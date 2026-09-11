//! yohu-source — 文档源层：HTTP 客户端 / 正文提取 / 适配器。

pub mod adapter;
pub mod error;
pub mod extract;
pub mod generic;
pub mod huawei;
pub mod http;

pub use adapter::{AdapterRegistry, SourceAdapter};
pub use error::SourceError;
pub use generic::GenericWebAdapter;
pub use http::{HttpClient, HttpConfig};
pub use huawei::{fetch_catalog_tree, probe_meta, HuaweiAdapter};

use yohu_protocol::{CatalogNode, DocMeta, DocRef, FetchChannel, RawDoc};

/// 编排入口：路由到适配器拉取，产出元信息与原始数据。
/// 若专用适配器获取失败，具备透明降级至通用网页抽取 (generic-web) 的高容错弹性。
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

    let (raw, final_channel) = match adapter.fetch(http, &doc_ref).await {
        Ok(raw) => (raw, channel),
        Err(err) => {
            // 如果不是通用适配器且遇到失败，尝试透明降级为 generic-web 兜底抓取
            if adapter.id() != yohu_domain::GENERIC_WEB_SOURCE_ID {
                let fallback_ref = DocRef {
                    source_id: yohu_domain::GENERIC_WEB_SOURCE_ID.to_string(),
                    url: url.to_string(),
                    catalog: doc_ref.catalog.clone(),
                    slug: doc_ref.slug.clone(),
                };
                match registry.generic().fetch(http, &fallback_ref).await {
                    Ok(raw) => (raw, FetchChannel::GenericWeb),
                    Err(_) => return Err(err),
                }
            } else {
                return Err(err);
            }
        }
    };

    let meta = DocMeta {
        title: raw.title.clone(),
        update_time: raw.update_time.clone(),
        source_url: url.to_string(),
        channel: final_channel,
        device_types: raw.device_types.clone(),
        doc_ref: merge_ref(doc_ref, url),
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
fn merge_ref(r: DocRef, url: &str) -> DocRef {
    DocRef {
        url: url.to_string(),
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
        };
        let merged = merge_ref(r, "new");
        assert_eq!(merged.url, "new");
    }
}
