//! 华为 API HTML 标题：`[hN]` 标记 + device-type。testdata/huawei-headings.json 单源。

use regex::Regex;
use std::sync::LazyLock;

use crate::devices;

static H_MARKER_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)\[h[234]\]\s*").unwrap());
static H_MARKER_NUM_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)\[h([2-4])\]").unwrap());
static DEVICE_ATTR_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"device-type="([^"]+)""#).unwrap());

/// Unmarked `h4` is a section (`h2`); `[h2]` / `[h3]` / `[h4]` are one level deeper than the marker.
pub fn heading_level(tag: u8, marker: Option<u8>) -> u8 {
    if tag <= 1 {
        return 1;
    }
    match marker {
        Some(2) => 3,
        Some(n) => n.saturating_add(1).min(4),
        None if tag == 4 => 2,
        None => tag.min(4),
    }
}

fn heading_marker(text: &str) -> Option<u8> {
    H_MARKER_NUM_RE
        .captures(text)
        .and_then(|c| c.get(1)?.as_str().parse().ok())
}

pub fn headings(md: &str, title: &str) -> String {
    let mut out = md.to_string();

    if !title.is_empty() {
        let pat = Regex::new(&format!(
            r"(?s)<h1[^>]*>\s*{}\s*</h1>",
            regex::escape(title)
        ))
        .unwrap();
        out = pat.replace_all(&out, "").into_owned();
    }

    for tag_num in 1u8..=4 {
        let tag = format!("h{tag_num}");
        let re = Regex::new(&format!(r#"(?s)<{tag}([^>]*?)>(.*?)</{tag}>"#)).unwrap();
        out = re
            .replace_all(&out, |c: &regex::Captures| {
                let attrs = &c[1];
                let raw = &c[2];
                let marker = heading_marker(raw);
                let text = H_MARKER_RE.replace_all(raw, "").trim().to_string();
                let prefix = "#".repeat(heading_level(tag_num, marker) as usize);
                let device_line = DEVICE_ATTR_RE
                    .captures(attrs)
                    .map(|m| devices::map_devices(&m[1]))
                    .map(|mapped| format!("\n\n**支持设备：** {mapped}\n"))
                    .unwrap_or_default();
                format!("\n{prefix} {text}\n{device_line}")
            })
            .into_owned();
    }
    out
}
