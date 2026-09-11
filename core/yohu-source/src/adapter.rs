//! SourceAdapter trait 与注册表（ADR-W4 双通道路由）。

use async_trait::async_trait;
use yohu_protocol::{CatalogNode, DocRef, RawDoc};

use crate::error::SourceError;
use crate::http::HttpClient;

/// 文档源适配器：URL 匹配 + 拉取。
#[async_trait]
pub trait SourceAdapter: Send + Sync {
    fn id(&self) -> &'static str;

    /// URL → DocRef；None 表示不匹配该源。
    fn match_url(&self, url: &str) -> Option<DocRef>;

    /// 拉取文档原始数据。
    async fn fetch(&self, http: &HttpClient, r: &DocRef) -> Result<RawDoc, SourceError>;

    /// 专栏树。默认无树（通用网页）。
    async fn fetch_catalog(
        &self,
        http: &HttpClient,
        r: &DocRef,
    ) -> Result<Vec<CatalogNode>, SourceError> {
        let _ = (http, r);
        Ok(Vec::new())
    }
}

/// 适配器注册表（静态注册，按顺序匹配；generic-web 永远兜底）。
pub struct AdapterRegistry {
    adapters: Vec<Box<dyn SourceAdapter>>,
}

impl AdapterRegistry {
    /// 默认注册表：华为 / GitHub 专用适配器 + generic-web 兜底。
    pub fn with_defaults() -> Self {
        Self {
            adapters: vec![
                Box::new(crate::huawei::HuaweiAdapter),
                Box::new(crate::github::GithubAdapter),
                Box::new(crate::generic::GenericWebAdapter),
            ],
        }
    }

    /// 获取 generic-web 兜底适配器引用
    pub fn generic(&self) -> &dyn SourceAdapter {
        for a in &self.adapters {
            if a.id() == yohu_domain::GENERIC_WEB_SOURCE_ID {
                return a.as_ref();
            }
        }
        unreachable!("generic-web adapter matches all urls");
    }

    /// 路由：返回 (adapter, doc_ref)。generic-web 的 match_url 恒 Some，故必有结果。
    pub fn route(&self, url: &str) -> (&dyn SourceAdapter, DocRef) {
        for a in &self.adapters {
            if let Some(r) = a.match_url(url) {
                return (a.as_ref(), r);
            }
        }
        unreachable!("generic-web adapter matches all urls");
    }
}
