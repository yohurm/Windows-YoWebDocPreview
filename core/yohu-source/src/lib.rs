//! yohu-source — 文档源层：HTTP 客户端 / 正文提取 / 适配器。

pub mod adapter;
pub mod error;
pub mod extract;
pub mod generic;
pub mod github;
pub mod huawei;
pub mod http;

pub use adapter::{AdapterRegistry, SourceAdapter};
pub use error::SourceError;
pub use generic::GenericWebAdapter;
pub use github::GithubAdapter;
pub use http::{HttpClient, HttpConfig};
pub use huawei::{probe_meta, HuaweiAdapter};

use yohu_protocol::{CatalogNode, DocMeta, DocRef, FetchChannel, RawDoc};

/// 编排入口：路由到适配器拉取，产出元信息与原始数据。
/// 路由兜底是 generic-web；专用适配器失败原样返回，不再二次抓网页。
pub async fn fetch_any(
    registry: &AdapterRegistry,
    http: &HttpClient,
    url: &str,
) -> Result<(DocMeta, RawDoc), SourceError> {
    let (adapter, doc_ref) = registry.route(url);
    let channel = if adapter.id() == yohu_domain::GENERIC_WEB_SOURCE_ID {
        FetchChannel::GenericWeb
    } else {
        FetchChannel::Adapter
    };
    let raw = adapter.fetch(http, &doc_ref).await?;

    let meta = DocMeta {
        title: raw.title.clone(),
        update_time: raw.update_time.clone(),
        source_url: url.to_string(),
        channel,
        device_types: raw.device_types.clone(),
        blob_kind: raw.blob_kind,
        doc_ref: merge_ref(doc_ref, url, &raw),
    };
    Ok((meta, raw))
}

/// 按适配器取专栏树；通用网页得到空列表。
pub async fn fetch_catalog(
    registry: &AdapterRegistry,
    http: &HttpClient,
    url: &str,
) -> Result<Vec<CatalogNode>, SourceError> {
    let (adapter, doc_ref) = registry.route(url);
    adapter.fetch_catalog(http, &doc_ref).await
}

/// DocRef 的 url 字段以用户输入为准（去锚点前的原始输入保留）。
fn merge_ref(r: DocRef, url: &str, raw: &RawDoc) -> DocRef {
    DocRef {
        url: url.to_string(),
        slug: raw
            .source_path
            .as_deref()
            .filter(|s| !s.is_empty())
            .unwrap_or(r.slug.as_str())
            .to_string(),
        git_ref: raw
            .source_ref
            .clone()
            .filter(|s| !s.is_empty())
            .or(r.git_ref),
        ..r
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn merge_ref_keeps_input_url() {
        let r = DocRef {
            source_id: "x".into(),
            catalog: None,
            slug: "s".into(),
            url: "old".into(),
            git_ref: None,
        };
        let merged = merge_ref(r, "new", &RawDoc::default());
        assert_eq!(merged.url, "new");
        assert_eq!(merged.slug, "s");
    }

    #[test]
    fn merge_ref_prefers_adapter_source_path() {
        let r = DocRef {
            source_id: "github-repo".into(),
            catalog: Some("o/r".into()),
            slug: String::new(),
            url: "old".into(),
            git_ref: None,
        };
        let raw = RawDoc {
            source_path: Some("docs/guide.md".into()),
            ..RawDoc::default()
        };
        let merged = merge_ref(r, "https://github.com/o/r", &raw);
        assert_eq!(merged.slug, "docs/guide.md");
    }
}
