//! library 错误模型（capability 自有 Error；壳统一映射 IpcError，ADR-W13）。

use yohu_protocol::IpcErrorCode;

#[derive(Debug, thiserror::Error)]
pub enum LibraryError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("source error: {0}")]
    Source(#[from] yohu_source::SourceError),

    #[error("invalid input: {0}")]
    Invalid(String),

    #[error("cancelled")]
    Cancelled,

    #[error("internal: {0}")]
    Internal(String),
}

impl LibraryError {
    /// IPC 错误码（与 IpcErrorCode 对齐）
    pub fn code(&self) -> IpcErrorCode {
        match self {
            LibraryError::Io(_) => IpcErrorCode::Io,
            LibraryError::Source(e) => match e {
                yohu_source::SourceError::Network(_) => IpcErrorCode::Network,
                yohu_source::SourceError::NotFound(_) => IpcErrorCode::NotFound,
                yohu_source::SourceError::Api(_) => IpcErrorCode::Api,
                yohu_source::SourceError::ExtractFailed(_) => IpcErrorCode::ExtractFailed,
            },
            LibraryError::Invalid(_) => IpcErrorCode::InvalidArgs,
            LibraryError::Cancelled => IpcErrorCode::Cancelled,
            LibraryError::Internal(_) => IpcErrorCode::Internal,
        }
    }

    pub fn invalid(msg: impl Into<String>) -> Self {
        LibraryError::Invalid(msg.into())
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        LibraryError::Internal(msg.into())
    }
}
