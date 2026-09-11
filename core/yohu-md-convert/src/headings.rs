use regex::Regex;
use std::sync::LazyLock;

static ANY_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

/// 标准 HTML 标题：`hN` → `N` 个 `#`。去掉与文档标题相同的 h1。
pub fn standard_headings(md: &str, title: &str) -> String {
    let mut out = md.to_string();
    if !title.is_empty() {
        let pat = Regex::new(&format!(
            r"(?s)<h1[^>]*>\s*{}\s*</h1>",
            regex::escape(title)
        ))
        .unwrap();
        out = pat.replace_all(&out, "").into_owned();
    }

    for tag_num in 1u8..=6 {
        let tag = format!("h{tag_num}");
        let re = Regex::new(&format!(r#"(?s)<{tag}([^>]*?)>(.*?)</{tag}>"#)).unwrap();
        out = re
            .replace_all(&out, |c: &regex::Captures| {
                let text = ANY_TAG_RE.replace_all(&c[2], "").trim().to_string();
                let prefix = "#".repeat(tag_num as usize);
                format!("\n{prefix} {text}\n")
            })
            .into_owned();
    }
    out
}
