//! manifest 模型：解析/序列化/校验（兼容现有知识库格式）。
//!
//! 只做字符串级解析与 schema 校验；磁盘读写由 yohu-library 承担。

use yohu_protocol::LibraryEntry;

/// 解析 manifest JSON（顶层数组）。容忍单条损坏：坏条目跳过并计数返回；
/// 整体非 JSON 或顶层非数组返回 `(vec![], usize::MAX)`。
pub fn parse_manifest(json: &str) -> (Vec<LibraryEntry>, usize) {
    let mut entries = Vec::new();
    let Ok(v) = serde_json::from_str::<serde_json::Value>(json) else {
        return (entries, usize::MAX);
    };
    let Some(arr) = v.as_array() else {
        return (entries, usize::MAX);
    };
    let mut skipped = 0usize;
    for item in arr {
        match serde_json::from_value::<LibraryEntry>(item.clone()) {
            Ok(e) => entries.push(e),
            Err(_) => skipped += 1,
        }
    }
    (entries, skipped)
}

/// 序列化 manifest 为 pretty JSON（中文原样输出）。
pub fn to_manifest_json(entries: &[LibraryEntry]) -> String {
    serde_json::to_string_pretty(entries).unwrap_or_else(|_| "[]".into())
}

/// 必填字段校验：file/url/slug/catalog 非空。
pub fn validate_entry(e: &LibraryEntry) -> Result<(), &'static str> {
    if e.file.trim().is_empty() {
        return Err("file is empty");
    }
    if e.url.trim().is_empty() {
        return Err("url is empty");
    }
    if e.slug.trim().is_empty() {
        return Err("slug is empty");
    }
    if e.catalog.trim().is_empty() {
        return Err("catalog is empty");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const LEGACY_SAMPLE: &str = r#"[
      {
        "file": "开发/指南/入门/资源分类与访问.md",
        "url": "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access",
        "slug": "resource-categories-and-access",
        "catalog": "harmonyos-guides",
        "local_time": "2026-04-30 02:41:24",
        "official_time": "2026-05-26 06:48:54",
        "status": "UPDATE"
      },
      { "bad": true }
    ]"#;

    #[test]
    fn parses_legacy_manifest_skipping_bad_entries() {
        let (entries, skipped) = parse_manifest(LEGACY_SAMPLE);
        assert_eq!(skipped, 1);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].slug, "resource-categories-and-access");
    }

    #[test]
    fn rejects_non_array_top_level() {
        for bad in [r#"{"a":1}"#, "not json at all"] {
            let (entries, skipped) = parse_manifest(bad);
            assert!(entries.is_empty());
            assert_eq!(skipped, usize::MAX);
        }
    }

    #[test]
    fn roundtrip_preserves_chinese_paths() {
        let (entries, _) = parse_manifest(LEGACY_SAMPLE);
        let json = to_manifest_json(&entries);
        assert!(json.contains("开发/指南/入门/资源分类与访问.md"));
        let (back, skipped) = parse_manifest(&json);
        assert_eq!(skipped, 0);
        assert_eq!(back.len(), 1);
        assert_eq!(back[0].file, entries[0].file);
    }

    #[test]
    fn validate_rejects_blank_required_fields() {
        let mut e = LibraryEntry {
            file: "a.md".into(),
            url: "https://x".into(),
            slug: "s".into(),
            catalog: "c".into(),
            local_time: None,
            official_time: None,
            status: None,
        };
        assert!(validate_entry(&e).is_ok());
        e.slug = "  ".into();
        assert_eq!(validate_entry(&e), Err("slug is empty"));
    }
}