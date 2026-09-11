use regex::Regex;
use std::sync::LazyLock;

static HL_HEADER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?s)<div[^>]*highlight-div-header[^>]*>.*?</div>"#).unwrap());

pub fn detect_language(block: &str) -> &'static str {
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

pub fn scrub_code(inner: &str) -> String {
    HL_HEADER_RE.replace_all(inner, "").into_owned()
}
