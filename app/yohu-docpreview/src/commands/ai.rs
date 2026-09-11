//! AI 域命令：把已拉取文档解析为 AgentDocument。

use tauri::State;
use yohu_protocol::{AgentDocument, IpcError};

use crate::commands::{ipc, ipc_code};
use crate::state::AppState;

/// `ai.parse`：拉取（走文档缓存）→ 转换 → 大纲/章节。
#[tauri::command(rename = "ai.parse")]
pub async fn ai_parse(state: State<'_, AppState>, url: String) -> Result<AgentDocument, IpcError> {
    let url = url.trim();
    if url.is_empty() {
        return Err(ipc_code(
            yohu_protocol::IpcErrorCode::InvalidArgs,
            "url must not be empty",
        ));
    }
    let url = url.to_string();
    let (meta, raw) = super::doc::cached_or_fetch(&state, &url).await?;
    tokio::task::spawn_blocking(move || yohu_library::parse_document(&meta, &raw, &url))
        .await
        .map_err(ipc)
}
