//! 扫描知识库多份 manifest（file 相对 manifest 目录），补专栏与本地更新时间。

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use yohu_domain::{catalog_from_rel, extract_update_time};
use yohu_protocol::LibraryEntry;

#[derive(Debug, Deserialize)]
struct RawItem {
    slug: String,
    file: String,
    #[serde(default)]
    url: String,
    #[serde(default)]
    name: String,
    #[serde(default)]
    title: String,
}

#[derive(Debug, Clone)]
pub struct ScannedDoc {
    pub entry: LibraryEntry,
    pub title: String,
    pub manifest_rel: String,
}

pub fn scan_library(root: &Path, scope: &[String]) -> (Vec<ScannedDoc>, HashSet<String>) {
    let mut docs = Vec::new();
    let mut dirs = HashSet::new();
    collect_dirs(root, root, &mut dirs);

    for scope_name in scope {
        let scope_root = root.join(scope_name);
        if !scope_root.is_dir() {
            continue;
        }
        let walker = walkdir_manifests(&scope_root);
        for mf in walker {
            let Ok(rel_mf) = mf.strip_prefix(root) else {
                continue;
            };
            let manifest_rel = rel_mf.to_string_lossy().replace('\\', "/");
            let Some(catalog) = catalog_from_rel(&manifest_rel) else {
                continue;
            };
            let Ok(text) = std::fs::read_to_string(&mf) else {
                continue;
            };
            let Ok(items) = serde_json::from_str::<Vec<RawItem>>(&text) else {
                continue;
            };
            let manifest_dir = mf.parent().unwrap_or(&mf);
            for item in items {
                if item.slug.is_empty() || item.file.is_empty() {
                    continue;
                }
                let abs = (manifest_dir.join(&item.file)).to_path_buf();
                let file = match abs.strip_prefix(root) {
                    Ok(p) => p.to_string_lossy().replace('\\', "/"),
                    Err(_) => continue,
                };
                let url = if item.url.is_empty() {
                    yohu_domain::huawei_doc_url(catalog, &item.slug)
                } else {
                    item.url
                };
                let local_time = std::fs::read_to_string(&abs)
                    .ok()
                    .and_then(|md| extract_update_time(&md));
                let title = if !item.title.is_empty() {
                    item.title
                } else {
                    item.name
                };
                docs.push(ScannedDoc {
                    entry: LibraryEntry {
                        file,
                        url,
                        slug: item.slug,
                        catalog: catalog.to_string(),
                        local_time,
                        official_time: None,
                        status: None,
                    },
                    title,
                    manifest_rel: manifest_rel.clone(),
                });
            }
        }
    }
    (docs, dirs)
}

fn collect_dirs(root: &Path, dir: &Path, out: &mut HashSet<String>) {
    let Ok(rd) = std::fs::read_dir(dir) else {
        return;
    };
    for ent in rd.flatten() {
        let p = ent.path();
        if !p.is_dir() {
            continue;
        }
        if let Ok(rel) = p.strip_prefix(root) {
            out.insert(rel.to_string_lossy().replace('\\', "/"));
        }
        collect_dirs(root, &p, out);
    }
}

fn walkdir_manifests(dir: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    walk_manifests(dir, &mut out);
    out.sort();
    out
}

fn walk_manifests(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(rd) = std::fs::read_dir(dir) else {
        return;
    };
    for ent in rd.flatten() {
        let p = ent.path();
        if p.is_dir() {
            walk_manifests(&p, out);
        } else if p.file_name().and_then(|n| n.to_str()) == Some("manifest.json") {
            out.push(p);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_is_relative_to_manifest_dir() {
        let dir = tempfile::tempdir().unwrap();
        let mf_dir = dir.path().join("开发/指南/入门");
        std::fs::create_dir_all(mf_dir.join("快速入门")).unwrap();
        std::fs::write(
            mf_dir.join("manifest.json"),
            r#"[{"slug":"start-overview","name":"开发准备","file":"快速入门/开发准备.md","url":"https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/start-overview"}]"#,
        )
        .unwrap();
        std::fs::write(
            mf_dir.join("快速入门/开发准备.md"),
            "# 开发准备\n\n更新时间：2026-04-01 00:00:00\n\n来源：x\n",
        )
        .unwrap();

        let (docs, _) = scan_library(dir.path(), &["开发".into()]);
        assert_eq!(docs.len(), 1);
        assert_eq!(docs[0].entry.catalog, "harmonyos-guides");
        assert_eq!(docs[0].entry.file, "开发/指南/入门/快速入门/开发准备.md");
        assert_eq!(docs[0].entry.local_time.as_deref(), Some("2026-04-01 00:00:00"));
    }
}
