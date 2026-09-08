//! 系统命令：信息 / 打开路径 / 系统对话框（插件封装，模块禁直连）。

use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use yohu_protocol::IpcError;
use yohu_runtime::open_path;

use crate::commands::ipc;
use crate::state::AppState;

/// `system.info` 返回（关于/诊断）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub name: &'static str,
    pub version: &'static str,
    pub data_dir: String,
    pub library_root: String,
}

/// `system.info`：关于/诊断信息。
#[tauri::command(rename = "system.info")]
pub fn system_info(state: State<'_, AppState>) -> SystemInfo {
    SystemInfo {
        name: yohu_protocol::DISPLAY_NAME,
        version: yohu_protocol::version(),
        data_dir: state.paths.local_root.to_string_lossy().into_owned(),
        library_root: state.paths.library_root.to_string_lossy().into_owned(),
    }
}

/// `system.openPath`：用系统文件管理器打开目录，或选中文件。
#[tauri::command(rename = "system.openPath")]
pub fn system_open_path(path: String) -> Result<(), IpcError> {
    open_path(std::path::Path::new(&path)).map_err(ipc)
}

/// `dialog.pickFolder`：选择目录（取消 → null）。
#[tauri::command(rename = "dialog.pickFolder")]
pub async fn dialog_pick_folder(app: AppHandle) -> Result<Option<String>, IpcError> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |picked| {
        let _ = tx.send(picked);
    });
    let picked = rx.await.map_err(ipc)?;
    Ok(picked.map(|p| p.to_string()))
}

/// `dialog.pickFile`：选择单个文件（取消 → null）。
#[tauri::command(rename = "dialog.pickFile")]
pub async fn dialog_pick_file(app: AppHandle) -> Result<Option<String>, IpcError> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_file(move |picked| {
        let _ = tx.send(picked);
    });
    let picked = rx.await.map_err(ipc)?;
    Ok(picked.map(|p| p.to_string()))
}

/// `dialog.saveFile`：保存文件对话框（取消 → null）。
#[tauri::command(rename = "dialog.saveFile")]
pub async fn dialog_save_file(
    app: AppHandle,
    default_name: Option<String>,
) -> Result<Option<String>, IpcError> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let mut dlg = app.dialog().file();
    if let Some(name) = default_name {
        dlg = dlg.set_file_name(&name);
    }
    dlg.save_file(move |picked| {
        let _ = tx.send(picked);
    });
    let picked = rx.await.map_err(ipc)?;
    Ok(picked.map(|p| p.to_string()))
}
