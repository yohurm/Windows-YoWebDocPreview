//! Agent 非交互入口：解析 URL 或本地 Markdown，stdout 只打 AgentDocument JSON。

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use yohu_protocol::{DocMeta, DocRef, FetchChannel, IpcError, IpcErrorCode};

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            let _ = serde_json::to_writer(std::io::stderr(), &e);
            let _ = writeln_stderr();
            ExitCode::from(if e.code == IpcErrorCode::InvalidArgs { 2 } else { 1 })
        }
    }
}

fn writeln_stderr() -> std::io::Result<()> {
    use std::io::Write;
    writeln!(std::io::stderr())
}

fn run() -> Result<(), IpcError> {
    tokio::runtime::Runtime::new()
        .map_err(|e| IpcError::internal(e.to_string()))?
        .block_on(run_async())
}

async fn run_async() -> Result<(), IpcError> {
    let action = parse_args(std::env::args().skip(1).collect())?;
    let doc = match action {
        Action::ParseUrl(url) => parse_url(&url).await?,
        Action::ParseFile(path) => parse_file(&path)?,
    };
    serde_json::to_writer(std::io::stdout(), &doc).map_err(|e| IpcError::internal(e.to_string()))?;
    Ok(())
}

#[derive(Debug)]
enum Action {
    ParseUrl(String),
    ParseFile(PathBuf),
}

fn parse_args(args: Vec<String>) -> Result<Action, IpcError> {
    let mut it = args.into_iter();
    let cmd = it.next().unwrap_or_default();
    if cmd != "parse" {
        return Err(invalid(
            "usage: yohu-ai parse --url <url> | yohu-ai parse --file <path>",
        ));
    }
    let flag = it.next().unwrap_or_default();
    let value = it.next().unwrap_or_default();
    if it.next().is_some() {
        return Err(invalid("unexpected extra arguments"));
    }
    match flag.as_str() {
        "--url" => {
            let url = value.trim();
            if url.is_empty() {
                return Err(invalid("url must not be empty"));
            }
            Ok(Action::ParseUrl(url.to_string()))
        }
        "--file" => {
            if value.trim().is_empty() {
                return Err(invalid("file path must not be empty"));
            }
            Ok(Action::ParseFile(PathBuf::from(value)))
        }
        _ => Err(invalid(
            "usage: yohu-ai parse --url <url> | yohu-ai parse --file <path>",
        )),
    }
}

async fn parse_url(url: &str) -> Result<yohu_protocol::AgentDocument, IpcError> {
    let http = yohu_source::HttpClient::new(yohu_source::HttpConfig::default())
        .map_err(|e| IpcError::new(IpcErrorCode::Network, e.to_string()))?;
    let registry = yohu_source::AdapterRegistry::with_defaults();
    let (meta, raw) = yohu_source::fetch_any(&registry, &http, url)
        .await
        .map_err(map_source)?;
    Ok(yohu_library::parse_document(&meta, &raw, url))
}

fn parse_file(path: &Path) -> Result<yohu_protocol::AgentDocument, IpcError> {
    let markdown = std::fs::read_to_string(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            IpcError::new(IpcErrorCode::NotFound, e.to_string())
        } else {
            IpcError::new(IpcErrorCode::Io, e.to_string())
        }
    })?;
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .filter(|s| !s.is_empty())
        .unwrap_or("untitled");
    let title = yohu_ai::leading_title(&markdown).unwrap_or_else(|| stem.to_string());
    let source_url = file_url(path);
    let meta = DocMeta {
        doc_ref: DocRef {
            source_id: yohu_domain::GENERIC_WEB_SOURCE_ID.into(),
            catalog: None,
            slug: yohu_domain::safe_stem(&title),
            url: source_url.clone(),
            git_ref: None,
        },
        title,
        update_time: None,
        source_url,
        channel: FetchChannel::GenericWeb,
        device_types: vec![],
        blob_kind: Some(yohu_protocol::BlobKind::Markdown),
    };
    Ok(yohu_library::parse_markdown(&markdown, meta))
}

fn file_url(path: &Path) -> String {
    let display = path.display().to_string().replace('\\', "/");
    if display.starts_with('/') {
        format!("file://{display}")
    } else {
        format!("file:///{display}")
    }
}

fn map_source(e: yohu_source::SourceError) -> IpcError {
    let code = match e.code() {
        "NOT_FOUND" => IpcErrorCode::NotFound,
        "NETWORK" => IpcErrorCode::Network,
        "API" => IpcErrorCode::Api,
        "EXTRACT_FAILED" => IpcErrorCode::ExtractFailed,
        _ => IpcErrorCode::Internal,
    };
    IpcError::new(code, e.to_string())
}

fn invalid(message: impl Into<String>) -> IpcError {
    IpcError::new(IpcErrorCode::InvalidArgs, message)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_and_unknown() {
        assert_eq!(parse_args(vec![]).unwrap_err().code, IpcErrorCode::InvalidArgs);
        assert_eq!(
            parse_args(vec!["parse".into(), "--url".into(), "".into()])
                .unwrap_err()
                .code,
            IpcErrorCode::InvalidArgs
        );
        assert_eq!(
            parse_args(vec!["parse".into(), "--file".into(), "".into()])
                .unwrap_err()
                .code,
            IpcErrorCode::InvalidArgs
        );
    }

    #[test]
    fn accepts_url_and_file() {
        match parse_args(vec!["parse".into(), "--url".into(), "https://example.com/a".into()]).unwrap()
        {
            Action::ParseUrl(u) => assert_eq!(u, "https://example.com/a"),
            Action::ParseFile(_) => panic!("url"),
        }
        match parse_args(vec!["parse".into(), "--file".into(), "doc.md".into()]).unwrap() {
            Action::ParseFile(p) => assert_eq!(p, PathBuf::from("doc.md")),
            Action::ParseUrl(_) => panic!("file"),
        }
    }
}
