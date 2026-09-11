use crate::headings;
use crate::images::ImageKind;
use crate::links;
use crate::options::ConvertOptions;
use crate::postprocess;

/// 站点方言钩子。通用内核只调用这些扩展点，不点名任何站点。
pub trait ConvertDialect {
    type Extra: Default;

    fn protect_cell_notes(&self, html: &str, extra: &mut Self::Extra) -> String {
        let _ = extra;
        html.to_string()
    }

    fn protect_notes(&self, html: &str, extra: &mut Self::Extra) -> String {
        let _ = extra;
        html.to_string()
    }

    fn headings(&self, html: &str, title: &str) -> String {
        headings::standard_headings(html, title)
    }

    fn restore_cell_notes(&self, html: &str, extra: &mut Self::Extra) -> String {
        let _ = extra;
        html.to_string()
    }

    fn detect_language(&self, block: &str) -> &'static str {
        let _ = block;
        "text"
    }

    fn scrub_code(&self, inner: &str) -> String {
        inner.to_string()
    }

    fn restore_notes(&self, html: &str, extra: &mut Self::Extra) -> String {
        let _ = extra;
        html.to_string()
    }

    fn classify_image(&self, tag: &str) -> ImageKind {
        let _ = tag;
        ImageKind::Block
    }

    fn emit_image(&self, kind: ImageKind, url: &str) -> String {
        match kind {
            ImageKind::Block => format!("\n![]({url})\n"),
            ImageKind::Inline => format!("![]({url})"),
        }
    }

    fn rewrite_links(&self, md: &str, opts: &ConvertOptions) -> String {
        links::complete_relative(md, opts.base_url.as_deref())
    }

    fn postprocess(&self, md: &str, opts: &ConvertOptions) -> String {
        let _ = opts;
        postprocess::run_generic(md)
    }

    fn extra_header(&self, html: &str, opts: &ConvertOptions) -> String {
        let _ = html;
        device_line_from_opts(opts)
    }
}

/// 默认方言：标准 HTML → Markdown，无站点知识。
pub struct GenericDialect;

impl ConvertDialect for GenericDialect {
    type Extra = ();
}

pub fn device_line_from_opts(opts: &ConvertOptions) -> String {
    if opts.device_types.is_empty() {
        String::new()
    } else {
        format!("**支持设备：** {}", opts.device_types.join(" | "))
    }
}
