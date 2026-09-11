//! yohu-ai — Agent 文档解析核心（纯函数，零 IO，零站点知识，零模型）。

mod outline;
mod parse;
mod section;

pub use outline::{extract_outline_items, leading_title};
pub use parse::parse_document;
