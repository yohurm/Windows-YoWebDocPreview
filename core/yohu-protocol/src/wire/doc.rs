//! 文档域 wire 类型：引用 / 通道 / 原始文档 / 元信息。

use serde::{Deserialize, Serialize};

/// 文档引用：定位一篇文档的最小坐标。
///
/// - 结构化源（华为）：source_id="huawei-harmonyos"，catalog/slug 有值
/// - 通用网页：source_id="generic-web"，catalog=None，slug=域名+路径派生
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocRef {
    pub source_id: String,
    #[serde(default)]
    pub catalog: Option<String>,
    pub slug: String,
    pub url: String,
}

/// 拉取通道
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FetchChannel {
    /// 专用适配器通道
    Adapter,
    /// 通用网页通道（GET + 正文提取）
    GenericWeb,
}

/// 源文档原始数据（适配器/正文提取的产出）
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawDoc {
    pub title: String,
    #[serde(default)]
    pub update_time: Option<String>,
    pub html: String,
    /// 支持设备（device-type 映射后）；generic-web 为空
    #[serde(default)]
    pub device_types: Vec<String>,
}

/// 文档元信息（UI 展示用；不含大体积 HTML）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocMeta {
    pub doc_ref: DocRef,
    pub title: String,
    #[serde(default)]
    pub update_time: Option<String>,
    pub source_url: String,
    pub channel: FetchChannel,
    #[serde(default)]
    pub device_types: Vec<String>,
}

/// 专栏/官方文档目录树节点（用于左侧导航栏多网页联动）
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogNode {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub slug: Option<String>,
    #[serde(default)]
    pub is_leaf: bool,
    #[serde(default)]
    pub children: Vec<CatalogNode>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn doc_ref_roundtrip_camel_case() {
        let r = DocRef {
            source_id: "huawei-harmonyos".into(),
            catalog: Some("harmonyos-guides".into()),
            slug: "resource-categories-and-access".into(),
            url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access".into(),
        };
        let json = serde_json::to_string(&r).unwrap();
        assert!(json.contains("\"sourceId\""));
        let back: DocRef = serde_json::from_str(&json).unwrap();
        assert_eq!(back, r);
    }
}
