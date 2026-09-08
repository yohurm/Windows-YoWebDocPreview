//! 构建期把守（ADR-W14）：tauri.conf.json 身份须与 yohu-protocol 常量一致，
//! 不一致直接构建失败——身份单源从「约定」升级为「构建期把守」。

use std::path::Path;

fn main() {
    tauri_build::build();

    let manifest = std::path::PathBuf::from(
        std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"),
    );
    let conf_path = manifest.join("tauri.conf.json");
    println!("cargo:rerun-if-changed={}", conf_path.display());
    assert_identity_sync(&conf_path);
}

/// 校验 productName / identifier / 窗口标题 / version 与 protocol 单源一致。
fn assert_identity_sync(conf_path: &Path) {
    let conf = std::fs::read_to_string(conf_path)
        .unwrap_or_else(|e| panic!("读取 {} 失败: {e}", conf_path.display()));
    let json: serde_json::Value = serde_json::from_str(&conf)
        .unwrap_or_else(|e| panic!("解析 {} 失败: {e}", conf_path.display()));
    let version = env!("CARGO_PKG_VERSION");
    let product = json["productName"].as_str().unwrap_or("");
    let identifier = json["identifier"].as_str().unwrap_or("");
    let title = json["app"]["windows"][0]["title"].as_str().unwrap_or("");
    let conf_version = json["version"].as_str().unwrap_or("");
    if product != yohu_protocol::PRODUCT_NAME
        || identifier != yohu_protocol::IDENTIFIER
        || title != yohu_protocol::DISPLAY_NAME
        || conf_version != version
    {
        panic!(
            "tauri.conf.json 身份须与 yohu-protocol 常量及 CARGO_PKG_VERSION 一致：\
             productName={}/{}, identifier={}/{}, title={}/{}, version={}/{}",
            product,
            yohu_protocol::PRODUCT_NAME,
            identifier,
            yohu_protocol::IDENTIFIER,
            title,
            yohu_protocol::DISPLAY_NAME,
            conf_version,
            version
        );
    }
}
