//! 崩溃处理：panic hook 写 `logs/panic-<ts>.log`（v1 §6 兑现）。

use std::path::PathBuf;

/// 安装全局 panic hook（先于一切业务装配）。
pub fn install(logs_dir: PathBuf) {
    std::panic::set_hook(Box::new(move |info| {
        let message = format!("{info}");
        eprintln!("PANIC: {message}");
        let _ = std::fs::create_dir_all(&logs_dir);
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let file = logs_dir.join(format!("panic-{stamp}.log"));
        let _ = std::fs::write(&file, &message);
    }));
}
