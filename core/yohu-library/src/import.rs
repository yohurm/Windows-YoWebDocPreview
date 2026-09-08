//! 外部清单导入：`docs_to_update.json` → 批量任务条目。

use crate::batch::BatchItem;
use crate::error::LibraryError;

/// 导入清单条目格式（兼容 yovo-harmonyos-docs 抓取脚本输出）
#[derive(Debug, Clone, serde::Deserialize)]
pub struct ImportEntry {
    pub url: String,
    /// 库内目标相对目录（可选；缺省放库根）
    #[serde(default)]
    pub dir: Option<String>,
}

/// 解析导入清单 JSON（顶层数组）。
///
/// 目标目录做防穿越校验（拒绝 `..` 段与绝对路径）。
pub fn parse_import_list(json: &str) -> Result<Vec<BatchItem>, LibraryError> {
    let raw: Vec<ImportEntry> = serde_json::from_str(json)
        .map_err(|e| LibraryError::invalid(format!("清单格式错误: {e}")))?;
    let mut items = Vec::with_capacity(raw.len());
    for e in raw {
        if e.url.trim().is_empty() {
            return Err(LibraryError::invalid("清单含空 URL"));
        }
        let rel_dir = e.dir.unwrap_or_default();
        if !rel_dir.is_empty() && !yohu_domain::is_safe_rel_path(&rel_dir) {
            return Err(LibraryError::invalid(format!("目标目录不安全: {rel_dir}")));
        }
        items.push(BatchItem { url: e.url, rel_dir });
    }
    Ok(items)
}

/// 从文件读取并解析。
pub fn import_file(path: &std::path::Path) -> Result<Vec<BatchItem>, LibraryError> {
    let json = std::fs::read_to_string(path)?;
    parse_import_list(&json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_list_with_dirs() {
        let items = parse_import_list(
            r#"[
                {"url": "https://a.com/1"},
                {"url": "https://a.com/2", "dir": "开发/指南"}
            ]"#,
        )
        .unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].rel_dir, "");
        assert_eq!(items[1].rel_dir, "开发/指南");
    }

    #[test]
    fn rejects_traversal_dir() {
        let err = parse_import_list(r#"[{"url": "https://a.com", "dir": "../out"}]"#).unwrap_err();
        assert!(matches!(err, LibraryError::Invalid(_)));
    }

    #[test]
    fn rejects_bad_json_and_empty_url() {
        assert!(parse_import_list("not json").is_err());
        assert!(parse_import_list(r#"[{"url": " "}]"#).is_err());
    }
}
