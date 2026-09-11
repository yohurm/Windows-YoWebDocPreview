use yohu_domain::github_api_prefix;

use crate::http::HttpClient;

pub fn api_base() -> String {
    std::env::var("YOHU_GITHUB_API_URL")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| github_api_prefix().trim_end_matches('/').to_string())
}

pub fn raw_base() -> String {
    std::env::var("YOHU_GITHUB_RAW_URL")
        .ok()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| yohu_domain::github_raw_prefix().trim_end_matches('/').to_string())
}

pub fn github_get<'a>(http: &'a HttpClient, url: &'a str) -> reqwest::RequestBuilder {
    http.raw()
        .get(url)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
}
