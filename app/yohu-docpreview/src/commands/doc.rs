//! 文档域命令：拉取 / HTML 二段获取（ADR-W6）/ 转换 / 历史。

use tauri::State;
use yohu_protocol::{CatalogNode, DocMeta, IpcError};

use crate::commands::{ipc, ipc_source};
use crate::state::AppState;

/// `doc.fetch`：拉取文档元信息（正文进缓存，`doc.html` 二段获取）。
#[tauri::command(rename = "doc.fetch")]
pub async fn doc_fetch(state: State<'_, AppState>, url: String) -> Result<DocMeta, IpcError> {
    if let Some((meta, _)) = state.cache.lock().expect("cache lock poisoned").get(&url) {
        return Ok(meta);
    }
    let (meta, raw) = yohu_source::fetch_any(&state.registry, &state.http, &url)
        .await
        .map_err(ipc_source)?;
    state
        .cache
        .lock()
        .expect("cache lock poisoned")
        .put(url.clone(), (meta.clone(), raw));
    Ok(meta)
}

/// `doc.html`：取缓存的原始 HTML（仓库 Markdown 源则为空串）。
#[tauri::command(rename = "doc.html")]
pub async fn doc_html(state: State<'_, AppState>, url: String) -> Result<String, IpcError> {
    if let Some((_, raw)) = state.cache.lock().expect("cache lock poisoned").get(&url) {
        return Ok(raw.html);
    }

    let (meta, raw) = yohu_source::fetch_any(&state.registry, &state.http, &url)
        .await
        .map_err(ipc_source)?;
    let html = raw.html.clone();
    state
        .cache
        .lock()
        .expect("cache lock poisoned")
        .put(url.clone(), (meta, raw));
    Ok(html)
}

/// `doc.convert`：按源方言转 Markdown（若未在缓存则现场拉取兜底）。
#[tauri::command(rename = "doc.convert")]
pub async fn doc_convert(state: State<'_, AppState>, url: String) -> Result<String, IpcError> {
    let (meta, raw) = {
        let cached = state.cache.lock().expect("cache lock poisoned").get(&url);
        if let Some(pair) = cached {
            pair
        } else {
            let (meta, raw) = yohu_source::fetch_any(&state.registry, &state.http, &url)
                .await
                .map_err(ipc_source)?;
            state
                .cache
                .lock()
                .expect("cache lock poisoned")
                .put(url.clone(), (meta.clone(), raw.clone()));
            (meta, raw)
        }
    };
    tokio::task::spawn_blocking(move || {
        yohu_library::convert_document(&meta, &raw, &url, Default::default())
    })
    .await
    .map_err(ipc)
}

/// `doc.history`：预览历史快照（LRU，最新在前）。
#[tauri::command(rename = "doc.history")]
pub fn doc_history(state: State<'_, AppState>) -> Vec<DocMeta> {
    state.cache.lock().expect("cache lock poisoned").history()
}

/// `doc.export`：将当前文档导出为 Markdown 文件至目标目录（默认为配置中的导出目录或库根）。
#[tauri::command(rename = "doc.export")]
pub async fn doc_export(
    state: State<'_, AppState>,
    url: String,
    target_dir: Option<String>,
) -> Result<String, IpcError> {
    let (meta, raw) = {
        let cached = state.cache.lock().expect("cache lock poisoned").get(&url);
        if let Some(pair) = cached {
            pair
        } else {
            let (meta, raw) = yohu_source::fetch_any(&state.registry, &state.http, &url)
                .await
                .map_err(ipc_source)?;
            state
                .cache
                .lock()
                .expect("cache lock poisoned")
                .put(url.clone(), (meta.clone(), raw.clone()));
            (meta, raw)
        }
    };

    let out_dir = match target_dir {
        Some(d) if !d.trim().is_empty() => std::path::PathBuf::from(d),
        _ => state.paths.library_root.clone(),
    };
    std::fs::create_dir_all(&out_dir).map_err(ipc)?;

    let stem = yohu_domain::safe_stem(&meta.title);
    let md_path = out_dir.join(format!("{stem}.md"));

    let md_content = tokio::task::spawn_blocking({
        let meta = meta.clone();
        let url = url.clone();
        move || yohu_library::export_document(&meta, &raw, &url, Default::default())
    })
    .await
    .map_err(ipc)?;

    yohu_runtime::atomic_write(&md_path, md_content).map_err(ipc)?;

    Ok(md_path.to_string_lossy().into_owned())
}

/// `doc.catalog`：获取文档所属专栏/官方分类树（用于左侧导航栏多网页无缝联动）。
#[tauri::command(rename = "doc.catalog")]
pub async fn doc_catalog(
    state: State<'_, AppState>,
    url: String,
) -> Result<Vec<CatalogNode>, IpcError> {
    yohu_source::fetch_catalog(&state.registry, &state.http, &url)
        .await
        .map_err(ipc_source)
}
