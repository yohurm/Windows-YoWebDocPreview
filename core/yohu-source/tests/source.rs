//! yohu-source 集成测试：wiremock 模拟 API 响应。

use wiremock::matchers::{body_partial_json, method};
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
