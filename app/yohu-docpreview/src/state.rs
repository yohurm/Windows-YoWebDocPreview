//! 应用状态容器：core 服务实例 + 运行期可变状态。
//!
//! 组合根装配在 lib.rs；commands 层只经 `State<AppState>` 访问，不触碰 Tauri 之外的全局。

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use yohu_protocol::{AppEvent, DocMeta};
use yohu_source::{AdapterRegistry, HttpClient};

use crate::paths::AppPaths;
use crate::settings_store::SettingsStore;

/// 预览缓存（LRU 简化为容量上限的插入序表）
pub struct Cache {
    map: HashMap<String, (DocMeta, String)>, // url → (meta, html)
    order: Vec<String>,
}

const CACHE_CAP: usize = 30;

impl Cache {
    pub fn new() -> Self {
        Self { map: HashMap::new(), order: Vec::new() }
    }

    pub fn put(&mut self, url: String, v: (DocMeta, String)) {
        if self.map.contains_key(&url) {
            self.order.retain(|u| u != &url);
        } else if self.map.len() >= CACHE_CAP {
            if let Some(old) = self.order.first().cloned() {
                self.map.remove(&old);
                self.order.remove(0);
            }
        }
        self.order.push(url.clone());
        self.map.insert(url, v);
    }

    pub fn get(&self, url: &str) -> Option<(DocMeta, String)> {
        self.map.get(url).cloned()
    }

    /// `doc.history` 快照（最新在前）。
    pub fn history(&self) -> Vec<DocMeta> {
        self.order
            .iter()
            .rev()
            .filter_map(|u| self.map.get(u).map(|(m, _)| m.clone()))
            .collect()
    }
}

/// 应用状态（Tauri managed state）。
pub struct AppState {
    // ===== core 服务（只读装配，运行期不换） =====
    pub registry: Arc<AdapterRegistry>,
    pub http: HttpClient,
    pub settings: SettingsStore,
    pub paths: AppPaths,

    // ===== 事件与生命周期 =====
    pub event_tx: mpsc::Sender<AppEvent>,
    pub root_cancel: CancellationToken,

    // ===== 运行期状态（短临界区，std Mutex） =====
    /// 预览缓存（doc.history 数据源）
    pub cache: Mutex<Cache>,
}
