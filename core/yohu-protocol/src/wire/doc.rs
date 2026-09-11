//! 文档域 wire 类型：引用 / 通道 / 原始文档 / 元信息。

use serde::{Deserialize, Serialize};

/// 文档引用：定位一篇文档的最小坐标。
///
/// - 结构化源（华为）：source_id="huawei-harmonyos"，catalog/slug 有值
/// - GitHub 仓库：source_id="github-repo"，catalog=`owner/repo`，slug=仓库内路径
/// - 通用网页：source_id="generic-web"，catalog=None，slug=域名+路径派生
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocRef {
    pub source_id: String,
    #[serde(default)]
    pub catalog: Option<String>,
    pub slug: String,
    pub url: String,
    /// 已解析的 git 坐标（提交 SHA 或完整分支名）。禁止再按 `/` 切开。
    #[serde(default)]
    pub git_ref: Option<String>,
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

/// 仓库 blob 分型。HTML 文档源不填（`None`）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BlobKind {
    Markdown,
    Code,
    Image,
    Binary,
    TooLarge,
}

/// 源文档原始数据（适配器/正文提取的产出）
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawDoc {
    pub title: String,
    #[serde(default)]
    pub update_time: Option<String>,
    pub html: String,
    /// 源就是 Markdown 时填写（GitHub 仓库文件）。与 `html` 互斥：适配器只填一种。
    #[serde(default)]
    pub markdown: Option<String>,
    /// 适配器实际打开的仓库路径。打开仓库根且存在 README 时回写该路径。
    #[serde(default)]
    pub source_path: Option<String>,
    /// 适配器解析后的提交 SHA，回写 `DocRef.git_ref`。
    #[serde(default)]
    pub source_ref: Option<String>,
    /// 仓库 blob 分型；HTML 文档源为 `None`。
    #[serde(default)]
    pub blob_kind: Option<BlobKind>,
    /// 代码/纯文本预览（非 Markdown）。
    #[serde(default)]
    pub text: Option<String>,
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
    #[serde(default)]
    pub blob_kind: Option<BlobKind>,
}

/// 左侧导航树节点（华为专栏，或 GitHub 仓库一层目录）。
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
            git_ref: None,
        };
        let json = serde_json::to_string(&r).unwrap();
        assert!(json.contains("\"sourceId\""));
        let back: DocRef = serde_json::from_str(&json).unwrap();
        assert_eq!(back, r);
    }
}
