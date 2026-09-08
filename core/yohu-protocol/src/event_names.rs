//! 事件名常量（core → UI，`listen`）。
//!
//! Tauri 2.9+ 事件名禁止点号，统一用 `/` 分层；
//! invoke 命令名仍用点分（如 `doc.fetch`）。
//! TS 侧 `@yohu/api` 的 `EVENT_NAMES` 与此处对齐（契约测试守护）。

/// 批量任务进度（200ms 聚合，最新快照语义，可丢）
pub const TASK_PROGRESS: &str = "task/progress";

/// 任务终态（必达）
pub const TASK_DONE: &str = "task/done";

/// 任务逐条失败明细（批量上限 200 条，超出聚合计数）
pub const TASK_ERROR: &str = "task/error";

/// 设置变更（必达，携带全量快照）
pub const SETTINGS_CHANGED: &str = "settings/changed";

/// 全部事件名（供测试与诊断遍历）
pub const EVENT_NAMES_ALL: &[&str] =
    &[TASK_PROGRESS, TASK_DONE, TASK_ERROR, SETTINGS_CHANGED];