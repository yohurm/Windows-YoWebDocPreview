//! yohu-library — capability 用例层：manifest 读写 / 图片资源 / 批量执行 / 检查更新 / 导入清单（ADR-W13）。
//!
//! 原子写与路径根已收口 `yohu-runtime`（ADR-W10）；本 crate 不再自带持久化原语。

pub mod batch;
pub mod check;
pub mod convert;
pub mod error;
pub mod images;
pub mod import;
pub mod store;

pub use check::{run_check, CheckItem, CheckResult};
pub use convert::{convert_document, convert_html, export_document};
pub use error::LibraryError;
pub use store::LibraryStore;
