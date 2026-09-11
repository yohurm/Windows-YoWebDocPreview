//! 官网树路径 → 本地相对目录（精确 / 规范化 / 包含，失败停在已匹配层）。

use std::collections::HashSet;

use crate::naming::safe_stem;

fn normalize(s: &str) -> String {
    s.replace('（', "(")
        .replace('）', ")")
        .replace('／', "/")
}

fn children_of(dirs: &HashSet<String>, parent: &str) -> Vec<String> {
    let prefix = if parent.is_empty() {
        String::new()
    } else {
        format!("{parent}/")
    };
    let mut kids = Vec::new();
    for d in dirs {
        let rest = if prefix.is_empty() {
            d.as_str()
        } else if let Some(r) = d.strip_prefix(&prefix) {
            r
        } else {
            continue;
        };
        if rest.is_empty() || rest.contains('/') {
            continue;
        }
        kids.push(rest.to_string());
    }
    kids.sort();
    kids
}

fn pick_child(children: &[String], want: &str) -> Option<String> {
    if children.iter().any(|c| c == want) {
        return Some(want.to_string());
    }
    let nwant = normalize(want);
    for c in children {
        if normalize(c) == nwant {
            return Some(c.clone());
        }
    }
    for c in children {
        let nc = normalize(c);
        if nc.contains(&nwant) || nwant.contains(&nc) {
            return Some(c.clone());
        }
    }
    None
}

/// `tree_parts` 从专栏根之下开始。`existing_dirs` 为库内已有目录（`/` 分隔）。
/// 返回相对库根的 `.md` 路径。
pub fn resolve_new_file(
    catalog_root: &str,
    tree_parts: &[String],
    title: &str,
    existing_dirs: &HashSet<String>,
) -> String {
    let mut cur = catalog_root.trim_end_matches('/').to_string();
    for part in tree_parts {
        if part.is_empty() {
            continue;
        }
        let kids = children_of(existing_dirs, &cur);
        let Some(next) = pick_child(&kids, part) else {
            break;
        };
        cur = format!("{cur}/{next}");
    }
    format!("{cur}/{}.md", safe_stem(title))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stops_when_layer_missing() {
        let dirs: HashSet<String> = ["设计/设计指南", "设计/设计指南/通用设计基础"]
            .into_iter()
            .map(str::to_string)
            .collect();
        let path = resolve_new_file(
            "设计/设计指南",
            &["通用设计基础".into(), "新子树".into()],
            "新文档",
            &dirs,
        );
        assert_eq!(path, "设计/设计指南/通用设计基础/新文档.md");
    }

    #[test]
    fn matches_fullwidth_parens() {
        let dirs: HashSet<String> = [
            "开发/指南".into(),
            "开发/指南/应用框架".into(),
            "开发/指南/应用框架/ArkUI（方舟UI框架）".into(),
        ]
        .into_iter()
        .collect();
        let path = resolve_new_file(
            "开发/指南",
            &["应用框架".into(), "ArkUI(方舟UI框架)".into()],
            "简介",
            &dirs,
        );
        assert_eq!(path, "开发/指南/应用框架/ArkUI（方舟UI框架）/简介.md");
    }
}
