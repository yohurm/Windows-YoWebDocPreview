//! 命令行转换：华为文档 HTML → Markdown（黄金样本导入脚本使用）。

use std::path::PathBuf;

use yohu_md_huawei::{html_to_markdown, HuaweiConvertOptions};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 7 {
        eprintln!("用法: convert_file <input.html> <title> <update_time> <source_url> <catalog> <output.md>");
        std::process::exit(2);
    }
    let input = PathBuf::from(&args[1]);
    let title = args[2].clone();
    let update_time = if args[3].is_empty() { None } else { Some(args[3].clone()) };
    let source_url = args[4].clone();
    let catalog = if args[5].is_empty() { None } else { Some(args[5].clone()) };
    let output = PathBuf::from(&args[6]);

    let html = std::fs::read_to_string(&input).unwrap_or_else(|e| {
        eprintln!("读取 {} 失败: {e}", input.display());
        std::process::exit(1);
    });
    let opts = HuaweiConvertOptions {
        title: title.clone(),
        update_time,
        source_url,
        catalog,
        ..Default::default()
    };
    let md = html_to_markdown(&html, &opts);
    if let Some(parent) = output.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let chars = md.chars().count();
    std::fs::write(&output, &md).unwrap_or_else(|e| {
        eprintln!("写入 {} 失败: {e}", output.display());
        std::process::exit(1);
    });
    println!("{}: {} -> {} ({} chars)", title, input.display(), output.display(), chars);
}
