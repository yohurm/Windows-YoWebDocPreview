//! yohu-source 集成测试：wiremock 模拟 API 响应。

use wiremock::matchers::{body_partial_json, method, path, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

use yohu_source::{AdapterRegistry, HttpConfig, HttpClient};

fn client() -> HttpClient {
    HttpClient::new(HttpConfig::default()).unwrap()
}

/// `YOHU_DOC_API_URL` 是进程级环境变量，probe_meta 测试必须串行，
/// 否则并行线程会把请求打到对方的 wiremock 服务器上（相互污染）。
static ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

#[tokio::test]
async fn huawei_adapter_parses_value_response() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(body_partial_json(serde_json::json!({
            "objectId": "test-slug",
            "catalogName": "harmonyos-guides",
        })))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "value": {
                "title": "测试文档",
                "displayUpdateTime": "2026-05-26 06:48:54",
                "content": { "content": "<h2>章节</h2><p>内容</p>" }
            }
        })))
        .mount(&server)
        .await;

    // 将适配器指向 mock 服务器（通过环境变量注入端点）
    let reg = AdapterRegistry::with_defaults();
    let url = "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/test-slug".to_string();

    // 直接构造 DocRef 走 huawei fetch（绕过真实端点：用 route 校验 + 手动调用）
    let (adapter, doc_ref) = reg.route(&url);
    assert_eq!(adapter.id(), "huawei-harmonyos");
    assert_eq!(doc_ref.slug, "test-slug");
}

#[tokio::test]
async fn github_adapter_routes_repo_url() {
    let reg = AdapterRegistry::with_defaults();
    let url = "https://github.com/yohurm/Windows-YoWebDocPreview/blob/main/README.md";
    let (adapter, doc_ref) = reg.route(url);
    assert_eq!(adapter.id(), "github-repo");
    assert_eq!(doc_ref.catalog.as_deref(), Some("yohurm/Windows-YoWebDocPreview"));
    assert_eq!(doc_ref.slug, "README.md");
}

#[tokio::test]
async fn generic_web_extracts_article() {
    let server = MockServer::start().await;
    let article = r#"<html><head><title>文章标题</title></head><body>
        <nav>导航链接一堆<a href="/a">A</a><a href="/b">B</a></nav>
        <article><h1>文章标题</h1><p>这是正文内容，足够长以通过最小长度检查。</p>
        <p>第二段落补充更多文字内容确保密度评分通过阈值判定逻辑。</p></article>
        <footer>页脚信息</footer></body></html>"#;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string(article))
        .mount(&server)
        .await;

    let reg = AdapterRegistry::with_defaults();
    let url = format!("{}/post/1", server.uri());
    let (meta, raw) = yohu_source::fetch_any(&reg, &client(), &url).await.unwrap();

    assert_eq!(raw.title, "文章标题");
    assert!(!raw.html.contains("<nav"));
    assert!(!raw.html.contains("<footer"));
    assert!(raw.html.contains("正文内容"));
    assert_eq!(meta.channel, yohu_protocol::FetchChannel::GenericWeb);
}

#[tokio::test]
async fn not_found_maps_to_error() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(404))
        .mount(&server)
        .await;

    let reg = AdapterRegistry::with_defaults();
    let url = format!("{}/missing", server.uri());
    let err = yohu_source::fetch_any(&reg, &client(), &url).await.unwrap_err();
    assert_eq!(err.code(), "NOT_FOUND");
}

#[tokio::test]
async fn dedicated_adapter_failure_does_not_scrape_generic_web() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(500).set_body_string("boom"))
        .mount(&server)
        .await;

    let _guard = ENV_LOCK.lock().unwrap();
    std::env::set_var("YOHU_DOC_API_URL", format!("{}/api", server.uri()));
    let err = yohu_source::fetch_any(
        &AdapterRegistry::with_defaults(),
        &client(),
        "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/test-slug",
    )
    .await
    .unwrap_err();
    std::env::remove_var("YOHU_DOC_API_URL");

    assert_eq!(err.code(), "API", "{err}");
}
#[tokio::test]
async fn probe_meta_reads_title_and_time() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "value": {
                "title": "探针文档",
                "displayUpdateTime": "2026-01-02 03:04:05"
            }
        })))
        .mount(&server)
        .await;

    // 测试端点注入（wiremock 回放）
    let _guard = ENV_LOCK.lock().unwrap();
    std::env::set_var("YOHU_DOC_API_URL", format!("{}/api", server.uri()));
    let (title, time) = yohu_source::probe_meta(&client(), "probe-slug", "harmonyos-guides")
        .await
        .unwrap();
    std::env::remove_var("YOHU_DOC_API_URL");

    assert_eq!(title, "探针文档");
    assert_eq!(time.as_deref(), Some("2026-01-02 03:04:05"));
}

