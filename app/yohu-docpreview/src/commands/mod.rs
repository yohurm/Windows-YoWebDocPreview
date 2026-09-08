//! 命令层：Tauri invoke 处理器（按域分文件）。
//!
//! **薄命令层纪律**：只做参数反序列化 → core API → 结果序列化。
//! 业务逻辑一律在 core crates。错误统一映射为 [`IpcError`]（禁止 String 裸串跨 IPC）。
//!
//! 命令名用点分（`doc.fetch`），事件名用斜杠（`settings/changed`）。

pub mod doc;
pub mod settings;
pub mod system;

use yohu_protocol::{IpcError, IpcErrorCode};

/// 构造 IPC 错误。
pub fn ipc_code(code: IpcErrorCode, message: impl Into<String>) -> IpcError {
    IpcError::new(code, message)
}

/// 内部错误兜底。
pub fn ipc(e: impl std::fmt::Display) -> IpcError {
    IpcError::internal(e.to_string())
}

/// source 错误 → IPC（保留语义码）。
pub fn ipc_source(e: yohu_source::SourceError) -> IpcError {
    let code = match e.code() {
        "NOT_FOUND" => IpcErrorCode::NotFound,
        "NETWORK" => IpcErrorCode::Network,
        "API" => IpcErrorCode::Api,
        "EXTRACT_FAILED" => IpcErrorCode::ExtractFailed,
        _ => IpcErrorCode::Internal,
    };
    IpcError::new(code, e.to_string())
}
