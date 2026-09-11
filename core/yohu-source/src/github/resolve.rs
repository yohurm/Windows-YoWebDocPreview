use serde_json::Value;
use yohu_domain::{
    apply_known_ref, github_commits_api_path, github_matching_refs_api_path, github_repo_api_path,
    is_github_commit_sha, parse_github, GithubLoc,
};
use yohu_protocol::DocRef;

use crate::error::SourceError;
use crate::http::HttpClient;

use super::client::{api_base, github_get};

pub struct ResolvedRepo {
    pub loc: GithubLoc,
    pub sha: String,
}

pub fn loc_from_ref(r: &DocRef) -> Result<GithubLoc, SourceError> {
    if let Some(mut loc) = parse_github(&r.url) {
        if let Some(known) = r.git_ref.as_deref().filter(|s| !s.is_empty()) {
            loc = apply_known_ref(loc, known);
        }
        return Ok(loc);
    }
    let catalog = r
        .catalog
        .as_deref()
        .ok_or_else(|| SourceError::Api("github doc requires owner/repo catalog".into()))?;
    let (owner, repo) = catalog
        .split_once('/')
        .ok_or_else(|| SourceError::Api("github catalog must be owner/repo".into()))?;
    Ok(GithubLoc {
        owner: owner.into(),
        repo: repo.into(),
        git_ref: r.git_ref.clone(),
        path: r.slug.clone(),
    })
}

pub async fn resolve_repo(http: &HttpClient, loc: &GithubLoc) -> Result<ResolvedRepo, SourceError> {
    let default_branch = fetch_default_branch(http, loc).await?;
    let loc = apply_known_ref(loc.clone(), &default_branch);
    let loc = match_slashed_ref(http, loc).await?;
    let git_ref = loc
        .git_ref
        .clone()
        .unwrap_or_else(|| default_branch.clone());
    let sha = fetch_commit_sha(http, &loc, &git_ref).await?;
    Ok(ResolvedRepo {
        loc: GithubLoc {
            git_ref: Some(git_ref),
            ..loc
        },
        sha,
    })
}

async fn fetch_default_branch(http: &HttpClient, loc: &GithubLoc) -> Result<String, SourceError> {
    let url = format!("{}{}", api_base(), github_repo_api_path(&loc.owner, &loc.repo));
    let resp = github_get(http, &url).send().await?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(SourceError::NotFound(format!("{}/{}", loc.owner, loc.repo)));
    }
    if !resp.status().is_success() {
        return Err(SourceError::Api(format!(
            "github repo lookup failed ({})",
            resp.status()
        )));
    }
    let data: Value = resp.json().await.map_err(|e| SourceError::Api(e.to_string()))?;
    data.get("default_branch")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .ok_or_else(|| SourceError::Api("github repo missing default_branch".into()))
}

async fn fetch_commit_sha(
    http: &HttpClient,
    loc: &GithubLoc,
    git_ref: &str,
) -> Result<String, SourceError> {
    if is_github_commit_sha(git_ref) {
        return Ok(git_ref.to_string());
    }
    let url = format!(
        "{}{}",
        api_base(),
        github_commits_api_path(&loc.owner, &loc.repo, git_ref)
    );
    let resp = github_get(http, &url).send().await?;
    if !resp.status().is_success() {
        return Err(SourceError::Api(format!(
            "github commit lookup failed ({})",
            resp.status()
        )));
    }
    let data: Value = resp.json().await.map_err(|e| SourceError::Api(e.to_string()))?;
    data.get("sha")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .ok_or_else(|| SourceError::Api("github commit missing sha".into()))
}

async fn match_slashed_ref(http: &HttpClient, loc: GithubLoc) -> Result<GithubLoc, SourceError> {
    let Some(prefix) = loc.git_ref.clone() else {
        return Ok(loc);
    };
    if is_github_commit_sha(&prefix) || !loc.path.contains('/') {
        return Ok(loc);
    }
    let url = format!(
        "{}{}",
        api_base(),
        github_matching_refs_api_path(&loc.owner, &loc.repo, &prefix)
    );
    let resp = github_get(http, &url).send().await?;
    if !resp.status().is_success() {
        return Ok(loc);
    }
    let data: Value = resp.json().await.map_err(|e| SourceError::Api(e.to_string()))?;
    let rest = format!("{prefix}/{}", loc.path);
    let mut best: Option<String> = None;
    if let Some(items) = data.as_array() {
        for item in items {
            let name = item
                .get("ref")
                .and_then(|v| v.as_str())
                .and_then(|r| r.strip_prefix("refs/heads/"))
                .unwrap_or("");
            if name.is_empty() {
                continue;
            }
            if rest == name || rest.starts_with(&format!("{name}/")) {
                if best.as_ref().is_none_or(|cur| name.len() > cur.len()) {
                    best = Some(name.to_string());
                }
            }
        }
    }
    Ok(best.map(|known| apply_known_ref(loc.clone(), &known)).unwrap_or(loc))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loc_from_empty_slug_stays_empty() {
        let loc = loc_from_ref(&DocRef {
            source_id: yohu_domain::github_source_id().into(),
            catalog: Some("o/r".into()),
            slug: String::new(),
            url: "https://example.com/not-github".into(),
            git_ref: None,
        })
        .unwrap();
        assert_eq!(loc.path, "");
    }
}
