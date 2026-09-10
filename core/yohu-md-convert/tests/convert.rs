//! 转换引擎集成测试：对照 fetch_docs.py 行为的手写样例。

use std::collections::HashMap;

use yohu_md_convert::{heading_level, html_to_markdown, ConvertOptions};

fn opts(title: &str) -> ConvertOptions {
    ConvertOptions {
        title: title.into(),
        update_time: Some("2026-05-26 06:48:54".into()),
        source_url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/test".into(),
        catalog: None,
        image_map: HashMap::new(),
        device_types: vec![],
        base_url: None,
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
    assert!(md.contains("正文段落。"));
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
    assert!(md.contains("```ArkTS"), "actual:\n{md}");
    // 实体解码
    let html2 = "<pre><code>let a < b && c;</code></pre>";
    let md2 = html_to_markdown(html2, &opts("t"));
    assert!(md2.contains("let a < b && c;"), "actual:\n{md2}");
}

#[test]
fn note_becomes_callout() {
    let html = r#"<div class="note"><span class="notetitle">注意：</span><div class="notebody">危险操作</div></div>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("> [!WARNING]"), "actual:\n{md}");
    assert!(md.contains("> 危险操作"));
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
    assert!(md.contains("| --- | --- |"));
    assert!(md.contains("| 共享 | b1 |"));
    assert!(md.contains("| 共享 | b2 |"), "rowspan 展开：\n{md}");
}

#[test]
fn ordered_list_auto_numbering() {
    let html = "<ol><li><p>第一步</p></li><li><p>第二步</p></li></ol>";
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("1. 第一步"));
    assert!(md.contains("2. 第二步"));
}

#[test]
fn unordered_list() {
    let html = "<ul><li>苹果</li><li>香蕉</li></ul>";
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("- 苹果"));
    assert!(md.contains("- 香蕉"));
}

#[test]
fn inline_formatting_and_links() {
    let html = r#"<p><strong>加粗</strong>与<b>粗体</b>，见<a href="/consumer/cn/doc/harmonyos-guides/x">链接</a>。</p>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("**加粗**"));
    assert!(md.contains("**粗体**"));
    assert!(
        md.contains("[链接](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/x)"),
        "相对链接补全：\n{md}"
    );
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
fn image_mapping_to_local_path() {
    let mut map = HashMap::new();
    map.insert(
        "https://example.com/img/a.png".to_string(),
        "assets/t/a.png".to_string(),
    );
    let o = ConvertOptions { image_map: map, ..opts("t") };
    let html = r#"<p>图示<img src="https://example.com/img/a.png">结束</p>"#;
    let md = html_to_markdown(html, &o);
    assert!(md.contains("![](assets/t/a.png)"), "actual:\n{md}");
}

#[test]
fn api_metadata_spacing_for_references_catalog() {
    // 用 <br> 构造相邻的两条元数据行（模拟 API 参考文档结构）
    let html = "<p><b>系统能力：</b>SystemCapability.A<br><b>起始版本：</b>API 12</p>";

    fn gap_between(md: &str) -> usize {
        let a = md.find("**系统能力：**").unwrap();
        let b = md.find("**起始版本：**").unwrap();
        md[a..b].matches('\n').count()
    }

    // 非 references：两行相邻（1 个换行）
    let base = html_to_markdown(html, &opts("t"));
    assert_eq!(gap_between(&base), 1, "基线间距：\n{base}");

    // references：元数据行之间插入空行（2 个换行）
    let o = ConvertOptions { catalog: Some("harmonyos-references".into()), ..opts("t") };
    let refs = html_to_markdown(html, &o);
    assert_eq!(gap_between(&refs), 2, "references 应插入空行：\n{refs}");
}

#[test]
fn adjacent_code_like_bold_is_unchanged() {
    let html = "<p>例如：<strong>mcc460_mnc00-zh_Hant_CN</strong>、<strong>zh_CN-car-ldpi</strong>。</p>";
    let md = html_to_markdown(html, &opts("t"));
    assert!(
        md.contains("**mcc460_mnc00-zh_Hant_CN**、**zh_CN-car-ldpi**。"),
        "标识符加粗后接顿号不得插入空格：\n{md}"
    );
}

#[test]
fn emphasis_closer_pads_before_cjk() {
    let html = "<p>选择<strong>&gt; Install Plugin from Disk…</strong>安装本地插件。</p>";
    let md = html_to_markdown(html, &opts("t"));
    assert!(
        md.contains("**> Install Plugin from Disk…** 安装本地插件。"),
        "省略号后的 ** 必须与后接汉字隔开：\n{md}"
    );
}

#[test]
fn adjacent_strong_merges_menu_path() {
    let html = concat!(
        "<p>点击<strong>File &gt; Settings</strong>（macOS为",
        "<strong>DevEco Studio &gt; Preferences</strong><strong>/</strong><strong>Settings</strong>）",
        "<strong>&gt; Plugins</strong>，安装。</p>",
    );
    let md = html_to_markdown(html, &opts("t"));
    assert!(
        md.contains("**File > Settings**（macOS为**DevEco Studio > Preferences/Settings**）**> Plugins**"),
        "相邻 strong 应合成一段加粗，不得留下 ****：\n{md}"
    );
    assert!(!md.contains("****"), "相邻 ** 不得黏成 ****：\n{md}");
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
        "IconPic 必须留在安装步骤同一行，且 …** 后要能被 CommonMark 关掉：\n{md}"
    );
    assert!(
        md.lines().any(|l| l.trim() == "![](https://example.com/shot.png)"),
        "截图仍应独立成行：\n{md}"
    );
}

