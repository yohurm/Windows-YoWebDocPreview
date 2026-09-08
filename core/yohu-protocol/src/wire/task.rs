//! 任务域 wire 类型：状态机 / 失败明细 / 进度快照 / 终态摘要。

use serde::{Deserialize, Serialize};

/// 任务状态机
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskState {
    Running,
    Done,
    Cancelled,
    Failed,
}

/// 单条失败明细
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskError {
    pub url: String,
    pub message: String,
}

/// 批量任务进度快照（最新快照语义）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskProgress {
    pub run_id: u32,
    pub done: u32,
    pub total: u32,
    pub failed: u32,
    pub state: TaskState,
    #[serde(default)]
    pub current: Option<String>,
    #[serde(default)]
    pub errors: Vec<TaskError>,
}

/// 任务终态摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskSummary {
    pub run_id: u32,
    pub state: TaskState,
    pub done: u32,
    pub total: u32,
    pub failed: u32,
    #[serde(default)]
    pub errors: Vec<TaskError>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn task_progress_roundtrip() {
        let p = TaskProgress {
            run_id: 7,
            done: 3,
            total: 10,
            failed: 1,
            state: TaskState::Running,
            current: Some("https://example.com".into()),
            errors: vec![TaskError { url: "u".into(), message: "timeout".into() }],
        };
        let back: TaskProgress =
            serde_json::from_str(&serde_json::to_string(&p).unwrap()).unwrap();
        assert_eq!(back.run_id, 7);
        assert_eq!(back.errors.len(), 1);
    }
}
