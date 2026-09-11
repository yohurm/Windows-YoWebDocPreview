//! 华为开发者文档方言测试。

use std::collections::HashMap;

use yohu_md_huawei::{heading_level, html_to_markdown, HuaweiConvertOptions};

fn opts(title: &str) -> HuaweiConvertOptions {
    HuaweiConvertOptions {
        title: title.into(),
        update_time: Some("2026-05-26 06:48:54".into()),
        source_url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/test".into(),
        catalog: None,
        image_map: HashMap::new(),
        device_types: vec![],
    }
}

#[test]
fn heading_level_table_matches_testdata() {
    let table: serde_json::Value =
        serde_json::from_str(include_str!("../../../testdata/huawei-headings.json")).unwrap();
    for case in table["cases"].as_array().expect("cases") {
        let tag = case["tag"].as_u64().unwrap() as u8;
        let marker = case["marker"].as_u64().map(|n| n as u8);
        let level = case["level"].as_u64().unwrap() as u8;
        assert_eq!(
            heading_level(tag, marker),
            level,
            "tag={tag} marker={marker:?}"
        );
    }
}

#[test]
fn headings_map_huawei_live_levels() {
    let html = concat!(
        "<h1>测试文档</h1>",
        "<h4>基本知识</h4>",
        "<h4>[h2]基础概念</h4>",
        "<h4>[h3]细节</h4>",
        "<h2>[h2] 仍按标记加深</h2>",
        "<p>正文段落。</p>",
    );
    let md = html_to_markdown(html, &opts("测试文档"));
    assert!(md.starts_with("# 测试文档\n"));
    assert!(md.contains("## 基本知识"), "unmarked h4 → h2:\n{md}");
    assert!(md.contains("### 基础概念"), "[h2] → h3:\n{md}");
    assert!(md.contains("#### 细节"), "[h3] → h4:\n{md}");
    assert!(md.contains("### 仍按标记加深"), "h2+[h2] → h3:\n{md}");
    assert!(!md.contains("[h2]"));
    assert!(!md.contains("[h3]"));
}

#[test]
fn heading_device_type_line() {
    let html = r#"<h2 device-type="phone,tablet">多设备标题</h2>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("**支持设备：** Phone | Tablet"));
}

#[test]
fn code_block_language_detection() {
    let html = r#"<pre><code>import { ability } from ".ets#";</code></pre>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("```ArkTS"), "{md}");
    let md2 = html_to_markdown("<pre><code>let a < b && c;</code></pre>", &opts("t"));
    assert!(md2.contains("let a < b && c;"), "{md2}");
}

#[test]
fn note_becomes_callout() {
    let html = r#"<div class="note"><span class="notetitle">注意：</span><div class="notebody">危险操作</div></div>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("> [!WARNING]"), "{md}");
    assert!(md.contains("> 危险操作"));
}

#[test]
fn inline_icon_table_matches_testdata() {
    let table: serde_json::Value =
        serde_json::from_str(include_str!("../../../testdata/huawei-inline-icon.json")).unwrap();
    assert_eq!(table["maxPx"].as_u64().unwrap(), 48);
    for case in table["cases"].as_array().expect("cases") {
        let name = case["name"].as_str().unwrap();
        let class = case["className"].as_str().unwrap_or("");
        let mut attrs = String::new();
        if !class.is_empty() {
            attrs.push_str(&format!(r#" class="{class}""#));
        }
        if let Some(w) = case.get("originWidth").and_then(|v| v.as_u64()) {
            attrs.push_str(&format!(r#" originwidth="{w}""#));
        }
        if let Some(h) = case.get("originHeight").and_then(|v| v.as_u64()) {
            attrs.push_str(&format!(r#" originheight="{h}""#));
        }
        if let Some(w) = case.get("width").and_then(|v| v.as_u64()) {
            attrs.push_str(&format!(r#" width="{w}""#));
        }
        if let Some(h) = case.get("height").and_then(|v| v.as_u64()) {
            attrs.push_str(&format!(r#" height="{h}""#));
        }
        let html = format!(r#"<p>前<img{attrs} src="https://example.com/{name}.png">后</p>"#);
        let md = html_to_markdown(&html, &opts("t"));
        if case["inline"].as_bool().unwrap() {
            assert!(md.contains("![icon]("), "{name} 应为行内图标：\n{md}");
        } else {
            assert!(!md.contains("![icon]("), "{name} 不应标成图标：\n{md}");
            assert!(md.contains("![]("), "{name} 仍应是图片：\n{md}");
        }
    }
}

#[test]
fn api_metadata_spacing_for_references_catalog() {
    let html = "<p><b>系统能力：</b>SystemCapability.A<br><b>起始版本：</b>API 12</p>";

    fn gap_between(md: &str) -> usize {
        let a = md.find("**系统能力：**").unwrap();
        let b = md.find("**起始版本：**").unwrap();
        md[a..b].matches('\n').count()
    }

    let base = html_to_markdown(html, &opts("t"));
    assert_eq!(gap_between(&base), 1, "{base}");

    let o = HuaweiConvertOptions {
        catalog: Some("harmonyos-references".into()),
        ..opts("t")
    };
    let refs = html_to_markdown(html, &o);
    assert_eq!(gap_between(&refs), 2, "{refs}");
}

#[test]
fn inline_icon_stays_in_sentence() {
    let html = concat!(
        "<ol><li>点击<span><img class=\"IconPic notEnlarge\" originwidth=\"21\" originheight=\"20\" ",
        "src=\"https://example.com/gear.png\" width=\"21\" height=\"20\"></span> ",
        "<strong>&gt; Install Plugin from Disk…</strong>安装本地插件。",
        "<p><span><img originwidth=\"978\" originheight=\"708\" src=\"https://example.com/shot.png\"></span></p>",
        "</li></ol>",
    );
    let md = html_to_markdown(html, &opts("t"));
    let install = md
        .lines()
        .find(|l| l.contains("Install Plugin from Disk"))
        .unwrap_or(&md);
    assert!(
        install.contains("点击![icon](https://example.com/gear.png) **> Install Plugin from Disk…** 安装本地插件。"),
        "{md}"
    );
    assert!(md.lines().any(|l| l.trim() == "![](https://example.com/shot.png)"), "{md}");
}

#[test]
fn dollar_placeholders_escaped() {
    let html = "<p>通过$r('app.type.name')与$rawfile('f')访问，占位符%1$s和%2$d。</p>";
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains(r"\$r('app.type.name')"), "{md}");
    assert!(md.contains(r"\$rawfile('f')"), "{md}");
    assert!(md.contains(r"%1\$s"), "{md}");
    assert!(md.contains(r"%2\$d"), "{md}");
}

#[test]
fn device_line_extracted_from_h1() {
    let html = r#"<h1 device-type="phone,2in1,tablet,wearable,tv">t</h1><p>正文</p>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(
        md.contains("**支持设备：** Phone | PC/2in1 | Tablet | Wearable | TV"),
        "{md}"
    );
}

#[test]
fn huawei_relative_doc_links() {
    let html = r#"<p><a href="/consumer/cn/doc/harmonyos-guides/x">X</a></p>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/x)"));
}
