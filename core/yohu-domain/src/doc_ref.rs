//! URL → DocRef 解析（双通道路由的领域侧纯函数）。
//!
//! 规则（ADR-W4）：URL 命中专用适配器模式则解析出 catalog/slug；
//! 未命中回退 generic-web（catalog=None，slug=域名+路径派生）。

use yohu_protocol::DocRef;

/// 华为开发者文档站 URL 前缀
pub const HUAWEI_DOC_PREFIX: &str = "https://developer.huawei.com/consumer/cn/doc/";

/// 华为六 catalog（最长匹配优先纪律：design-guides 先于 guides 类）
pub const HUAWEI_CATALOGS: &[&str] = &[
    "design-guides",
    "harmonyos-guides",
    "harmonyos-references",
    "harmonyos-faqs",
    "best-practices",
    "harmonyos-releases",
];

/// 尝试按华为文档 URL 模式解析：`.../doc/<catalog>/<slug>`。
pub fn match_huawei(url: &str) -> Option<DocRef> {
    let rest = url.strip_prefix(HUAWEI_DOC_PREFIX)?;
    let (catalog, slug_full) = rest.split_once('/')?;
    if !HUAWEI_CATALOGS.contains(&catalog) {
        return None;
    }
    // 去掉锚点/查询/尾部斜杠/.md 后缀
    let slug = slug_full
        .split(['#', '?'])
        .next()?
        .trim_end_matches('/')
        .trim_end_matches(".md");
    if slug.is_empty() {
        return None;
    }
    Some(DocRef {
        source_id: "huawei-harmonyos".into(),
        catalog: Some(catalog.into()),
        slug: slug.into(),
        url: url.to_string(),
    })
}

/// generic-web 合成 slug：域名 + 路径段以 `-` 连接，去锚点/查询，非法字符折叠为 `-`。
pub fn generic_slug(url: &str) -> String {
    let stripped = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);
    let stripped = stripped.split(['#', '?']).next().unwrap_or(stripped);
    let stripped = stripped.trim_end_matches('/');
    let mut out = String::new();
    let mut last_dash = false;
    for ch in stripped.chars() {
        if ch.is_ascii_alphanumeric() || ch == '.' || ch == '_' {
            out.push(ch);
            last_dash = false;
        } else if !last_dash && !out.is_empty() {
            out.push('-');
            last_dash = true;
        }
    }
    out.trim_end_matches('-').to_string()
}

/// 双通道路由入口：专用适配器优先，generic-web 兜底。
pub fn parse_url(url: &str) -> DocRef {
    match_huawei(url).unwrap_or_else(|| DocRef {
        source_id: "generic-web".into(),
        catalog: None,
        slug: generic_slug(url),
        url: url.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_huawei_guides_url() {
        let r = parse_url(
            "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access",
        );
        assert_eq!(r.source_id, "huawei-harmonyos");
        assert_eq!(r.catalog.as_deref(), Some("harmonyos-guides"));
        assert_eq!(r.slug, "resource-categories-and-access");
    }

    #[test]
    fn huawei_slug_strips_anchor_query_and_md() {
        let r = match_huawei(
            "https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-app-ability-uiability.md#section1",
        );
        assert_eq!(r.unwrap().slug, "js-apis-app-ability-uiability");

        let r = match_huawei("https://developer.huawei.com/consumer/cn/doc/best-practices/bp-to-ui/");
        assert_eq!(r.unwrap().slug, "bp-to-ui");
    }

    #[test]
    fn unknown_catalog_falls_back_to_generic() {
        let r = parse_url("https://developer.huawei.com/consumer/cn/doc/unknown-cat/foo");
        assert_eq!(r.source_id, "generic-web");
        assert!(r.catalog.is_none());
    }

    #[test]
    fn generic_web_synthesizes_slug() {
        let r = parse_url("https://blog.example.com/rust/async-basics?q=1#top");
        assert_eq!(r.source_id, "generic-web");
        assert_eq!(r.slug, "blog.example.com-rust-async-basics");
    }

    #[test]
    fn generic_slug_handles_root_path() {
        assert_eq!(generic_slug("https://example.com/"), "example.com");
        assert_eq!(generic_slug("not a url!!"), "not-a-url");
    }
}