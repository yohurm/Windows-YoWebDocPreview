//! 宿主文件耐久：原子写（tmp + rename）与损坏备份。不解析业务 schema。

use std::path::{Path, PathBuf};

/// 原子写：父目录创建 → 写 `.tmp` → rename 覆盖目标。
pub fn atomic_write(file: &Path, bytes: impl AsRef<[u8]>) -> std::io::Result<()> {
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = file.with_extension("tmp");
    std::fs::write(&tmp, bytes.as_ref())?;
    std::fs::rename(&tmp, file)?;
    Ok(())
}

/// 把损坏文件备份为 `<file>.corrupt-<unix-ms>`，避免静默覆盖。
pub fn backup_corrupt(file: &Path) -> Option<PathBuf> {
    if !file.exists() {
        return None;
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let backup = file.with_extension(format!("corrupt-{stamp}"));
    std::fs::rename(file, &backup).ok()?;
    Some(backup)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "yohu-runtime-persist-{}-{name}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn atomic_write_creates_parent_and_overwrites() {
        let dir = temp_dir("roundtrip");
        let file = dir.join("sub").join("data.json");
        atomic_write(&file, "{\"ok\":true}").unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "{\"ok\":true}");
        atomic_write(&file, "second").unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "second");
        // 无残留临时文件
        let leftovers: Vec<_> = std::fs::read_dir(file.parent().unwrap())
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().ends_with(".tmp"))
            .collect();
        assert!(leftovers.is_empty());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn backup_corrupt_renames_existing_file() {
        let dir = temp_dir("corrupt");
        let file = dir.join("x.json");
        std::fs::write(&file, "bad").unwrap();
        let backup = backup_corrupt(&file).unwrap();
        assert!(!file.exists());
        assert!(backup
            .file_name()
            .unwrap()
            .to_string_lossy()
            .contains("corrupt-"));
        assert_eq!(std::fs::read_to_string(&backup).unwrap(), "bad");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn backup_corrupt_missing_file_is_none() {
        let dir = temp_dir("missing");
        assert!(backup_corrupt(&dir.join("nope.json")).is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
