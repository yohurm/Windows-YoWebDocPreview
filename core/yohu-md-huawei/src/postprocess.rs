//! 华为/HarmonyOS 后处理：行内图标保护、$r / $rawfile / API 参考元数据间距。

use regex::Regex;

pub fn protect_inline_icons(md: &str) -> (String, Vec<String>) {
    let re = Regex::new(r"!\[icon\]\([^)]+\)").unwrap();
    let mut icons = Vec::new();
    let out = re
        .replace_all(md, |c: &regex::Captures| {
            let i = icons.len();
            icons.push(c[0].to_string());
            format!("\u{2}I{i}\u{2}")
        })
        .into_owned();
    (out, icons)
}

pub fn restore_inline_icons(md: &str, icons: &[String]) -> String {
    let mut out = md.to_string();
    for (i, icon) in icons.iter().enumerate() {
        out = out.replace(&format!("\u{2}I{i}\u{2}"), icon);
    }
    out
}

pub fn escape_placeholders(md: &str) -> String {
    map_non_code(md, |section| {
        let s = Regex::new(r"<(pid|bundleName|uri|\w+)>")
            .unwrap()
            .replace_all(section, concat!("&", "lt;${1}", "&", "gt;"))
            .into_owned();
        let s = Regex::new(r"\$r\b")
            .unwrap()
            .replace_all(&s, r"\$$r")
            .into_owned();
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

pub fn api_metadata_spacing(md: &str) -> String {
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
