use serde_json::Value;
use yohu_domain::GithubLoc;
use yohu_protocol::CatalogNode;

use crate::error::SourceError;
use crate::http::HttpClient;

use super::client::{api_base, github_get};
use super::resolve::ResolvedRepo;
use yohu_domain::github_contents_api_path;

/// blob / 仓库根从根目录列；tree URL 只列当前层。
pub fn listing_path(url: &str, loc: &GithubLoc) -> String {
    let path = url.split(['#', '?']).next().unwrap_or(url);
    if path.contains("/tree/") {
        loc.path.clone()
    } else {
        String::new()
    }
}

pub async fn fetch_dir_listing(
    http: &HttpClient,
    resolved: &ResolvedRepo,
    dir: &str,
) -> Result<Vec<CatalogNode>, SourceError> {
    let data = fetch_contents(http, resolved, dir).await?;
    if let Some(items) = data.as_array() {
        return Ok(parse_entries(items));
    }
    if data.get("type").and_then(|v| v.as_str()) == Some("file") {
        let parent = parent_path(dir);
        if parent != dir {
            let parent_data = fetch_contents(http, resolved, &parent).await?;
            if let Some(items) = parent_data.as_array() {
                return Ok(parse_entries(items));
            }
        }
    }
    Ok(Vec::new())
}

async fn fetch_contents(
    http: &HttpClient,
    resolved: &ResolvedRepo,
    dir: &str,
) -> Result<Value, SourceError> {
    let url = format!(
        "{}{}?ref={}",
        api_base(),
        github_contents_api_path(&resolved.loc.owner, &resolved.loc.repo, dir),
        resolved.sha
    );
    let resp = github_get(http, &url).send().await?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(Value::Array(Vec::new()));
    }
    if !resp.status().is_success() {
        return Err(SourceError::Api(format!(
            "github contents failed ({})",
            resp.status()
        )));
    }
    resp.json().await.map_err(|e| SourceError::Api(e.to_string()))
}

fn parse_entries(items: &[Value]) -> Vec<CatalogNode> {
    let mut dirs = Vec::new();
    let mut files = Vec::new();
    for item in items {
        let typ = item.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let path = item.get("path").and_then(|v| v.as_str()).unwrap_or("");
        if name.is_empty() || path.is_empty() {
            continue;
        }
        if typ == "dir" {
            dirs.push(CatalogNode {
                id: path.to_string(),
                name: name.to_string(),
                slug: None,
                is_leaf: false,
                children: Vec::new(),
            });
        } else if typ == "file" || typ == "symlink" {
            files.push(CatalogNode {
                id: path.to_string(),
                name: name.to_string(),
                slug: Some(path.to_string()),
                is_leaf: true,
                children: Vec::new(),
            });
        }
    }
    dirs.sort_by(|a, b| a.name.to_ascii_lowercase().cmp(&b.name.to_ascii_lowercase()));
    files.sort_by(|a, b| a.name.to_ascii_lowercase().cmp(&b.name.to_ascii_lowercase()));
    dirs.extend(files);
    dirs
}

fn parent_path(path: &str) -> String {
    match path.rsplit_once('/') {
        Some((dir, _)) => dir.to_string(),
        None => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blob_and_repo_urls_list_root() {
        let loc = GithubLoc {
            owner: "o".into(),
            repo: "r".into(),
            git_ref: Some("sha".into()),
            path: "src/lib.rs".into(),
        };
        assert_eq!(
            listing_path("https://github.com/o/r/blob/sha/src/lib.rs", &loc),
            ""
        );
        assert_eq!(listing_path("https://github.com/o/r", &loc), "");
    }

    #[test]
    fn tree_url_lists_that_directory() {
        let loc = GithubLoc {
            owner: "o".into(),
            repo: "r".into(),
            git_ref: Some("sha".into()),
            path: "src".into(),
        };
        assert_eq!(listing_path("https://github.com/o/r/tree/sha/src", &loc), "src");
    }
}
