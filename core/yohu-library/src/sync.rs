//! 对照官网目录树 + 本地时间，应用更新 / 新篇 / 下线标记。
//!
//! 拉页与转换走既有 `fetch_any` + `export_document`，不复制 Python 转换器。

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

use tokio_util::sync::CancellationToken;
use yohu_domain::{
    catalogs_in_scope, classify, is_marked_offline, local_root_for, mark_offline,
    resolve_new_file, single_root_manifest, UpdateKind,
};
use yohu_protocol::{CatalogNode, SyncItem, SyncReport, TaskProgress, TaskState};
use yohu_runtime::atomic_write;
use yohu_source::{AdapterRegistry, HttpClient};

use crate::error::LibraryError;
use crate::scan::{scan_library, ScannedDoc};
use crate::store::LibraryStore;

#[derive(Debug, Clone)]
struct OfficialLeaf {
    slug: String,
    name: String,
    tree_parts: Vec<String>,
}

pub async fn plan_sync(
    store: &LibraryStore,
    http: &HttpClient,
    scope: &[String],
    token: &CancellationToken,
    concurrency: usize,
) -> Result<Vec<SyncItem>, LibraryError> {
    if scope.is_empty() {
        return Err(LibraryError::invalid("scope must not be empty"));
    }
    let (local, dirs) = scan_library(store.root(), scope);
    let catalogs = catalogs_in_scope(scope);
    if catalogs.is_empty() {
        return Err(LibraryError::invalid("scope matches no Huawei catalogs"));
    }

    let mut official: HashMap<(String, String), OfficialLeaf> = HashMap::new();
    for catalog in &catalogs {
        if token.is_cancelled() {
            return Err(LibraryError::Cancelled);
        }
        let tree = yohu_source::fetch_catalog_tree(http, catalog).await?;
        for leaf in walk_leaves(&tree, Vec::new()) {
            official.insert(((*catalog).to_string(), leaf.slug.clone()), leaf);
        }
    }

    let mut local_by_key: HashMap<(String, String), ScannedDoc> = HashMap::new();
    for doc in local {
        local_by_key.insert((doc.entry.catalog.clone(), doc.entry.slug.clone()), doc);
    }

    let mut items = Vec::new();
    let mut to_probe = Vec::new();
    for ((catalog, slug), leaf) in &official {
        if let Some(doc) = local_by_key.get(&(catalog.clone(), slug.clone())) {
            to_probe.push(doc.clone());
        } else {
            let url = yohu_domain::huawei_doc_url(catalog, slug);
            let root = local_root_for(catalog).unwrap_or("");
            let file = resolve_new_file(root, &leaf.tree_parts, &leaf.name, &dirs);
            items.push(SyncItem {
                file,
                url,
                slug: slug.clone(),
                catalog: catalog.clone(),
                status: "NEW".into(),
                local_time: None,
                official_time: None,
                title: leaf.name.clone(),
                tree_parts: leaf.tree_parts.clone(),
            });
        }
    }

    let queue = Arc::new(Mutex::new(std::collections::VecDeque::from(to_probe)));
    let found = Arc::new(Mutex::new(Vec::<SyncItem>::new()));
    let mut handles = Vec::new();
    for _ in 0..concurrency.max(1) {
        let queue = Arc::clone(&queue);
        let found = Arc::clone(&found);
        let http = http.clone();
        let token = token.clone();
        handles.push(tokio::spawn(async move {
            loop {
                if token.is_cancelled() {
                    return;
                }
                let doc = {
                    let Ok(mut q) = queue.lock() else { return };
                    q.pop_front()
                };
                let Some(doc) = doc else { return };
                let probe = yohu_source::probe_meta(&http, &doc.entry.slug, &doc.entry.catalog).await;
                if let Ok((_, official_time)) = probe {
                    if classify(doc.entry.local_time.as_deref(), official_time.as_deref())
                        == UpdateKind::Update
                    {
                        if let Ok(mut f) = found.lock() {
                            f.push(sync_from_local(&doc, "UPDATE", official_time));
                        }
                    }
                }
            }
        }));
    }
    for h in handles {
        let _ = h.await;
    }
    if token.is_cancelled() {
        return Err(LibraryError::Cancelled);
    }
    items.extend(found.lock().map_err(|_| LibraryError::internal("probe poisoned"))?.drain(..));

    for ((catalog, slug), doc) in &local_by_key {
        if official.contains_key(&(catalog.clone(), slug.clone())) {
            continue;
        }
        let already = std::fs::read_to_string(store.root().join(&doc.entry.file))
            .ok()
            .is_some_and(|md| is_marked_offline(&md));
        if already {
            continue;
        }
        items.push(sync_from_local(doc, "OFFLINE", None));
    }

    items.sort_by(|a, b| a.status.cmp(&b.status).then(a.slug.cmp(&b.slug)));
    Ok(items)
}

