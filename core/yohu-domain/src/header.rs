//! 知识库 Markdown 头：更新时间、下线标记。纯字符串，零 IO。

use crate::catalog::OFFLINE_MARK;

/// 读第一处 `更新时间：`，去掉下线标记后再给时间对比用。
pub fn extract_update_time(md: &str) -> Option<String> {
    for line in md.lines() {
        let Some(rest) = line.strip_prefix("更新时间：") else {
            continue;
        };
        let rest = rest
            .trim()
            .strip_suffix(OFFLINE_MARK)
            .unwrap_or(rest)
            .trim();
        if !rest.is_empty() {
            return Some(rest.to_string());
        }
    }
    None
}

pub fn is_marked_offline(md: &str) -> bool {
    md.lines().any(|l| l.contains(OFFLINE_MARK))
}

/// 在首条更新时间行末追加下线标记。已标记则原样返回。
pub fn mark_offline(md: &str) -> String {
    if is_marked_offline(md) {
        return md.to_string();
    }
    let mut out = String::with_capacity(md.len() + OFFLINE_MARK.len());
    let mut done = false;
    for (i, line) in md.lines().enumerate() {
        if i > 0 {
            out.push('\n');
        }
        if !done && line.starts_with("更新时间：") {
            out.push_str(line.trim_end());
            out.push_str(OFFLINE_MARK);
            done = true;
        } else {
            out.push_str(line);
        }
    }
    if md.ends_with('\n') {
        out.push('\n');
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_offline_suffix_from_time() {
        let md = "# T\n\n更新时间：2026-06-12 06:54:11（官网已下线）\n\n来源：x\n";
        assert_eq!(
            extract_update_time(md).as_deref(),
            Some("2026-06-12 06:54:11")
        );
        assert!(is_marked_offline(md));
    }

    #[test]
    fn mark_is_idempotent() {
        let md = "# T\n\n更新时间：2026-01-01 00:00:00\n\n来源：x\n";
        let once = mark_offline(md);
        assert!(once.contains("更新时间：2026-01-01 00:00:00（官网已下线）"));
        assert_eq!(mark_offline(&once), once);
    }
}
