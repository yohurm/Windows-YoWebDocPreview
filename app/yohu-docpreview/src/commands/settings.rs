//! 设置命令：get / set（set 后必发 `settings/changed` 全量快照）。

use tauri::State;
use yohu_protocol::{AppEvent, AppSettings, IpcError, IpcErrorCode};

use crate::commands::ipc_code;
use crate::state::AppState;

/// `settings.get`：全量快照。
#[tauri::command(rename = "settings.get")]
pub fn settings_get(state: State<'_, AppState>) -> AppSettings {
    state.settings.snapshot()
}

/// `settings.set`：全量替换并原子落盘；`settings/changed` 是控制面，`send().await` 必达。
///
/// 生效语义按键表（protocol::SettingsKey::effect）：libraryRoot 重启生效（路径集启动冻结），
/// concurrency / imageDownload 下一任务生效，requestTimeoutSec / theme 立即生效（前端自应用）。
#[tauri::command(rename = "settings.set")]
pub async fn settings_set(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, IpcError> {
    let updated = state
        .settings
        .set_all(settings)
        .map_err(|e| ipc_code(IpcErrorCode::Io, e))?;
    let _ = state
        .event_tx
        .send(AppEvent::SettingsChanged { key: None, settings: updated.clone() })
        .await;
    Ok(updated)
}
