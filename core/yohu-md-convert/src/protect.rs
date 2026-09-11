//! 通用代码块保护。站点 note / 工具条剥离由方言承担。

use crate::state::ConvertState;
use regex::Regex;
use std::sync::LazyLock;

static PRE_INNER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)<pre[^>]*>(.*?)</pre>").unwrap());
static CODE_TAG_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"</?code[^>]*>").unwrap());

pub fn save_code_blocks(md: &str, st: &mut ConvertState) -> String {
    let re = Regex::new(r"(?s)<pre[^>]*>.*?</pre>").unwrap();
    re.replace_all(md, |c: &regex::Captures| {
        let i = st.code_blocks.len();
        st.code_blocks.push(c[0].to_string());
        format!("\u{0}CODE{i}\u{0}")
    })
    .into_owned()
}

pub fn restore_code_blocks(
    md: &str,
    st: &mut ConvertState,
    detect_language: impl Fn(&str) -> &'static str,
    scrub_inner: impl Fn(&str) -> String,
) -> String {
    let mut out = md.to_string();
    for (i, block) in std::mem::take(&mut st.code_blocks).into_iter().enumerate() {
        let ph = format!("\u{0}CODE{i}\u{0}");
        let lang = detect_language(&block);
        let replacement = match PRE_INNER_RE.captures(&block) {
            Some(c) => {
                let mut code = c[1].to_string();
                const LT: &str = concat!("&", "lt;");
                const GT: &str = concat!("&", "gt;");
                const AMP: &str = concat!("&", "amp;");
                code = code.replace(LT, "<").replace(GT, ">").replace(AMP, "&");
                let code = CODE_TAG_RE.replace_all(&code, "");
                let code = scrub_inner(&code);
                format!("\n```{lang}\n{}\n```\n", code.trim())
            }
            None => String::new(),
        };
        out = out.replacen(&ph, &replacement, 1);
    }
    out
}
