//! 共享 HTTP 客户端：中性默认头（UA / Accept / Accept-Language）。

use std::sync::Arc;
use std::time::Duration;

use tokio::sync::Semaphore;

use crate::error::SourceError;

/// HTTP 客户端配置
#[derive(Debug, Clone)]
pub struct HttpConfig {
    pub timeout_sec: u64,
    pub concurrency: usize,
}

impl Default for HttpConfig {
    fn default() -> Self {
        Self { timeout_sec: 15, concurrency: 4 }
    }
}

/// 共享客户端（reqwest 内部连接池复用）
#[derive(Clone)]
pub struct HttpClient {
    inner: Arc<Inner>,
}

struct Inner {
    client: reqwest::Client,
    semaphore: Arc<Semaphore>,
}

impl HttpClient {
    pub fn new(cfg: HttpConfig) -> Result<Self, SourceError> {
        let client = reqwest::Client::builder()
            .user_agent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
                 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            .default_headers(default_headers())
            .timeout(Duration::from_secs(cfg.timeout_sec))
            .build()?;
        Ok(Self {
            inner: Arc::new(Inner {
                client,
                semaphore: Arc::new(Semaphore::new(cfg.concurrency.max(1))),
            }),
        })
    }

    pub fn raw(&self) -> &reqwest::Client {
        &self.inner.client
    }

    /// 并发许可（批量任务用）
    pub async fn acquire(&self) -> tokio::sync::OwnedSemaphorePermit {
        Arc::clone(&self.inner.semaphore)
            .acquire_owned()
            .await
            .expect("semaphore closed")
    }
}

fn default_headers() -> reqwest::header::HeaderMap {
    // 中性默认头：站点专属头（Origin/Referer/Sec-Fetch-*）由各适配器逐请求附加，
    // generic-web 通道不得携带华为站头（ADR-W4 双通道路由纪律）。
    use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE};
    let mut h = HeaderMap::new();
    h.insert(ACCEPT, HeaderValue::from_static("application/json, text/plain, */*"));
    h.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9"));
    h
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_headers_are_neutral() {
        // generic-web 通道不得携带华为站头（ADR-W4）
        let h = default_headers();
        assert!(!h.contains_key("origin"));
        assert!(!h.contains_key("referer"));
    }
}