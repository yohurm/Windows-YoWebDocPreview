//! 文档域命令：拉取 / HTML 二段获取（ADR-W6）/ 转换 / 历史。

use tauri::State;
use yohu_protocol::{CatalogNode, DocMeta, FetchChannel, IpcError};

use crate::commands::{ipc, ipc_source};
use crate::state::AppState;

/// `doc.fetch`：拉取文档元信息（HTML 进缓存，`doc.html` 二段获取）。
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
        .put(url.clone(), (meta.clone(), raw.html));
    Ok(meta)
}

/// `doc.html`：取缓存的原始 HTML（若未在缓存则现场拉取并放入缓存）。
#[tauri::command(rename = "doc.html")]
pub async fn doc_html(state: State<'_, AppState>, url: String) -> Result<String, IpcError> {
    let cached = state
        .cache
        .lock()
        .expect("cache lock poisoned")
        .get(&url)
        .map(|(_, html)| html);

    if let Some(html) = cached {
        return Ok(html);
    }

    // 缓存未命中时自动现场拉取，保证幂等与高容错
    let (meta, raw) = yohu_source::fetch_any(&state.registry, &state.http, &url)
        .await
        .map_err(ipc_source)?;
    state
        .cache
        .lock()
        .expect("cache lock poisoned")
        .put(url.clone(), (meta, raw.html.clone()));
    Ok(raw.html)
}

/// `doc.convert`：HTML → Markdown（若未在缓存则现场拉取兜底）。
#[tauri::command(rename = "doc.convert")]
pub async fn doc_convert(state: State<'_, AppState>, url: String) -> Result<String, IpcError> {
    let (meta, html) = {
        let cached = state
            .cache
            .lock()
            .expect("cache lock poisoned")
            .get(&url);
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
                .put(url.clone(), (meta.clone(), raw.html.clone()));
            (meta, raw.html)
        }
    };
    let base_url = match meta.channel {
        FetchChannel::GenericWeb => Some(url.clone()),
        FetchChannel::Adapter => None,
    };
    let opts = yohu_md_convert::ConvertOptions {
        title: meta.title.clone(),
        update_time: meta.update_time.clone(),
        source_url: url.clone(),
        catalog: meta.doc_ref.catalog.clone(),
        image_map: Default::default(),
        device_types: meta.device_types.clone(),
        base_url,
    };
    tokio::task::spawn_blocking(move || yohu_md_convert::html_to_markdown(&html, &opts))
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
    // 1. 获取 meta 与 HTML（若未在缓存则现场拉取）
    let (meta, html) = {
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
                .put(url.clone(), (meta.clone(), raw.html.clone()));
            (meta, raw.html)
        }
    };

    // 2. 确定保存目录与文件名
    let out_dir = match target_dir {
        Some(d) if !d.trim().is_empty() => std::path::PathBuf::from(d),
        _ => state.paths.library_root.clone(),
    };
    std::fs::create_dir_all(&out_dir).map_err(ipc)?;

    let stem = yohu_domain::safe_stem(&meta.title);
    let md_path = out_dir.join(format!("{stem}.md"));

    // 3. 准备转换选项
    let base_url = match meta.channel {
        FetchChannel::GenericWeb => Some(url.clone()),
        FetchChannel::Adapter => None,
    };
    let opts = yohu_md_convert::ConvertOptions {
        title: meta.title.clone(),
        update_time: meta.update_time.clone(),
        source_url: url.clone(),
        catalog: meta.doc_ref.catalog.clone(),
        image_map: Default::default(),
        device_types: meta.device_types.clone(),
        base_url,
    };

    // 4. HTML -> Markdown
    let md_content = tokio::task::spawn_blocking(move || {
        yohu_md_convert::html_to_markdown(&html, &opts)
    })
    .await
    .map_err(ipc)?;

    // 5. 原子写盘
    yohu_runtime::atomic_write(&md_path, md_content).map_err(ipc)?;

    Ok(md_path.to_string_lossy().into_owned())
}

/// `doc.catalog`：获取文档所属专栏/官方分类树（用于左侧导航栏多网页无缝联动）。
#[tauri::command(rename = "doc.catalog")]
pub async fn doc_catalog(
    state: State<'_, AppState>,
    url: String,
) -> Result<Vec<CatalogNode>, IpcError> {
    let (_, doc_ref) = state.registry.route(&url);
    if doc_ref.source_id == "huawei-harmonyos" {
        if let Some(cat) = &doc_ref.catalog {
            let tree = yohu_source::fetch_catalog_tree(&state.http, cat)
                .await
                .map_err(ipc_source)?;
            return Ok(tree);
        }
    }
    // 默认或通用网页返回空列表（前端优雅降级）
    Ok(Vec::new())
}
