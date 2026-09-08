//! 通用网页适配器：GET 页面 + 正文提取（generic-web 兜底通道）。

use async_trait::async_trait;
use yohu_protocol::{DocRef, RawDoc};

use crate::error::SourceError;
use crate::http::HttpClient;
use crate::adapter::SourceAdapter;

pub struct GenericWebAdapter;

#[async_trait]
impl SourceAdapter for GenericWebAdapter {
    fn id(&self) -> &'static str {
        "generic-web"
    }

    /// 兜底匹配所有 HTTP(S) URL。
    fn match_url(&self, url: &str) -> Option<DocRef> {
        if url.starts_with("http://") || url.starts_with("https://") {
            Some(DocRef {
                source_id: "generic-web".into(),
                catalog: None,
                slug: yohu_domain::generic_slug(url),
                url: url.to_string(),
            })
        } else {
            None
        }
    }

    async fn fetch(&self, http: &HttpClient, r: &DocRef) -> Result<RawDoc, SourceError> {
        let resp = http.raw().get(&r.url).send().await?;
        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(SourceError::NotFound(r.url.clone()));
        }
        let status = resp.status();
        let body = resp.text().await.map_err(|e| {
            SourceError::ExtractFailed(format!("read body failed (status {status}): {e}"))
        })?;
        let (title, content) = crate::extract::extract_main_content(&body)?;
        Ok(RawDoc {
            title,
            update_time: None,
            html: content,
            device_types: Vec::new(),
        })
    }
}