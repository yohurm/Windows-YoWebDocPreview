//! GitHub 仓库坐标（纯函数，零 IO）。
//!
//! 身份与主机前缀单源 testdata/github-source.json；UI 镜像同一张表。

use std::sync::OnceLock;

use serde::Deserialize;
use yohu_protocol::{BlobKind, DocRef};

const GITHUB_SOURCE_JSON: &str = include_str!("../../../testdata/github-source.json");

static GITHUB_SOURCE_TABLE: OnceLock<GithubSourceTable> = OnceLock::new();

#[derive(Debug, Deserialize)]
struct GithubSourceTable {
    #[serde(rename = "sourceId")]
    source_id: String,
    #[serde(rename = "webPrefix")]
    web_prefix: String,
    #[serde(rename = "rawPrefix")]
    raw_prefix: String,
    #[serde(rename = "apiPrefix")]
    api_prefix: String,
    #[serde(rename = "webAliases")]
    web_aliases: Vec<String>,
    #[serde(rename = "docExtensions")]
    doc_extensions: Vec<String>,
    #[serde(rename = "readmeNames")]
    readme_names: Vec<String>,
    #[serde(rename = "reservedRepoSegments")]
    reserved_repo_segments: Vec<String>,
    #[serde(rename = "imageExtensions")]
    image_extensions: Vec<String>,
    #[serde(rename = "previewMaxBytes")]
    preview_max_bytes: u64,
}

fn source_table() -> &'static GithubSourceTable {
    GITHUB_SOURCE_TABLE.get_or_init(|| {
        serde_json::from_str(GITHUB_SOURCE_JSON).expect("testdata/github-source.json must parse")
    })
}

pub fn github_source_id() -> &'static str {
    source_table().source_id.as_str()
}

pub fn is_github_source(source_id: &str) -> bool {
    source_id == github_source_id()
}

pub fn github_web_prefix() -> &'static str {
    source_table().web_prefix.as_str()
}

pub fn github_raw_prefix() -> &'static str {
    source_table().raw_prefix.as_str()
}

pub fn github_api_prefix() -> &'static str {
    source_table().api_prefix.as_str()
}

pub fn github_doc_extensions() -> &'static [String] {
    &source_table().doc_extensions
}

pub fn is_github_doc_path(path: &str) -> bool {
    let name = path.rsplit('/').next().unwrap_or(path);
    if is_github_readme_name(name) {
        return true;
    }
    let lower = path.to_ascii_lowercase();
    github_doc_extensions()
        .iter()
        .any(|ext| lower.ends_with(ext.as_str()))
}

pub fn is_github_readme_name(name: &str) -> bool {
    source_table()
        .readme_names
        .iter()
        .any(|n| n.eq_ignore_ascii_case(name))
}

pub fn github_reserved_repo_segments() -> &'static [String] {
    &source_table().reserved_repo_segments
}

pub fn github_image_extensions() -> &'static [String] {
    &source_table().image_extensions
}

pub fn github_preview_max_bytes() -> u64 {
    source_table().preview_max_bytes
}

pub fn is_github_image_path(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    github_image_extensions()
        .iter()
        .any(|ext| lower.ends_with(ext.as_str()))
}

/// 仓库 blob 分型（路径契约，零 IO）。
pub fn classify_github_blob(path: &str) -> BlobKind {
    if is_github_doc_path(path) {
        BlobKind::Markdown
    } else if is_github_image_path(path) {
        BlobKind::Image
    } else {
        BlobKind::Code
    }
}

pub fn is_github_commit_sha(value: &str) -> bool {
    value.len() == 40 && value.bytes().all(|b| b.is_ascii_hexdigit())
}

/// 把 ref 编成单一路径段（`/` → `%2F`），供 GitHub API 使用。
pub fn encode_github_ref(git_ref: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut out = String::with_capacity(git_ref.len());
    for b in git_ref.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => {
                out.push('%');
                out.push(HEX[(b >> 4) as usize] as char);
                out.push(HEX[(b & 0xf) as usize] as char);
            }
        }
    }
    out
}

