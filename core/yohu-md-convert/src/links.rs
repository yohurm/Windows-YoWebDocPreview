use regex::Regex;

/// 相对链接补全。`base_url = None` 时原样保留，不做任何站点前缀。
pub fn complete_relative(md: &str, base_url: Option<&str>) -> String {
    let Some(base) = base_url else {
        return md.to_string();
    };
    let base = base.trim_end_matches('/');
    let origin = url_origin(base).unwrap_or_else(|| base.to_string());
    let re = Regex::new(r"\]\(([^)]+)\)").unwrap();
    re.replace_all(md, |c: &regex::Captures| {
        let target = &c[1];
        if target.starts_with("http://")
            || target.starts_with("https://")
            || target.starts_with('#')
            || target.starts_with("mailto:")
            || target.is_empty()
        {
            format!("]({target})")
        } else if let Some(rest) = target.strip_prefix('/') {
            format!("]({origin}/{rest})")
        } else {
            let dir = base
                .rsplit_once('/')
                .map(|(d, _)| d.to_string())
                .unwrap_or_else(|| base.to_string());
            format!("]({dir}/{target})")
        }
    })
    .into_owned()
}

fn url_origin(url: &str) -> Option<String> {
    let (scheme, rest) = url.split_once("://")?;
    if scheme.is_empty() || rest.is_empty() {
        return None;
    }
    let host = rest.split('/').next()?;
    if host.is_empty() {
        None
    } else {
        Some(format!("{scheme}://{host}"))
    }
}
