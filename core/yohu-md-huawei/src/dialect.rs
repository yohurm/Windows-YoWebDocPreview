use yohu_md_convert::{ConvertDialect, ConvertOptions, GenericDialect, ImageKind};

use crate::code;
use crate::devices;
use crate::headings;
use crate::images;
use crate::links;
use crate::notes::{self, HuaweiState};
use crate::postprocess;

pub struct HuaweiDialect {
    pub catalog: Option<String>,
    pub device_types: Vec<String>,
}

impl ConvertDialect for HuaweiDialect {
    type Extra = HuaweiState;

    fn protect_cell_notes(&self, html: &str, extra: &mut Self::Extra) -> String {
        notes::extract_cell_notes(html, extra)
    }

    fn protect_notes(&self, html: &str, extra: &mut Self::Extra) -> String {
        notes::save_notes(html, extra)
    }

    fn headings(&self, html: &str, title: &str) -> String {
        headings::headings(html, title)
    }

    fn restore_cell_notes(&self, html: &str, extra: &mut Self::Extra) -> String {
        notes::restore_cell_notes(html, extra)
    }

    fn detect_language(&self, block: &str) -> &'static str {
        code::detect_language(block)
    }

    fn scrub_code(&self, inner: &str) -> String {
        code::scrub_code(inner)
    }

    fn restore_notes(&self, html: &str, extra: &mut Self::Extra) -> String {
        notes::restore_notes(html, extra)
    }

    fn classify_image(&self, tag: &str) -> ImageKind {
        images::classify_image(tag)
    }

    fn emit_image(&self, kind: ImageKind, url: &str) -> String {
        match kind {
            ImageKind::Block => format!("\n![]({url})\n"),
            ImageKind::Inline => format!("![icon]({url})"),
        }
    }

    fn rewrite_links(&self, md: &str, _opts: &ConvertOptions) -> String {
        links::rewrite_doc_links(md)
    }

    fn postprocess(&self, md: &str, opts: &ConvertOptions) -> String {
        let (md, icons) = postprocess::protect_inline_icons(md);
        let md = ConvertDialect::postprocess(&GenericDialect, &md, opts);
        let md = postprocess::restore_inline_icons(&md, &icons);
        let md = postprocess::escape_placeholders(&md);
        if self.catalog.as_deref() == Some("harmonyos-references") {
            postprocess::api_metadata_spacing(&md)
        } else {
            md
        }
    }

    fn extra_header(&self, html: &str, _opts: &ConvertOptions) -> String {
        devices::extra_header(html, &self.device_types)
    }
}
