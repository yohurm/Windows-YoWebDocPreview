//! yohu-docpreview — Tauri 桌面壳（组合根）。
//!
//! 架构边界：
//! - 本 crate 是**唯一**引用 Tauri 的地方；
//! - `commands/` 是薄命令层：参数反序列化 → core API → 结果序列化，禁止业务逻辑；
//! - 所有业务能力在 core crates（protocol/runtime/domain/source/library/ai）；壳不直接依赖转换方言 crate 或 yohu-ai；
//! - 事件唯一出口是 `events.rs` 总线；命令与后台只 `tx.send(AppEvent)`。

mod appearance;
mod commands;
mod events;
mod panic_hook;
mod paths;
mod settings_store;
mod shell_nav;
mod state;

use std::sync::{Arc, Mutex};

use tauri::{Manager, RunEvent};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use yohu_protocol::AppEvent;
use yohu_source::{AdapterRegistry, HttpClient, HttpConfig};

use crate::paths::AppPaths;
use crate::settings_store::SettingsStore;
use crate::state::{AppState, Cache};

/// 事件通道容量
const EVENT_CHANNEL_CAP: usize = 1024;

pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    let root_cancel = CancellationToken::new();

    let builder = tauri::Builder::default().setup(move |app| {
        let handle = app.handle().clone();

        // 1) 设置探针：读 settings.json → libraryRoot 冻结快照 → AppPaths::resolve
        let settings = SettingsStore::load(AppPaths::probe_settings_file());
        let snapshot = settings.snapshot();
        let paths = AppPaths::resolve(&snapshot.library_root);

        // 2) 崩溃 hook（先于一切业务）
        panic_hook::install(paths.logs_dir.clone());

        // 3) core 服务装配（超时/并发取设置冻结快照）
        let http = HttpClient::new(HttpConfig {
            timeout_sec: snapshot.request_timeout_sec,
            concurrency: snapshot.concurrency as usize,
        })
        .map_err(|e| format!("http client init: {e}"))?;
        paths.ensure_dirs().map_err(|e| format!("create data dirs: {e}"))?;

        // 4) 事件总线先行
        let (event_tx, event_rx) = mpsc::channel::<AppEvent>(EVENT_CHANNEL_CAP);
        events::spawn_dispatcher(event_rx, handle.clone());

        // 5) 应用状态
        app.manage(AppState {
            registry: Arc::new(AdapterRegistry::with_defaults()),
            http,
            settings,
            paths,
            event_tx,
            root_cancel: root_cancel.clone(),
            cache: Mutex::new(Cache::new()),
        });

        if let Some(window) = app.get_webview_window("main") {
            appearance::apply_to_window(&window, snapshot.theme);
            let _ = window.show();
        }

        Ok(())
    });

    let app = builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(shell_nav::plugin())
        .invoke_handler(tauri::generate_handler![
            commands::doc::doc_fetch,
            commands::doc::doc_html,
            commands::doc::doc_convert,
            commands::doc::doc_catalog,
            commands::doc::doc_history,
            commands::doc::doc_export,
            commands::ai::ai_parse,
            commands::library::library_plan,
            commands::library::library_sync,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::system::system_info,
            commands::system::system_open_path,
            commands::system::dialog_pick_folder,
            commands::system::dialog_pick_file,
            commands::system::dialog_save_file,
        ])
        .build(tauri::generate_context!())?;

    // 6) 退出序列（RunEvent::Exit）：根 token cancel → 设置 flush
    app.run(move |app_handle, event| {
        match event {
            RunEvent::Ready => {
                if let Some(window) = app_handle.get_webview_window("main") {
                    if let Some(state) = app_handle.try_state::<AppState>() {
                        appearance::apply_to_window(&window, state.settings.snapshot().theme);
                    }
                    let _ = window.show();
                }
            }
            RunEvent::Exit => {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    state.root_cancel.cancel();
                    if let Err(e) = state.settings.save_atomic() {
                        eprintln!("flush settings on exit: {e}");
                    }
                }
            }
            _ => {}
        }
    });

    Ok(())
}
