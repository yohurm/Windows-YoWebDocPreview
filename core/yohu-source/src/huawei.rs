//! 华为 HarmonyOS 开发者文档适配器。
//!
//! 统一契约：
//! - POST `documentPortal/getDocumentById` 拉取文档正文
//! - POST `documentPortal/getCatalogTree` 拉取章节目录树（多网页联动）
//! - 正文提取、属性解析

use async_trait::async_trait;
use serde_json::json;
use yohu_protocol::{CatalogNode, DocRef, RawDoc};

use yohu_domain::{huawei_doc_prefix, huawei_doc_url};

use crate::adapter::SourceAdapter;
use crate::error::SourceError;
use crate::http::HttpClient;

const DEFAULT_SVC_HOST: &str = "https://svc-drcn.developer.huawei.com";
const DOC_ENDPOINT: &str = "/community/servlet/consumer/cn/documentPortal/getDocumentById";
const CATALOG_ENDPOINT: &str = "/community/servlet/consumer/cn/documentPortal/getCatalogTree";

fn get_doc_url() -> String {
    if let Ok(endpoint) = std::env::var("YOHU_DOC_API_URL") {
        if !endpoint.trim().is_empty() {
            return endpoint;
        }
    }
    format!("{DEFAULT_SVC_HOST}{DOC_ENDPOINT}")
}

fn post_document<'a>(
    http: &'a HttpClient,
    slug: &'a str,
    catalog: &'a str,
) -> reqwest::RequestBuilder {
    let url = get_doc_url();
    let body = json!({
        "objectId": slug,
        "catalogName": catalog,
        "language": "cn",
    });
    http.raw()
        .post(&url)
        .header("Content-Type", "application/json; charset=UTF-8")
        .header("Origin", yohu_domain::huawei_doc_origin())
        .header("Referer", huawei_doc_url(catalog, slug))
        .json(&body)
}

fn post_catalog_tree<'a>(
    http: &'a HttpClient,
    catalog: &'a str,
) -> reqwest::RequestBuilder {
    let url = format!("{DEFAULT_SVC_HOST}{CATALOG_ENDPOINT}");
    let body = json!({
        "catalogName": catalog,
        "language": "cn",
    });
    http.raw()
        .post(&url)
        .header("Content-Type", "application/json; charset=UTF-8")
        .header("Origin", yohu_domain::huawei_doc_origin())
        .header("Referer", format!("{}{catalog}/", huawei_doc_prefix()))
        .json(&body)
}

fn parse_tree_node(item: &serde_json::Value) -> Option<CatalogNode> {
    let name = item["nodeName"].as_str().unwrap_or("").trim().to_string();
    if name.is_empty() {
        return None;
    }
    let id = item["nodeId"]
        .as_str()
        .unwrap_or_else(|| item["catalogIndex"].as_str().unwrap_or(""))
        .to_string();
    let slug = item["relateDocument"].as_str().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let is_leaf = item["isLeaf"].as_bool().unwrap_or(slug.is_some());

    let mut children = Vec::new();
    if let Some(arr) = item["children"].as_array() {
        for child in arr {
            if let Some(c) = parse_tree_node(child) {
                children.push(c);
            }
        }
    }

    Some(CatalogNode {
        id: if id.is_empty() { name.clone() } else { id },
        name,
        slug,
        is_leaf,
        children,
    })
}

/// 拉取华为文档目录树
pub(crate) async fn fetch_catalog_tree(
    http: &HttpClient,
    catalog: &str,
) -> Result<Vec<CatalogNode>, SourceError> {
    let resp = post_catalog_tree(http, catalog).send().await?;
    let status = resp.status();
    if !status.is_success() {
        return Err(SourceError::Api(format!("failed to fetch catalog tree (status {status})")));
    }
    let data: serde_json::Value = resp.json().await.map_err(|e| {
        SourceError::Api(format!("invalid json response for catalog tree: {e}"))
    })?;

    let list = data
        .get("value")
        .and_then(|v| v.get("catalogTreeList"))
        .or_else(|| data.get("value"))
        .and_then(|v| v.as_array());

    let mut result = Vec::new();
    if let Some(nodes) = list {
        for node in nodes {
            if let Some(item) = parse_tree_node(node) {
                result.push(item);
            }
        }
    }

    Ok(result)
}

