//! 更新时间归一化与对比（移植 check_updates.py::normalize_time）。
//!
//! 归一化规则：trim 后取前 19 字符（"YYYY-MM-DD HH:MM:SS"），
//! 以兼容官方时间可能带时区后缀（"… CST"）的情况。

/// 归一化：trim + 截取前 19 字符。
pub fn normalize_time(t: &str) -> &str {
    let t = t.trim();
    if t.len() >= 19 { &t[..19] } else { t }
}

/// 对比本地与官方时间：不同则需更新。
/// 本地缺失视为 NEW；官方缺失无法判定 → false。
pub fn needs_update(local: Option<&str>, official: Option<&str>) -> bool {
    matches!(classify(local, official), UpdateKind::New | UpdateKind::Update)
}

/// 判定结果分类
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpdateKind {
    Unchanged,
    New,
    Update,
}

/// 一步产出分类（供更新检查执行器使用）。
pub fn classify(local: Option<&str>, official: Option<&str>) -> UpdateKind {
    let official = match official.map(str::trim).filter(|s| !s.is_empty()) {
        Some(o) => o,
        None => return UpdateKind::Unchanged,
    };
    let local = local.map(str::trim).filter(|s| !s.is_empty());
    match local {
        None => UpdateKind::New,
        Some(l) if normalize_time(l) == normalize_time(official) => UpdateKind::Unchanged,
        Some(_) => UpdateKind::Update,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_truncates_timezone_suffix() {
        assert_eq!(normalize_time("2026-05-26 06:48:54 CST"), "2026-05-26 06:48:54");
        assert_eq!(normalize_time("  2026-05-26 06:48:54  "), "2026-05-26 06:48:54");
        assert_eq!(normalize_time("2026-05-26"), "2026-05-26");
    }

    #[test]
    fn same_time_ignoring_timezone_is_unchanged() {
        assert_eq!(
            classify(Some("2026-05-26 06:48:54"), Some("2026-05-26 06:48:54 CST")),
            UpdateKind::Unchanged
        );
    }

    #[test]
    fn missing_local_means_new() {
        assert_eq!(classify(None, Some("2026-05-26 06:48:54")), UpdateKind::New);
        assert_eq!(classify(Some(""), Some("2026-05-26 06:48:54")), UpdateKind::New);
    }

    #[test]
    fn missing_official_cannot_judge() {
        assert_eq!(classify(None, None), UpdateKind::Unchanged);
        assert_eq!(classify(Some("2026-01-01 00:00:00"), Some("")), UpdateKind::Unchanged);
    }

    #[test]
    fn differing_times_mean_update() {
        assert_eq!(
            classify(Some("2026-04-30 02:41:24"), Some("2026-05-26 06:48:54")),
            UpdateKind::Update
        );
        assert!(needs_update(Some("2026-04-30 02:41:24"), Some("2026-05-26 06:48:54")));
        assert!(!needs_update(Some("2026-05-26 06:48:54"), Some("2026-05-26 06:48:54 CST")));
    }
}