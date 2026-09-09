//! yohu-md-convert — HTML→Markdown 转换引擎（纯函数，零 IO）。
//!
//! 全量移植 `fetch_docs.py::html_to_markdown` 的规则；
//! 模块与 Python 步骤编号对应，黄金样本 diff 为验收门禁。

mod postprocess;
mod protect;
mod tables;
mod transform;

pub use transform::heading_level;

use std::collections::HashMap;

/// 转换选项（由调用方注入；本 crate 不做 IO）
#[derive(Debug, Clone, Default)]
pub struct ConvertOptions {
    pub title: String,
    pub update_time: Option<String>,
    pub source_url: String,
    /// harmonyos-references 有 API 元数据间距特例
    pub catalog: Option<String>,
    /// 远程图片 URL → 本地相对路径
    pub image_map: HashMap<String, String>,
    /// 支持设备（映射后的展示名）
    pub device_types: Vec<String>,
    /// 相对链接补全基准（generic-web 传页面 URL；None 保留华为站 `/consumer/cn/doc/` 特例行为）
    pub base_url: Option<String>,
}

/// 引擎内部状态（占位符仓库）
#[derive(Default)]
struct State {
    code_blocks: Vec<String>,
    notes: Vec<String>,
    cell_notes: Vec<(usize, String)>,
}

/// 主入口：HTML → Markdown。
pub fn html_to_markdown(html: &str, opts: &ConvertOptions) -> String {
    let mut st = State::default();
    let mut md = html.to_string();

    // Step 0: 表格单元格内 note 提取（移至最近表格前占位）
    md = protect::extract_cell_notes(&md, &mut st);
    // Step 1: 保护代码块
    md = protect::save_code_blocks(&md, &mut st);
    // Step 2: 提取普通 note
    md = protect::save_notes(&md, &mut st);
    // Step 3: 剥离 div
    md = transform::strip_divs(&md);
    // Step 4: 标题映射（含 device-type 行）
    md = transform::headings(&md, &opts.title);
    // Step 4.5: 还原表格 note 占位符
    md = protect::restore_cell_notes(&md, &mut st);
    // Step 5: 表格
    md = tables::convert_tables(&md);
    // Step 6-9: 行内格式 / 列表 / 段落 / span
    md = transform::inline_formatting(&md);
    md = transform::lists(&md);
    md = transform::paragraphs(&md);
    // Step 10: 还原代码块（语言探测）
    md = protect::restore_code_blocks(&md, &mut st);
    // Step 11: 还原 note 为 callout
    md = protect::restore_notes(&md, &mut st);
    // Step 12: 图片映射
    md = transform::images(&md, &opts.image_map);
    // Step 13: 剥离剩余 HTML 标签（二次保护代码块）
    md = transform::strip_remaining_tags(&md);
    // Step 14: 实体解码
    md = transform::decode_entities(&md);
    // Step 15: 相对链接补全（base_url 泛化；None 时华为站固定域名特例，同脚本行为）
    md = transform::fix_relative_links(&md, opts.base_url.as_deref());
    // 后处理（全程保护代码块）
    md = postprocess::run(&md, opts.catalog.as_deref());

    build_header(opts, html) + md.trim() + "\n"
}

/// 文档头生成（Python 步骤 12 输出组装）。
///
/// 对标 Python：`# {title}\n\n更新时间：{t}\n\n来源：{url}\n[支持设备行]\n`；
/// 支持设备在调用方未注入时回退为从原文 `<h1 device-type="...">` 提取
/// （对标 Python 在转换开头执行的 `<h1[^>]+device-type="([^"]+)"` 提取）。
fn build_header(opts: &ConvertOptions, html: &str) -> String {
    let device_line = if opts.device_types.is_empty() {
        transform::extract_device_line(html)
    } else {
        opts.device_line()
    };
    let mut h = format!("# {}\n\n", opts.title);
    if let Some(t) = &opts.update_time {
        h.push_str(&format!("更新时间：{t}\n\n"));
    }
    if !opts.source_url.is_empty() {
        h.push_str(&format!("来源：{}\n", opts.source_url));
    }
    if !device_line.is_empty() {
        h.push_str(&format!("{device_line}\n"));
    }
    h.push('\n');
    h
}

impl ConvertOptions {
    fn device_line(&self) -> String {
        if self.device_types.is_empty() {
            String::new()
        } else {
            format!("**支持设备：** {}", self.device_types.join(" | "))
        }
    }
}