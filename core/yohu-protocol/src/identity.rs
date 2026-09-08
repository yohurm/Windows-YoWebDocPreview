//! 应用身份常量（单源）。

/// 产品名（NSIS productName / 主程序名）
pub const PRODUCT_NAME: &str = "YoDocPreview";

/// 展示名（窗口标题 / 标题栏 / 主页字标）
pub const DISPLAY_NAME: &str = "YoDocPreview";

/// 包标识
pub const IDENTIFIER: &str = "com.yohu.docpreview";

/// 描述
pub const DESCRIPTION: &str = "通用在线文档阅读与 Markdown 导出工作台";

/// 版权
pub const COPYRIGHT: &str = "Copyright © 2026 Yohu";

/// LocalAppData 数据目录名
pub const DATA_DIR_NAME: &str = "YoDocPreview";

/// 运行时版本号
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
