//! 设置存储：JSON + 原子写（临时文件 + rename）。键表/默认值在 yohu-protocol。

use std::path::PathBuf;
use std::sync::RwLock;

use yohu_protocol::AppSettings;
use yohu_runtime::{atomic_write, backup_corrupt};

/// 文件设置存储。
pub struct SettingsStore {
    file: PathBuf,
    inner: RwLock<AppSettings>,
}

impl SettingsStore {
    /// 读取（缺失 → 默认值；损坏 → 备份 `.corrupt-<ts>` 后回落默认，不中断启动）。
    pub fn load(file: PathBuf) -> Self {
        let settings = match std::fs::read_to_string(&file) {
            Ok(text) => match serde_json::from_str::<AppSettings>(&text) {
                Ok(s) => s,
                Err(_) => {
                    let _ = backup_corrupt(&file);
                    AppSettings::default()
                }
            },
            Err(_) => AppSettings::default(),
        };
        Self {
            file,
            inner: RwLock::new(settings),
        }
    }

    pub fn snapshot(&self) -> AppSettings {
        self.inner.read().expect("settings lock poisoned").clone()
    }

    /// 全量替换并原子落盘；返回落盘后的快照。
    pub fn set_all(&self, settings: AppSettings) -> Result<AppSettings, String> {
        *self.inner.write().expect("settings lock poisoned") = settings;
        self.save_atomic()?;
        Ok(self.snapshot())
    }

    /// 原子写：临时文件 + rename。
    pub fn save_atomic(&self) -> Result<(), String> {
        let snapshot = self.snapshot();
        let text = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
        atomic_write(&self.file, text).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "yohu-docpreview-settings-{}-{name}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir.join("settings.json")
    }

    #[test]
    fn missing_file_yields_defaults() {
        let s = SettingsStore::load(temp_file("missing"));
        assert_eq!(s.snapshot(), AppSettings::default());
    }

    #[test]
    fn corrupt_file_is_backed_up_and_defaults() {
        let f = temp_file("corrupt");
        std::fs::write(&f, "garbage{{{").unwrap();
        let s = SettingsStore::load(f.clone());
        assert_eq!(s.snapshot(), AppSettings::default());
        assert!(!f.exists());
        let dir = f.parent().unwrap();
        assert!(std::fs::read_dir(dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .any(|e| e.file_name().to_string_lossy().contains("corrupt-")));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn set_all_persists_atomically() {
        let f = temp_file("roundtrip");
        let s = SettingsStore::load(f.clone());
        let mut v = AppSettings::default();
        v.concurrency = 8;
        let back = s.set_all(v).unwrap();
        assert_eq!(back.concurrency, 8);
        let reloaded = SettingsStore::load(f.clone());
        assert_eq!(reloaded.snapshot().concurrency, 8);
        let _ = std::fs::remove_dir_all(f.parent().unwrap());
    }
}
