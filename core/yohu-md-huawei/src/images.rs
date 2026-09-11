use yohu_md_convert::ImageKind;

const INLINE_ICON_MAX_PX: u32 = 48;

fn attr_u32(tag: &str, names: &[&str]) -> Option<u32> {
    let lower = tag.to_ascii_lowercase();
    for name in names {
        let key = format!("{name}=\"");
        if let Some(idx) = lower.find(&key) {
            let rest = &tag[idx + key.len()..];
            let end = rest.find('"')?;
            return rest[..end].parse().ok();
        }
    }
    None
}

fn class_has(tag: &str, token: &str) -> bool {
    let lower = tag.to_ascii_lowercase();
    let key = "class=\"";
    let Some(idx) = lower.find(key) else {
        return false;
    };
    let rest = &tag[idx + key.len()..];
    let Some(end) = rest.find('"') else {
        return false;
    };
    rest[..end]
        .split_whitespace()
        .any(|cls| cls.eq_ignore_ascii_case(token))
}

pub fn classify_image(tag: &str) -> ImageKind {
    if class_has(tag, "IconPic") || class_has(tag, "notEnlarge") {
        return ImageKind::Inline;
    }
    match (
        attr_u32(tag, &["originwidth", "width"]),
        attr_u32(tag, &["originheight", "height"]),
    ) {
        (Some(w), Some(h))
            if w > 0 && h > 0 && w <= INLINE_ICON_MAX_PX && h <= INLINE_ICON_MAX_PX =>
        {
            ImageKind::Inline
        }
        _ => ImageKind::Block,
    }
}
