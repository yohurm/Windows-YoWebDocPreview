//! 事件总线（ADR-W11）：core/壳各处只 `tx.send(AppEvent)`，本模块是唯一 `emit` 出口。
//!
//! - `task/progress` 类可丢事件进 200ms 聚合器（同 run 最新快照覆盖，通道满则丢旧）；
//! - `task/done`、`task/error`、`settings/changed` 控制面必达（`send().await` 语义）；
//! - 控制面事件发出前先冲刷聚合器，保证「终态之前见到最终进度」的时序。

use std::collections::HashMap;
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use yohu_protocol::{AppEvent, TaskProgress};

/// 聚合窗口（ADR-W11）
pub const AGGREGATE_WINDOW: Duration = Duration::from_millis(200);

/// 进度聚合器（纯逻辑，可单测）：按 run_id 保留最新快照。
#[derive(Default)]
pub struct ProgressAggregator {
    pending: HashMap<u32, TaskProgress>,
}

impl ProgressAggregator {
    /// 收进一条进度快照（同 run 覆盖旧值）。
    pub fn push(&mut self, p: TaskProgress) {
        self.pending.insert(p.run_id, p);
    }

    /// 是否有待冲刷快照。
    pub fn is_empty(&self) -> bool {
        self.pending.is_empty()
    }

    /// 取走全部待冲刷快照（按 run_id 排序，便于测试断言）。
    pub fn drain(&mut self) -> Vec<TaskProgress> {
        let mut out: Vec<TaskProgress> = self.pending.drain().map(|(_, v)| v).collect();
        out.sort_by_key(|p| p.run_id);
        out
    }
}

/// 启动分发循环（app 层唯一的事件出口）。
///
/// 注意：必须用 `tauri::async_runtime::spawn` 而非 `tokio::spawn`——
/// 本函数在 Tauri setup（主线程，无 tokio reactor 上下文）调用。
pub fn spawn_dispatcher(
    rx: mpsc::Receiver<AppEvent>,
    app: AppHandle,
) -> tauri::async_runtime::JoinHandle<()> {
    tauri::async_runtime::spawn(async move {
        let mut rx = rx;
        let mut agg = ProgressAggregator::default();
        let mut ticker = tokio::time::interval(AGGREGATE_WINDOW);
        ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        loop {
            tokio::select! {
                maybe = rx.recv() => {
                    match maybe {
                        Some(AppEvent::TaskProgress(p)) => agg.push(p),
                        Some(control) => {
                            flush(&mut agg, &app);
                            emit(&app, &control);
                        }
                        None => {
                            flush(&mut agg, &app);
                            break;
                        }
                    }
                }
                _ = ticker.tick() => flush(&mut agg, &app),
            }
        }
    })
}

fn flush(agg: &mut ProgressAggregator, app: &AppHandle) {
    if agg.is_empty() {
        return;
    }
    for p in agg.drain() {
        emit(app, &AppEvent::TaskProgress(p));
    }
}

fn emit(app: &AppHandle, event: &AppEvent) {
    if let Err(e) = app.emit(event.name(), event) {
        eprintln!("事件 emit 失败（{}）: {e}", event.name());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use yohu_protocol::TaskState;

    fn progress(run_id: u32, done: u32) -> TaskProgress {
        TaskProgress {
            run_id,
            done,
            total: 10,
            failed: 0,
            state: TaskState::Running,
            current: None,
            errors: vec![],
        }
    }

    #[test]
    fn aggregator_keeps_latest_snapshot_per_run() {
        let mut agg = ProgressAggregator::default();
        agg.push(progress(1, 1));
        agg.push(progress(1, 2));
        agg.push(progress(1, 3)); // 窗口内同 run 覆盖
        agg.push(progress(2, 5)); // 不同 run 互不影响
        let out = agg.drain();
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].run_id, 1);
        assert_eq!(out[0].done, 3); // 只留最新快照
        assert_eq!(out[1].run_id, 2);
        assert!(agg.is_empty());
    }
}
