//! 通用正文提取（Readability 式启发算法的轻量实现）。
//!
//! ADR-W1：接口收敛于此；当前为自研简化评分器（零额外依赖），
//! 若质量不足可切换 readability crate 而不影响上层。

use regex::Regex;
use std::sync::LazyLock;

use crate::error::SourceError;

static TITLE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<title[^>]*>(.*?)</title>").unwrap());
static H1_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<h1[^>]*>(.*?)</h1>").unwrap());
static ARTICLE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<article\b[^>]*>(.*?)</article>").unwrap());
static MAIN_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<main\b[^>]*>(.*?)</main>").unwrap());
static BLOCK_OPEN_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<(div|section)\b[^>]*>").unwrap());
static ANY_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());
static LINK_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<a\b[^>]*>(.*?)</a>").unwrap());
static NOISE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?is)<script\b.*?</script>|<style\b.*?</style>|<nav\b.*?</nav>|<footer\b.*?</footer>|<aside\b.*?</aside>|<iframe\b.*?</iframe>|<form\b.*?</form>|<!--.*?-->",
    )
    .unwrap()
});

/// 提取主内容：返回 (标题, 净化后的正文 HTML)。
pub fn extract_main_content(html: &str) -> Result<(String, String), SourceError> {
    let title = extract_title(html);

    // 候选容器评分：<article>/<main> 直接优先；否则按文本密度选 <div>/<section>
    for re in [&*ARTICLE_RE, &*MAIN_RE] {
        if let Some(c) = re.captures(html) {
            let inner = c[1].to_string();
            if text_len(&inner) >= MIN_CONTENT_LEN {
                return Ok((title, sanitize(&inner)));
            }
        }
    }

    // div/section 密度评分
    let best = best_dense_block(html)
        .ok_or_else(|| SourceError::ExtractFailed("no main content block found".into()))?;
    if text_len(&best) < MIN_CONTENT_LEN {
        return Err(SourceError::ExtractFailed(
            "extracted content too short (page may require JS rendering)".into(),
        ));
    }
    Ok((title, sanitize(&best)))
}

const MIN_CONTENT_LEN: usize = 80;

fn extract_title(html: &str) -> String {
    if let Some(c) = TITLE_RE.captures(html) {
        let t = strip_tags(&c[1]).trim().to_string();
        if !t.is_empty() {
            return t;
        }
    }
    H1_RE
        .captures(html)
        .map(|c| strip_tags(&c[1]).trim().to_string())
        .unwrap_or_default()
}

/// 找文本密度最高的顶层块。
fn best_dense_block(html: &str) -> Option<String> {
    let mut best: Option<(usize, String)> = None;
    let mut pos = 0usize;
    while let Some(m) = BLOCK_OPEN_RE.find_at(html, pos) {
        let Some(end) = find_block_end(html, m.end()) else { break };
        let inner = &html[m.end()..end];
        let score = text_len(inner) - link_density_penalty(inner);
        if best.as_ref().map(|(s, _)| score > *s).unwrap_or(true) {
            best = Some((score, inner.to_string()));
        }
        pos = end;
    }
    best.map(|(_, s)| s)
}

/// 找与开标签平衡的闭合位置。
fn find_block_end(html: &str, open_end: usize) -> Option<usize> {
    let rest = &html[open_end..];
    let mut depth = 1i32;
    let mut p = 0usize;
    while depth > 0 {
        let next_open = rest[p..].find("<div").or_else(|| rest[p..].find("<section"));
        let next_close = rest[p..].find("</div>").or_else(|| rest[p..].find("</section>"));
        match (next_open, next_close) {
            (Some(no), Some(nc)) if no < nc => {
                depth += 1;
                p += no + 4;
            }
            (_, Some(nc)) => {
                depth -= 1;
                p += nc + 6;
                if depth == 0 {
                    return Some(open_end + nc + 6);
                }
            }
            _ => return None,
        }
    }
    None
}

/// 可见文本长度（剥标签后）。
fn text_len(s: &str) -> usize {
    ANY_TAG_RE.replace_all(s, "").trim().len()
}

/// 链接密度惩罚（导航区特征）。
fn link_density_penalty(s: &str) -> usize {
    LINK_RE.find_iter(s).map(|m| m.as_str().len()).sum::<usize>() / 2
}

/// 净化：剥离 script/style/nav/footer/aside/iframe/form 与 HTML 注释。
fn sanitize(html: &str) -> String {
    NOISE_RE.replace_all(html, "").into_owned()
}

fn strip_tags(s: &str) -> String {
    ANY_TAG_RE.replace_all(s, "").into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefers_article_over_dense_div() {
        let html = r#"<html><head><title>T</title></head><body>
            <div><p>侧栏文字不够长。</p></div>
            <article><p>正文段落一，包含足够多的文字以通过最小长度阈值检查逻辑。</p></article>
        </body></html>"#;
        let (title, content) = extract_main_content(html).unwrap();
        assert_eq!(title, "T");
        assert!(content.contains("正文段落一"));
        assert!(!content.contains("侧栏"));
    }

    #[test]
    fn short_content_is_extract_failed() {
        let html = r#"<html><head><title>T</title></head><body><p>短</p></body></html>"#;
        assert!(extract_main_content(html).is_err());
    }
}
