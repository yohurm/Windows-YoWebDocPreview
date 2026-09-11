use regex::Regex;
use yohu_domain::huawei_doc_origin;

/// `/consumer/cn/doc/` 相对路径补到华为站 origin（单源在 domain）。
pub fn rewrite_doc_links(md: &str) -> String {
    let origin = huawei_doc_origin();
    let re = Regex::new(r"\[([^\]]*)\]\((/consumer/cn/doc/[^)\s]*)\)").unwrap();
    re.replace_all(md, |c: &regex::Captures| {
        format!("[{}]({}{})", &c[1], origin, &c[2])
    })
    .into_owned()
}
