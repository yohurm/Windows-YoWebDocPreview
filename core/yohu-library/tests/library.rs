//! yohu-library 集成测试：manifest / 导出编排 / 批量与取消。

use std::sync::Arc;

use tokio_util::sync::CancellationToken;
use wiremock::matchers::method;
use wiremock::{Mock, MockServer, ResponseTemplate};

use yohu_library::batch::{run_batch, BatchItem};
use yohu_library::LibraryStore;
use yohu_source::{AdapterRegistry, HttpConfig, HttpClient};

fn client() -> HttpClient {
    HttpClient::new(HttpConfig::default()).unwrap()
}

fn sample_page(title: &str) -> String {
    format!(
        r#"<html><head><title>{title}</title></head><body><article>
        <h1>{title}</h1><p>这是正文内容段落一，包含足够多的文字以通过提取阈值。</p>
        <p>第二段补充文字确保密度评分稳定通过最小长度判定逻辑要求。</p></article></body></html>"#
    )
}

#[tokio::test]
async fn manifest_roundtrip_and_upsert() {
    let dir = tempfile::tempdir().unwrap();
    let store = LibraryStore::open(dir.path());

    assert!(store.load_manifest().is_empty());
    store
        .upsert_entry(yohu_protocol::LibraryEntry {
            file: "web/a.md".into(),
            url: "https://example.com/a".into(),
            slug: "a".into(),
            catalog: "web".into(),
            local_time: None,
            official_time: None,
            status: None,
        })
        .unwrap();
    // upsert 同 URL 覆盖
    store
        .upsert_entry(yohu_protocol::LibraryEntry {
            file: "web/a2.md".into(),
            url: "https://example.com/a".into(),
            slug: "a".into(),
            catalog: "web".into(),
            local_time: None,
            official_time: None,
            status: None,
        })
        .unwrap();

    let all = store.load_manifest();
    assert_eq!(all.len(), 1);
    assert_eq!(all[0].file, "web/a2.md");
}

#[tokio::test]
async fn corrupt_manifest_backed_up() {
    let dir = tempfile::tempdir().unwrap();
    let p = dir.path().join("manifest.json");
    std::fs::write(&p, "not json {{{").unwrap();
    let store = LibraryStore::open(dir.path());
    assert!(store.load_manifest().is_empty());
    assert!(!p.exists()); // 已被备份移走
}

#[tokio::test]
async fn export_one_writes_md_and_manifest() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string(sample_page("导出测试文档")))
        .mount(&server)
        .await;

    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(LibraryStore::open(dir.path()));
    let reg = Arc::new(AdapterRegistry::with_defaults());
    let url = format!("{}/doc", server.uri());

    let path = store
        .export_one(&reg, &client(), &url, "docs", false, None)
        .await
        .unwrap();

    assert!(path.exists());
    let content = std::fs::read_to_string(&path).unwrap();
    assert!(content.contains("# 导出测试文档"));
    assert!(content.contains("正文内容"));

    let manifest = store.load_manifest();
    assert_eq!(manifest.len(), 1);
    assert_eq!(manifest[0].url, url);
    assert!(manifest[0].file.starts_with("docs/"));
}

#[tokio::test]
async fn batch_runs_and_reports_progress() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string(sample_page("批量文档")))
        .mount(&server)
        .await;

    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(LibraryStore::open(dir.path()));
    let reg = Arc::new(AdapterRegistry::with_defaults());
    let items: Vec<BatchItem> = (0..5)
        .map(|i| BatchItem { url: format!("{}/p{i}", server.uri()), rel_dir: String::new() })
        .collect();

    let result = run_batch(
        store, reg, client(), items, 2, CancellationToken::new(), 1, None,
        |_| {},
    )
    .await;

    assert_eq!(result.done, 5);
    assert_eq!(result.failed, 0);
    assert!(!result.cancelled);
}

#[tokio::test]
async fn batch_cancel_stops_early() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string(sample_page("取消文档")))
        .mount(&server)
        .await;

    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(LibraryStore::open(dir.path()));
    let reg = Arc::new(AdapterRegistry::with_defaults());
    let items: Vec<BatchItem> = (0..200)
        .map(|i| BatchItem { url: format!("{}/c{i}", server.uri()), rel_dir: String::new() })
        .collect();

    let token = CancellationToken::new();
    let cancel_token = token.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        cancel_token.cancel();
    });

    let result = run_batch(
        store, reg, client(), items, 1, token, 2, None,
        |_| {},
    )
    .await;

    assert!(result.cancelled);
    assert!(result.done < 200);
}
#[tokio::test]
async fn batch_resume_skips_completed_urls() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string(sample_page("续跑文档")))
        .mount(&server)
        .await;

    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(LibraryStore::open(dir.path()));
    let reg = Arc::new(AdapterRegistry::with_defaults());
    let state_dir = tempfile::tempdir().unwrap();
    let state_path = state_dir.path().join("state.json");

    // 第一轮：3 条，中途取消（取消后 state 落盘）
    let items: Vec<BatchItem> = (0..3)
        .map(|i| BatchItem { url: format!("{}/r{i}", server.uri()), rel_dir: String::new() })
        .collect();
    let token = CancellationToken::new();
    let t2 = token.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(60)).await;
        t2.cancel();
    });
    let r1 = run_batch(
        Arc::clone(&store), Arc::clone(&reg), client(), items.clone(), 1, token, 1,
        Some(&state_path), |_| {},
    )
    .await;
    assert!(r1.cancelled);
    assert!(state_path.exists(), "取消后断点应落盘");

    // 第二轮：同清单重跑 → 已完成跳过，剩余完成，断点清理
    let r2 = run_batch(
        Arc::clone(&store), Arc::clone(&reg), client(), items, 2, CancellationToken::new(), 2,
        Some(&state_path), |_| {},
    )
    .await;
    assert!(!r2.cancelled);
    assert_eq!(r2.done, 3);
    assert!(!state_path.exists(), "自然完成后断点应清理");
    assert_eq!(store.load_manifest().len(), 3);
}

