use regex::Regex;
use yohu_domain::{github_blob_url, github_raw_url, resolve_repo_path};

use crate::options::GithubConvertOptions;

/// 相对链接补到 blob，相对图片补到 raw。http(s)/锚点不动。
pub fn rewrite_relative(md: &str, opts: &GithubConvertOptions) -> String {
    if opts.owner.is_empty() || opts.repo.is_empty() || opts.git_ref.is_empty() {
        return md.to_string();
    }
    let re = Regex::new(r"!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)").unwrap();
    let rewritten = re
        .replace_all(md, |c: &regex::Captures| {
            if c.get(1).is_some() {
                let alt = &c[1];
                let href = c[2].trim();
                format!("![{alt}]({})", rewrite_target(href, opts, true))
            } else {
                let text = &c[3];
                let href = c[4].trim();
                format!("[{text}]({})", rewrite_target(href, opts, false))
            }
        })
        .into_owned();
    rewrite_html_attrs(&rewritten, opts)
}

fn rewrite_html_attrs(md: &str, opts: &GithubConvertOptions) -> String {
    let re = Regex::new(r#"(?i)(\b(?:src|href)\s*=\s*["'])([^"']+)(["'])"#).unwrap();
    re.replace_all(md, |c: &regex::Captures| {
        let href = c[2].trim();
        let image = c[1].to_ascii_lowercase().contains("src");
        format!("{}{}{}", &c[1], rewrite_target(href, opts, image), &c[3])
    })
    .into_owned()
}

fn rewrite_target(href: &str, opts: &GithubConvertOptions, image: bool) -> String {
    if href.is_empty()
        || href.starts_with('#')
        || href.starts_with("mailto:")
        || href.starts_with("https://")
        || href.starts_with("http://")
        || href.starts_with("data:")
    {
        return href.to_string();
    }
    let path = resolve_repo_path(&opts.path, href);
    if image {
        github_raw_url(&opts.owner, &opts.repo, &opts.git_ref, &path)
    } else {
        github_blob_url(&opts.owner, &opts.repo, &opts.git_ref, &path)
    }
}