fn parse_document_payload(data: &serde_json::Value) -> Option<(String, Option<String>)> {
    let val = data.get("value").or_else(|| data.get("data"))?;
    if val.is_null() {
        return None;
    }
    let title = val["title"].as_str().unwrap_or("").to_string();
    let update_time = val["displayUpdateTime"].as_str().map(str::to_string);
    Some((title, update_time))
}

pub struct HuaweiAdapter;

#[async_trait]
impl SourceAdapter for HuaweiAdapter {
    fn id(&self) -> &'static str {
        yohu_domain::huawei_source_id()
    }

    fn match_url(&self, url: &str) -> Option<DocRef> {
        yohu_domain::match_huawei(url)
    }

    async fn fetch(&self, http: &HttpClient, r: &DocRef) -> Result<RawDoc, SourceError> {
        let catalog = r
            .catalog
            .as_deref()
            .ok_or_else(|| SourceError::Api("huawei doc requires catalog".into()))?;

        let resp = post_document(http, &r.slug, catalog).send().await?;

        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(SourceError::NotFound(r.url.clone()));
        }
        let status = resp.status();
        let data: serde_json::Value = resp.json().await.map_err(|e| {
            SourceError::Api(format!("invalid json response (status {status}): {e}"))
        })?;

        let Some((title, update_time)) = parse_document_payload(&data) else {
            return Err(SourceError::NotFound(r.url.clone()));
        };
        let html = data
            .get("value")
            .or_else(|| data.get("data"))
            .and_then(|v| v["content"]["content"].as_str())
            .unwrap_or("")
            .to_string();

        if title.is_empty() || title == "404" || html.is_empty() {
            return Err(SourceError::NotFound(r.url.clone()));
        }

        Ok(RawDoc {
            title,
            update_time,
            html,
            markdown: None,
            source_path: None,
            source_ref: None,
            blob_kind: None,
            text: None,
            device_types: Vec::new(),
        })
    }

    async fn fetch_catalog(
        &self,
        http: &HttpClient,
        r: &DocRef,
    ) -> Result<Vec<CatalogNode>, SourceError> {
        match r.catalog.as_deref() {
            Some(catalog) => fetch_catalog_tree(http, catalog).await,
            None => Ok(Vec::new()),
        }
    }
}

/// 轻量探测：只取 title / displayUpdateTime（更新检查用，不拉正文）。
pub async fn probe_meta(
    http: &HttpClient,
    slug: &str,
    catalog: &str,
) -> Result<(String, Option<String>), SourceError> {
    let resp = post_document(http, slug, catalog).send().await?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(SourceError::NotFound(slug.to_string()));
    }
    let status = resp.status();
    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| SourceError::Api(format!("invalid json response (status {status}): {e}")))?;
    match parse_document_payload(&data) {
        Some((title, time)) if !title.is_empty() && title != "404" => Ok((title, time)),
        _ => Err(SourceError::NotFound(slug.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_tree_node_extracts_correctly() {
        let node_raw = json!({
            "nodeId": "n1",
            "nodeName": "快速入门",
            "isLeaf": false,
            "children": [
                {
                    "nodeId": "n2",
                    "nodeName": "构建第一个应用",
                    "relateDocument": "start-with-ets-stage",
                    "isLeaf": true,
                    "children": []
                }
            ]
        });
        let parsed = parse_tree_node(&node_raw).expect("parsed node");
        assert_eq!(parsed.name, "快速入门");
        assert_eq!(parsed.children.len(), 1);
        assert_eq!(parsed.children[0].name, "构建第一个应用");
        assert_eq!(parsed.children[0].slug.as_deref(), Some("start-with-ets-stage"));
    }
}
