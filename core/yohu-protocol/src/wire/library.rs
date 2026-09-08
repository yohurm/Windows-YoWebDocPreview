//! 文档库域 wire 类型：manifest 条目 / 更新状态 / 目录树。

use serde::{Deserialize, Serialize};

/// manifest 条目（兼容现有知识库格式字段）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct LibraryEntry {
    pub file: String,
    pub url: String,
    pub slug: String,
    pub catalog: String,
    #[serde(default)]
    pub local_time: Option<String>,
    #[serde(default)]
    pub official_time: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
}

/// 更新检查结果条目状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UpdateStatus {
    New,
    Update,
}

/// 库目录树节点
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(default)]
    pub children: Vec<TreeNode>,
}

/// 批量任务条目（`batch.run` 输入与 `library.importList` 输出共用）
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchEntry {
    pub url: String,
    /// 库内目标相对目录（空 = 库根）
    #[serde(default)]
    pub rel_dir: String,
}

/// `library.importList` 返回：解析后的待办条目清单
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportListResult {
    pub count: u32,
    pub items: Vec<BatchEntry>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn library_entry_matches_legacy_manifest_format() {
        // 兼容现有知识库 manifest.json 字段（snake_case 无前缀包装）
        let json = r#"{
            "file": "开发/指南/入门/资源分类与访问.md",
            "url": "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access",
            "slug": "resource-categories-and-access",
            "catalog": "harmonyos-guides",
            "local_time": "2026-04-30 02:41:24",
            "official_time": "2026-05-26 06:48:54",
            "status": "UPDATE"
        }"#;
        let e: LibraryEntry = serde_json::from_str(json).unwrap();
        assert_eq!(e.slug, "resource-categories-and-access");
        assert_eq!(e.catalog, "harmonyos-guides");
        assert_eq!(e.status.as_deref(), Some("UPDATE"));
    }

    #[test]
    fn library_entry_tolerates_missing_optional_fields() {
        // generic-web 条目时间字段缺失
        let json = r#"{
            "file": "web/example.md",
            "url": "https://example.com/post",
            "slug": "example-com-post",
            "catalog": "web"
        }"#;
        let e: LibraryEntry = serde_json::from_str(json).unwrap();
        assert!(e.local_time.is_none());
        assert!(e.status.is_none());
    }

    #[test]
    fn batch_entry_camel_case_with_default_rel_dir() {
        let e: BatchEntry =
            serde_json::from_str(r#"{"url": "https://example.com/a"}"#).unwrap();
        assert_eq!(e.rel_dir, "");
        let json = serde_json::to_string(&BatchEntry {
            url: "https://example.com/a".into(),
            rel_dir: "开发/指南".into(),
        })
        .unwrap();
        assert!(json.contains("\"relDir\""));
    }

    #[test]
    fn import_list_result_shape() {
        let r = ImportListResult {
            count: 1,
            items: vec![BatchEntry { url: "u".into(), rel_dir: "d".into() }],
        };
        let json = serde_json::to_string(&r).unwrap();
        assert!(json.contains("\"count\":1"));
        assert!(json.contains("\"items\""));
    }
}
