//! 按扫描到的标题切章节（含文首 h1）。

use yohu_protocol::AgentSection;

use crate::outline::Scanned;

pub(crate) fn split_sections(markdown: &str, headings: &[Scanned]) -> Vec<AgentSection> {
    if headings.is_empty() {
        return Vec::new();
    }
    headings
        .iter()
        .enumerate()
        .map(|(i, h)| {
            let end = headings.get(i + 1).map(|n| n.start).unwrap_or(markdown.len());
            AgentSection {
                id: h.id.clone(),
                heading: h.text.clone(),
                level: h.level,
                markdown: markdown[h.start..end].to_string(),
                start_offset: h.start,
                end_offset: end,
            }
        })
        .collect()
}