/// 用仓库已知的完整 ref（默认分支）纠正「按第一段切开」的 URL 解析。
pub fn apply_known_ref(parsed: GithubLoc, known_ref: &str) -> GithubLoc {
    if known_ref.is_empty() {
        return parsed;
    }
    let rest = match &parsed.git_ref {
        None => {
            return GithubLoc {
                git_ref: Some(known_ref.to_string()),
                ..parsed
            };
        }
        Some(r) if is_github_commit_sha(r) => return parsed,
        Some(r) if parsed.path.is_empty() => r.clone(),
        Some(r) => format!("{r}/{}", parsed.path),
    };
    if rest == known_ref {
        return GithubLoc {
            git_ref: Some(known_ref.to_string()),
            path: String::new(),
            ..parsed
        };
    }
    if let Some(path) = rest.strip_prefix(&format!("{known_ref}/")) {
        return GithubLoc {
            git_ref: Some(known_ref.to_string()),
            path: path.to_string(),
            ..parsed
        };
    }
    parsed
}

fn canonicalize_github_url(url: &str) -> String {
    let stripped = strip_url(url);
    let https = stripped.replacen("http://", "https://", 1);
    for alias in &source_table().web_aliases {
        let https_alias = alias.replacen("http://", "https://", 1);
        if let Some(rest) = https.strip_prefix(alias.as_str()).or_else(|| {
            https.strip_prefix(https_alias.as_str())
        }) {
            return format!("{}{rest}", github_web_prefix());
        }
    }
    https
}

/// 仓库内一个路径的解析结果。`git_ref == None` 表示用默认分支。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubLoc {
    pub owner: String,
    pub repo: String,
    pub git_ref: Option<String>,
    pub path: String,
}

impl GithubLoc {
    pub fn catalog(&self) -> String {
        format!("{}/{}", self.owner, self.repo)
    }
}

/// `owner/repo` 专栏坐标。禁止把 git ref 按 `/` 切开；这里只拆两段。
pub fn parse_github_catalog(catalog: &str) -> Option<(String, String)> {
    let (owner, repo) = catalog.split_once('/')?;
    if owner.is_empty() || repo.is_empty() || repo.contains('/') {
        return None;
    }
    Some((owner.to_string(), repo.to_string()))
}

fn strip_url(url: &str) -> &str {
    url.split(['#', '?']).next().unwrap_or(url).trim_end_matches('/')
}

pub fn parse_github(url: &str) -> Option<GithubLoc> {
    let stripped = canonicalize_github_url(url);
    if let Some(rest) = stripped.strip_prefix(github_web_prefix()) {
        return parse_web_rest(rest);
    }
    if let Some(rest) = stripped.strip_prefix(github_raw_prefix()) {
        return parse_raw_rest(rest);
    }
    None
}

fn parse_web_rest(rest: &str) -> Option<GithubLoc> {
    let mut parts = rest.split('/');
    let owner = parts.next()?.to_string();
    let repo = parts.next()?.to_string();
    if owner.is_empty() || repo.is_empty() {
        return None;
    }
    match parts.next() {
        None => Some(GithubLoc {
            owner,
            repo,
            git_ref: None,
            path: String::new(),
        }),
        Some(kind) if kind == "blob" || kind == "raw" => {
            let git_ref = parts.next()?.to_string();
            let path = parts.collect::<Vec<_>>().join("/");
            if git_ref.is_empty() || path.is_empty() {
                return None;
            }
            Some(GithubLoc {
                owner,
                repo,
                git_ref: Some(git_ref),
                path,
            })
        }
        Some("tree") => {
            let git_ref = parts.next()?.to_string();
            if git_ref.is_empty() {
                return None;
            }
            Some(GithubLoc {
                owner,
                repo,
                git_ref: Some(git_ref),
                path: parts.collect::<Vec<_>>().join("/"),
            })
        }
        Some(other) if github_reserved_repo_segments().iter().any(|s| s == other) => None,
        Some(_) => None,
    }
}

