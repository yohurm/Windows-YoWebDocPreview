//! 解析编排：先走既有 convert，再交给 yohu-ai。禁止在此重写标题算法。

use yohu_protocol::{AgentDocument, DocMeta, RawDoc};

use crate::convert::convert_document;

/// 预览同款 Markdown + 大纲/章节。
pub fn parse_document(meta: &DocMeta, raw: &RawDoc, page_url: &str) -> AgentDocument {
    let markdown = convert_document(meta, raw, page_url, Default::default());
    yohu_ai::parse_document(&markdown, meta.clone())
}

/// 已有 Markdown（本地文件）→ AgentDocument。
pub fn parse_markdown(markdown: &str, meta: DocMeta) -> AgentDocument {
    yohu_ai::parse_document(markdown, meta)
}

#[cfg(test)]
mod tests {
    use super::*;
    use yohu_protocol::{DocRef, FetchChannel, RawDoc};

    fn meta() -> DocMeta {
        DocMeta {
            title: "导出测试文档".into(),
            update_time: None,
            source_url: "https://example.com/x".into(),
            channel: FetchChannel::GenericWeb,
            device_types: vec![],
            blob_kind: None,
            doc_ref: DocRef {
                source_id: yohu_domain::GENERIC_WEB_SOURCE_ID.into(),
                catalog: None,
                slug: "x".into(),
                url: "https://example.com/x".into(),
                git_ref: None,
            },
        }
    }

    #[test]
    fn parse_uses_convert_markdown() {
        let raw = RawDoc {
            title: "导出测试文档".into(),
            html: "<article><h1>导出测试文档</h1><h2>第二节</h2><p>正文段落足够长以便提取。</p></article>"
                .into(),
            ..RawDoc::default()
        };
        let converted = convert_document(&meta(), &raw, "https://example.com/x", Default::default());
        let parsed = parse_document(&meta(), &raw, "https://example.com/x");
        assert_eq!(parsed.markdown, converted);
    }

    #[test]
    fn parse_markdown_keeps_sections() {
        let parsed = parse_markdown("# T\n\n## Sec\n", meta());
        assert_eq!(parsed.outline.len(), 1);
        assert_eq!(parsed.outline[0].text, "Sec");
        assert_eq!(parsed.sections.len(), 2);
    }
}