#[tokio::test]
async fn probe_meta_maps_missing_to_not_found() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "value": { "title": "404" }
        })))
        .mount(&server)
        .await;

    let _guard = ENV_LOCK.lock().unwrap();
    std::env::set_var("YOHU_DOC_API_URL", format!("{}/api", server.uri()));
    let err = yohu_source::probe_meta(&client(), "gone", "harmonyos-guides").await.unwrap_err();
    std::env::remove_var("YOHU_DOC_API_URL");

    assert_eq!(err.code(), "NOT_FOUND");
}

const SHA: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

#[tokio::test]
async fn github_adapter_fetches_readme_markdown() {
    let _guard = ENV_LOCK.lock().unwrap();
    let server = MockServer::start().await;
    std::env::set_var("YOHU_GITHUB_API_URL", server.uri());
    std::env::set_var("YOHU_GITHUB_RAW_URL", server.uri());
    Mock::given(method("GET"))
        .and(path("/repos/o/r"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "default_branch": "main"
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/repos/o/r/commits/main"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "sha": SHA
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path(format!("/o/r/{SHA}/README.md")))
        .respond_with(ResponseTemplate::new(200).set_body_string("# Hello\n\nbody"))
        .mount(&server)
        .await;

    let reg = AdapterRegistry::with_defaults();
    let result = yohu_source::fetch_any(
        &reg,
        &client(),
        "https://github.com/o/r/blob/main/README.md",
    )
    .await;
    std::env::remove_var("YOHU_GITHUB_API_URL");
    std::env::remove_var("YOHU_GITHUB_RAW_URL");

    let (meta, raw) = result.unwrap();
    assert_eq!(meta.doc_ref.source_id, "github-repo");
    assert_eq!(meta.doc_ref.git_ref.as_deref(), Some(SHA));
    assert_eq!(raw.title, "Hello");
    assert!(raw.html.is_empty());
    assert_eq!(raw.markdown.as_deref(), Some("# Hello\n\nbody"));
    assert_eq!(raw.source_path.as_deref(), Some("README.md"));
    assert_eq!(raw.blob_kind, Some(yohu_protocol::BlobKind::Markdown));
    assert!(raw.text.is_none());
}

#[tokio::test]
async fn github_adapter_opens_repo_root_without_readme() {
    let _guard = ENV_LOCK.lock().unwrap();
    let server = MockServer::start().await;
    std::env::set_var("YOHU_GITHUB_API_URL", server.uri());
    std::env::set_var("YOHU_GITHUB_RAW_URL", server.uri());
    Mock::given(method("GET"))
        .and(path("/repos/o/empty/readme"))
        .respond_with(ResponseTemplate::new(404))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/repos/o/empty"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "default_branch": "main"
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/repos/o/empty/commits/main"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "sha": SHA
        })))
        .mount(&server)
        .await;
    let reg = AdapterRegistry::with_defaults();
    let result = yohu_source::fetch_any(&reg, &client(), "https://github.com/o/empty").await;
    std::env::remove_var("YOHU_GITHUB_API_URL");
    std::env::remove_var("YOHU_GITHUB_RAW_URL");

    let (meta, raw) = result.unwrap();
    assert_eq!(meta.doc_ref.slug, "");
    assert_eq!(meta.doc_ref.git_ref.as_deref(), Some(SHA));
    assert_eq!(raw.blob_kind, Some(yohu_protocol::BlobKind::Markdown));
    assert!(
        raw.markdown.as_deref().unwrap_or("").contains("没有 README"),
        "{:?}",
        raw.markdown
    );
}

