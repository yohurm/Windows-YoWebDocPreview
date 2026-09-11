//! 公共内核：标准 HTML，无站点方言。

use std::collections::HashMap;

use yohu_md_convert::{html_to_markdown, ConvertOptions};

fn opts(title: &str) -> ConvertOptions {
    ConvertOptions {
        title: title.into(),
        update_time: Some("2026-05-26 06:48:54".into()),
        source_url: "https://blog.example.com/posts/1".into(),
        image_map: HashMap::new(),
        base_url: None,
    }
}

#[test]
fn standard_headings_keep_tag_level() {
    let html = "<h1>测试文档</h1><h2>节</h2><h4>小节</h4><p>正文</p>";
    let md = html_to_markdown(html, &opts("测试文档"));
    assert!(md.lines().any(|l| l == "## 节"), "{md}");
    assert!(md.lines().any(|l| l == "#### 小节"), "generic h4 stays h4:\n{md}");
    assert!(!md.lines().any(|l| l == "## 小节"), "{md}");
}

#[test]
fn table_with_rowspan() {
    let html = concat!(
        "<table><thead><tr><th>列A</th><th>列B</th></tr></thead>",
        "<tbody>",
        "<tr><td rowspan=\"2\">共享</td><td>b1</td></tr>",
        "<tr><td>b2</td></tr>",
        "</tbody></table>"
    );
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("| 列A | 列B |"));
    assert!(md.contains("| 共享 | b2 |"), "{md}");
}

#[test]
fn ordered_and_unordered_lists() {
    let md = html_to_markdown(
        "<ol><li><p>第一步</p></li><li><p>第二步</p></li></ol><ul><li>苹果</li></ul>",
        &opts("t"),
    );
    assert!(md.contains("1. 第一步"));
    assert!(md.contains("2. 第二步"));
    assert!(md.contains("- 苹果"));
}

#[test]
fn inline_formatting_keeps_relative_href() {
    let html = r#"<p><strong>加粗</strong>与<b>粗体</b>，见<a href="/guide/x">链接</a>。</p>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("**加粗**"));
    assert!(md.contains("[链接](/guide/x)"), "no site prefix:\n{md}");
    assert!(!md.contains("developer.huawei.com"));
}

#[test]
fn image_mapping_and_closing_bracket() {
    let mut map = HashMap::new();
    map.insert(
        "https://example.com/img/a.png".to_string(),
        "assets/t/a.png".to_string(),
    );
    let o = ConvertOptions {
        image_map: map,
        ..opts("t")
    };
    let md = html_to_markdown(
        r#"<p>图示<img originwidth="1102" src="https://example.com/img/a.png">结束</p>"#,
        &o,
    );
    assert!(md.lines().any(|l| l.trim() == "![](assets/t/a.png)"), "{md}");
    assert!(!md.lines().any(|l| l.contains("见图") && l.contains("![](")), "{md}");
    assert!(!md.lines().any(|l| l.trim() == ">"));
    assert!(!md.contains("![icon]("));
}

#[test]
fn emphasis_and_adjacent_strong() {
    let md = html_to_markdown(
        concat!(
            "<p>选择<strong>&gt; Install Plugin from Disk…</strong>安装。</p>",
            "<p>点击<strong>File &gt; Settings</strong>（macOS为",
            "<strong>DevEco Studio &gt; Preferences</strong><strong>/</strong><strong>Settings</strong>）",
            "<strong>&gt; Plugins</strong>。</p>",
        ),
        &opts("t"),
    );
    assert!(
        md.contains("**> Install Plugin from Disk…** 安装。"),
        "{md}"
    );
    assert!(!md.contains("****"), "{md}");
}

#[test]
fn header_and_base_url() {
    let md = html_to_markdown("<p>x</p>", &opts("标题X"));
    assert!(md.contains("# 标题X"));
    assert!(md.contains("更新时间：2026-05-26 06:48:54"));
    assert!(md.contains("来源：https://blog.example.com/posts/1"));

    let html = r##"<p><a href="/guide/x">指南</a><a href="sub/page">子页</a><a href="https://ext.com/a">外链</a><a href="#anchor">锚点</a></p>"##;
    let o = ConvertOptions {
        base_url: Some("https://blog.example.com/posts/1".into()),
        ..opts("t")
    };
    let md = html_to_markdown(html, &o);
    assert!(md.contains("](https://blog.example.com/guide/x)"));
    assert!(md.contains("](https://blog.example.com/posts/sub/page)"));
    assert!(md.contains("](https://ext.com/a)"));
    assert!(md.contains("](#anchor)"));
}

#[test]
fn generic_ignores_huawei_note_and_placeholder_dialect() {
    let html = concat!(
        r#"<div class="note"><span class="notetitle">注意：</span><div class="notebody">危险操作</div></div>"#,
        "<p>通过$r('app.type.name')访问</p>",
        r#"<h4>[h2]基础概念</h4>"#,
    );
    let md = html_to_markdown(html, &opts("t"));
    assert!(!md.contains("> [!WARNING]"), "{md}");
    assert!(md.contains("$r('app.type.name')"), "{md}");
    assert!(!md.contains(r"\$r"), "{md}");
    assert!(md.contains("#### [h2]基础概念") || md.contains("[h2]基础概念"), "{md}");
}