pub async fn apply_sync(
    store: Arc<LibraryStore>,
    registry: Arc<AdapterRegistry>,
    http: HttpClient,
    items: Vec<SyncItem>,
    concurrency: usize,
    download_images: bool,
    token: CancellationToken,
    run_id: u32,
    mut on_progress: impl FnMut(TaskProgress) + Send,
) -> Result<SyncReport, LibraryError> {
    let total = items.len() as u32;
    let done = Arc::new(AtomicU32::new(0));
    let failed = Arc::new(AtomicU32::new(0));
    let updated = Arc::new(AtomicU32::new(0));
    let created = Arc::new(AtomicU32::new(0));
    let marked = Arc::new(AtomicU32::new(0));
    let current = Arc::new(Mutex::new(None::<String>));
    let queue = Arc::new(Mutex::new(std::collections::VecDeque::from(items.clone())));

    let mut handles = Vec::new();
    for _ in 0..concurrency.max(1) {
        let queue = Arc::clone(&queue);
        let store = Arc::clone(&store);
        let registry = Arc::clone(&registry);
        let http = http.clone();
        let token = token.clone();
        let done = Arc::clone(&done);
        let failed = Arc::clone(&failed);
        let updated = Arc::clone(&updated);
        let created = Arc::clone(&created);
        let marked = Arc::clone(&marked);
        let current = Arc::clone(&current);

        handles.push(tokio::spawn(async move {
            loop {
                if token.is_cancelled() {
                    return;
                }
                let item = {
                    let Ok(mut q) = queue.lock() else { return };
                    q.pop_front()
                };
                let Some(item) = item else { return };
                if let Ok(mut c) = current.lock() {
                    *c = Some(item.url.clone());
                }
                let result = apply_one(&store, &registry, &http, &item, download_images).await;
                match (result, item.status.as_str()) {
                    (Ok(()), "UPDATE") => {
                        updated.fetch_add(1, Ordering::Relaxed);
                    }
                    (Ok(()), "NEW") => {
                        created.fetch_add(1, Ordering::Relaxed);
                    }
                    (Ok(()), "OFFLINE") => {
                        marked.fetch_add(1, Ordering::Relaxed);
                    }
                    (Ok(()), _) => {}
                    (Err(_), _) => {
                        failed.fetch_add(1, Ordering::Relaxed);
                    }
                }
                done.fetch_add(1, Ordering::Relaxed);
            }
        }));
    }

    loop {
        if token.is_cancelled() || handles.iter().all(|h| h.is_finished()) {
            break;
        }
        on_progress(TaskProgress {
            run_id,
            done: done.load(Ordering::Relaxed),
            total,
            failed: failed.load(Ordering::Relaxed),
            state: TaskState::Running,
            current: current.lock().ok().and_then(|g| g.clone()),
            errors: Vec::new(),
        });
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    for h in handles {
        let _ = h.await;
    }

    Ok(SyncReport {
        planned: total,
        updated: updated.load(Ordering::Relaxed),
        created: created.load(Ordering::Relaxed),
        marked_offline: marked.load(Ordering::Relaxed),
        failed: failed.load(Ordering::Relaxed),
        items,
    })
}

async fn apply_one(
    store: &LibraryStore,
    registry: &AdapterRegistry,
    http: &HttpClient,
    item: &SyncItem,
    download_images: bool,
) -> Result<(), LibraryError> {
    if !yohu_domain::is_safe_rel_path(&item.file) {
        return Err(LibraryError::invalid("unsafe path"));
    }
    let md_path = store.root().join(&item.file);
    match item.status.as_str() {
        "OFFLINE" => {
            let Ok(md) = std::fs::read_to_string(&md_path) else {
                return Ok(());
            };
            atomic_write(&md_path, mark_offline(&md))?;
            Ok(())
        }
        "UPDATE" | "NEW" => {
            let (meta, raw) = yohu_source::fetch_any(registry, http, &item.url).await?;
            if let Some(parent) = md_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let image_map = crate::images::build_image_map(&raw.html, &md_path);
            let mut warnings = Vec::new();
            let image_map = if download_images {
                crate::images::download_missing(http, &raw.html, &image_map, &md_path, &mut warnings)
                    .await
            } else {
                image_map
            };
            let markdown = crate::export_document(&meta, &raw, &item.url, image_map);
            atomic_write(&md_path, markdown)?;
            if item.status == "NEW" {
                append_manifest(store.root(), item, &meta.title)?;
            }
            let _ = warnings;
            Ok(())
        }
        _ => Err(LibraryError::invalid("unknown sync status")),
    }
}

fn append_manifest(root: &Path, item: &SyncItem, title: &str) -> Result<(), LibraryError> {
    let mf = manifest_path_for(root, item);
    let mut arr = if mf.exists() {
        let text = std::fs::read_to_string(&mf)?;
        serde_json::from_str::<Vec<serde_json::Value>>(&text).unwrap_or_default()
    } else {
        Vec::new()
    };
    if arr.iter().any(|v| v.get("slug").and_then(|s| s.as_str()) == Some(item.slug.as_str())) {
        return Ok(());
    }
    let file_in_mf = {
        let abs = root.join(&item.file);
        match mf.parent() {
            Some(dir) => abs
                .strip_prefix(dir)
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_else(|_| item.file.clone()),
            None => item.file.clone(),
        }
    };
    arr.push(serde_json::json!({
        "slug": item.slug,
        "name": title,
        "file": file_in_mf,
        "url": item.url,
        "title": title,
    }));
    if let Some(parent) = mf.parent() {
        std::fs::create_dir_all(parent)?;
    }
    atomic_write(&mf, serde_json::to_string_pretty(&arr).unwrap_or_else(|_| "[]".into()))?;
    Ok(())
}

fn manifest_path_for(root: &Path, item: &SyncItem) -> PathBuf {
    if single_root_manifest(&item.catalog) {
        if let Some(r) = local_root_for(&item.catalog) {
            return root.join(r).join("manifest.json");
        }
    }
    let mut dir = PathBuf::from(&item.file);
    dir.pop();
    let mut cur = root.join(&dir);
    loop {
        let cand = cur.join("manifest.json");
        if cand.exists() {
            return cand;
        }
        if !cur.starts_with(root) || cur == root {
            break;
        }
        if !cur.pop() {
            break;
        }
    }
    if let Some(r) = local_root_for(&item.catalog) {
        return root.join(r).join("manifest.json");
    }
    root.join("manifest.json")
}

fn sync_from_local(doc: &ScannedDoc, status: &str, official: Option<String>) -> SyncItem {
    SyncItem {
        file: doc.entry.file.clone(),
        url: doc.entry.url.clone(),
        slug: doc.entry.slug.clone(),
        catalog: doc.entry.catalog.clone(),
        status: status.into(),
        local_time: doc.entry.local_time.clone(),
        official_time: official,
        title: doc.title.clone(),
        tree_parts: Vec::new(),
    }
}

fn walk_leaves(nodes: &[CatalogNode], prefix: Vec<String>) -> Vec<OfficialLeaf> {
    let mut out = Vec::new();
    for n in nodes {
        if n.is_leaf {
            if let Some(slug) = n.slug.as_deref().filter(|s| !s.is_empty()) {
                out.push(OfficialLeaf {
                    slug: slug.to_string(),
                    name: n.name.clone(),
                    tree_parts: prefix.clone(),
                });
            }
        }
        if !n.children.is_empty() {
            let mut next = prefix.clone();
            next.push(n.name.clone());
            out.extend(walk_leaves(&n.children, next));
        }
    }
    out
}