fn parse_raw_rest(rest: &str) -> Option<GithubLoc> {
    let mut parts = rest.split('/');
    let owner = parts.next()?.to_string();
    let repo = parts.next()?.to_string();
    let git_ref = parts.next()?.to_string();
    let path = parts.collect::<Vec<_>>().join("/");
    if owner.is_empty() || repo.is_empty() || git_ref.is_empty() || path.is_empty() {
        return None;
    }
    Some(GithubLoc {
        owner,
        repo,
        git_ref: Some(git_ref),
        path,
    })
}

pub fn match_github(url: &str) -> Option<DocRef> {
    let loc = parse_github(url)?;
    Some(DocRef {
        source_id: github_source_id().into(),
        catalog: Some(loc.catalog()),
        slug: loc.path,
        url: url.to_string(),
        git_ref: loc.git_ref,
    })
}

pub fn github_blob_url(owner: &str, repo: &str, git_ref: &str, path: &str) -> String {
    format!(
        "{}{owner}/{repo}/blob/{git_ref}/{path}",
        github_web_prefix()
    )
}

pub fn github_raw_url(owner: &str, repo: &str, git_ref: &str, path: &str) -> String {
    format!("{}{owner}/{repo}/{git_ref}/{path}", github_raw_prefix())
}

pub fn github_repo_api_path(owner: &str, repo: &str) -> String {
    format!("/repos/{owner}/{repo}")
}

pub fn github_readme_api_path(owner: &str, repo: &str) -> String {
    format!("/repos/{owner}/{repo}/readme")
}

pub fn github_commits_api_path(owner: &str, repo: &str, git_ref: &str) -> String {
    format!(
        "/repos/{owner}/{repo}/commits/{}",
        encode_github_ref(git_ref)
    )
}

pub fn github_matching_refs_api_path(owner: &str, repo: &str, prefix: &str) -> String {
    format!(
        "/repos/{owner}/{repo}/git/matching-refs/heads/{}",
        encode_github_ref(prefix)
    )
}

pub fn github_contents_api_path(owner: &str, repo: &str, path: &str) -> String {
    if path.is_empty() {
        format!("/repos/{owner}/{repo}/contents")
    } else {
        format!("/repos/{owner}/{repo}/contents/{path}")
    }
}

