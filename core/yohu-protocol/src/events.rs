//! 事件信封单源（ADR-W11）：core/壳各处只构造 `AppEvent`，
//! 壳 `events.rs` 总线统一消费并 `emit(event.name(), &event)`。
//!
//! 语义（ADR-W7）：Progress 类 200ms 聚合可丢；Done/SettingsChanged 必达；
//! TaskError 逐条明细（上限 200 条，超出聚合计数）。

use serde::{Deserialize, Serialize};

use crate::event_names::{SETTINGS_CHANGED, TASK_DONE, TASK_ERROR, TASK_PROGRESS};
use crate::wire::{AppSettings, TaskError, TaskProgress, TaskSummary};

/// 应用事件信封（core → UI，唯一事件出口）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AppEvent {
    /// 批量任务进度（200ms 聚合最新快照，可丢）
    TaskProgress(TaskProgress),
    /// 任务终态（必达）
    TaskDone(TaskSummary),
    /// 逐条失败明细（上限 200 条）
    TaskError {
        run_id: u32,
        error: TaskError,
    },
    /// 设置变更（必达，携带全量快照；key 为触发变更的单键，批量初始化为 None）
    SettingsChanged {
        key: Option<String>,
        settings: AppSettings,
    },
}

impl AppEvent {
    /// Tauri 事件名（禁止点号，`/` 分层，继承 ADR-v6-020）
    pub fn name(&self) -> &'static str {
        match self {
            AppEvent::TaskProgress(_) => TASK_PROGRESS,
            AppEvent::TaskDone(_) => TASK_DONE,
            AppEvent::TaskError { .. } => TASK_ERROR,
            AppEvent::SettingsChanged { .. } => SETTINGS_CHANGED,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wire::TaskState;

    #[test]
    fn event_names_match_event_names_module() {
        let events = vec![
            AppEvent::TaskProgress(TaskProgress {
                run_id: 1,
                done: 0,
                total: 0,
                failed: 0,
                state: TaskState::Running,
                current: None,
                errors: vec![],
            }),
            AppEvent::TaskDone(TaskSummary {
                run_id: 1,
                state: TaskState::Done,
                done: 1,
                total: 1,
                failed: 0,
                errors: vec![],
            }),
            AppEvent::TaskError {
                run_id: 1,
                error: TaskError { url: "u".into(), message: "m".into() },
            },
            AppEvent::SettingsChanged { key: None, settings: AppSettings::default() },
        ];
        for e in &events {
            assert!(!e.name().contains('.'));
        }
        assert_eq!(events[0].name(), "task/progress");
        assert_eq!(events[1].name(), "task/done");
        assert_eq!(events[2].name(), "task/error");
        assert_eq!(events[3].name(), "settings/changed");
    }
}
