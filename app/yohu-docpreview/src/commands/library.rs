//! 文档库对照与全量更新（薄转发）。

use std::sync::Arc;

use tauri::State;
use yohu_library::LibraryStore;
use yohu_protocol::{AppEvent, SyncReport};

use crate::commands::ipc_library;
use crate::state::AppState;

fn default_scope(scope: Option<Vec<String>>) -> Vec<String> {
    match scope {
        Some(s) if !s.is_empty() => s,
        _ => vec!["开发".into(), "设计".into()],
    }
}

#[tauri::command(rename = "library.plan")]
pub async fn library_plan(
    state: State<'_, AppState>,
    scope: Option<Vec<String>>,
) -> Result<SyncReport, yohu_protocol::IpcError> {
    let scope = default_scope(scope);
    let store = LibraryStore::open(&state.paths.library_root);
    let conc = state.settings.snapshot().concurrency.max(1) as usize;
    let items = yohu_library::plan_sync(&store, &state.http, &scope, &state.root_cancel, conc)
        .await
        .map_err(ipc_library)?;
    Ok(SyncReport {
        planned: items.len() as u32,
        updated: 0,
        created: 0,
        marked_offline: 0,
        failed: 0,
        items,
    })
}

#[tauri::command(rename = "library.sync")]
pub async fn library_sync(
    state: State<'_, AppState>,
    scope: Option<Vec<String>>,
) -> Result<SyncReport, yohu_protocol::IpcError> {
    let scope = default_scope(scope);
    let store = Arc::new(LibraryStore::open(&state.paths.library_root));
    let token = state.root_cancel.child_token();
    let snapshot = state.settings.snapshot();
    let items = yohu_library::plan_sync(
        store.as_ref(),
        &state.http,
        &scope,
        &token,
        snapshot.concurrency.max(1) as usize,
    )
        .await
        .map_err(ipc_library)?;
    let tx = state.event_tx.clone();
    yohu_library::apply_sync(
        store,
        Arc::clone(&state.registry),
        state.http.clone(),
        items,
        snapshot.concurrency.max(1) as usize,
        snapshot.image_download,
        token,
        1,
        move |p| {
            let _ = tx.try_send(AppEvent::TaskProgress(p));
        },
    )
    .await
    .map_err(ipc_library)
}