/// 相对仓库路径：`current` 为文件 posix 路径。
pub fn resolve_repo_path(current: &str, rel: &str) -> String {
    let rel = rel.split(['#', '?']).next().unwrap_or(rel);
    if rel.is_empty() {
        return current.to_string();
    }
    let start = if rel.starts_with('/') {
        Vec::new()
    } else {
        let mut segs: Vec<&str> = current.split('/').filter(|s| !s.is_empty()).collect();
        if !segs.is_empty() {
            segs.pop();
        }
        segs
    };
    let mut segs = start;
    for part in rel.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                segs.pop();
            }
            other => segs.push(other),
        }
    }
    segs.join("/")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn table_identity_matches_testdata() {
        assert_eq!(github_source_id(), "github-repo");
        assert_eq!(github_web_prefix(), "https://github.com/");
        assert_eq!(github_raw_prefix(), "https://raw.githubusercontent.com/");
        assert!(is_github_doc_path("README.md"));
        assert!(is_github_doc_path("docs/A.MDX"));
        assert!(!is_github_doc_path("src/lib.rs"));
        assert!(is_github_source(github_source_id()));
        assert!(!is_github_source("generic-web"));
    }

    #[test]
    fn parses_repo_root_as_empty_path() {
        let loc = parse_github("https://github.com/yohurm/Windows-YoWebDocPreview").unwrap();
        assert_eq!(loc.owner, "yohurm");
        assert_eq!(loc.repo, "Windows-YoWebDocPreview");
        assert_eq!(loc.git_ref, None);
        assert_eq!(loc.path, "");
        let r = match_github("https://www.github.com/yohurm/Windows-YoWebDocPreview").unwrap();
        assert_eq!(r.source_id, "github-repo");
        assert_eq!(r.catalog.as_deref(), Some("yohurm/Windows-YoWebDocPreview"));
        assert_eq!(r.slug, "");
    }

    #[test]
    fn readme_name_without_extension_is_a_doc() {
        assert!(is_github_doc_path("README"));
        assert!(is_github_readme_name("readme.md"));
    }

    #[test]
    fn parses_blob_and_raw() {
        let blob = parse_github(
            "https://github.com/yohurm/Windows-YoWebDocPreview/blob/main/docs/architecture/adr/README.md#w15",
        )
        .unwrap();
        assert_eq!(blob.git_ref.as_deref(), Some("main"));
        assert_eq!(blob.path, "docs/architecture/adr/README.md");

        let raw = parse_github(
            "https://raw.githubusercontent.com/yohurm/Windows-YoWebDocPreview/main/README.md",
        )
        .unwrap();
        assert_eq!(raw.path, "README.md");
        assert_eq!(raw.git_ref.as_deref(), Some("main"));
    }

    #[test]
    fn parses_tree_as_directory() {
        let root = parse_github("https://github.com/o/r/tree/main").unwrap();
        assert_eq!(root.path, "");
        let nested = parse_github("https://github.com/o/r/tree/main/docs").unwrap();
        assert_eq!(nested.path, "docs");
    }

    #[test]
    fn rejects_non_doc_github_pages() {
        assert!(parse_github("https://github.com/yohurm").is_none());
        assert!(parse_github("https://github.com/yohurm/repo/issues/1").is_none());
        assert!(parse_github("https://github.com/features").is_none());
        assert!(parse_github("https://example.com/yohurm/repo").is_none());
    }

    #[test]
    fn resolve_repo_path_joins_posix() {
        assert_eq!(
            resolve_repo_path("docs/guide.md", "./install.md"),
            "docs/install.md"
        );
        assert_eq!(
            resolve_repo_path("docs/guide.md", "../README.md"),
            "README.md"
        );
        assert_eq!(resolve_repo_path("README.md", "/LICENSE.md"), "LICENSE.md");
    }

    #[test]
    fn encode_ref_keeps_slash_as_one_segment() {
        assert_eq!(encode_github_ref("release/v3.8.51"), "release%2Fv3.8.51");
        assert_eq!(encode_github_ref("main"), "main");
        assert!(is_github_commit_sha("0123456789abcdef0123456789abcdef01234567"));
        assert!(!is_github_commit_sha("release/v3.8.51"));
    }

    #[test]
    fn apply_known_ref_repairs_slashed_default_branch() {
        let parsed = parse_github(
            "https://github.com/diegosouzapw/OmniRoute/blob/release/v3.8.51/README.md",
        )
        .unwrap();
        assert_eq!(parsed.git_ref.as_deref(), Some("release"));
        assert_eq!(parsed.path, "v3.8.51/README.md");
        let fixed = apply_known_ref(parsed, "release/v3.8.51");
        assert_eq!(fixed.git_ref.as_deref(), Some("release/v3.8.51"));
        assert_eq!(fixed.path, "README.md");
    }

    #[test]
    fn parse_github_catalog_is_two_segments() {
        assert_eq!(
            parse_github_catalog("yohurm/Windows-YoWebDocPreview"),
            Some(("yohurm".into(), "Windows-YoWebDocPreview".into()))
        );
        assert!(parse_github_catalog("only-owner").is_none());
        assert!(parse_github_catalog("a/b/c").is_none());
    }

    #[test]
    fn blob_and_raw_builders_use_table_prefix() {
        assert_eq!(
            github_blob_url("o", "r", "main", "docs/a.md"),
            "https://github.com/o/r/blob/main/docs/a.md"
        );
        assert_eq!(
            github_raw_url("o", "r", "main", "docs/a.md"),
            "https://raw.githubusercontent.com/o/r/main/docs/a.md"
        );
    }
}
