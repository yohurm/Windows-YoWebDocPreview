//! 通用后处理：强调闭合、块图分行、前导空格。不含站点占位符。

use regex::Regex;

pub fn run_generic(md: &str) -> String {
    let md = split_images_to_lines(md);
    let md = pad_emphasis_closers(&md);
    clean_leading_spaces(&md)
}

fn pad_emphasis_closers(md: &str) -> String {
    map_non_code(md, |section| {
        let re = Regex::new(r"\*\*([^*]+)\*\*(\S)").unwrap();
        re.replace_all(section, |c: &regex::Captures| {
            let inner = &c[1];
            let next = &c[2];
            let last = inner.chars().last();
            let next_ch = next.chars().next();
            if last.is_some_and(|ch| ch == '…' || ch == '.')
                && next_ch.is_some_and(|ch| !ch.is_ascii_punctuation() && ch != '。' && ch != '，')
            {
                format!("**{inner}** {next}")
            } else {
                c[0].to_string()
            }
        })
        .into_owned()
    })
}

fn split_images_to_lines(md: &str) -> String {
    map_non_code(md, |section| {
        let img_split = Regex::new(r"(!\[.*?\]\(.*?\))").unwrap();
        let mut result: Vec<String> = Vec::new();
        for line in section.split('\n') {
            let has_mixed_img = line.contains("![")
                && line.contains("](")
                && !line.trim_start().starts_with("![");
            if has_mixed_img {
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
