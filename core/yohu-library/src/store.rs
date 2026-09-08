//! 文档库存储：manifest 加载/保存/upsert、单篇导出编排。

use std::path::{Path, PathBuf};

use yohu_domain::{parse_manifest, safe_stem, to_manifest_json, validate_entry};
use yohu_protocol::LibraryEntry;

use yohu_runtime::{atomic_write, backup_corrupt};

use crate::error::LibraryError;

/// manifest 固定文件名
pub const MANIFEST_FILE: &str = "manifest.json";

/// 文档库
pub struct LibraryStore {
    root: PathBuf,
}

impl LibraryStore {
    /// 打开（不创建）库；root 为库根目录。
    pub fn open(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    fn manifest_path(&self) -> PathBuf {
        self.root.join(MANIFEST_FILE)
    }

    /// 加载 manifest：损坏则备份后返回空。
    pub fn load_manifest(&self) -> Vec<LibraryEntry> {
        let p = self.manifest_path();
        let Ok(json) = std::fs::read_to_string(&p) else {
            return Vec::new();
        };
        let (entries, skipped) = parse_manifest(&json);
        if skipped == usize::MAX {
            backup_corrupt(&p);
            return Vec::new();
        }
        entries
    }

    /// 保存 manifest（原子写）。
    pub fn save_manifest(&self, entries: &[LibraryEntry]) -> std::io::Result<()> {
        atomic_write(&self.manifest_path(), &to_manifest_json(entries))
    }

    /// 按 URL upsert 条目并持久化。
    pub fn upsert_entry(&self, entry: LibraryEntry) -> Result<(), LibraryError> {
        validate_entry(&entry).map_err(LibraryError::invalid)?;
        let mut all = self.load_manifest();
        if let Some(existing) = all.iter_mut().find(|e| e.url == entry.url) {
            *existing = entry;
        } else {
            all.push(entry);
        }
        Ok(self.save_manifest(&all)?)
    }

    /// 导出单篇：拉取 → 图片映射 → 转换 → 写盘 → manifest upsert。
    ///
    /// `rel_dir` 为库内相对目录（如 "开发/指南"），空则直接放根下。
    #[allow(clippy::too_many_arguments)]
    pub async fn export_one(
        &self,
        registry: &yohu_source::AdapterRegistry,
        http: &yohu_source::HttpClient,
        url: &str,
        rel_dir: &str,
        download_images: bool,
        progress: Option<&(dyn Fn(String) + Send + Sync)>,
    ) -> Result<PathBuf, LibraryError> {
        // 1. 拉取
        if let Some(p) = progress {
            p(format!("拉取 {url}"));
        }
        let (meta, raw) = yohu_source::fetch_any(registry, http, url).await?;

        // 2. 目标路径
        let stem = safe_stem(&meta.title);
        let dir = if rel_dir.trim().is_empty() {
            self.root.clone()
        } else {
            self.root.join(rel_dir)
        };
        let md_path = dir.join(format!("{stem}.md"));

        // 3. 图片映射（复用已有 assets + 可选下载）
        if let Some(p) = progress {
            p("映射图片资源".into());
        }
        let image_map = crate::images::build_image_map(&raw.html, &md_path);
        let mut warnings = Vec::new();
        let image_map = if download_images {
            crate::images::download_missing(
                http, &raw.html, &image_map, &md_path, &mut warnings,
            )
            .await
        } else {
            image_map
        };

        // 4. 转换（generic-web 传页面 URL 作 base，相对链接补全）
        if let Some(p) = progress {
            p("转换为 Markdown".into());
        }
        let base_url = match meta.channel {
            yohu_protocol::FetchChannel::GenericWeb => Some(url.to_string()),
            yohu_protocol::FetchChannel::Adapter => None,
        };
        let opts = yohu_md_convert::ConvertOptions {
            title: meta.title.clone(),
            update_time: meta.update_time.clone(),
            source_url: url.to_string(),
            catalog: meta.doc_ref.catalog.clone(),
            image_map,
            device_types: meta.device_types.clone(),
            base_url,
        };
        let markdown = yohu_md_convert::html_to_markdown(&raw.html, &opts);

        // 5. 写盘（原子写）
        atomic_write(&md_path, &markdown)?;

        // 6. manifest upsert
        let rel_file = md_path
            .strip_prefix(&self.root)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| md_path.to_string_lossy().into_owned());
        let _ = self.upsert_entry(LibraryEntry {
            file: rel_file,
            url: url.to_string(),
            slug: meta.doc_ref.slug.clone(),
            catalog: meta.doc_ref.catalog.clone().unwrap_or_else(|| "web".into()),
            local_time: meta.update_time.clone(),
            official_time: meta.update_time.clone(),
            status: None,
        });

        if !warnings.is_empty() {
            if let Some(p) = progress {
                p(format!("图片告警: {}", warnings.join("; ")));
            }
        }
        Ok(md_path)
    }

    /// 读本地 MD 文件内容（路径必须位于库内，防穿越）。
    pub fn read_doc(&self, rel_file: &str) -> Result<String, LibraryError> {
        if !yohu_domain::is_safe_rel_path(rel_file) {
            return Err(LibraryError::invalid("unsafe path"));
        }
        let p = self.root.join(rel_file);
        Ok(std::fs::read_to_string(p)?)
    }

    /// 库目录树（仅 .md 文件与目录）。
    pub fn tree(&self) -> Vec<yohu_protocol::TreeNode> {
        build_tree(&self.root, &self.root, 0)
    }
}

const MAX_TREE_DEPTH: usize = 12;

fn build_tree(root: &Path, dir: &Path, depth: usize) -> Vec<yohu_protocol::TreeNode> {
    if depth > MAX_TREE_DEPTH {
        return Vec::new();
    }
    let mut nodes = Vec::new();
    let Ok(rd) = std::fs::read_dir(dir) else {
        return nodes;
    };
    let mut items: Vec<_> = rd.filter_map(|e| e.ok()).collect();
    items.sort_by_key(|e| e.file_name());
    for item in items {
        let name = item.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') || name == MANIFEST_FILE || name == "assets" {
            continue;
        }
        let path = item.path();
        let rel = path
            .strip_prefix(root)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        if path.is_dir() {
            nodes.push(yohu_protocol::TreeNode {
                name,
                path: rel,
                is_dir: true,
                children: build_tree(root, &path, depth + 1),
            });
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            nodes.push(yohu_protocol::TreeNode {
                name,
                path: rel,
                is_dir: false,
                children: Vec::new(),
            });
        }
    }
    nodes
}
