//! wire 类型：IPC 命令参数 / 返回 / 事件载荷（按域拆分）。
//!
//! 纯 serde 数据结构，无 IO。TS 侧 `@yohu/api` 手工对齐并以契约测试守护；
//! 字段 camelCase；manifest 条目保持 snake_case 以兼容现有知识库格式。

mod ai;
mod doc;
mod library;
mod task;

pub use ai::{AgentDocument, AgentSection, OutlineNode};
pub use doc::{BlobKind, CatalogNode, DocMeta, DocRef, FetchChannel, RawDoc};
pub use library::{
    BatchEntry, ImportListResult, LibraryEntry, SyncItem, SyncReport, TreeNode,
};
pub use task::{TaskError, TaskProgress, TaskState, TaskSummary};

pub use crate::settings::AppSettings;
