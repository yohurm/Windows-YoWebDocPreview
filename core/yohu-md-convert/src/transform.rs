//! 主体转换：div/标题/行内格式/列表/段落/图片/标签剥离/实体/链接
//! （Python 步骤 3、4、6、7、8、9、12、13、14、15）。

use std::collections::HashMap;

use regex::Regex;
use std::sync::LazyLock;

static H_MARKER_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\[h[234]\]\s*").unwrap());
static DEVICE_ATTR_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"device-type="([^"]+)""#).unwrap());
static ANY_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());

/// device-type 属性值 → 展示名映射（同脚本 DEVICE_MAP）
const DEVICE_MAP: &[(&str, &str)] = &[
    ("phone", "Phone"),
    ("2in1", "PC/2in1"),
    ("tablet", "Tablet"),
    ("wearable", "Wearable"),
    ("tv", "TV"),
];

/// Step 3：剥离 div 包装为换行。
pub fn strip_divs(md: &str) -> String {
    let open = Regex::new(r"<div[^>]*>").unwrap();
    let out = open.replace_all(md, "\n");
    let close = Regex::new(r"</div>").unwrap();
    close.replace_all(&out, "\n").into_owned()
}

/// Step 4：标题映射 h1–h4 → #~####；剔除 `[h2]` 标记；提取 device-type 行；
/// 与文档标题相同的 h1 移除。
pub fn headings(md: &str, title: &str) -> String {
    let mut out = md.to_string();

    // 移除与文档标题相同的 h1
    if !title.is_empty() {
        let pat = Regex::new(&format!(
            r"(?s)<h1[^>]*>\s*{}\s*</h1>",
            regex::escape(title)
        ))
        .unwrap();
        out = pat.replace_all(&out, "").into_owned();
    }

    for (tag, prefix) in [("h1", "#"), ("h2", "##"), ("h3", "###"), ("h4", "####")] {
        let re = Regex::new(&format!(r#"(?s)<{tag}([^>]*?)>(.*?)</{tag}>"#)).unwrap();
        out = re
            .replace_all(&out, |c: &regex::Captures| {
                let attrs = &c[1];
                let mut text = c[2].to_string();
                // 剔除 [h2]/[h3]/[h4] 标记
                text = H_MARKER_RE.replace_all(&text, "").into_owned();
                // device-type 行
                let device_line = DEVICE_ATTR_RE
                    .captures(attrs)
                    .map(|m| map_devices(&m[1]))
                    .map(|mapped| format!("\n\n**支持设备：** {mapped}\n"))
                    .unwrap_or_default();
                format!("\n{prefix} {text}\n{device_line}")
            })
            .into_owned();
    }
    out
}

fn map_devices(raw: &str) -> String {
    raw.split(',')
        .map(|d| d.trim())
        .map(|d| {
            DEVICE_MAP
                .iter()
                .find(|(k, _)| *k == d)
                .map(|(_, v)| *v)
                .unwrap_or(d)
        })
        .collect::<Vec<&str>>()
        .join(" | ")
}

/// 从 HTML 提取 `<h1 device-type="...">` 并映射为展示行
/// `**支持设备：** Phone | ...`（对标 Python 在转换开头的 h1 设备提取）。
pub fn extract_device_line(html: &str) -> String {
    static RE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r#"<h1[^>]+device-type="([^"]+)""#).unwrap());
    RE.captures(html)
        .map(|c| format!("**支持设备：** {}", map_devices(&c[1])))
        .unwrap_or_default()
}

/// Step 6：行内格式 strong/b/a。
pub fn inline_formatting(md: &str) -> String {
    let strong = Regex::new(r"(?s)<strong[^>]*>(.*?)</strong>").unwrap();
    let md = strong.replace_all(md, r"**${1}**").into_owned();
    // 注意：<b 后必须跟空白或 >，避免误吞 <br>/<base> 等标签
    let bold = Regex::new(r"(?s)<b(?:\s[^>]*)?>(.*?)</b>").unwrap();
    let md = bold.replace_all(&md, r"**${1}**").into_owned();
    let link = Regex::new(r#"(?s)<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>"#).unwrap();
    link.replace_all(&md, "[${2}](${1})").into_owned()
}

/// Step 7：列表（ol 自动编号 / ul / li 内多段折叠）。
pub fn lists(md: &str) -> String {
    let mut out = md.to_string();

    // ol：提取 li 并自动编号
    let ol_re = Regex::new(r"(?s)<ol[^>]*>.*?</ol>").unwrap();
    out = ol_re
        .replace_all(&out, |seg: &regex::Captures| {
            let li_re = Regex::new(r"(?s)<li[^>]*>(.*?)</li>").unwrap();
            let mut result = String::new();
            for (i, li) in li_re.captures_iter(&seg[0]).enumerate() {
                result.push_str(&format_li(&li[1], &format!("{}.", i + 1)));
            }
            result
        })
        .into_owned();

    // 剩余 li 作为无序列表
    let li_re = Regex::new(r"(?s)<li[^>]*>(.*?)</li>").unwrap();
    out = li_re.replace_all(&out, |c: &regex::Captures| format_li(&c[1], "-")).into_owned();

    // 去掉 ul/ol 包装
    let wrapper = Regex::new(r"</?[ou]l[^>]*>").unwrap();
    out = wrapper.replace_all(&out, "\n").into_owned();

    // 清理列表项与表格行的前导缩进
    let indent = Regex::new(r"(?m)^[ \t]+(\d+\. | - )").unwrap();
    out = indent.replace_all(&out, "${1}").into_owned();
    let table_indent = Regex::new(r"(?m)^[ \t]+(\|)").unwrap();
    table_indent.replace_all(&out, "${1}").into_owned()
}

fn format_li(inner: &str, prefix: &str) -> String {
    let p_open = Regex::new(r"<p[^>]*>").unwrap();
    let collapsed = p_open.replace_all(inner, "");
    let p_close = Regex::new(r"</p>").unwrap();
    let collapsed = p_close.replace_all(&collapsed, "\n");
    let collapsed = Regex::new(r"\n{3,}").unwrap().replace_all(&collapsed, "\n\n");
    let collapsed = collapsed.trim().to_string();
    let lines: Vec<&str> = collapsed.split('\n').collect();
    if lines.len() > 1 {
        let mut result = format!("{prefix} {}\n", lines[0].trim());
        for l in &lines[1..] {
            if !l.trim().is_empty() {
                result.push_str(&format!("\n  {}\n", l.trim()));
            }
        }
        result
    } else {
        format!("{prefix} {collapsed}\n")
    }
}

/// Step 8-9：段落/换行/span。
pub fn paragraphs(md: &str) -> String {
    let p_open = Regex::new(r"<p[^>]*>").unwrap();
    let md = p_open.replace_all(md, "\n").into_owned();
    let p_close = Regex::new(r"</p>").unwrap();
    let md = p_close.replace_all(&md, "\n").into_owned();
    let br = Regex::new(r"<br\s*/?>").unwrap();
    let md = br.replace_all(&md, "\n").into_owned();
    let span = Regex::new(r"</?span[^>]*>").unwrap();
    span.replace_all(&md, "").into_owned()
}

/// Step 12：图片——先按 URL 映射替换，再转换 img 标签。
pub fn images(md: &str, image_map: &HashMap<String, String>) -> String {
    let mut out = md.to_string();
    for (orig, local) in image_map {
        out = out.replace(orig.as_str(), local.as_str());
    }
    // 对标 Python `re.sub(r'<img[^>]+>', ...)`：必须吞掉闭合 `>`，
    // 否则残留孤立 `>` 会变成 Markdown 引用行（真实缺陷）。
    let img_re = Regex::new(r#"<img[^>]+>"#).unwrap();
    img_re
        .replace_all(&out, |tag: &regex::Captures| {
            let src = Regex::new(r#"src="([^"]+)""#)
                .unwrap()
                .captures(&tag[0])
                .or_else(|| Regex::new(r"src='([^']+)'").unwrap().captures(&tag[0]));
            match src.and_then(|c| c.get(1)) {
                Some(s) => format!("\n![]({})\n", s.as_str().replace(' ', "%20")),
                None => String::new(),
            }
        })
        .into_owned()
}

/// Step 13：剥离剩余 HTML 标签（二次保护代码块）。
pub fn strip_remaining_tags(md: &str) -> String {
    let fence = Regex::new(r"(?s)```.*?```").unwrap();
    let mut parts: Vec<String> = Vec::new();
    let mut last = 0usize;
    let mut out = String::new();
    for m in fence.find_iter(md) {
        // 非代码区剥标签
        out.push_str(&ANY_TAG_RE.replace_all(&md[last..m.start()], ""));
        parts.push(m.as_str().to_string());
        out.push_str(&format!("\u{2}C{}\u{2}", parts.len() - 1));
        last = m.end();
    }
    out.push_str(&ANY_TAG_RE.replace_all(&md[last..], ""));
    for (i, block) in parts.iter().enumerate() {
        out = out.replace(&format!("\u{2}C{i}\u{2}"), block);
    }
    out
}

/// Step 14：实体解码。
pub fn decode_entities(md: &str) -> String {
    const LT: &str = concat!("&", "lt;");
    const GT: &str = concat!("&", "gt;");
    const QUOT: &str = concat!("&", "quot;");
    const APOS: &str = concat!("&", "#39;");
    const NBSP: &str = concat!("&", "nbsp;");
    const AMP: &str = concat!("&", "amp;");
    // 保护代码块后解码非代码区（代码块已在 Step10 解码，此处避免二次解码 &）
    let fence = Regex::new(r"(?s)```.*?```").unwrap();
    let mut out = String::new();
    let mut last = 0usize;
    for m in fence.find_iter(md) {
        out.push_str(&decode_plain(&md[last..m.start()]));
        out.push_str(m.as_str());
        last = m.end();
    }
    out.push_str(&decode_plain(&md[last..]));
    return out;

    fn decode_plain(s: &str) -> String {
        s.replace(LT, "<")
            .replace(GT, ">")
            .replace(QUOT, "\"")
            .replace(APOS, "'")
            .replace(NBSP, " ")
            .replace(AMP, "&")
    }
}

/// Step 15：相对链接补全为绝对 URL。
///
/// - `base_url = Some`（generic-web）：`/root/path` 补到基准页的 origin；
///   `rel/path` 补到基准页所在目录；绝对/锚点/mailto 不动；
/// - `base_url = None`：保留华为站 `/consumer/cn/doc/` 前缀补固定域名的脚本行为（黄金样本兼容）。
pub fn fix_relative_links(md: &str, base_url: Option<&str>) -> String {
    match base_url {
        Some(base) => {
            let base = base.trim_end_matches('/');
            let origin = url_origin(base).unwrap_or_else(|| base.to_string());
            let re = Regex::new(r"\]\(([^)]+)\)").unwrap();
            re.replace_all(md, |c: &regex::Captures| {
                let target = &c[1];
                if target.starts_with("http://")
                    || target.starts_with("https://")
                    || target.starts_with('#')
                    || target.starts_with("mailto:")
                    || target.is_empty()
                {
                    format!("]({target})")
                } else if let Some(rest) = target.strip_prefix('/') {
                    format!("]({origin}/{rest})")
                } else {
                    // 相对页面路径：去掉基准 URL 的文件名部分再拼接
                    let dir = base
                        .rsplit_once('/')
                        .map(|(d, _)| d.to_string())
                        .unwrap_or_else(|| base.to_string());
                    format!("]({dir}/{target})")
                }
            })
            .into_owned()
        }
        None => {
            let re = Regex::new(r"\[([^\]]*)\]\((/consumer/cn/doc/[^)\s]*)\)").unwrap();
            re.replace_all(md, "[${1}](https://developer.huawei.com${2})")
                .into_owned()
        }
    }
}

/// 提取 `scheme://host[:port]`（origin）；非标准形态返回 None。
fn url_origin(url: &str) -> Option<String> {
    let (scheme, rest) = url.split_once("://")?;
    if scheme.is_empty() || rest.is_empty() {
        return None;
    }
    let host = rest.split('/').next()?;
    if host.is_empty() {
        None
    } else {
        Some(format!("{scheme}://{host}"))
    }
}
