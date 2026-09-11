//! yohu-md-github — GitHub 仓库 Markdown 方言。
//!
//! 输入已是 Markdown，不走 HTML 管线。只依赖 convert 的文档头与 domain 身份。

mod links;
mod options;

pub use options::GithubConvertOptions;

use yohu_md_convert::build_header;

/// 仓库 Markdown → 预览正文：只改相对链接，不加转换头。
pub fn markdown_to_document(md: &str, opts: &GithubConvertOptions) -> String {
    let mut body = links::rewrite_relative(md.trim(), opts);
    if !body.ends_with('\n') {
        body.push('\n');
    }
    body
}

/// 导出时再补文档头，避免预览叠「来源」行和重复标题。
pub fn with_export_header(md: &str, opts: &GithubConvertOptions) -> String {
    build_header(&opts.to_inner(), "") + md.trim_start()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts() -> GithubConvertOptions {
        GithubConvertOptions {
            title: "Guide".into(),
            update_time: None,
            source_url: "https://github.com/o/r/blob/main/docs/guide.md".into(),
            owner: "o".into(),
            repo: "r".into(),
            git_ref: "main".into(),
            path: "docs/guide.md".into(),
        }
    }

    #[test]
    fn rewrites_relative_doc_and_image() {
        let md = markdown_to_document(
            "# Guide\n\nSee [install](./install.md) and ![](./shot.png).",
            &opts(),
        );
        assert!(md.contains("# Guide"));
        assert!(!md.contains("来源："));
        assert!(md.contains("](https://github.com/o/r/blob/main/docs/install.md)"));
        assert!(md.contains("](https://raw.githubusercontent.com/o/r/main/docs/shot.png)"));
        assert!(!md.contains("](./install.md)"));
    }

    #[test]
    fn keeps_absolute_and_hash_links() {
        let md = markdown_to_document(
            "[a](https://example.com/x) and [here](#anchor)",
            &opts(),
        );
        assert!(md.contains("](https://example.com/x)"));
        assert!(md.contains("](#anchor)"));
    }

    #[test]
    fn rewrites_embedded_html_assets() {
        let md = markdown_to_document(
            r#"<div align="center"><img src="./shot.png" width="80"></div>"#,
            &opts(),
        );
        assert!(md.contains("https://raw.githubusercontent.com/o/r/main/docs/shot.png"));
        assert!(!md.contains("./shot.png"));
    }

    #[test]
    fn export_header_is_opt_in() {
        let body = markdown_to_document("# Guide\n\ntext", &opts());
        let exported = with_export_header(&body, &opts());
        assert!(exported.contains("来源：https://github.com/o/r/blob/main/docs/guide.md"));
        assert!(exported.starts_with("# Guide"));
    }
}
