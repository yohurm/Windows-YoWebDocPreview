//! 文档域命令：拉取 / HTML 二段获取（ADR-W6）/ 转换 / 历史。

use tauri::State;
use yohu_protocol::{CatalogNode, DocMeta, IpcError, RawDoc};

use crate::commands::{ipc, ipc_library, ipc_source};
use crate::state::AppState;

pub(crate) async fn cached_or_fetch(
    state: &AppState,
    url: &str,
) -> Result<(DocMeta, RawDoc), IpcError> {
    if let Some(pair) = state.cache.lock().expect("cache lock poisoned").get(url) {
        return Ok(pair);
    }
    let (meta, raw) = yohu_source::fetch_any(&state.registry, &state.http, url)
        .await
        .map_err(ipc_source)?;
    state
        .cache
        .lock()
        .expect("cache lock poisoned")
        .put(url.to_string(), (meta.clone(), raw.clone()));
    Ok((meta, raw))
}

/// `doc.fetch`：拉取文档元信息（正文进缓存，`doc.html` 二段获取）。
#[tauri::command(rename = "doc.fetch")]
pub async fn doc_fetch(state: State<'_, AppState>, url: String) -> Result<DocMeta, IpcError> {
    let (meta, _) = cached_or_fetch(&state, &url).await?;
    Ok(meta)
}

/// `doc.html`：取缓存的原始 HTML（仓库 Markdown 源则为空串）。
#[tauri::command(rename = "doc.html")]
pub async fn doc_html(state: State<'_, AppState>, url: String) -> Result<String, IpcError> {
    let (_, raw) = cached_or_fetch(&state, &url).await?;
    Ok(raw.html)
}

/// `doc.convert`：按源方言转 Markdown。
#[tauri::command(rename = "doc.convert")]
pub async fn doc_convert(state: State<'_, AppState>, url: String) -> Result<String, IpcError> {
    let (meta, raw) = cached_or_fetch(&state, &url).await?;
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

/// `doc.export`：当前文档导出为 Markdown（不改 manifest）。
#[tauri::command(rename = "doc.export")]
pub async fn doc_export(
    state: State<'_, AppState>,
    url: String,
    target_dir: Option<String>,
) -> Result<String, IpcError> {
    let (meta, raw) = cached_or_fetch(&state, &url).await?;
    let dest = match target_dir {
        Some(d) if !d.trim().is_empty() => std::path::PathBuf::from(d),
        _ => state.paths.library_root.clone(),
    };
    tokio::task::spawn_blocking(move || yohu_library::export_to_dir(&dest, &meta, &raw, &url))
        .await
        .map_err(ipc)?
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(ipc_library)
}

/// `doc.catalog`：获取文档所属专栏/仓库一层目录。
#[tauri::command(rename = "doc.catalog")]
pub async fn doc_catalog(
    state: State<'_, AppState>,
    url: String,
) -> Result<Vec<CatalogNode>, IpcError> {
    yohu_source::fetch_catalog(&state.registry, &state.http, &url)
        .await
        .map_err(ipc_source)
}
