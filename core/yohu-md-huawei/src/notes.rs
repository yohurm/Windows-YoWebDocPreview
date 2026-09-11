//! 华为 `.note` / `notetitle` / `notebody` 与表格内 note。

use regex::Regex;
use std::sync::LazyLock;

#[derive(Default)]
pub struct HuaweiState {
    notes: Vec<String>,
    cell_notes: Vec<(usize, String)>,
}

static NOTETITLE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"<span class="notetitle">\s*(.*?)\s*</span>"#).unwrap());
static NOTEBODY_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"<div class="notebody">(.*?)</div>"#).unwrap());
static HEADING5_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?m)^##### .+$").unwrap());
static WS_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());
static NOTE_PREFIX_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(注意|说明|警告|危险|提示)[：:]?\s*").unwrap());
static TAGS_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

pub fn extract_cell_notes(md: &str, st: &mut HuaweiState) -> String {
    const NEEDLE: &str = "<div class=\"note\">";
    let mut result = String::with_capacity(md.len());
    let mut rest = md;
    while let Some(rel) = rest.find(NEEDLE) {
        let abs = md.len() - rest.len() + rel;
        let is_cell_note = in_table_cell(md, abs)
            && matches!(find_matching_div_end(md, abs), Some(e) if e > abs);
        if !is_cell_note {
            result.push_str(&rest[..rel]);
            result.push_str(NEEDLE);
            rest = &rest[rel + NEEDLE.len()..];
            continue;
        }
        let end = find_matching_div_end(md, abs).unwrap();
        let note_html = &md[abs..end];
        let title = NOTETITLE_RE
            .captures(note_html)
            .and_then(|c| c.get(1))
            .map(|m| {
                m.as_str()
                    .trim()
                    .trim_end_matches('：')
                    .trim_end_matches(':')
                    .to_string()
            })
            .unwrap_or_else(|| "说明".into());
        let body = NOTEBODY_RE
            .captures(note_html)
            .and_then(|c| c.get(1))
            .map(|m| strip_tags(m.as_str()).trim().to_string())
            .unwrap_or_default();
        let note_md = format!("\n> [!NOTE] {title}\n> {body}\n");
        let pid = st.cell_notes.len();
        st.cell_notes.push((pid, note_md));

        result.push_str(&rest[..rel]);
        if let Some(tp) = result.rfind("<table") {
            result.insert_str(tp, &format!("\u{0}TBLNOTE{pid}\u{0}"));
        }
        rest = &rest[rel + (end - abs)..];
    }
    result.push_str(rest);
    result
}

pub fn save_notes(md: &str, st: &mut HuaweiState) -> String {
    let re = Regex::new(r#"(?s)<div[^>]*class="[^"]*note[^"]*"[^>]*>.*?</div>"#).unwrap();
    re.replace_all(md, |c: &regex::Captures| {
        let i = st.notes.len();
        st.notes.push(c[0].to_string());
        format!("\u{0}NOTE{i}\u{0}")
    })
    .into_owned()
}

pub fn restore_cell_notes(md: &str, st: &mut HuaweiState) -> String {
    let mut out = md.to_string();
    for (pid, note_md) in &st.cell_notes {
        let ph = format!("\u{0}TBLNOTE{pid}\u{0}");
        let Some(pos) = out.find(&ph) else { continue };
        let insert_pos = HEADING5_RE
            .find_iter(&out[..pos])
            .last()
            .map(|m| m.end())
            .unwrap_or(pos);
        out.replace_range(insert_pos..insert_pos, &format!("\n{note_md}\n"));
        if let Some(p2) = out.find(&ph) {
            out.replace_range(p2..p2 + ph.len(), "");
        }
    }
    let orphan = Regex::new("\u{0}TBLNOTE\\d+\u{0}").unwrap();
    orphan.replace_all(&out, "").into_owned()
}

pub fn restore_notes(md: &str, st: &mut HuaweiState) -> String {
    let mut out = md.to_string();
    for (i, note_html) in std::mem::take(&mut st.notes).into_iter().enumerate() {
        let ph = format!("\u{0}NOTE{i}\u{0}");
        let lower = note_html.to_lowercase();
        let note_type = if lower.contains("caution")
            || note_html.contains("注意")
            || note_html.contains("警告")
            || note_html.contains("危险")
        {
            "WARNING"
        } else if lower.contains("tip") || note_html.contains("说明") {
            "TIP"
        } else {
            "NOTE"
        };
        let inner = strip_tags(&note_html);
        let inner = WS_RE.replace_all(inner.trim(), " ");
        let inner = NOTE_PREFIX_RE.replace(&inner, "");
        out = out.replacen(&ph, &format!("\n> [!{note_type}]\n> {inner}\n"), 1);
    }
    out
}

fn in_table_cell(text: &str, pos: usize) -> bool {
    let before = &text[..pos];
    let open = |tag: &str| count_open_tags(before, tag);
    let close = |tag: &str| before.matches(&format!("</{tag}>")).count();
    (open("td") > close("td")) || (open("th") > close("th"))
}

fn count_open_tags(before: &str, tag: &str) -> usize {
    let pat = format!("<{tag}");
    let mut n = 0usize;
    let mut from = 0usize;
    while let Some(i) = before[from..].find(&pat) {
        let after = from + i + pat.len();
        match before[after..].chars().next() {
            Some(c) if c.is_ascii_alphanumeric() => {}
            _ => n += 1,
        }
        from = after;
    }
    n
}

fn find_matching_div_end(text: &str, start: usize) -> Option<usize> {
    let mut depth = 1i32;
    let mut p = start + "<div class=\"note\">".len();
    while p < text.len() && depth > 0 {
        let next_open = text[p..].find("<div").map(|i| p + i);
        let next_close = text[p..].find("</div>").map(|i| p + i);
        match (next_open, next_close) {
            (Some(no), Some(nc)) if no < nc => {
                depth += 1;
                p = no + 4;
            }
            (_, Some(nc)) => {
                depth -= 1;
                p = nc + 6;
            }
            _ => return None,
        }
    }
    if depth == 0 {
        Some(p)
    } else {
        None
    }
}

fn strip_tags(s: &str) -> String {
    TAGS_RE.replace_all(s, " ").into_owned()
}
