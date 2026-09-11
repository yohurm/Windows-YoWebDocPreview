use crate::options::ConvertOptions;

/// 文档头：标题 / 更新时间 / 来源 / 方言附加行。
pub fn build_header(opts: &ConvertOptions, extra: &str) -> String {
    let mut h = format!("# {}\n\n", opts.title);
    if let Some(t) = &opts.update_time {
        h.push_str(&format!("更新时间：{t}\n\n"));
    }
    if !opts.source_url.is_empty() {
        h.push_str(&format!("来源：{}\n", opts.source_url));
    }
    if !extra.is_empty() {
        h.push_str(&format!("{extra}\n"));
    }
    h.push('\n');
    h
}