#[test]
fn image_tag_consumes_closing_bracket() {
    // 对标 Python `re.sub(r'<img[^>]+>', ...)`：不得残留孤立 `>`（会变成引用行）
    let html = r#"<p>图示<img originwidth="1102" src="https://example.com/img/a.png">结束</p>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("![](https://example.com/img/a.png)"), "actual:\n{md}");
    assert!(
        !md.lines().any(|l| l.trim() == ">"),
        "img 标签残留 > 会变成引用行：\n{md}"
    );
}

#[test]
fn dollar_placeholders_escaped_like_python() {
    // 对标 Python 后处理：$r/$rawfile/%1$s 在非代码区转义为 \$r/\$rawfile/%1\$d
    let html = "<p>通过$r('app.type.name')与$rawfile('f')访问，占位符%1$s和%2$d。</p>";
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains(r"\$r('app.type.name')"), "actual:\n{md}");
    assert!(md.contains(r"\$rawfile('f')"), "actual:\n{md}");
    assert!(md.contains(r"%1\$s"), "actual:\n{md}");
    assert!(md.contains(r"%2\$d"), "actual:\n{md}");
    assert!(!md.contains("\\('"), "$r 不得被吃掉：\n{md}");
}

#[test]
fn device_line_extracted_from_h1_when_not_injected() {
    // 对标 Python：调用方未注入 device_types 时从 <h1 device-type> 提取
    let html = r#"<h1 device-type="phone,2in1,tablet,wearable,tv">t</h1><p>正文</p>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(
        md.contains("**支持设备：** Phone | PC/2in1 | Tablet | Wearable | TV"),
        "actual:\n{md}"
    );
    // 文档头空行格式：# 标题 / 空行 / 更新时间 / 空行 / 来源
    assert!(md.starts_with("# t\n\n更新时间：2026-05-26 06:48:54\n\n来源："), "actual:\n{md}");
}

#[test]
fn header_contains_meta_lines() {
    let md = html_to_markdown("<p>x</p>", &opts("标题X"));
    assert!(md.contains("# 标题X"));
    assert!(md.contains("更新时间：2026-05-26 06:48:54"));
    assert!(md.contains("来源：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/test"));
}
#[test]
fn base_url_completes_relative_links() {
    let html = r##"<p><a href="/guide/x">指南</a><a href="sub/page">子页</a><a href="https://ext.com/a">外链</a><a href="#anchor">锚点</a></p>"##;
    let o = ConvertOptions { base_url: Some("https://blog.example.com/posts/1".into()), ..opts("t") };
    let md = html_to_markdown(html, &o);
    assert!(md.contains("](https://blog.example.com/guide/x)"));
    assert!(md.contains("](https://blog.example.com/posts/sub/page)"));
    assert!(md.contains("](https://ext.com/a)"));
    assert!(md.contains("](#anchor)"));
}

#[test]
fn none_base_url_keeps_huawei_special_case() {
    let html = r#"<p><a href="/consumer/cn/doc/harmonyos-guides/x">X</a></p>"#;
    let md = html_to_markdown(html, &opts("t"));
    assert!(md.contains("](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/x)"));
}
