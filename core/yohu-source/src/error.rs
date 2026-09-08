//! 统一错误模型（IPC 层映射为 { code, message }）。

use thiserror::Error;

#[derive(Debug, Error)]
pub enum SourceError {
    #[error("network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("document not found: {0}")]
    NotFound(String),

    #[error("api error: {0}")]
    Api(String),

    #[error("content extraction failed: {0}")]
    ExtractFailed(String),
}

impl SourceError {
    /// IPC 错误码
    pub fn code(&self) -> &'static str {
        match self {
            SourceError::Network(_) => "NETWORK",
            SourceError::NotFound(_) => "NOT_FOUND",
            SourceError::Api(_) => "API",
            SourceError::ExtractFailed(_) => "EXTRACT_FAILED",
        }
    }
}