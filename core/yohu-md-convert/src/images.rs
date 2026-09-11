use std::collections::HashMap;

use regex::Regex;

/// 图片分类由方言决定；内核不写站点 alt。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageKind {
    Block,
    Inline,
}

/// 先按 URL 映射替换，再转换 img。分类与输出都来自方言。
pub fn images(
    md: &str,
    image_map: &HashMap<String, String>,
    classify: impl Fn(&str) -> ImageKind,
    emit: impl Fn(ImageKind, &str) -> String,
) -> String {
    let mut out = md.to_string();
    for (orig, local) in image_map {
        out = out.replace(orig.as_str(), local.as_str());
    }
    let img_re = Regex::new(r#"<img[^>]+>"#).unwrap();
    img_re
        .replace_all(&out, |tag: &regex::Captures| {
            let src = Regex::new(r#"src="([^"]+)""#)
                .unwrap()
                .captures(&tag[0])
                .or_else(|| Regex::new(r"src='([^']+)'").unwrap().captures(&tag[0]));
            match src.and_then(|c| c.get(1)) {
                Some(s) => {
                    let url = s.as_str().replace(' ', "%20");
                    emit(classify(&tag[0]), &url)
                }
                None => String::new(),
            }
        })
        .into_owned()
}
