//! 通用 HTML 变换：div / 行内 / 列表 / 段落 / 标签剥离 / 实体。

use std::collections::HashMap;

use regex::Regex;
use std::sync::LazyLock;

use crate::images::{self, ImageKind};

static ANY_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

pub fn strip_divs(md: &str) -> String {
    let open = Regex::new(r"<div[^>]*>").unwrap();
    let out = open.replace_all(md, "\n");
    let close = Regex::new(r"</div>").unwrap();
    close.replace_all(&out, "\n").into_owned()
}

fn merge_adjacent_bold(md: &str) -> String {
    static JOIN: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"(?i)</(?:strong|b)>\s*<(?:strong|b)(?:\s[^>]*)?>").unwrap()
    });
    let mut out = md.to_string();
    loop {
        let next = JOIN.replace_all(&out, "").into_owned();
        if next == out {
            return out;
        }
        out = next;
    }
}

pub fn inline_formatting(md: &str) -> String {
    let md = merge_adjacent_bold(md);
    let strong = Regex::new(r"(?s)<strong[^>]*>(.*?)</strong>").unwrap();
    let md = strong.replace_all(&md, r"**${1}**").into_owned();
    let bold = Regex::new(r"(?s)<b(?:\s[^>]*)?>(.*?)</b>").unwrap();
    let md = bold.replace_all(&md, r"**${1}**").into_owned();
    let link = Regex::new(r#"(?s)<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>"#).unwrap();
    link.replace_all(&md, "[${2}](${1})").into_owned()
}

pub fn lists(md: &str) -> String {
    let mut out = md.to_string();

    let ol_re = Regex::new(r"(?s)<ol[^>]*>.*?</ol>").unwrap();
    out = ol_re
        .replace_all(&out, |seg: &regex::Captures| {
            let li_re = Regex::new(r"(?s)<li[^>]*>(.*?)</li>").unwrap();
            let mut result = String::new();
            for (i, li) in li_re.captures_iter(&seg[0]).enumerate() {
                result.push_str(&format_li(&li[1], &format!("{}.", i + 1)));
            }
            result
        })
        .into_owned();

    let li_re = Regex::new(r"(?s)<li[^>]*>(.*?)</li>").unwrap();
    out = li_re
        .replace_all(&out, |c: &regex::Captures| format_li(&c[1], "-"))
        .into_owned();

    let wrapper = Regex::new(r"</?[ou]l[^>]*>").unwrap();
    out = wrapper.replace_all(&out, "\n").into_owned();

    let indent = Regex::new(r"(?m)^[ \t]+(\d+\. | - )").unwrap();
    out = indent.replace_all(&out, "${1}").into_owned();
    let table_indent = Regex::new(r"(?m)^[ \t]+(\|)").unwrap();
    table_indent.replace_all(&out, "${1}").into_owned()
}

fn format_li(inner: &str, prefix: &str) -> String {
    let p_open = Regex::new(r"<p[^>]*>").unwrap();
    let collapsed = p_open.replace_all(inner, "");
    let p_close = Regex::new(r"</p>").unwrap();
    let collapsed = p_close.replace_all(&collapsed, "\n");
    let collapsed = Regex::new(r"\n{3,}").unwrap().replace_all(&collapsed, "\n\n");
    let collapsed = collapsed.trim().to_string();
    let lines: Vec<&str> = collapsed.split('\n').collect();
    if lines.len() > 1 {
        let mut result = format!("{prefix} {}\n", lines[0].trim());
        for l in &lines[1..] {
            if !l.trim().is_empty() {
                result.push_str(&format!("\n  {}\n", l.trim()));
            }
        }
        result
    } else {
        format!("{prefix} {collapsed}\n")
    }
}

pub fn paragraphs(md: &str) -> String {
    let p_open = Regex::new(r"<p[^>]*>").unwrap();
    let md = p_open.replace_all(md, "\n").into_owned();
    let p_close = Regex::new(r"</p>").unwrap();
    let md = p_close.replace_all(&md, "\n").into_owned();
    let br = Regex::new(r"<br\s*/?>").unwrap();
    let md = br.replace_all(&md, "\n").into_owned();
    let span = Regex::new(r"</?span[^>]*>").unwrap();
    span.replace_all(&md, "").into_owned()
}

pub fn images(
    md: &str,
    image_map: &HashMap<String, String>,
    classify: impl Fn(&str) -> ImageKind,
    emit: impl Fn(ImageKind, &str) -> String,
) -> String {
    images::images(md, image_map, classify, emit)
}

pub fn strip_remaining_tags(md: &str) -> String {
    let fence = Regex::new(r"(?s)```.*?```").unwrap();
    let mut parts: Vec<String> = Vec::new();
    let mut last = 0usize;
    let mut out = String::new();
    for m in fence.find_iter(md) {
        out.push_str(&ANY_TAG_RE.replace_all(&md[last..m.start()], ""));
        parts.push(m.as_str().to_string());
        out.push_str(&format!("\u{2}C{}\u{2}", parts.len() - 1));
        last = m.end();
    }
    out.push_str(&ANY_TAG_RE.replace_all(&md[last..], ""));
    for (i, block) in parts.iter().enumerate() {
        out = out.replace(&format!("\u{2}C{i}\u{2}"), block);
    }
    out
}

pub fn decode_entities(md: &str) -> String {
    const LT: &str = concat!("&", "lt;");
    const GT: &str = concat!("&", "gt;");
    const QUOT: &str = concat!("&", "quot;");
    const APOS: &str = concat!("&", "#39;");
    const NBSP: &str = concat!("&", "nbsp;");
    const AMP: &str = concat!("&", "amp;");
    let fence = Regex::new(r"(?s)```.*?```").unwrap();
    let mut out = String::new();
    let mut last = 0usize;
    for m in fence.find_iter(md) {
        out.push_str(&decode_plain(&md[last..m.start()]));
        out.push_str(m.as_str());
        last = m.end();
    }
    out.push_str(&decode_plain(&md[last..]));
    return out;

    fn decode_plain(s: &str) -> String {
        s.replace(LT, "<")
            .replace(GT, ">")
            .replace(QUOT, "\"")
            .replace(APOS, "'")
            .replace(NBSP, " ")
            .replace(AMP, "&")
    }
}
