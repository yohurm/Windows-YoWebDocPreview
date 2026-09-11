//! yohu-md-convert — 公共 HTML→Markdown 内核（纯函数，零 IO，零站点知识）。
//!
//! 管线固定；站点差异只经 [`ConvertDialect`]。默认 [`GenericDialect`]。

mod dialect;
mod header;
mod headings;
mod images;
mod links;
mod options;
mod pipeline;
mod postprocess;
mod protect;
mod state;
mod tables;
mod transform;

pub use dialect::{ConvertDialect, GenericDialect};
pub use images::ImageKind;
pub use options::ConvertOptions;
pub use pipeline::html_to_markdown_with;
pub use state::ConvertState;

/// 通用入口：标准 HTML 方言。
pub fn html_to_markdown(html: &str, opts: &ConvertOptions) -> String {
    html_to_markdown_with(html, opts, &GenericDialect)
}
