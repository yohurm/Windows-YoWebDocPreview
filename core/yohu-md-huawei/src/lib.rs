//! yohu-md-huawei — 华为开发者文档 HTML→Markdown 方言。
//!
//! 只依赖公共内核 [`yohu_md_convert`] 与领域身份 [`yohu_domain`]。
//! 通用管线不引用本 crate。

mod code;
mod devices;
mod dialect;
mod headings;
mod images;
mod links;
mod notes;
mod options;
mod postprocess;

pub use headings::heading_level;
pub use options::HuaweiConvertOptions;

use dialect::HuaweiDialect;
use yohu_md_convert::html_to_markdown_with;

/// 华为文档入口。
pub fn html_to_markdown(html: &str, opts: &HuaweiConvertOptions) -> String {
    html_to_markdown_with(
        html,
        &opts.to_inner(),
        &HuaweiDialect {
            catalog: opts.catalog.clone(),
            device_types: opts.device_types.clone(),
        },
    )
}
