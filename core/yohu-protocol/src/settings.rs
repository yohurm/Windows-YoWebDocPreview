//! 应用设置 wire 模型（键表见需求 §4.8；纯数据 + 默认值，零 IO）。
//!
//! 落盘与副作用在壳；键校验/应用逻辑在 yohu-domain（贴 protocol 模型）。

use serde::{Deserialize, Serialize};

use crate::identity::DATA_DIR_NAME;

/// 主题（默认跟随系统）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    System,
    Light,
    Dark,
}

/// 设置键（wire 名 camelCase，与 @yohu/api 对齐）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SettingsKey {
    LibraryRoot,
    Concurrency,
    RequestTimeoutSec,
    ImageDownload,
    Theme,
}

/// 生效语义
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Effect {
    Immediate,
    NextTask,
    Restart,
}

impl SettingsKey {
    pub fn as_str(&self) -> &'static str {
        match self {
            SettingsKey::LibraryRoot => "libraryRoot",
            SettingsKey::Concurrency => "concurrency",
            SettingsKey::RequestTimeoutSec => "requestTimeoutSec",
            SettingsKey::ImageDownload => "imageDownload",
            SettingsKey::Theme => "theme",
        }
    }

    pub fn effect(&self) -> Effect {
        match self {
            SettingsKey::LibraryRoot => Effect::Restart,
            SettingsKey::Concurrency | SettingsKey::ImageDownload => Effect::NextTask,
            SettingsKey::RequestTimeoutSec | SettingsKey::Theme => Effect::Immediate,
        }
    }
}

impl Theme {
    /// 工作台窗口 / html 底色（与 `--yo-bg-app` 对齐）。
    pub const FILL_LIGHT: (u8, u8, u8) = (0xF8, 0xFA, 0xFC);
    pub const FILL_DARK: (u8, u8, u8) = (0x09, 0x0D, 0x16);

    pub fn resolves_dark(self, system_dark: bool) -> bool {
        match self {
            Theme::Dark => true,
            Theme::Light => false,
            Theme::System => system_dark,
        }
    }

    pub fn window_fill_rgb(self, system_dark: bool) -> (u8, u8, u8) {
        if self.resolves_dark(system_dark) {
            Self::FILL_DARK
        } else {
            Self::FILL_LIGHT
        }
    }
}

/// 全量设置快照（默认值即需求 §4.8 表）
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub library_root: String,
    pub concurrency: u32,
    pub request_timeout_sec: u64,
    pub image_download: bool,
    pub theme: Theme,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            library_root: format!("%LOCALAPPDATA%\\{DATA_DIR_NAME}\\library"),
            concurrency: 4,
            request_timeout_sec: 15,
            image_download: true,
            theme: Theme::System,
        }
    }
}

impl AppSettings {
    /// 宽容反序列化：缺字段回落默认值；整体损坏回落全默认。
    pub fn from_json_lenient(json: &str) -> Self {
        serde_json::from_str(json).unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_match_requirements_table() {
        let s = AppSettings::default();
        assert_eq!(s.concurrency, 4);
        assert_eq!(s.request_timeout_sec, 15);
        assert!(s.library_root.contains(DATA_DIR_NAME));
        assert!(s.image_download);
        assert_eq!(s.theme, Theme::System);
    }

    #[test]
    fn settings_roundtrip_camel_case() {
        let s = AppSettings::default();
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"libraryRoot\""));
        assert!(json.contains("\"requestTimeoutSec\""));
        let back: AppSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(back, s);
    }

    #[test]
    fn lenient_parse_fills_missing_fields() {
        let s = AppSettings::from_json_lenient(r#"{"concurrency": 8}"#);
        assert_eq!(s.concurrency, 8);
        assert_eq!(s.request_timeout_sec, 15); // 缺失回落默认
    }

    #[test]
    fn corrupt_json_falls_back_to_defaults() {
        assert_eq!(AppSettings::from_json_lenient("garbage{{{"), AppSettings::default());
    }

    #[test]
    fn effects_match_key_table() {
        assert_eq!(SettingsKey::LibraryRoot.effect(), Effect::Restart);
        assert_eq!(SettingsKey::Theme.effect(), Effect::Immediate);
        assert_eq!(SettingsKey::Concurrency.effect(), Effect::NextTask);
    }

    #[test]
    fn theme_resolves_against_system() {
        assert!(Theme::Dark.resolves_dark(false));
        assert!(!Theme::Light.resolves_dark(true));
        assert!(Theme::System.resolves_dark(true));
        assert!(!Theme::System.resolves_dark(false));
        assert_eq!(Theme::Dark.window_fill_rgb(false), Theme::FILL_DARK);
        assert_eq!(Theme::Light.window_fill_rgb(true), Theme::FILL_LIGHT);
    }
}
