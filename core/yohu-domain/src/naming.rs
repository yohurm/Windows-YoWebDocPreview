//! 导出文件名/目录名派生（标题 → 安全文件名）。
//!
//! Windows 禁用字符 `< > : " / \ | ? *` 与保留名（CON/PRN/AUX/NUL/COM?/LPT?）；
//! 空白折叠为单个空格，首尾点空格去除；空结果回退 "untitled"。

use std::path::{Path, PathBuf};

/// 将标题转为安全文件名主体（不含扩展名）。
pub fn safe_stem(title: &str) -> String {
    let folded: String = title
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            c if c.is_control() => ' ',
            c => c,
        })
        .collect();
    let collapsed = folded.split_whitespace().collect::<Vec<_>>().join(" ");
    let out = collapsed
        .trim_matches(|c| matches!(c, '.' | ' ' | '-'))
        .to_string();
    if out.is_empty() || is_reserved(&out) {
        "untitled".into()
    } else {
        out
    }
}

fn is_reserved(name: &str) -> bool {
    let base = name.split('.').next().unwrap_or(name).to_ascii_uppercase();
    matches!(base.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (base.len() > 3
            && base.starts_with("COM")
            && base[3..].chars().all(|c| c.is_ascii_digit()))
        || (base.len() > 3
            && base.starts_with("LPT")
            && base[3..].chars().all(|c| c.is_ascii_digit()))
}

/// assets 子目录名 = 文档文件 stem（同脚本 build_image_map 约定）。
pub fn assets_dir_for(md_path: &Path) -> PathBuf {
    let stem = md_path.file_stem().and_then(|s| s.to_str()).unwrap_or("untitled");
    md_path.parent().unwrap_or(Path::new(".")).join("assets").join(stem)
}

/// 校验清单导入的目标相对路径不含穿越（拒绝 `..` 段与绝对路径）。
pub fn is_safe_rel_path(rel: &str) -> bool {
    if rel.is_empty() {
        return false;
    }
    if Path::new(rel).is_absolute() {
        return false;
    }
    rel.split(['/', '\\']).all(|seg| seg != ".." && !seg.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_windows_illegal_chars() {
        // 非法字符替换为 '-'，首尾的 '-' 随 trim 去除
        assert_eq!(safe_stem(r#"UIAbility<A/B>:概览*?"#), "UIAbility-A-B--概览");
    }

    #[test]
    fn collapses_whitespace_and_trims_dots() {
        assert_eq!(safe_stem("  多   空格  标题。.. "), "多 空格 标题。");
    }

    #[test]
    fn empty_falls_back_to_untitled() {
        assert_eq!(safe_stem(""), "untitled");
        assert_eq!(safe_stem("???"), "untitled");
        assert_eq!(safe_stem("..."), "untitled");
    }

    #[test]
    fn reserved_device_names_are_replaced() {
        assert_eq!(safe_stem("CON"), "untitled");
        assert_eq!(safe_stem("com1"), "untitled");
        assert_eq!(safe_stem("LPT4.txt"), "untitled");
        assert_eq!(safe_stem("console"), "console"); // 非保留名
    }

    #[test]
    fn assets_dir_uses_doc_stem() {
        let p = Path::new("开发/指南/入门/资源分类与访问.md");
        assert_eq!(
            assets_dir_for(p),
            Path::new("开发/指南/入门/assets/资源分类与访问")
        );
    }

    #[test]
    fn rejects_traversal_and_absolute() {
        assert!(!is_safe_rel_path("../secret.txt"));
        assert!(!is_safe_rel_path("a/../../b.md"));
        assert!(!is_safe_rel_path("C:\\Windows\\x.md"));
        assert!(!is_safe_rel_path(""));
        assert!(is_safe_rel_path("开发/指南/入门/x.md"));
        assert!(is_safe_rel_path("single.md"));
    }
}