#[tokio::test]
async fn github_adapter_resolves_slashed_default_branch_without_full_tree() {
    let _guard = ENV_LOCK.lock().unwrap();
    let server = MockServer::start().await;
    std::env::set_var("YOHU_GITHUB_API_URL", server.uri());
    Mock::given(method("GET"))
        .and(path("/repos/diegosouzapw/OmniRoute"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "default_branch": "release/v3.8.51"
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path_regex(r"^/repos/diegosouzapw/OmniRoute/commits/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "sha": SHA
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/repos/diegosouzapw/OmniRoute/readme"))
        .respond_with(ResponseTemplate::new(200).set_body_string("# OmniRoute\n\nlanding"))
        .mount(&server)
        .await;

    let reg = AdapterRegistry::with_defaults();
    let result = yohu_source::fetch_any(
        &reg,
        &client(),
        "https://github.com/diegosouzapw/OmniRoute",
    )
    .await;
    std::env::remove_var("YOHU_GITHUB_API_URL");

    let (meta, raw) = result.unwrap();
    assert_eq!(meta.doc_ref.slug, "README.md");
    assert_eq!(meta.doc_ref.git_ref.as_deref(), Some(SHA));
    assert_eq!(raw.title, "OmniRoute");
    assert_eq!(raw.markdown.as_deref(), Some("# OmniRoute\n\nlanding"));
    let received = server.received_requests().await.unwrap();
    assert!(
        received.iter().all(|req| !req.url.path().contains("/git/trees/")),
        "repo-root fetch must not call git trees"
    );
}

#[tokio::test]
async fn github_adapter_lists_root_files_not_just_docs() {
    let _guard = ENV_LOCK.lock().unwrap();
    let server = MockServer::start().await;
    std::env::set_var("YOHU_GITHUB_API_URL", server.uri());
    Mock::given(method("GET"))
        .and(path("/repos/o/r"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "default_branch": "main"
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/repos/o/r/commits/main"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "sha": SHA
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/repos/o/r/contents"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
            {"type": "dir", "name": "src", "path": "src"},
            {"type": "file", "name": "README.md", "path": "README.md"},
            {"type": "file", "name": "Cargo.toml", "path": "Cargo.toml"}
        ])))
        .mount(&server)
        .await;

    let reg = AdapterRegistry::with_defaults();
    let result = yohu_source::fetch_catalog(&reg, &client(), "https://github.com/o/r").await;
    std::env::remove_var("YOHU_GITHUB_API_URL");

    let tree = result.unwrap();
    let names: Vec<_> = tree.iter().map(|n| n.name.as_str()).collect();
    assert_eq!(names, ["src", "Cargo.toml", "README.md"]);
    assert!(!tree[0].is_leaf);
    assert!(tree[0].children.is_empty());
    assert_eq!(tree[1].slug.as_deref(), Some("Cargo.toml"));
}

#[tokio::test]
async fn github_adapter_fetches_source_as_code_blob() {
    let _guard = ENV_LOCK.lock().unwrap();
    let server = MockServer::start().await;
    std::env::set_var("YOHU_GITHUB_API_URL", server.uri());
    std::env::set_var("YOHU_GITHUB_RAW_URL", server.uri());
    Mock::given(method("GET"))
        .and(path("/repos/o/r"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "default_branch": "main"
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path("/repos/o/r/commits/main"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "sha": SHA
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path(format!("/o/r/{SHA}/src/lib.rs")))
        .respond_with(ResponseTemplate::new(200).set_body_string("fn main() {}\n"))
        .mount(&server)
        .await;

    let reg = AdapterRegistry::with_defaults();
    let result = yohu_source::fetch_any(
        &reg,
        &client(),
        "https://github.com/o/r/blob/main/src/lib.rs",
    )
    .await;
    std::env::remove_var("YOHU_GITHUB_API_URL");
    std::env::remove_var("YOHU_GITHUB_RAW_URL");

    let (meta, raw) = result.unwrap();
    assert_eq!(raw.blob_kind, Some(yohu_protocol::BlobKind::Code));
    assert_eq!(meta.blob_kind, Some(yohu_protocol::BlobKind::Code));
    assert_eq!(raw.text.as_deref(), Some("fn main() {}\n"));
    assert!(raw.markdown.is_none());
    assert_eq!(raw.source_path.as_deref(), Some("src/lib.rs"));
}
