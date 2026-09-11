use yohu_domain::{classify_github_blob, github_preview_max_bytes, github_readme_api_path};

use crate::error::SourceError;
use crate::http::HttpClient;

use super::client::{api_base, github_get, raw_base};
use super::resolve::ResolvedRepo;

pub struct FetchedBlob {
    pub path: String,
    pub kind: String,
    pub title: String,
    pub markdown: Option<String>,
    pub text: Option<String>,
}

pub fn title_from_markdown(md: &str, path: &str) -> String {
    for line in md.lines() {
        let t = line.trim();
        if t.is_empty() || t.starts_with('<') {
            continue;
        }
        if let Some(rest) = t.strip_prefix("# ") {
            let title = rest.trim();
            if !title.is_empty() {
                return title.to_string();
            }
        }
    }
    path.rsplit('/').next().unwrap_or(path).to_string()
}

pub async fn resolve_blob(
    http: &HttpClient,
    resolved: &ResolvedRepo,
) -> Result<FetchedBlob, SourceError> {
    let path = resolved.loc.path.clone();
    if path.is_empty() {
        if let Some((readme_path, body)) = try_readme_api(http, resolved).await? {
            return Ok(markdown_blob(readme_path, body));
        }
        return Ok(FetchedBlob {
            path: String::new(),
            kind: "markdown".into(),
            title: resolved.loc.catalog(),
            markdown: Some(format!(
                "# {}\n\n仓库根目录没有 README。从左侧打开文件。\n",
                resolved.loc.catalog()
            )),
            text: None,
        });
    }

    let kind = classify_github_blob(&path);
    if kind == "image" {
        return Ok(FetchedBlob {
            path: path.clone(),
            kind: kind.into(),
            title: file_name(&path),
            markdown: None,
            text: None,
        });
    }

    let body = fetch_raw(http, resolved, &path).await?;
    if body.as_bytes().contains(&0) {
        return Ok(FetchedBlob {
            path,
            kind: "binary".into(),
            title: file_name(&resolved.loc.path),
            markdown: None,
            text: None,
        });
    }
    if body.len() as u64 > github_preview_max_bytes() {
        return Ok(FetchedBlob {
            path,
            kind: "tooLarge".into(),
            title: file_name(&resolved.loc.path),
            markdown: None,
            text: None,
        });
    }
    if kind == "markdown" {
        return Ok(markdown_blob(path, body));
    }
    Ok(FetchedBlob {
        path: path.clone(),
        kind: "code".into(),
        title: file_name(&path),
        markdown: None,
        text: Some(body),
    })
}

fn markdown_blob(path: String, body: String) -> FetchedBlob {
    FetchedBlob {
        title: title_from_markdown(&body, &path),
        kind: "markdown".into(),
        path,
        markdown: Some(body),
        text: None,
    }
}

fn file_name(path: &str) -> String {
    path.rsplit('/').next().unwrap_or(path).to_string()
}

async fn try_readme_api(
    http: &HttpClient,
    resolved: &ResolvedRepo,
) -> Result<Option<(String, String)>, SourceError> {
    let url = format!(
        "{}{}?ref={}",
        api_base(),
        github_readme_api_path(&resolved.loc.owner, &resolved.loc.repo),
        resolved.sha
    );
    let resp = github_get(http, &url)
        .header("Accept", "application/vnd.github.raw")
        .send()
        .await?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }
    if !resp.status().is_success() {
        return Err(SourceError::Api(format!(
            "github readme failed ({})",
            resp.status()
        )));
    }
    let body = resp.text().await.map_err(|e| SourceError::Api(e.to_string()))?;
    Ok(Some(("README.md".into(), body)))
}

async fn fetch_raw(
    http: &HttpClient,
    resolved: &ResolvedRepo,
    path: &str,
) -> Result<String, SourceError> {
    let raw = format!(
        "{}/{}/{}/{}/{}",
        raw_base(),
        resolved.loc.owner,
        resolved.loc.repo,
        resolved.sha,
        path
    );
    let resp = http.raw().get(&raw).send().await?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(SourceError::NotFound(path.to_string()));
    }
    if !resp.status().is_success() {
        return Err(SourceError::Api(format!(
            "github raw fetch failed ({})",
            resp.status()
        )));
    }
    resp.text().await.map_err(|e| SourceError::Api(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn title_uses_first_heading() {
        assert_eq!(title_from_markdown("# Hello\n\nbody", "x.md"), "Hello");
        assert_eq!(title_from_markdown("no heading", "docs/a.md"), "a.md");
        assert_eq!(
            title_from_markdown("<div align=\"center\">\n\n# OmniRoute — gateway\n", "README.md"),
            "OmniRoute — gateway"
        );
    }

    #[test]
    fn classify_keeps_code_out_of_markdown() {
        assert_eq!(classify_github_blob("src/lib.rs"), "code");
        assert_eq!(classify_github_blob("README.md"), "markdown");
        assert_eq!(classify_github_blob("docs/shot.png"), "image");
    }
}
