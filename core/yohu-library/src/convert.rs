//! 转换编排：按 `source_id` 选引擎。壳与 store 只走这里，禁止各自 if 方言。

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use yohu_domain::{apply_known_ref, parse_github, parse_github_catalog, safe_stem, GithubLoc};
use yohu_protocol::{BlobKind, DocMeta, RawDoc};
use yohu_runtime::atomic_write;

use crate::error::LibraryError;

pub fn convert_document(
    meta: &DocMeta,
    raw: &RawDoc,
    page_url: &str,
    image_map: HashMap<String, String>,
) -> String {
    if yohu_domain::is_github_source(&meta.doc_ref.source_id) {
        return convert_github_preview(meta, raw, page_url);
    }
    if yohu_domain::is_huawei_source(&meta.doc_ref.source_id) {
        return yohu_md_huawei::html_to_markdown(
            raw.html.as_str(),
            &yohu_md_huawei::HuaweiConvertOptions {
                title: meta.title.clone(),
                update_time: meta.update_time.clone(),
                source_url: page_url.to_string(),
                catalog: meta.doc_ref.catalog.clone(),
                image_map,
                device_types: meta.device_types.clone(),
            },
        );
    }
    yohu_md_convert::html_to_markdown(
        raw.html.as_str(),
        &yohu_md_convert::ConvertOptions {
            title: meta.title.clone(),
            update_time: meta.update_time.clone(),
            source_url: page_url.to_string(),
            image_map,
            base_url: Some(page_url.to_string()),
        },
    )
}

/// 预览正文：代码给原文；图/二进制由 UI 按 `blobKind` 画，这里不编用户文案。
fn convert_github_preview(meta: &DocMeta, raw: &RawDoc, page_url: &str) -> String {
    match raw.blob_kind {
        Some(BlobKind::Code) => raw.text.clone().unwrap_or_default(),
        Some(BlobKind::Image | BlobKind::Binary | BlobKind::TooLarge) => String::new(),
        Some(BlobKind::Markdown) | None => {
            let md = raw.markdown.as_deref().unwrap_or("");
            yohu_md_github::markdown_to_document(md, &github_opts(meta, page_url))
        }
    }
}

pub fn export_document(
    meta: &DocMeta,
    raw: &RawDoc,
    page_url: &str,
    image_map: HashMap<String, String>,
) -> String {
    if yohu_domain::is_github_source(&meta.doc_ref.source_id) {
        let opts = github_opts(meta, page_url);
        let body = match raw.blob_kind {
            Some(BlobKind::Code) => {
                let ext = file_ext(&meta.doc_ref.slug);
                let text = raw.text.clone().unwrap_or_default();
                format!("```{ext}\n{text}\n```\n")
            }
            Some(BlobKind::Image) => format!(
                "![{}]({})\n",
                meta.title,
                yohu_domain::github_raw_url(&opts.owner, &opts.repo, &opts.git_ref, &opts.path)
            ),
            Some(BlobKind::Binary | BlobKind::TooLarge) => String::new(),
            Some(BlobKind::Markdown) | None => convert_github_preview(meta, raw, page_url),
        };
        return yohu_md_github::with_export_header(&body, &opts);
    }
    convert_document(meta, raw, page_url, image_map)
}

/// 预览导出：写一篇 Markdown，不改 manifest、不拉图。
pub fn export_to_dir(
    dest_dir: &Path,
    meta: &DocMeta,
    raw: &RawDoc,
    page_url: &str,
) -> Result<PathBuf, LibraryError> {
    std::fs::create_dir_all(dest_dir)?;
    let md_path = dest_dir.join(format!("{}.md", safe_stem(&meta.title)));
    let md = export_document(meta, raw, page_url, HashMap::new());
    atomic_write(&md_path, md)?;
    Ok(md_path)
}

pub fn convert_html(
    meta: &DocMeta,
    html: &str,
    page_url: &str,
    image_map: HashMap<String, String>,
) -> String {
    convert_document(
        meta,
        &RawDoc {
            title: meta.title.clone(),
            update_time: meta.update_time.clone(),
            html: html.to_string(),
            markdown: None,
            source_path: None,
            source_ref: None,
            blob_kind: None,
            text: None,
            device_types: meta.device_types.clone(),
        },
        page_url,
        image_map,
    )
}

fn github_opts(meta: &DocMeta, page_url: &str) -> yohu_md_github::GithubConvertOptions {
    let mut loc = parse_github(page_url).unwrap_or_else(|| loc_from_meta(meta));
    if let Some(known) = meta.doc_ref.git_ref.as_deref() {
        loc = apply_known_ref(loc, known);
    }
    let path = if !meta.doc_ref.slug.is_empty() {
        meta.doc_ref.slug.clone()
    } else {
        loc.path
    };
    yohu_md_github::GithubConvertOptions {
        title: meta.title.clone(),
        update_time: meta.update_time.clone(),
        source_url: page_url.to_string(),
        owner: loc.owner,
        repo: loc.repo,
        git_ref: meta
            .doc_ref
            .git_ref
            .clone()
            .or(loc.git_ref)
            .unwrap_or_else(|| "HEAD".into()),
        path,
    }
}

