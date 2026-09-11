use crate::dialect::ConvertDialect;
use crate::header;
use crate::options::ConvertOptions;
use crate::protect;
use crate::state::ConvertState;
use crate::tables;
use crate::transform;

/// 通用管线：步骤固定，站点差异只经 dialect。
pub fn html_to_markdown_with<D: ConvertDialect>(
    html: &str,
    opts: &ConvertOptions,
    dialect: &D,
) -> String {
    let mut st = ConvertState::default();
    let mut extra = D::Extra::default();
    let mut md = html.to_string();

    md = dialect.protect_cell_notes(&md, &mut extra);
    md = protect::save_code_blocks(&md, &mut st);
    md = dialect.protect_notes(&md, &mut extra);
    md = transform::strip_divs(&md);
    md = dialect.headings(&md, &opts.title);
    md = dialect.restore_cell_notes(&md, &mut extra);
    md = tables::convert_tables(&md);
    md = transform::inline_formatting(&md);
    md = transform::lists(&md);
    md = transform::paragraphs(&md);
    md = protect::restore_code_blocks(
        &md,
        &mut st,
        |block| dialect.detect_language(block),
        |inner| dialect.scrub_code(inner),
    );
    md = dialect.restore_notes(&md, &mut extra);
    md = transform::images(
        &md,
        &opts.image_map,
        |tag| dialect.classify_image(tag),
        |kind, url| dialect.emit_image(kind, url),
    );
    md = transform::strip_remaining_tags(&md);
    md = transform::decode_entities(&md);
    md = dialect.rewrite_links(&md, opts);
    md = dialect.postprocess(&md, opts);

    header::build_header(opts, &dialect.extra_header(html, opts)) + md.trim() + "\n"
}
