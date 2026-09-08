//! IPC 错误模型：core 内部错误映射为 `{ code, message }`，前端只依赖 code。
//!
//! 壳的 commands 层负责把各 core crate 的自有 Error 映射到此类型（禁止 String 裸串跨 IPC）。

use serde::{Deserialize, Serialize};

/// 稳定错误码（前端只依赖 code，不解析 message 文案）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IpcErrorCode {
    /// 参数不合法（含库路径防穿越拒绝）
    InvalidArgs,
    /// 文档不存在
    NotFound,
    /// 网络错误
    Network,
    /// 源站 API 错误
    Api,
    /// 正文提取失败
    ExtractFailed,
    /// 磁盘 IO 失败
    Io,
    /// 任务已被取消
    Cancelled,
    /// 未归类内部错误
    Internal,
}

/// 跨 IPC 的通用错误。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcError {
    pub code: IpcErrorCode,
    pub message: String,
}

impl IpcError {
    pub fn new(code: IpcErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into() }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(IpcErrorCode::Internal, message)
    }
}

impl std::fmt::Display for IpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{:?}] {}", self.code, self.message)
    }
}

impl std::error::Error for IpcError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ipc_error_serializes_snake_case_code() {
        let e = IpcError::new(IpcErrorCode::NotFound, "doc missing");
        let json = serde_json::to_string(&e).unwrap();
        assert!(json.contains("\"code\":\"not_found\""));
        assert!(json.contains("\"message\":\"doc missing\""));
    }
}
