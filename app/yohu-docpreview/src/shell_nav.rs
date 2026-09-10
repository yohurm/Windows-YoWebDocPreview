//! 工作台 WebView 只承载壳页面。文档 URL 必须走 fetchDoc，不能当成浏览导航。

use tauri::Url;

pub fn allow_shell_navigation(url: &Url) -> bool {
    match url.scheme() {
        "tauri" | "asset" | "about" => true,
        "http" | "https" => matches!(
            url.host_str(),
            Some("localhost" | "127.0.0.1" | "tauri.localhost" | "::1")
        ),
        _ => false,
    }
}

pub fn plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("yohu-shell-nav")
        .on_navigation(|_webview, url| allow_shell_navigation(url))
        .build()
}

#[cfg(test)]
mod tests {
    use super::allow_shell_navigation;
    use tauri::Url;

    fn parse(url: &str) -> Url {
        url.parse().expect("url")
    }

    #[test]
    fn allows_the_workbench_origin_and_blocks_document_hosts() {
        assert!(allow_shell_navigation(&parse("http://localhost:1335/")));
        assert!(allow_shell_navigation(&parse("https://tauri.localhost/")));
        assert!(allow_shell_navigation(&parse("about:srcdoc")));
        assert!(!allow_shell_navigation(&parse(
            "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts"
        )));
        assert!(!allow_shell_navigation(&parse("https://gitcode.com/example/pages/BasicKnowledge.ets")));
    }
}
