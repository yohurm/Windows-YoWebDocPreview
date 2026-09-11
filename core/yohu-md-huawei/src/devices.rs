use regex::Regex;
use std::sync::LazyLock;
use yohu_md_convert::ConvertOptions;

const DEVICE_MAP: &[(&str, &str)] = &[
    ("phone", "Phone"),
    ("2in1", "PC/2in1"),
    ("tablet", "Tablet"),
    ("wearable", "Wearable"),
    ("tv", "TV"),
];

pub fn map_devices(raw: &str) -> String {
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

pub fn extract_device_line(html: &str) -> String {
    static RE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r#"<h1[^>]+device-type="([^"]+)""#).unwrap());
    RE.captures(html)
        .map(|c| format!("**支持设备：** {}", map_devices(&c[1])))
        .unwrap_or_default()
}

pub fn extra_header(html: &str, opts: &ConvertOptions) -> String {
    if !opts.device_types.is_empty() {
        format!("**支持设备：** {}", opts.device_types.join(" | "))
    } else {
        extract_device_line(html)
    }
}