fn file_ext(path: &str) -> &str {
    path.rsplit('.')
        .next()
        .filter(|s| *s != path)
        .unwrap_or("text")
}

fn loc_from_meta(meta: &DocMeta) -> GithubLoc {
    let (owner, repo) = meta
        .doc_ref
        .catalog
        .as_deref()
        .and_then(parse_github_catalog)
        .unwrap_or_else(|| (String::new(), String::new()));
    GithubLoc {
        owner,
        repo,
        git_ref: meta.doc_ref.git_ref.clone(),
        path: meta.doc_ref.slug.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use yohu_protocol::{DocMeta, DocRef, FetchChannel};

    fn meta(source_id: &str) -> DocMeta {
        DocMeta {
            title: "t".into(),
            update_time: None,
            source_url: "https://example.com/x".into(),
            channel: FetchChannel::GenericWeb,
            device_types: vec![],
            blob_kind: None,
            doc_ref: DocRef {
                source_id: source_id.into(),
                catalog: Some("harmonyos-guides".into()),
                slug: "x".into(),
                url: "https://example.com/x".into(),
                git_ref: None,
            },
        }
    }

    #[test]
    fn generic_source_skips_huawei_note() {
        let md = convert_html(
            &meta(yohu_domain::GENERIC_WEB_SOURCE_ID),
            r#"<div class="note"><span class="notetitle">注意：</span><div class="notebody">危险</div></div>"#,
            "https://example.com/x",
            Default::default(),
        );
        assert!(!md.contains("> [!WARNING]"), "{md}");
    }

    #[test]
    fn huawei_source_applies_note() {
        let md = convert_html(
            &meta(yohu_domain::huawei_source_id()),
            r#"<div class="note"><span class="notetitle">注意：</span><div class="notebody">危险</div></div>"#,
            "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/x",
            Default::default(),
        );
        assert!(md.contains("> [!WARNING]"), "{md}");
    }

    #[test]
    fn github_source_keeps_markdown() {
        let mut m = meta(yohu_domain::github_source_id());
        m.doc_ref.catalog = Some("o/r".into());
        m.doc_ref.slug = "docs/guide.md".into();
        m.title = "Guide".into();
        let raw = RawDoc {
            title: "Guide".into(),
            update_time: None,
            html: String::new(),
            markdown: Some("# Guide\n\nSee [x](./x.md)".into()),
            source_path: Some("docs/guide.md".into()),
            source_ref: None,
            blob_kind: Some(BlobKind::Markdown),
            text: None,
            device_types: vec![],
        };
        let md = convert_document(
            &m,
            &raw,
            "https://github.com/o/r/blob/main/docs/guide.md",
            Default::default(),
        );
        assert!(md.contains("See [x](https://github.com/o/r/blob/main/docs/x.md)"), "{md}");
        assert!(!md.contains("来源："), "{md}");
        assert!(!md.contains("> [!WARNING]"));
        let exported = export_document(
            &m,
            &raw,
            "https://github.com/o/r/blob/main/docs/guide.md",
            Default::default(),
        );
        assert!(exported.contains("来源：https://github.com/o/r/blob/main/docs/guide.md"));
        assert_eq!(exported.matches("# Guide").count(), 1);
    }

    #[test]
    fn github_code_preview_is_raw_text_export_is_fenced() {
        let mut m = meta(yohu_domain::github_source_id());
        m.doc_ref.catalog = Some("o/r".into());
        m.doc_ref.slug = "src/lib.rs".into();
        m.blob_kind = Some(BlobKind::Code);
        m.title = "lib.rs".into();
        let raw = RawDoc {
            title: "lib.rs".into(),
            blob_kind: Some(BlobKind::Code),
            text: Some("fn main() {}\n".into()),
            ..RawDoc::default()
        };
        let preview = convert_document(
            &m,
            &raw,
            "https://github.com/o/r/blob/main/src/lib.rs",
            Default::default(),
        );
        assert_eq!(preview, "fn main() {}\n");
        let exported = export_document(
            &m,
            &raw,
            "https://github.com/o/r/blob/main/src/lib.rs",
            Default::default(),
        );
        assert!(exported.contains("```rs\nfn main() {}\n\n```"), "{exported}");
    }

    #[test]
    fn github_binary_preview_leaves_presentation_to_ui() {
        let mut m = meta(yohu_domain::github_source_id());
        m.doc_ref.catalog = Some("o/r".into());
        m.doc_ref.slug = "a.bin".into();
        m.blob_kind = Some(BlobKind::Binary);
        let raw = RawDoc {
            blob_kind: Some(BlobKind::Binary),
            ..RawDoc::default()
        };
        let preview = convert_document(
            &m,
            &raw,
            "https://github.com/o/r/blob/main/a.bin",
            Default::default(),
        );
        assert!(preview.is_empty());
    }
}
