//! ATX 标题扫描与大纲嵌套。扫描规则与 UI `extractMarkdownToc` 同一 testdata。

use std::sync::LazyLock;

use regex::Regex;
use yohu_protocol::OutlineNode;

static LINK: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\[([^\]]+)\]\([^)]+\)").unwrap());
static MARK: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[*_`~]").unwrap());

/// 大纲用的扁平标题（已跳过文首 h1）。`children` 为空。
pub fn extract_outline_items(markdown: &str) -> Vec<OutlineNode> {
    outline_items(&scan_headings(markdown))
}

pub(crate) fn outline_items(scanned: &[Scanned]) -> Vec<OutlineNode> {
    scanned
        .iter()
        .filter(|h| !h.skip_outline)
        .map(|h| OutlineNode {
            id: h.id.clone(),
            text: h.text.clone(),
            level: h.level,
            children: vec![],
        })
        .collect()
}

/// 文首 `#` 标题文本（转换头 / 文档名）。无则 `None`。
pub fn leading_title(markdown: &str) -> Option<String> {
    scan_headings(markdown)
        .into_iter()
        .find(|h| h.skip_outline)
        .map(|h| h.text)
}

pub(crate) fn strip_bom(markdown: &str) -> &str {
    markdown.strip_prefix('\u{feff}').unwrap_or(markdown)
}

pub(crate) fn scan_headings(markdown: &str) -> Vec<Scanned> {
    let markdown = strip_bom(markdown);
    if markdown.is_empty() {
        return Vec::new();
    }

    let mut found: Vec<Scanned> = Vec::new();
    let mut in_code = false;
    let mut idx: usize = 0;
    let mut offset = 0usize;

    for raw_line in markdown.split('\n') {
        let line_start = offset;
        let line = raw_line.trim();
        if line.starts_with("```") {
            in_code = !in_code;
        } else if !in_code && !line.starts_with("$$") {
            if let Some((level, raw_title)) = atx_heading(line) {
                let text = strip_markup(raw_title);
                if !text.is_empty() {
                    found.push(Scanned {
                        id: format!("toc-heading-{idx}"),
                        text,
                        level,
                        start: line_start,
                        skip_outline: false,
                    });
                    idx += 1;
                }
            }
        }
        offset += raw_line.len();
        if offset < markdown.len() {
            offset += 1;
        }
    }

    if found.first().is_some_and(|h| h.level == 1) {
        found[0].skip_outline = true;
    }
    found
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct Scanned {
    pub id: String,
    pub text: String,
    pub level: u8,
    pub start: usize,
    pub skip_outline: bool,
}

pub(crate) fn nest_outline(items: &[OutlineNode]) -> Vec<OutlineNode> {
    let mut roots: Vec<OutlineNode> = Vec::new();
    let mut stack: Vec<OutlineNode> = Vec::new();

    for item in items {
        let node = OutlineNode {
            id: item.id.clone(),
            text: item.text.clone(),
            level: item.level,
            children: vec![],
        };
        while stack.last().is_some_and(|top| top.level >= node.level) {
            let finished = stack.pop().expect("stack non-empty");
            attach(finished, &mut stack, &mut roots);
        }
        stack.push(node);
    }
    while let Some(finished) = stack.pop() {
        attach(finished, &mut stack, &mut roots);
    }
    roots
}

fn attach(node: OutlineNode, stack: &mut [OutlineNode], roots: &mut Vec<OutlineNode>) {
    if let Some(parent) = stack.last_mut() {
        parent.children.push(node);
    } else {
        roots.push(node);
    }
}

fn atx_heading(line: &str) -> Option<(u8, &str)> {
    let bytes = line.as_bytes();
    let mut n = 0u8;
    while (n as usize) < bytes.len() && bytes[n as usize] == b'#' && n < 4 {
        n += 1;
    }
    if n == 0 {
        return None;
    }
    let rest = line.get(n as usize..)?;
    let trimmed = rest.strip_prefix(|c: char| c.is_whitespace())?;
    if trimmed.is_empty() {
        return None;
    }
    Some((n, trimmed))
}

fn strip_markup(title: &str) -> String {
    let unlinked = LINK.replace_all(title, "$1");
    MARK.replace_all(&unlinked, "").trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nests_by_level() {
        let flat = vec![
            OutlineNode {
                id: "a".into(),
                text: "A".into(),
                level: 2,
                children: vec![],
            },
            OutlineNode {
                id: "b".into(),
                text: "B".into(),
                level: 3,
                children: vec![],
            },
            OutlineNode {
                id: "c".into(),
                text: "C".into(),
                level: 2,
                children: vec![],
            },
        ];
        let tree = nest_outline(&flat);
        assert_eq!(tree.len(), 2);
        assert_eq!(tree[0].text, "A");
        assert_eq!(tree[0].children.len(), 1);
        assert_eq!(tree[0].children[0].text, "B");
        assert_eq!(tree[1].text, "C");
    }
}
