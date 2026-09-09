//! URL → DocRef 解析（双通道路由的领域侧纯函数）。
//!
//! 规则（ADR-W4）：URL 命中专用适配器模式则解析出 catalog/slug；
//! 未命中回退 generic-web（catalog=None，slug=域名+路径派生）。

use yohu_protocol::DocRef;

/// 华为开发者文档站 URL 前缀
pub const HUAWEI_DOC_PREFIX: &str = "https://developer.huawei.com/consumer/cn/doc/";

/// 华为文档 catalog 路径段（含 NEXT/V5、变更预告）。
pub const HUAWEI_CATALOGS: &[&str] = &[
    "design-guides",
    "harmonyos-guides-V5",
    "harmonyos-guides",
    "harmonyos-references-V5",
    "harmonyos-references",
    "harmonyos-faqs",
    "best-practices",
    "harmonyos-releases",
    "harmonyos-roadmap",
];

/// 顶栏专栏族：一组 catalog 共用一个落地文档。
pub struct HuaweiChannel {
    pub key: &'static str,
    pub catalogs: &'static [&'static str],
    pub landing_catalog: &'static str,
    pub landing_slug: &'static str,
}

pub const HUAWEI_CHANNELS: &[HuaweiChannel] = &[
    HuaweiChannel {
        key: "releases",
        catalogs: &["harmonyos-releases"],
        landing_catalog: "harmonyos-releases",
        landing_slug: "2600",
    },
    HuaweiChannel {
        key: "guides",
        catalogs: &["harmonyos-guides", "harmonyos-guides-V5"],
        landing_catalog: "harmonyos-guides",
        landing_slug: "application-dev-guide",
    },
    HuaweiChannel {
        key: "references",
        catalogs: &["harmonyos-references", "harmonyos-references-V5"],
        landing_catalog: "harmonyos-references",
        landing_slug: "development-intro-api",
    },
    HuaweiChannel {
        key: "practices",
        catalogs: &["best-practices"],
        landing_catalog: "best-practices",
        landing_slug: "bpta-best-practices-overview",
    },
    HuaweiChannel {
        key: "faqs",
        catalogs: &["harmonyos-faqs"],
        landing_catalog: "harmonyos-faqs",
        landing_slug: "faqs-ability-kit",
    },
    HuaweiChannel {
        key: "roadmap",
        catalogs: &["harmonyos-roadmap"],
        landing_catalog: "harmonyos-roadmap",
        landing_slug: "changelogs-overview-pre",
    },
];

pub fn huawei_doc_url(catalog: &str, slug: &str) -> String {
    format!("{HUAWEI_DOC_PREFIX}{catalog}/{slug}")
}

pub fn huawei_channel_for_catalog(catalog: &str) -> Option<&'static HuaweiChannel> {
    HUAWEI_CHANNELS.iter().find(|ch| ch.catalogs.contains(&catalog))
}

pub fn huawei_channel_landing_url(channel: &HuaweiChannel) -> String {
    huawei_doc_url(channel.landing_catalog, channel.landing_slug)
}

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
    fn parses_huawei_guides_v5_url() {
        let r = parse_url(
            "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/resource-categories-and-access",
        );
        assert_eq!(r.source_id, "huawei-harmonyos");
        assert_eq!(r.catalog.as_deref(), Some("harmonyos-guides-V5"));
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

    #[test]
    fn channel_landings_parse_as_huawei_adapter() {
        for ch in HUAWEI_CHANNELS {
            let url = huawei_channel_landing_url(ch);
            let r = parse_url(&url);
            assert_eq!(r.source_id, "huawei-harmonyos", "{url}");
            assert_eq!(r.catalog.as_deref(), Some(ch.landing_catalog), "{url}");
            assert_eq!(r.slug, ch.landing_slug, "{url}");
        }
    }

    #[test]
    fn roadmap_catalog_is_huawei_not_generic() {
        let r = parse_url(
            "https://developer.huawei.com/consumer/cn/doc/harmonyos-roadmap/changelogs-overview-pre",
        );
        assert_eq!(r.source_id, "huawei-harmonyos");
        assert_eq!(r.catalog.as_deref(), Some("harmonyos-roadmap"));
    }

    #[test]
    fn channel_table_catalogs_are_registered() {
        for ch in HUAWEI_CHANNELS {
            for id in ch.catalogs {
                assert!(
                    HUAWEI_CATALOGS.contains(id),
                    "channel {} catalog {id} missing from HUAWEI_CATALOGS",
                    ch.key
                );
            }
            assert!(
                ch.catalogs.contains(&ch.landing_catalog),
                "landing catalog {} not in channel {}",
                ch.landing_catalog,
                ch.key
            );
        }
    }
}