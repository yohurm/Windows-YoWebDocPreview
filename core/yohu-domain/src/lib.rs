//! yohu-domain — 纯领域层（无 IO）。
//!
//! URL→DocRef 解析、manifest 模型与校验、更新时间归一化对比、
//! 导出文件名派生。只依赖 yohu-protocol 与 serde。
//!
//! 设置键表与默认值已迁至 yohu-protocol（wire 单源），domain 不再重复定义。

pub mod catalog;
pub mod doc_ref;
pub mod github;
pub mod header;
pub mod manifest;
pub mod naming;
pub mod path_match;
pub mod time_cmp;

pub use catalog::*;
pub use doc_ref::*;
pub use github::*;
pub use header::*;
pub use manifest::*;
pub use naming::*;
pub use path_match::*;
pub use time_cmp::*;
