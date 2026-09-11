//! 更新检查执行器：manifest → 官方时间探测 → NEW/UPDATE/NOT_FOUND 清单。
//!
//! - 并发受 `concurrency` 限制（复用 HttpClient 信号量语义，本地 worker 池）；
//! - `CancellationToken` 可取消；
//! - 断点续跑：`.check_progress.json` 每 100 条持久化，`resume` 跳过已处理条目；
//! - 只检查华为文档（probe_meta 走华为 API）；GitHub / generic-web 跳过。

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tokio_util::sync::CancellationToken;
use yohu_protocol::{TaskProgress, TaskState};
use yohu_source::HttpClient;

use crate::error::LibraryError;
use crate::store::LibraryStore;

/// 检查结果条目
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckItem {
    pub file: String,
    pub url: String,
    pub slug: String,
    pub catalog: String,
    pub local_time: Option<String>,
    pub official_time: Option<String>,
    /// NEW | UPDATE | NOT_FOUND
    pub status: String,
}

/// 检查断点文件名（库根下；壳层 fresh-start 时按此名清理）
pub const CHECK_PROGRESS_FILE: &str = ".check_progress.json";

/// 检查断点（`.check_progress.json`）
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckProgress {
    /// 已处理条目键（`catalog::slug`）
    processed: Vec<String>,
}

/// 检查执行结果
pub struct CheckResult {
    pub items: Vec<CheckItem>,
    pub checked: u32,
    pub not_found: u32,
    pub cancelled: bool,
}

/// 运行更新检查。
///
/// - `entries` 为 manifest 快照（壳加载后传入）；
/// - `on_progress` 每完成一条回调（壳层节流转发）。
pub async fn run_check(
    store: Arc<LibraryStore>,
    http: HttpClient,
    entries: Vec<yohu_protocol::LibraryEntry>,
    concurrency: usize,
    token: CancellationToken,
    run_id: u32,
    mut on_progress: impl FnMut(TaskProgress) + Send,
) -> Result<CheckResult, LibraryError> {
    // 断点加载（同清单键去重）
    let progress_path = check_progress_path(store.root());
    let mut prog = load_progress(&progress_path);
    let resume_keys: std::collections::HashSet<String> =
        prog.processed.iter().cloned().collect();

    // 只检查华为文档：probe_meta 走华为 API。GitHub / generic-web 不进清单。
    let candidates: Vec<_> = entries
        .into_iter()
        .filter(|e| {
            !e.slug.is_empty()
                && yohu_domain::is_huawei_source(&yohu_domain::parse_url(&e.url).source_id)
        })
        .collect();

    let done = Arc::new(AtomicU32::new(0));
    let failed = Arc::new(AtomicU32::new(0));
    let current = Arc::new(Mutex::new(None::<String>));
    let results: Arc<Mutex<Vec<CheckItem>>> = Arc::new(Mutex::new(Vec::new()));
    let keys: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));

    let queue = Arc::new(Mutex::new(std::collections::VecDeque::from(
        candidates
            .into_iter()
            .filter(|e| !resume_keys.contains(&format!("{}::{}", e.catalog, e.slug)))
            .collect::<Vec<_>>(),
    )));
    let total = queue.lock().map_err(|_| LibraryError::internal("queue poisoned"))?.len() as u32;

    let mut handles = Vec::new();
    for _ in 0..concurrency.max(1) {
        let queue = Arc::clone(&queue);
        let http = http.clone();
        let token = token.clone();
        let done = Arc::clone(&done);
        let failed = Arc::clone(&failed);
        let current = Arc::clone(&current);
        let results = Arc::clone(&results);
        let keys = Arc::clone(&keys);

        handles.push(tokio::spawn(async move {
            loop {
                if token.is_cancelled() {
                    return;
                }
                let item = {
                    let Ok(mut q) = queue.lock() else { return };
                    q.pop_front()
                };
                let Some(item) = item else { return };

                {
                    let Ok(mut c) = current.lock() else { return };
                    *c = Some(item.url.clone());
                }

                let key = format!("{}::{}", item.catalog, item.slug);
                let probe = yohu_source::probe_meta(&http, &item.slug, &item.catalog).await;

                let status = match &probe {
                    Err(yohu_source::SourceError::NotFound(_)) => Some("NOT_FOUND".to_string()),
                    Ok((_, official)) => {
                        let official = official.as_deref();
                        match yohu_domain::classify(item.local_time.as_deref(), official) {
                            yohu_domain::UpdateKind::New => Some("NEW".to_string()),
                            yohu_domain::UpdateKind::Update => Some("UPDATE".to_string()),
                            yohu_domain::UpdateKind::Unchanged => None, // 无变化不进清单
                        }
                    }
                    Err(_) => {
                        // 网络/API 暂时性错误：计失败但不中断整体
                        failed.fetch_add(1, Ordering::Relaxed);
                        None
                    }
                };

                if let Some(status) = status {
                    let (_, official) = probe.unwrap_or((String::new(), None));
                    if let Ok(mut r) = results.lock() {
                        r.push(CheckItem {
                            file: item.file.clone(),
                            url: item.url.clone(),
                            slug: item.slug.clone(),
                            catalog: item.catalog.clone(),
                            local_time: item.local_time.clone(),
                            official_time: official,
                            status,
                        });
                    }
                }
                if let Ok(mut k) = keys.lock() {
                    k.push(key);
                }
                done.fetch_add(1, Ordering::Relaxed);
            }
        }));
    }

    // 等待完成或取消
    loop {
        if token.is_cancelled() {
            break;
        }
        if handles.iter().all(|h| h.is_finished()) {
            break;
        }
        on_progress(TaskProgress {
            run_id,
            done: done.load(Ordering::Relaxed),
            total,
            failed: failed.load(Ordering::Relaxed),
            state: TaskState::Running,
            current: current.lock().ok().and_then(|g| g.clone()),
            errors: Vec::new(),
        });
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    for h in handles.drain(..) {
        h.abort();
    }

    // 持久化断点（取消时保留以便续跑；完成时清理）
    let cancelled = token.is_cancelled();
    let mut items = results.lock().map_err(|_| LibraryError::internal("results poisoned"))?.clone();
    let new_keys = keys.lock().map_err(|_| LibraryError::internal("keys poisoned"))?.clone();
    prog.processed.extend(new_keys);
    if cancelled {
        save_progress(&progress_path, &prog);
    } else {
        // 完成：清理断点
        let _ = std::fs::remove_file(&progress_path);
    }
    items.sort_by(|a, b| a.status.cmp(&b.status).then(a.url.cmp(&b.url)));

    Ok(CheckResult {
        checked: done.load(Ordering::Relaxed),
        not_found: items.iter().filter(|i| i.status == "NOT_FOUND").count() as u32,
        cancelled,
        items,
    })
}

fn check_progress_path(root: &Path) -> PathBuf {
    root.join(CHECK_PROGRESS_FILE)
}

fn load_progress(path: &Path) -> CheckProgress {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_progress(path: &Path, p: &CheckProgress) {
    if let Ok(json) = serde_json::to_string(p) {
        let _ = yohu_runtime::atomic_write(path, &json);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn progress_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let p = check_progress_path(dir.path());
        let prog = CheckProgress { processed: vec!["a::b".into()] };
        save_progress(&p, &prog);
        assert_eq!(load_progress(&p).processed, vec!["a::b".to_string()]);
    }
}
