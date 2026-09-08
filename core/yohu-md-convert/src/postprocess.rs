//! 后处理（全程保护代码块）：尖括号转义 / `$r` 类转义 / 图片独立成行 /
//! 前导空格清理 / API 参考元数据间距（Python 后处理段）。

use regex::Regex;

/// 执行全部后处理。
pub fn run(md: &str, catalog: Option<&str>) -> String {
    let md = escape_placeholders(md);
    let md = split_images_to_lines(&md);
    let md = clean_leading_spaces(&md);
    if catalog == Some("harmonyos-references") {
        api_metadata_spacing(&md)
    } else {
        md
    }
}

/// `<pid>` 类尖括号转义、$r/$rawfile/%d$s 转义（非代码区）。
fn escape_placeholders(md: &str) -> String {
    map_non_code(md, |section| {
        let s = Regex::new(r"<(pid|bundleName|uri|\w+)>")
            .unwrap()
            .replace_all(section, concat!("&", "lt;${1}", "&", "gt;"))
            .into_owned();
        // 对标 Python `re.sub(r'\$r\b', r'\\$r', s)`：替换串中 `$` 必须写作
        // `$$`，否则 `$r` 被解析为捕获组引用展开为空（真实缺陷：`$r('x')` 曾
        // 被吃成 `\('x')`）。
        let s = Regex::new(r"\$r\b").unwrap().replace_all(&s, r"\$$r").into_owned();
        let s = Regex::new(r"\$rawfile\b")
            .unwrap()
            .replace_all(&s, r"\$$rawfile")
            .into_owned();
        Regex::new(r"(%\d+)\$([sd])")
            .unwrap()
            .replace_all(&s, "${1}\\$$${2}")
            .into_owned()
    })
}

/// 图片引用独立成行。
fn split_images_to_lines(md: &str) -> String {
    map_non_code(md, |section| {
        let img_split = Regex::new(r"(!\[.*?\]\(.*?\))").unwrap();
        let mut result: Vec<String> = Vec::new();
        for line in section.split('\n') {
            let has_img = line.contains("![") && line.contains("](") && !line.trim_start().starts_with("![");
            if has_img {
                for part in img_split.split(line) {
                    let part = part.trim();
                    if !part.is_empty() {
                        result.push(part.to_string());
                    }
                }
            } else {
                result.push(line.to_string());
            }
        }
        result.join("\n")
    })
}

/// 清理前导空格（非特殊行）。
fn clean_leading_spaces(md: &str) -> String {
    map_non_code(md, |section| {
        section
            .split('\n')
            .map(|line| {
                let s = line.trim_start();
                if line.starts_with("    ") && !s.starts_with(['-', '>', '|', '#', '`']) {
                    s.to_string()
                } else {
                    line.to_string()
                }
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
}

/// API 元数据行之间插入空行（连续 `**xxx：**` 行间空一行）。
fn api_metadata_spacing(md: &str) -> String {
    map_non_code(md, |section| {
        let meta_re = Regex::new(r"^\*\*[^*]+[：:]\*\*").unwrap();
        let mut result: Vec<String> = Vec::new();
        let mut prev_meta = false;
        for line in section.split('\n') {
            let is_meta = meta_re.is_match(line.trim());
            if is_meta && prev_meta {
                result.push(String::new());
            }
            result.push(line.to_string());
            prev_meta = is_meta;
        }
        result.join("\n")
    })
}

/// 对非代码区（``` 围栏之外）逐段应用变换。
fn map_non_code<F>(md: &str, f: F) -> String
where
    F: Fn(&str) -> String,
{
    let fence = Regex::new(r"(?s)```.*?```").unwrap();
    let mut out = String::new();
    let mut last = 0usize;
    for m in fence.find_iter(md) {
        out.push_str(&f(&md[last..m.start()]));
        out.push_str(m.as_str());
        last = m.end();
    }
    out.push_str(&f(&md[last..]));
    out
}