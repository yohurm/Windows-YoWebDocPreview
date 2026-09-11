//! 转换编排：按 `source_id` 选引擎。壳与 store 只走这里，禁止各自 if 方言。

use std::collections::HashMap;

use yohu_protocol::DocMeta;

pub fn html_to_markdown(
    meta: &DocMeta,
    html: &str,
    page_url: &str,
    image_map: HashMap<String, String>,
) -> String {
    if yohu_domain::is_huawei_source(&meta.doc_ref.source_id) {
        yohu_md_huawei::html_to_markdown(
            html,
            &yohu_md_huawei::HuaweiConvertOptions {
                title: meta.title.clone(),
                update_time: meta.update_time.clone(),
                source_url: page_url.to_string(),
                catalog: meta.doc_ref.catalog.clone(),
                image_map,
                device_types: meta.device_types.clone(),
            },
        )
    } else {
        yohu_md_convert::html_to_markdown(
            html,
            &yohu_md_convert::ConvertOptions {
                title: meta.title.clone(),
                update_time: meta.update_time.clone(),
                source_url: page_url.to_string(),
                image_map,
                device_types: meta.device_types.clone(),
                base_url: Some(page_url.to_string()),
            },
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use yohu_protocol::{DocMeta, DocRef, FetchChannel};

    fn meta(source_id: &str) -> DocMeta {
        DocMeta {
            title: "t".into(),
            update_time: None,
            source_url: "https://example.com/x".into(),
            channel: FetchChannel::GenericWeb,
            device_types: vec![],
            doc_ref: DocRef {
                source_id: source_id.into(),
                catalog: Some("harmonyos-guides".into()),
                slug: "x".into(),
                url: "https://example.com/x".into(),
            },
        }
    }

    #[test]
    fn generic_source_skips_huawei_note() {
        let md = html_to_markdown(
            &meta(yohu_domain::GENERIC_WEB_SOURCE_ID),
            r#"<div class="note"><span class="notetitle">注意：</span><div class="notebody">危险</div></div>"#,
            "https://example.com/x",
            Default::default(),
        );
        assert!(!md.contains("> [!WARNING]"), "{md}");
    }

    #[test]
    fn huawei_source_applies_note() {
        let md = html_to_markdown(
            &meta(yohu_domain::huawei_source_id()),
            r#"<div class="note"><span class="notetitle">注意：</span><div class="notebody">危险</div></div>"#,
            "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/x",
            Default::default(),
        );
        assert!(md.contains("> [!WARNING]"), "{md}");
    }
}
