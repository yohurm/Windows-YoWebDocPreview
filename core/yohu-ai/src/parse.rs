//! Markdown + 元信息 → AgentDocument。

use yohu_protocol::{AgentDocument, DocMeta};

use crate::outline::{nest_outline, outline_items, scan_headings, strip_bom};
use crate::section::split_sections;

/// 解析已转换的 Markdown。空文与无标题均为成功（大纲/章节为空）。
pub fn parse_document(markdown: &str, meta: DocMeta) -> AgentDocument {
    let markdown = strip_bom(markdown);
    let scanned = scan_headings(markdown);
    let outline = nest_outline(&outline_items(&scanned));
    let sections = split_sections(markdown, &scanned);
    AgentDocument {
        meta,
        markdown: markdown.to_string(),
        outline,
        sections,
    }
}
