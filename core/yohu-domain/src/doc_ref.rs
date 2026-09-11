//! URL → DocRef 解析（双通道路由的领域侧纯函数）。
//!
//! 规则（ADR-W4）：URL 命中专用适配器模式则解析出 catalog/slug；
//! 未命中回退 generic-web（catalog=None，slug=域名+路径派生）。
//!
//! 华为专栏族表与 UI 镜像共用 testdata/huawei-catalogs.json。

use std::sync::OnceLock;

use serde::Deserialize;
use yohu_protocol::DocRef;

pub const GENERIC_WEB_SOURCE_ID: &str = "generic-web";

const HUAWEI_CATALOGS_JSON: &str = include_str!("../../../testdata/huawei-catalogs.json");

static HUAWEI_CATALOG_TABLE: OnceLock<HuaweiCatalogTable> = OnceLock::new();

#[derive(Debug, Deserialize)]
struct HuaweiCatalogTable {
    prefix: String,
    #[serde(rename = "sourceId")]
    source_id: String,
    brand: String,
    catalogs: Vec<HuaweiCatalog>,
    channels: Vec<HuaweiChannel>,
}

#[derive(Debug, Deserialize)]
pub struct HuaweiCatalog {
    pub id: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    /// 知识库内相对根。空 = 本机树不收录该专栏（如 NEXT V5）。
    #[serde(default, rename = "localRoot")]
    pub local_root: String,
}

#[derive(Debug, Deserialize)]
pub struct HuaweiChannel {
    pub key: String,
    pub label: String,
    pub catalogs: Vec<String>,
    #[serde(rename = "landingCatalog")]
    pub landing_catalog: String,
    #[serde(rename = "landingSlug")]
    pub landing_slug: String,
}

fn catalog_table() -> &'static HuaweiCatalogTable {
    HUAWEI_CATALOG_TABLE.get_or_init(|| {
        serde_json::from_str(HUAWEI_CATALOGS_JSON)
            .expect("testdata/huawei-catalogs.json must parse")
    })
}

pub fn huawei_doc_prefix() -> &'static str {
    catalog_table().prefix.as_str()
}

pub fn huawei_source_id() -> &'static str {
    catalog_table().source_id.as_str()
}

pub fn huawei_brand() -> &'static str {
    catalog_table().brand.as_str()
}

pub fn is_huawei_source(source_id: &str) -> bool {
    source_id == huawei_source_id()
}

pub fn huawei_doc_origin() -> &'static str {
    static ORIGIN: OnceLock<String> = OnceLock::new();
    ORIGIN.get_or_init(|| {
        let prefix = huawei_doc_prefix();
        match prefix.split_once("://") {
            Some((scheme, rest)) => {
                let host = rest.split('/').next().unwrap_or(rest);
                format!("{scheme}://{host}")
            }
            None => prefix.trim_end_matches('/').to_string(),
        }
    })
}

pub fn huawei_catalogs() -> &'static [HuaweiCatalog] {
    &catalog_table().catalogs
}

pub fn huawei_channels() -> &'static [HuaweiChannel] {
    &catalog_table().channels
}

pub fn is_huawei_catalog(id: &str) -> bool {
    huawei_catalogs().iter().any(|c| c.id == id)
}

pub fn huawei_doc_url(catalog: &str, slug: &str) -> String {
    format!("{}{catalog}/{slug}", huawei_doc_prefix())
}

pub fn huawei_channel_for_catalog(catalog: &str) -> Option<&'static HuaweiChannel> {
    huawei_channels()
        .iter()
        .find(|ch| ch.catalogs.iter().any(|id| id == catalog))
}

pub fn huawei_channel_landing_url(channel: &HuaweiChannel) -> String {
    huawei_doc_url(&channel.landing_catalog, &channel.landing_slug)
}

/// 尝试按华为文档 URL 模式解析：`.../doc/<catalog>/<slug>`。
pub fn match_huawei(url: &str) -> Option<DocRef> {
    let rest = url.strip_prefix(huawei_doc_prefix())?;
    let (catalog, slug_full) = rest.split_once('/')?;
    if !is_huawei_catalog(catalog) {
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
        source_id: huawei_source_id().into(),
        catalog: Some(catalog.into()),
        slug: slug.into(),
        url: url.to_string(),
        git_ref: None,
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
    match_huawei(url)
        .or_else(|| crate::github::match_github(url))
        .unwrap_or_else(|| DocRef {
            source_id: GENERIC_WEB_SOURCE_ID.into(),
            catalog: None,
            slug: generic_slug(url),
            url: url.to_string(),
            git_ref: None,
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
    fn github_repo_is_not_generic() {
        let r = parse_url("https://github.com/yohurm/Windows-YoWebDocPreview/blob/main/README.md");
        assert_eq!(r.source_id, "github-repo");
        assert_eq!(r.catalog.as_deref(), Some("yohurm/Windows-YoWebDocPreview"));
        assert_eq!(r.slug, "README.md");
    }

    #[test]
    fn generic_slug_handles_root_path() {
        assert_eq!(generic_slug("https://example.com/"), "example.com");
        assert_eq!(generic_slug("not a url!!"), "not-a-url");
    }

    #[test]
    fn channel_landings_parse_as_huawei_adapter() {
        for ch in huawei_channels() {
            let url = huawei_channel_landing_url(ch);
            let r = parse_url(&url);
            assert_eq!(r.source_id, "huawei-harmonyos", "{url}");
            assert_eq!(r.catalog.as_deref(), Some(ch.landing_catalog.as_str()), "{url}");
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
        for catalog in huawei_catalogs() {
            assert!(!catalog.display_name.is_empty(), "{}", catalog.id);
        }
        for ch in huawei_channels() {
            assert!(!ch.label.is_empty(), "{}", ch.key);
            for id in &ch.catalogs {
                assert!(
                    is_huawei_catalog(id),
                    "channel {} catalog {id} missing from catalogs",
                    ch.key
                );
            }
            assert!(
                ch.catalogs.iter().any(|id| id == &ch.landing_catalog),
                "landing catalog {} not in channel {}",
                ch.landing_catalog,
                ch.key
            );
        }
    }

    #[test]
    fn catalog_table_prefix_is_the_doc_host() {
        assert_eq!(
            huawei_doc_prefix(),
            "https://developer.huawei.com/consumer/cn/doc/"
        );
        assert_eq!(huawei_source_id(), "huawei-harmonyos");
        assert_eq!(huawei_brand(), "HarmonyOS");
        assert_eq!(huawei_doc_origin(), "https://developer.huawei.com");
        assert!(is_huawei_source(huawei_source_id()));
        assert!(!is_huawei_source(GENERIC_WEB_SOURCE_ID));
    }
}
