//! 知识库专栏根与路径 → catalog 最长匹配（零 IO）。
//!
//! `localRoot` 来自 testdata/huawei-catalogs.json，禁止在业务分支写死盘符或用户目录。

use crate::doc_ref::huawei_catalogs;

/// 更新时间行上的下线标记（与知识库规范同一字符串）。
pub const OFFLINE_MARK: &str = "（官网已下线）";

/// 给定库内相对路径（manifest 或文件），按最长 localRoot 前缀选专栏。
pub fn catalog_from_rel(rel: &str) -> Option<&'static str> {
    let rel = rel.replace('\\', "/");
    let mut best: Option<(&str, usize)> = None;
    for c in huawei_catalogs() {
        if c.local_root.is_empty() {
            continue;
        }
        let root = c.local_root.as_str();
        let hit = rel == root || rel.starts_with(&format!("{root}/"));
        if hit && best.map(|(_, n)| root.len() > n).unwrap_or(true) {
            best = Some((c.id.as_str(), root.len()));
        }
    }
    best.map(|(id, _)| id)
}

/// 范围目录（如 `开发`、`设计`）下要同步的专栏 id。
pub fn catalogs_in_scope(scope: &[String]) -> Vec<&'static str> {
    huawei_catalogs()
        .iter()
        .filter(|c| {
            if c.local_root.is_empty() {
                return false;
            }
            scope.iter().any(|s| {
                let s = s.replace('\\', "/");
                c.local_root == s || c.local_root.starts_with(&format!("{s}/"))
            })
        })
        .map(|c| c.id.as_str())
        .collect()
}

/// 专栏在库内的相对根。无 localRoot 则 None。
pub fn local_root_for(catalog: &str) -> Option<&'static str> {
    huawei_catalogs()
        .iter()
        .find(|c| c.id == catalog)
        .map(|c| c.local_root.as_str())
        .filter(|s| !s.is_empty())
}

/// 该专栏是否只有库内一份根级 manifest。
pub fn single_root_manifest(catalog: &str) -> bool {
    matches!(catalog, "harmonyos-references" | "harmonyos-releases")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn longest_root_wins_over_substring() {
        assert_eq!(
            catalog_from_rel("设计/设计指南/通用设计基础/manifest.json"),
            Some("design-guides")
        );
        assert_eq!(
            catalog_from_rel("开发/指南/入门/manifest.json"),
            Some("harmonyos-guides")
        );
        assert_eq!(
            catalog_from_rel("开发/最佳实践/功能开发/manifest.json"),
            Some("best-practices")
        );
        assert_eq!(catalog_from_rel("知识库/文档抓取方法/x.md"), None);
    }

    #[test]
    fn scope_开发_excludes_design() {
        let ids = catalogs_in_scope(&["开发".into()]);
        assert!(ids.contains(&"harmonyos-guides"));
        assert!(ids.contains(&"best-practices"));
        assert!(!ids.contains(&"design-guides"));
    }

    #[test]
    fn scope_设计_only_design_guides() {
        let ids = catalogs_in_scope(&["设计".into()]);
        assert_eq!(ids, vec!["design-guides"]);
    }
}