#[tokio::test]
async fn check_produces_update_list() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "value": { "title": "检查文档", "displayUpdateTime": "2026-06-01 00:00:00" }
        })))
        .mount(&server)
        .await;
    std::env::set_var("YOHU_DOC_API_URL", format!("{}/api", server.uri()));

    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(LibraryStore::open(dir.path()));
    // 本地时间早于官方 → UPDATE；无本地时间 → NEW；web catalog 跳过
    for (slug, local) in [
        ("upd-slug", Some("2026-01-01 00:00:00".to_string())),
        ("new-slug", None),
    ] {
        store
            .upsert_entry(yohu_protocol::LibraryEntry {
                file: format!("docs/{slug}.md"),
                url: format!("https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/{slug}"),
                slug: slug.into(),
                catalog: "harmonyos-guides".into(),
                local_time: local,
                official_time: None,
                status: None,
            })
            .unwrap();
    }
    store
        .upsert_entry(yohu_protocol::LibraryEntry {
            file: "web/w.md".into(),
            url: "https://example.com/w".into(),
            slug: "w".into(),
            catalog: "web".into(),
            local_time: None,
            official_time: None,
            status: None,
        })
        .unwrap();
    store
        .upsert_entry(yohu_protocol::LibraryEntry {
            file: "github/README.md".into(),
            url: "https://github.com/o/r/blob/main/README.md".into(),
            slug: "README.md".into(),
            catalog: "o/r".into(),
            local_time: None,
            official_time: None,
            status: None,
        })
        .unwrap();

    let entries = store.load_manifest();
    let result = yohu_library::run_check(
        Arc::clone(&store), client(), entries, 2, CancellationToken::new(), 9, |_| {},
    )
    .await
    .unwrap();
    std::env::remove_var("YOHU_DOC_API_URL");

    assert_eq!(result.checked, 2);
    let statuses: std::collections::HashMap<&str, &str> = result
        .items
        .iter()
        .map(|i| (i.slug.as_str(), i.status.as_str()))
        .collect();
    assert_eq!(statuses.get("upd-slug"), Some(&"UPDATE"));
    assert_eq!(statuses.get("new-slug"), Some(&"NEW"));
    // web / GitHub 条目不参与华为 probe
    assert!(!result.items.iter().any(|i| i.slug == "w"));
    assert!(!result.items.iter().any(|i| i.slug == "README.md"));
}

#[tokio::test]
async fn parse_after_fetch_matches_convert_and_has_outline() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string(
            r#"<html><head><title>解析集成</title></head><body><article>
            <h1>解析集成</h1>
            <p>这是正文内容段落一，包含足够多的文字以通过提取阈值。</p>
            <h2>第二节</h2>
            <p>第二段补充文字确保密度评分稳定通过最小长度判定逻辑要求。</p>
            </article></body></html>"#,
        ))
        .mount(&server)
        .await;

    let url = format!("{}/doc", server.uri());
    let (meta, raw) = yohu_source::fetch_any(&AdapterRegistry::with_defaults(), &client(), &url)
        .await
        .unwrap();
    let parsed = yohu_library::parse_document(&meta, &raw, &url);
    let converted = yohu_library::convert_document(&meta, &raw, &url, Default::default());
    assert_eq!(parsed.markdown, converted);
    assert!(
        parsed.outline.iter().any(|n| n.text.contains("第二节")),
        "{:?}",
        parsed.outline
    );
    assert!(parsed.sections.iter().any(|s| s.heading.contains("解析集成")));
}

#[tokio::test]
async fn parse_fetch_not_found() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(404))
        .mount(&server)
        .await;
    let url = format!("{}/missing", server.uri());
    let err = yohu_source::fetch_any(&AdapterRegistry::with_defaults(), &client(), &url)
        .await
        .unwrap_err();
    assert_eq!(err.code(), "NOT_FOUND");
}
