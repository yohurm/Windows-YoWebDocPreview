//! 表格转换（Python 步骤 5）：rowspan 展开、`\|` 转义、th 分隔行。

use regex::Regex;
use std::sync::LazyLock;

static ROWSPAN_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"rowspan="(\d+)""#).unwrap());
static P_OPEN_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<p[^>]*>").unwrap());
static P_CLOSE_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"</p>").unwrap());
static CELL_TAGS_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());
static CELL_WS_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

/// 单元格
struct Cell {
    text: String,
    rowspan: usize,
}

/// 行
struct Row {
    is_header: bool,
    cells: Vec<Cell>,
}

/// 手动扫描一行中的 td/th 单元格（Rust regex 不支持反向引用 `\1`）。
/// 返回 (属性串, 内容) 列表。
fn scan_cells(row_html: &str) -> Vec<(String, String)> {
    let open_re = Regex::new(r#"<(th|td)\b([^>]*)>"#).unwrap();
    let mut out = Vec::new();
    let bytes = row_html;
    let mut pos = 0usize;
    while let Some(c) = open_re.captures_at(bytes, pos) {
        let m = c.get(0).unwrap();
        let tag = c.get(1).unwrap().as_str(); // "th" | "td"
        let attrs = c.get(2).unwrap().as_str().to_string();
        let close_pat = format!("</{tag}>");
        let Some(rel_close) = bytes[m.end()..].find(&close_pat) else { break };
        let content = bytes[m.end()..m.end() + rel_close].to_string();
        out.push((attrs, content));
        pos = m.end() + rel_close + close_pat.len();
    }
    out
}

/// 转换全部 `<table>` 为 Markdown 表格。
pub fn convert_tables(md: &str) -> String {
    let re = Regex::new(r"(?s)<table[^>]*>.*?</table>").unwrap();
    re.replace_all(md, |m: &regex::Captures| convert_one(&m[0]))
        .into_owned()
}

fn convert_one(table_html: &str) -> String {
    let strip = Regex::new(r"</?thead[^>]*>|</?tbody[^>]*>").unwrap();
    let inner = strip.replace_all(table_html, "");
    let tr_re = Regex::new(r"(?s)<tr[^>]*>(.*?)</tr>").unwrap();
    let mut parsed: Vec<Row> = Vec::new();
    for tr in tr_re.captures_iter(&inner) {
        let row_html = &tr[1];
        let is_header = row_html.contains("<th");
        let mut cells = Vec::new();
        for (attrs, content) in scan_cells(row_html) {
            let rowspan = ROWSPAN_RE
                .captures(&attrs)
                .and_then(|m| m[1].parse::<usize>().ok())
                .unwrap_or(1);
            let mut text = P_OPEN_RE.replace_all(&content, "").into_owned();
            text = P_CLOSE_RE.replace_all(&text, " ").into_owned();
            text = CELL_TAGS_RE.replace_all(&text, "").into_owned();
            text = CELL_WS_RE.replace_all(&text, " ").trim().to_string();
            text = text.replace('|', "\\|");
            cells.push(Cell { text, rowspan });
        }
        parsed.push(Row { is_header, cells });
    }

    let mut lines: Vec<String> = Vec::new();
    // col → (text, remaining)
    let mut spans: std::collections::BTreeMap<usize, (String, usize)> = Default::default();

    for row in &parsed {
        if row.is_header {
            let texts: Vec<&str> = row.cells.iter().map(|c| c.text.as_str()).collect();
            lines.push(format!("| {} |", texts.join(" | ")));
            lines.push(format!("| {} |", vec!["---"; texts.len()].join(" | ")));
            continue;
        }
        let mut out: Vec<String> = Vec::new();
        let mut ci = 0usize;
        // 先填充延续中的 rowspan
        for (&col, (text, rem)) in spans.clone().iter() {
            while ci < col && ci < row.cells.len() {
                out.push(row.cells[ci].text.clone());
                ci += 1;
            }
            out.push(text.clone());
            let new_rem = rem - 1;
            if new_rem == 0 {
                spans.remove(&col);
            } else {
                spans.insert(col, (text.clone(), new_rem));
            }
        }
        // 处理剩余单元格
        while ci < row.cells.len() {
            let c = &row.cells[ci];
            out.push(c.text.clone());
            if c.rowspan > 1 {
                spans.insert(ci, (c.text.clone(), c.rowspan - 1));
            }
            ci += 1;
        }
        lines.push(format!("| {} |", out.join(" | ")));
    }
    format!("\n{}\n", lines.join("\n"))
}