//! 文档库非交互更新：对照官网后写回 libraryRoot 指向的树。
//!
//! 库根只来自 `--root` 或 `YOHU_DOCS_ROOT`，不写死盘符或家目录。

use std::path::PathBuf;
use std::process::ExitCode;
use std::sync::Arc;

use tokio_util::sync::CancellationToken;
use yohu_library::LibraryStore;
use yohu_protocol::{IpcError, IpcErrorCode};
use yohu_source::{AdapterRegistry, HttpClient, HttpConfig};

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

struct Args {
    root: PathBuf,
    scope: Vec<String>,
    plan_only: bool,
    concurrency: usize,
    images: bool,
}

fn parse_args(args: Vec<String>) -> Result<Args, IpcError> {
    let mut it = args.into_iter();
    let cmd = it.next().unwrap_or_default();
    if cmd != "sync" {
        return Err(invalid(
            "usage: yohu-docs sync --root <dir> [--scope 开发,设计] [--plan-only]",
        ));
    }
    let mut root = None;
    let mut scope = vec!["开发".into(), "设计".into()];
    let mut plan_only = false;
    let mut concurrency = 8usize;
    let mut images = true;
    while let Some(flag) = it.next() {
        match flag.as_str() {
            "--root" => {
                let v = it.next().unwrap_or_default();
                if v.trim().is_empty() {
                    return Err(invalid("root must not be empty"));
                }
                root = Some(PathBuf::from(v));
            }
            "--scope" => {
                let v = it.next().unwrap_or_default();
                let parts: Vec<String> = v
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
                if parts.is_empty() {
                    return Err(invalid("scope must not be empty"));
                }
                scope = parts;
            }
            "--plan-only" => plan_only = true,
            "--concurrency" => {
                concurrency = it
                    .next()
                    .and_then(|s| s.parse().ok())
                    .filter(|n| *n > 0)
                    .unwrap_or(8);
            }
            "--no-images" => images = false,
            _ => return Err(invalid("unknown argument")),
        }
    }
    let root = root
        .or_else(|| std::env::var_os("YOHU_DOCS_ROOT").map(PathBuf::from))
        .ok_or_else(|| invalid("set --root or YOHU_DOCS_ROOT"))?;
    Ok(Args {
        root,
        scope,
        plan_only,
        concurrency,
        images,
    })
}

async fn run_async() -> Result<(), IpcError> {
    let args = parse_args(std::env::args().skip(1).collect())?;
    if !args.root.is_dir() {
        return Err(IpcError::new(
            IpcErrorCode::NotFound,
            format!("library root is not a directory: {}", args.root.display()),
        ));
    }
    let http = HttpClient::new(HttpConfig {
        timeout_sec: 20,
        concurrency: args.concurrency,
    })
    .map_err(|e| IpcError::internal(e.to_string()))?;
    let store = LibraryStore::open(&args.root);
    let token = CancellationToken::new();
    let items = yohu_library::plan_sync(&store, &http, &args.scope, &token, args.concurrency)
        .await
        .map_err(|e| IpcError::new(e.code(), e.to_string()))?;
    if args.plan_only {
        let report = yohu_protocol::SyncReport {
            planned: items.len() as u32,
            updated: 0,
            created: 0,
            marked_offline: 0,
            failed: 0,
            items,
        };
        serde_json::to_writer(std::io::stdout(), &report)
            .map_err(|e| IpcError::internal(e.to_string()))?;
        return Ok(());
    }
    let report = yohu_library::apply_sync(
        Arc::new(store),
        Arc::new(AdapterRegistry::with_defaults()),
        http,
        items,
        args.concurrency,
        args.images,
        token,
        1,
        |p| {
            eprintln!(
                "sync {}/{} failed={} {}",
                p.done,
                p.total,
                p.failed,
                p.current.unwrap_or_default()
            );
        },
    )
    .await
    .map_err(|e| IpcError::new(e.code(), e.to_string()))?;
    serde_json::to_writer(std::io::stdout(), &report).map_err(|e| IpcError::internal(e.to_string()))?;
    Ok(())
}

fn invalid(msg: &str) -> IpcError {
    IpcError::new(IpcErrorCode::InvalidArgs, msg)
}
