//! 与 UI `extractMarkdownToc` 共用 testdata/ai-outline.json。

use serde::Deserialize;
use yohu_protocol::{DocMeta, DocRef, FetchChannel};

#[derive(Deserialize)]
struct Table {
    cases: Vec<Case>,
}

#[derive(Deserialize)]
struct Case {
    id: String,
    markdown: String,
    headings: Vec<Heading>,
}

#[derive(Deserialize)]
struct Heading {
    id: String,
    text: String,
    level: u8,
}

fn fixture_meta() -> DocMeta {
    DocMeta {
        doc_ref: DocRef {
            source_id: "generic-web".into(),
            catalog: None,
            slug: "fixture".into(),
            url: "https://example.com/fixture".into(),
            git_ref: None,
        },
        title: "fixture".into(),
        update_time: None,
        source_url: "https://example.com/fixture".into(),
        channel: FetchChannel::GenericWeb,
        device_types: vec![],
        blob_kind: None,
    }
}

fn flatten(nodes: &[yohu_protocol::OutlineNode]) -> Vec<(String, String, u8)> {
    let mut out = Vec::new();
    fn walk(nodes: &[yohu_protocol::OutlineNode], out: &mut Vec<(String, String, u8)>) {
        for n in nodes {
            out.push((n.id.clone(), n.text.clone(), n.level));
            walk(&n.children, out);
        }
    }
    walk(nodes, &mut out);
    out
}

#[test]
fn outline_matches_testdata() {
    let table: Table =
        serde_json::from_str(include_str!("../../../testdata/ai-outline.json")).unwrap();
    for case in table.cases {
        let items = yohu_ai::extract_outline_items(&case.markdown);
        let got: Vec<(String, String, u8)> = items
            .iter()
            .map(|h| (h.id.clone(), h.text.clone(), h.level))
            .collect();
        let expected: Vec<(String, String, u8)> = case
            .headings
            .iter()
            .map(|h| (h.id.clone(), h.text.clone(), h.level))
            .collect();
        assert_eq!(got, expected, "case {}", case.id);
        assert!(items.iter().all(|h| h.children.is_empty()));
    }
}

#[test]
fn empty_document_is_success() {
    let doc = yohu_ai::parse_document("", fixture_meta());
    assert!(doc.outline.is_empty());
    assert!(doc.sections.is_empty());
    assert!(doc.markdown.is_empty());
}

#[test]
fn no_headings_keeps_body_only_on_markdown() {
    let md = "just a paragraph";
    let doc = yohu_ai::parse_document(md, fixture_meta());
    assert!(doc.outline.is_empty());
    assert!(doc.sections.is_empty());
    assert_eq!(doc.markdown, md);
}

#[test]
fn leading_h1_is_a_section_but_not_outline() {
    let md = "# Title\n\n## A\n\nbody\n";
    let doc = yohu_ai::parse_document(md, fixture_meta());
    assert_eq!(flatten(&doc.outline), vec![("toc-heading-1".into(), "A".into(), 2)]);
    assert_eq!(doc.sections.len(), 2);
    assert_eq!(doc.sections[0].id, "toc-heading-0");
    assert_eq!(doc.sections[0].heading, "Title");
    assert_eq!(doc.sections[1].id, "toc-heading-1");
    assert!(doc.sections[0].markdown.starts_with("# Title"));
    assert!(doc.sections[1].markdown.starts_with("## A"));
}

#[test]
fn leading_title_reads_h1() {
    assert_eq!(yohu_ai::leading_title("# Hello\n\n## X\n").as_deref(), Some("Hello"));
    assert_eq!(yohu_ai::leading_title("## X\n"), None);
}

#[test]
fn strips_utf8_bom() {
    let md = "\u{feff}# Title\n\n## A\n";
    let items = yohu_ai::extract_outline_items(md);
    assert_eq!(items.iter().map(|h| h.text.as_str()).collect::<Vec<_>>(), ["A"]);
    assert_eq!(yohu_ai::leading_title(md).as_deref(), Some("Title"));
    let doc = yohu_ai::parse_document(md, fixture_meta());
    assert!(!doc.markdown.starts_with('\u{feff}'));
    assert_eq!(doc.sections[0].heading, "Title");
}
