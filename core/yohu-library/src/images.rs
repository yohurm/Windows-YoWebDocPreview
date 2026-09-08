//! 图片资源管理：已有 assets 对齐映射（移植 build_image_map）+ 缺失下载。

use std::collections::HashMap;
use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;

use yohu_source::HttpClient;

static IMG_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<img[^>]+>").unwrap());
static SRC_DQ_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"src="([^"]+)""#).unwrap());
static SRC_SQ_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"src='([^']+)'").unwrap());
static IMG_EXTS: [&str; 5] = ["png", "jpg", "jpeg", "gif", "svg"];

/// 收集 HTML 中全部远程图片 URL（按出现顺序）。
pub fn collect_image_urls(html: &str) -> Vec<String> {
    IMG_TAG_RE
        .find_iter(html)
        .filter_map(|tag| {
            SRC_DQ_RE
                .captures(tag.as_str())
                .or_else(|| SRC_SQ_RE.captures(tag.as_str()))
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().to_string())
                .filter(|s| s.starts_with("http"))
        })
        .collect()
}

/// 已有本地资源按出现顺序对齐映射（同脚本 build_image_map）。
pub fn build_image_map(html: &str, md_path: &Path) -> HashMap<String, String> {
    let dir = md_path.parent().unwrap_or(Path::new("."));
    let stem = md_path.file_stem().and_then(|s| s.to_str()).unwrap_or("untitled");
    let assets_dir = dir.join("assets").join(stem);

    let existing: Vec<String> = if assets_dir.exists() {
        let mut files: Vec<String> = std::fs::read_dir(&assets_dir)
            .map(|rd| {
                rd.filter_map(|e| e.ok())
                    .filter(|e| {
                        e.path()
                            .extension()
                            .and_then(|x| x.to_str())
                            .map(|x| IMG_EXTS.contains(&x.to_ascii_lowercase().as_str()))
                            .unwrap_or(false)
                    })
                    .filter_map(|e| e.file_name().into_string().ok())
                    .collect()
            })
            .unwrap_or_default();
        files.sort();
        files
            .iter()
            .map(|f| format!("assets/{stem}/{f}"))
            .collect()
    } else {
        Vec::new()
    };

    let mut map = HashMap::new();
    for (i, url) in collect_image_urls(html).into_iter().enumerate() {
        if i < existing.len() {
            map.insert(url, existing[i].clone());
        }
    }
    map
}

/// 下载未映射的远程图片到 assets 目录，补充映射。失败保留远程 URL 并记录告警。
pub async fn download_missing(
    http: &HttpClient,
    html: &str,
    map: &HashMap<String, String>,
    md_path: &Path,
    warnings: &mut Vec<String>,
) -> HashMap<String, String> {
    let mut out = map.clone();
    let dir = md_path.parent().unwrap_or(Path::new("."));
    let stem = md_path.file_stem().and_then(|s| s.to_str()).unwrap_or("untitled");
    let assets_dir = dir.join("assets").join(stem);

    for (i, url) in collect_image_urls(html).into_iter().enumerate() {
        if out.contains_key(&url) {
            continue;
        }
        let ext = url
            .split(['?', '#'])
            .next()
            .and_then(|u| u.rsplit('.').next())
            .map(|e| e.to_ascii_lowercase())
            .filter(|e| IMG_EXTS.contains(&e.as_str()))
            .unwrap_or_else(|| "png".into());
        let fname = format!("img-{i:03}.{ext}");
        let dest = assets_dir.join(&fname);

        let permit = http.acquire().await;
        let result = http.raw().get(&url).send().await;
        drop(permit);
        match result {
            Ok(resp) if resp.status().is_success() => {
                match resp.bytes().await {
                    Ok(bytes) => {
                        if std::fs::create_dir_all(&assets_dir).is_ok()
                            && std::fs::write(&dest, &bytes).is_ok()
                        {
                            out.insert(url, format!("assets/{stem}/{fname}"));
                        } else {
                            warnings.push(format!("{url}: write failed"));
                        }
                    }
                    Err(e) => warnings.push(format!("{url}: read body failed: {e}")),
                }
            }
            Ok(resp) => warnings.push(format!("{url}: HTTP {}", resp.status())),
            Err(e) => warnings.push(format!("{url}: {e}")),
        }
    }
    out
}