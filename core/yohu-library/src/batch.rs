//! 批量抓取执行器：并发 worker + 取消 + 进度回调 + 断点续跑。

use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

use tokio_util::sync::CancellationToken;
use yohu_protocol::{TaskError, TaskProgress, TaskState};
use yohu_source::{AdapterRegistry, HttpClient};

use crate::store::LibraryStore;

/// 单条任务输入
#[derive(Debug, Clone)]
pub struct BatchItem {
    pub url: String,
    pub rel_dir: String,
}

/// 进度快照（最新快照语义，由壳层节流转发）
#[derive(Clone)]
pub struct ProgressHandle {
    run_id: u32,
    done: Arc<AtomicU32>,
    failed: Arc<AtomicU32>,
    total: u32,
    current: Arc<Mutex<Option<String>>>,
    errors: Arc<Mutex<Vec<TaskError>>>,
}

impl ProgressHandle {
    fn snapshot(&self, state: TaskState) -> TaskProgress {
        TaskProgress {
            run_id: self.run_id,
            done: self.done.load(Ordering::Relaxed),
            failed: self.failed.load(Ordering::Relaxed),
            total: self.total,
            state,
            current: self.current.lock().ok().and_then(|g| g.clone()),
            errors: self
                .errors
                .lock()
                .map(|g| g.iter().rev().take(50).cloned().collect())
                .unwrap_or_default(),
        }
    }

    pub fn get(&self, state: TaskState) -> TaskProgress {
        self.snapshot(state)
    }
}

/// 批量执行结果摘要
pub struct BatchResult {
    pub done: u32,
    pub failed: u32,
    pub cancelled: bool,
}

/// 断点状态（`runs/<run_id>/state.json`）：已完成 URL 列表
#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct BatchState {
    done_urls: Vec<String>,
}

/// 运行批量抓取。
///
/// - `concurrency` 并发数；`token` 取消令牌
/// - `state_path` 断点文件（Some 时：启动加载已完成 URL 跳过；每条完成持久化；自然完成删除）
/// - `on_progress` 每 100ms 回调快照（壳层负责 200ms 聚合，ADR-W11）
#[allow(clippy::too_many_arguments)]
pub async fn run_batch(
    store: Arc<LibraryStore>,
    registry: Arc<AdapterRegistry>,
    http: HttpClient,
    items: Vec<BatchItem>,
    concurrency: usize,
    token: CancellationToken,
    run_id: u32,
    state_path: Option<&std::path::Path>,
    mut on_progress: impl FnMut(TaskProgress) + Send,
) -> BatchResult {
    let total = items.len() as u32;
    let done = Arc::new(AtomicU32::new(0));
    let failed = Arc::new(AtomicU32::new(0));
    let current = Arc::new(Mutex::new(None::<String>));
    let errors = Arc::new(Mutex::new(Vec::<TaskError>::new()));

    // 断点加载：已完成 URL 直接跳过（计入 done）
    let done_urls: Vec<String> = state_path
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<BatchState>(&s).ok())
        .map(|s| s.done_urls)
        .unwrap_or_default();
    let resume_set: std::collections::HashSet<String> = done_urls.iter().cloned().collect();
    let (pending, skipped): (Vec<BatchItem>, Vec<BatchItem>) = items
        .into_iter()
        .partition(|i| !resume_set.contains(&i.url));
    done.fetch_add(skipped.len() as u32, Ordering::Relaxed);
    let done_urls = Arc::new(Mutex::new(done_urls));

    let handle = ProgressHandle {
        run_id,
        done: Arc::clone(&done),
        failed: Arc::clone(&failed),
        total,
        current: Arc::clone(&current),
        errors: Arc::clone(&errors),
    };

    let queue = Arc::new(Mutex::new(std::collections::VecDeque::from(pending)));
    let mut handles = Vec::new();

    for _ in 0..concurrency.max(1) {
        let queue = Arc::clone(&queue);
        let store = Arc::clone(&store);
        let registry = Arc::clone(&registry);
        let http = http.clone();
        let token = token.clone();
        let done = Arc::clone(&done);
        let failed = Arc::clone(&failed);
        let current = Arc::clone(&current);
        let errors = Arc::clone(&errors);
        let done_urls = Arc::clone(&done_urls);

        handles.push(tokio::spawn(async move {
            loop {
                if token.is_cancelled() {
                    return;
                }
                let item = {
                    let mut q = match queue.lock() {
                        Ok(q) => q,
                        Err(_) => return,
                    };
                    q.pop_front()
                };
                let Some(item) = item else { return };

                {
                    let mut c = current.lock().unwrap();
                    *c = Some(item.url.clone());
                }

                let progress_cb = |msg: String| {
                    let mut c = current.lock().unwrap();
                    *c = Some(msg);
                };

                match store
                    .export_one(
                        &registry,
                        &http,
                        &item.url,
                        &item.rel_dir,
                        true,
                        Some(&progress_cb),
                    )
                    .await
                {
                    Ok(_) => {
                        done.fetch_add(1, Ordering::Relaxed);
                        if let Ok(mut d) = done_urls.lock() {
                            d.push(item.url.clone());
                        }
                    }
                    Err(e) => {
                        failed.fetch_add(1, Ordering::Relaxed);
                        if let Ok(mut es) = errors.lock() {
                            es.push(TaskError { url: item.url.clone(), message: e.to_string() });
                        }
                    }
                }
            }
        }));
    }

    // 等待全部 worker 或取消
    loop {
        if token.is_cancelled() {
            token.cancel(); // 广播给 worker
            break;
        }
        if handles.iter().all(|h| h.is_finished()) {
            break;
        }
        on_progress(handle.snapshot(TaskState::Running));
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    for h in handles.drain(..) {
        h.abort();
    }

    let cancelled = token.is_cancelled();
    let final_state = if cancelled { TaskState::Cancelled } else { TaskState::Done };
    let snapshot = handle.snapshot(final_state);
    on_progress(snapshot.clone());

    // 断点维护：自然完成 → 清理；取消 → 落盘以便续跑
    if let Some(p) = state_path {
        if cancelled {
            let state = BatchState { done_urls: done_urls.lock().map(|d| d.clone()).unwrap_or_default() };
            if let Ok(json) = serde_json::to_string(&state) {
                let _ = yohu_runtime::atomic_write(p, &json);
            }
        } else {
            let _ = std::fs::remove_file(p);
        }
    }

    BatchResult { done: snapshot.done, failed: snapshot.failed, cancelled }
}