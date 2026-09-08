//! 路径规划（ADR-W10 承载于 yohu-runtime）：全部在 LocalAppData，无管理员权限。
//!
//! ```text
//! %LOCALAPPDATA%\YoWebDocPreview\       # local_root（固定，不随 libraryRoot 迁移）
//! ├── settings\settings.json
//! ├── logs\                             # panic-*.log
//! ├── runs\<run_id>\state.json          # 批量断点
//! ├── cache\history.json                # 预览历史（预留）
//! └── library\                          # 默认库根（libraryRoot 重启冻结快照）
//! ```

use std::path::PathBuf;

use yohu_protocol::DATA_DIR_NAME;
use yohu_runtime::app_data_root;

/// 应用路径集（启动时冻结；`libraryRoot` 重启生效）。
#[derive(Debug, Clone)]
pub struct AppPaths {
    /// `%LOCALAPPDATA%\YoWebDocPreview`
    pub local_root: PathBuf,
    pub settings_dir: PathBuf,
    /// 崩溃日志目录
    pub logs_dir: PathBuf,
    /// 批量断点根（`runs\<run_id>\state.json`）
    pub runs_dir: PathBuf,
    /// 预览缓存/历史目录（预留）
    pub cache_dir: PathBuf,
    /// 库根（设置 `libraryRoot` 的启动冻结快照）
    pub library_root: PathBuf,
}

impl AppPaths {
    /// 确保运行所需目录存在（启动时装配调用）。
    pub fn ensure_dirs(&self) -> std::io::Result<()> {
        for d in [
            &self.settings_dir,
            &self.logs_dir,
            &self.runs_dir,
            &self.cache_dir,
            &self.library_root,
        ] {
            std::fs::create_dir_all(d)?;
        }
        Ok(())
    }
}

impl AppPaths {
    pub fn local_root() -> PathBuf {
        app_data_root(DATA_DIR_NAME)
    }

    /// 设置文件（探针用：与 libraryRoot 无关，先于路径集解析）。
    pub fn probe_settings_file() -> PathBuf {
        Self::local_root().join("settings").join("settings.json")
    }

    /// 解析路径集；`settings_library_root` 为空或为默认模板时用 `local_root/library`。
    pub fn resolve(settings_library_root: &str) -> Self {
        let local_root = Self::local_root();
        let default_lib = local_root.join("library");
        let library_root = match settings_library_root.trim() {
            "" => default_lib,
            // AppSettings 默认值是 `%LOCALAPPDATA%\...` 模板串，视为“默认库根”
            s if s.contains("%LOCALAPPDATA%") => default_lib,
            s => PathBuf::from(s),
        };
        Self {
            settings_dir: local_root.join("settings"),
            logs_dir: local_root.join("logs"),
            runs_dir: local_root.join("runs"),
            cache_dir: local_root.join("cache"),
            local_root,
            library_root,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_or_template_library_root_uses_default() {
        for s in ["", "  ", r"%LOCALAPPDATA%\YoWebDocPreview\library"] {
            let p = AppPaths::resolve(s);
            assert_eq!(p.library_root, AppPaths::local_root().join("library"));
        }
    }

    #[test]
    fn custom_library_root_does_not_move_settings_or_logs() {
        let p = AppPaths::resolve(r"D:\MyDocs");
        assert_eq!(p.library_root, PathBuf::from(r"D:\MyDocs"));
        assert_eq!(p.settings_dir.join("settings.json"), AppPaths::probe_settings_file());
        assert_eq!(p.logs_dir, AppPaths::local_root().join("logs"));
    }
}
