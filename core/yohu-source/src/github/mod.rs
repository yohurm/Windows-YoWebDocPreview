//! GitHub 仓库适配器：懒目录 + blob 分型，不抓 github.com 网页壳。

mod catalog;
mod client;
mod fetch;
mod resolve;

use async_trait::async_trait;
use yohu_domain::{github_source_id, match_github};
use yohu_protocol::{CatalogNode, DocRef, RawDoc};

use crate::adapter::SourceAdapter;
use crate::error::SourceError;
use crate::http::HttpClient;

use catalog::{fetch_dir_listing, listing_path};
use fetch::resolve_blob;
use resolve::{loc_from_ref, resolve_repo};

pub struct GithubAdapter;

#[async_trait]
impl SourceAdapter for GithubAdapter {
    fn id(&self) -> &'static str {
        github_source_id()
    }

    fn match_url(&self, url: &str) -> Option<DocRef> {
        match_github(url)
    }

    async fn fetch(&self, http: &HttpClient, r: &DocRef) -> Result<RawDoc, SourceError> {
        let loc = loc_from_ref(r)?;
        let resolved = resolve_repo(http, &loc).await?;
        let blob = resolve_blob(http, &resolved).await?;
        Ok(RawDoc {
            title: blob.title,
            update_time: None,
            html: String::new(),
            markdown: blob.markdown,
            source_path: Some(blob.path),
            source_ref: Some(resolved.sha),
            blob_kind: blob.kind,
            text: blob.text,
            device_types: Vec::new(),
        })
    }

    async fn fetch_catalog(
        &self,
        http: &HttpClient,
        r: &DocRef,
    ) -> Result<Vec<CatalogNode>, SourceError> {
        let loc = loc_from_ref(r)?;
        let resolved = resolve_repo(http, &loc).await?;
        fetch_dir_listing(http, &resolved, &listing_path(&r.url, &resolved.loc)).await
    }
}
