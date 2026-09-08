//! 黄金样本门禁（v1 G2 / v2 R4，S 级验收）。
//!
//! 样本布局：`testdata/golden/<slug>/{input.html, meta.json, expected.md}`。
//! - `expected.md` 冻结基线：优先取 Python 参考实现输出（若存在），否则取 Rust 引擎基线；
//! - 对比经规范化（去行尾空白 + 折叠连续空行），只报内容差异；
//! - 系统性偏差登记在 `testdata/golden/exceptions.md`（每条一行：`` - `<slug>` — 归因 ``），
//!   登记后本测试跳过该样本并计入报告；未登记的差异一律失败。

use std::path::{Path, PathBuf};

use yohu_md_convert::{html_to_markdown, ConvertOptions};

const GOLDEN_DIR: &str = "testdata/golden";
const EXCEPTIONS_FILE: &str = "testdata/golden/exceptions.md";

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_default()
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_default()
}

/// 规范化：行尾空白、连续空行折叠、首尾空行去除。
fn normalize(md: &str) -> String {
    let mut out = Vec::new();
    for line in md.split('\n') {
        let line = line.trim_end();
        if line.is_empty() && out.last().is_some_and(|p: &String| p.is_empty()) {
            continue;
        }
        out.push(line.to_string());
    }
    let s = out.join("\n");
    s.trim().to_string()
}

/// 解析豁免登记：形如 `` - `<slug>` — 说明 ``。
fn registered_exceptions(root: &Path) -> std::collections::HashSet<String> {
    let text = match std::fs::read_to_string(root.join(EXCEPTIONS_FILE)) {
        Ok(t) => t,
        Err(_) => return std::collections::HashSet::new(),
    };
    let mut set = std::collections::HashSet::new();
    for line in text.lines() {
        let Some(start) = line.trim().strip_prefix("- `") else { continue };
        let Some(slug) = start.split('`').next() else { continue };
        if !slug.is_empty() {
            set.insert(slug.to_string());
        }
    }
    set
}

/// 差异行数（多重集合差：实际多出的行 + 期望多出的行），零依赖。
fn line_delta(actual: &str, expected: &str) -> usize {
    use std::collections::HashMap;
    let mut a: HashMap<&str, usize> = HashMap::new();
    for l in actual.lines() {
        *a.entry(l).or_insert(0) += 1;
    }
    let mut e: HashMap<&str, usize> = HashMap::new();
    for l in expected.lines() {
        *e.entry(l).or_insert(0) += 1;
    }
    let mut n = 0usize;
    for (&k, &c) in &a {
        n += c.saturating_sub(*e.get(k).unwrap_or(&0));
    }
    for (&k, &c) in &e {
        n += c.saturating_sub(*a.get(k).unwrap_or(&0));
    }
    n
}

fn sample_dirs(root: &Path) -> Vec<PathBuf> {
    let base = root.join(GOLDEN_DIR);
    let mut out = Vec::new();
    if let Ok(rd) = std::fs::read_dir(&base) {
        for entry in rd.flatten() {
            let p = entry.path();
            if p.is_dir() {
                out.push(p);
            }
        }
    }
    out.sort();
    out
}

fn run_sample(dir: &Path) -> Result<String, String> {
    let html = std::fs::read_to_string(dir.join("input.html")).map_err(|e| e.to_string())?;
    let meta = std::fs::read_to_string(dir.join("meta.json")).map_err(|e| e.to_string())?;
    let v: serde_json::Value = serde_json::from_str(&meta).map_err(|e| e.to_string())?;
    let opts = ConvertOptions {
        title: v.get("title").and_then(|x| x.as_str()).unwrap_or_default().to_string(),
        update_time: v.get("time").and_then(|x| x.as_str()).map(str::to_string),
        source_url: v.get("url").and_then(|x| x.as_str()).unwrap_or_default().to_string(),
        catalog: v.get("catalog").and_then(|x| x.as_str()).map(str::to_string),
        ..Default::default()
    };
    let expected = std::fs::read_to_string(dir.join("expected.md")).map_err(|e| e.to_string())?;
    let actual = html_to_markdown(&html, &opts);
    let (na, ne) = (normalize(&actual), normalize(&expected));
    if na == ne {
        return Ok(format!("一致（{} 行）", na.lines().count()));
    }
    // 首个差异 + 差异行数统计
    let (la, le): (Vec<&str>, Vec<&str>) = (na.lines().collect(), ne.lines().collect());
    let mut first: Option<(usize, &str, &str)> = None;
    for i in 0..la.len().max(le.len()) {
        let a = la.get(i).copied().unwrap_or("<EOF>");
        let b = le.get(i).copied().unwrap_or("<EOF>");
        if a != b {
            first = Some((i + 1, a, b));
            break;
        }
    }
    let changes = line_delta(&na, &ne);
    Err(format!(
        "{} 行 / 期望 {} 行 | 差异 {} 处{}\n  首个差异 @ 行 {}:\n    EXP : {}\n    GOT : {}",
        na.lines().count(),
        ne.lines().count(),
        changes,
        first.as_ref().map(|_| "").unwrap_or(""),
        first.map(|(n, _, _)| n).unwrap_or(0),
        first.map(|(_, _, b)| b.chars().take(120).collect::<String>()).unwrap_or_default(),
        first.map(|(_, a, _)| a.chars().take(120).collect::<String>()).unwrap_or_default(),
    ))
}

#[test]
fn golden_samples_match_expected() {
    let root = repo_root();
    let dirs = sample_dirs(&root);
    assert!(
        !dirs.is_empty(),
        "未找到黄金样本（{}）。请先运行 scripts/import-golden.py 导入并生成基线。",
        root.join(GOLDEN_DIR).display()
    );

    let exceptions = registered_exceptions(&root);
    let mut skipped = Vec::new();
    let mut failed = Vec::new();

    for dir in &dirs {
        let slug = dir.file_name().unwrap().to_string_lossy().into_owned();
        if exceptions.contains(&slug) {
            skipped.push(slug);
            continue;
        }
        match run_sample(dir) {
            Ok(detail) => println!("golden [{slug}] {detail}"),
            Err(report) => {
                eprintln!("golden [{slug}] 差异:\n{report}");
                failed.push(slug);
            }
        }
    }

    if !failed.is_empty() {
        panic!(
            "\n黄金样本门禁失败：{} 篇与基线不一致（共 {} 篇，豁免 {} 篇）。修复引擎或登记 exceptions.md：{}\n失败: {:?}\n",
            failed.len(),
            dirs.len(),
            skipped.len(),
            root.join(EXCEPTIONS_FILE).display(),
            failed,
        );
    }
    if !skipped.is_empty() {
        println!("豁免登记跳过: {:?}", skipped);
    }
    println!("golden 门禁通过：{}/{} 篇零内容差异", dirs.len() - skipped.len(), dirs.len());
}
