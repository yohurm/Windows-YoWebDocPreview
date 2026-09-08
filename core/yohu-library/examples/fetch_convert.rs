//! 端到端验证：拉取真实华为文档并转换为 Markdown（本地手动运行）。
//!
//! ```bash
//! cargo run -p yohu-library --example fetch_convert -- <url>
//! ```

use yohu_library::LibraryStore;
use yohu_source::{AdapterRegistry, HttpConfig, HttpClient};

#[tokio::main]
async fn main() {
    let url = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts".into());

    let out_dir = tempfile::tempdir().expect("tempdir");
    let store = LibraryStore::open(out_dir.path());
    let reg = AdapterRegistry::with_defaults();
    let http = HttpClient::new(HttpConfig::default()).expect("http");

    let t0 = std::time::Instant::now();
    let path = store
        .export_one(&reg, &http, &url, "", false, None)
        .await
        .expect("export failed");
    println!("导出耗时: {:?}", t0.elapsed());
    println!("输出文件: {}", path.display());

    let md = std::fs::read_to_string(&path).unwrap();
    println!("MD 长度: {} 字符", md.len());
    println!("──────── 前 60 行 ────────");
    for line in md.lines().take(60) {
        println!("{line}");
    }
}