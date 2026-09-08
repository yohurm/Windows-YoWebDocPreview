//! 占位保护与还原：代码块 / note / 表格内 note（Python 步骤 0、1、2、4.5、10、11）。

use super::State;
use regex::Regex;
use std::sync::LazyLock;

static NOTETITLE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"<span class="notetitle">\s*(.*?)\s*</span>"#).unwrap());
static NOTEBODY_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"<div class="notebody">(.*?)</div>"#).unwrap());
static HEADING5_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?m)^##### .+$").unwrap());
static PRE_INNER_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?s)<pre[^>]*>(.*?)</pre>").unwrap());
static CODE_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"</?code[^>]*>").unwrap());
static HL_HEADER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?s)<div[^>]*highlight-div-header[^>]*>.*?</div>"#).unwrap());
static WS_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());
static NOTE_PREFIX_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(注意|说明|警告|危险|提示)[：:]?\s*").unwrap());
static TAGS_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

/// Step 0：表格单元格内的 note 提取，占位符插到最近的前置 `<table` 前。
///
/// 实现说明：所有位置都基于**原始字符串**计算（流式拷贝到 result），
/// 避免边改边用旧偏移导致的多字节字符边界 panic（真实缺陷修复）。
pub fn extract_cell_notes(md: &str, st: &mut State) -> String {
    const NEEDLE: &str = "<div class=\"note\">";
    let mut result = String::with_capacity(md.len());
    let mut rest = md;
    while let Some(rel) = rest.find(NEEDLE) {
        let abs = md.len() - rest.len() + rel;
        let is_cell_note = in_table_cell(md, abs)
            && matches!(find_matching_div_end(md, abs), Some(e) if e > abs);
        if !is_cell_note {
            // 非单元格内 note：原样保留，继续扫描
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
            .map(|m| m.as_str().trim().trim_end_matches('：').trim_end_matches(':').to_string())
            .unwrap_or_else(|| "说明".into());
        let body = NOTEBODY_RE
            .captures(note_html)
            .and_then(|c| c.get(1))
            .map(|m| strip_tags(m.as_str()).trim().to_string())
            .unwrap_or_default();
        let note_md = format!("\n> [!NOTE] {title}\n> {body}\n");
        let pid = st.cell_notes.len();
        st.cell_notes.push((pid, note_md));

        // 跳过 note 本体（不拷贝进 result）
        result.push_str(&rest[..rel]);
        // 占位符插到已输出内容中最近的前置 <table 前
        if let Some(tp) = result.rfind("<table") {
            result.insert_str(tp, &format!("\u{0}TBLNOTE{pid}\u{0}"));
        }
        rest = &rest[rel + (end - abs)..];
    }
    result.push_str(rest);
    result
}

/// Step 1：保护 `<pre>` 代码块为 `\0CODE<i>\0`。
pub fn save_code_blocks(md: &str, st: &mut State) -> String {
    let re = Regex::new(r"(?s)<pre[^>]*>.*?</pre>").unwrap();
    re.replace_all(md, |c: &regex::Captures| {
        let i = st.code_blocks.len();
        st.code_blocks.push(c[0].to_string());
        format!("\u{0}CODE{i}\u{0}")
    })
    .into_owned()
}

/// Step 2：保护普通 note div 为 `\0NOTE<i>\0`。
pub fn save_notes(md: &str, st: &mut State) -> String {
    let re = Regex::new(r#"(?s)<div[^>]*class="[^"]*note[^"]*"[^>]*>.*?</div>"#).unwrap();
    re.replace_all(md, |c: &regex::Captures| {
        let i = st.notes.len();
        st.notes.push(c[0].to_string());
        format!("\u{0}NOTE{i}\u{0}")
    })
    .into_owned()
}

/// Step 4.5：还原表格 note 占位符（插到最近前置标题后）。
pub fn restore_cell_notes(md: &str, st: &mut State) -> String {
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
        // 移除占位符（注意 insert 后位置偏移）
        if let Some(p2) = out.find(&ph) {
            out.replace_range(p2..p2 + ph.len(), "");
        }
    }
    // 清理孤儿占位符
    let orphan = Regex::new("\u{0}TBLNOTE\\d+\u{0}").unwrap();
    orphan.replace_all(&out, "").into_owned()
}

/// Step 10：还原代码块（语言探测 + 实体解码 + 高亮工具条剥离）。
pub fn restore_code_blocks(md: &str, st: &mut State) -> String {
    let mut out = md.to_string();
    for (i, block) in std::mem::take(&mut st.code_blocks).into_iter().enumerate() {
        let ph = format!("\u{0}CODE{i}\u{0}");
        let lang = detect_language(&block);
        let replacement = match PRE_INNER_RE.captures(&block) {
            Some(c) => {
                let mut code = c[1].to_string();
                // 实体解码（拼接构造实体名，防编辑器格式化改写字面量）
                const LT: &str = concat!("&", "lt;");
                const GT: &str = concat!("&", "gt;");
                const AMP: &str = concat!("&", "amp;");
                code = code.replace(LT, "<").replace(GT, ">").replace(AMP, "&");
                let code = CODE_TAG_RE.replace_all(&code, "");
                let code = HL_HEADER_RE.replace_all(&code, "");
                format!("\n```{lang}\n{}\n```\n", code.trim())
            }
            None => String::new(),
        };
        out = out.replacen(&ph, &replacement, 1);
    }
    out
}

/// Step 11：还原 note 为 callout。
pub fn restore_notes(md: &str, st: &mut State) -> String {
    let mut out = md.to_string();
    for (i, note_html) in std::mem::take(&mut st.notes).into_iter().enumerate() {
        let ph = format!("\u{0}NOTE{i}\u{0}");
        let lower = note_html.to_lowercase();
        let note_type = if lower.contains("caution") || note_html.contains("注意")
            || note_html.contains("警告") || note_html.contains("危险")
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
        out = out.replacen(
            &ph,
            &format!("\n> [!{note_type}]\n> {inner}\n"),
            1,
        );
    }
    out
}

// ── 内部工具 ──

/// 判断 pos 是否处于未闭合的 td/th 内。
///
/// 注意词边界：`<th` 不得误匹配 `<thead>`（对齐 Python `<th\b` 语义）。
fn in_table_cell(text: &str, pos: usize) -> bool {
    let before = &text[..pos];
    let open = |tag: &str| count_open_tags(before, tag);
    let close = |tag: &str| before.matches(&format!("</{tag}>")).count();
    (open("td") > close("td")) || (open("th") > close("th"))
}

/// 统计 `<tag` 开标签（要求后一字符非字母数字，排除 `<thead` 等）。
fn count_open_tags(before: &str, tag: &str) -> usize {
    let pat = format!("<{tag}");
    let mut n = 0usize;
    let mut from = 0usize;
    while let Some(i) = before[from..].find(&pat) {
        let after = from + i + pat.len();
        match before[after..].chars().next() {
            Some(c) if c.is_ascii_alphanumeric() => {} // <thead 等，不算
            _ => n += 1,
        }
        from = after;
    }
    n
}

/// 平衡计数找匹配的 `</div>` 结束位置。
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
    if depth == 0 { Some(p) } else { None }
}

fn strip_tags(s: &str) -> String {
    TAGS_RE.replace_all(s, " ").into_owned()
}

fn detect_language(block: &str) -> &'static str {
    let b = block.to_lowercase();
    if b.contains(".ets") || b.contains(".ets#") {
        "ArkTS"
    } else if b.contains(".ts#") || b.contains(".d.ts") {
        "ts"
    } else if b.contains(".cpp") || b.contains(".cc#") || b.contains(".h#") {
        "cpp"
    } else if b.contains("json") {
        "json"
    } else if b.contains("xml") {
        "xml"
    } else if b.contains("bash") || b.contains("shell") {
        "bash"
    } else {
        "text"
    }
}