//! yohu-protocol — wire 类型层（全图最底层）。
//!
//! 纯数据结构 + 身份常量 + 事件名常量；零 IO、零业务逻辑。
//! 所有跨 IPC 的类型定义单源于此；TS 侧由 `@yohu/api` 手工对齐并以契约测试守护。

pub mod error;
pub mod event_names;
pub mod events;
pub mod identity;
pub mod settings;
pub mod wire;

pub use error::{IpcError, IpcErrorCode};
pub use event_names::*;
pub use events::AppEvent;
pub use identity::*;
pub use settings::{AppSettings, Effect, SettingsKey, Theme};
pub use wire::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_constants_are_project_owned() {
        // 应用身份为本项目自有资产，禁止套用 ADBTools（ADR-W9）
        assert_eq!(PRODUCT_NAME, "YoWebDocPreview");
        assert_eq!(IDENTIFIER, "com.yohu.webdocpreview");
        assert_ne!(DATA_DIR_NAME, "YohuAdbTools");
    }

    #[test]
    fn event_names_use_slash_not_dot() {
        // Tauri 2.9+ 事件名禁止点号（继承 ADR-v6-020）
        for name in EVENT_NAMES_ALL {
            assert!(!name.contains('.'), "event name {name} must not contain '.'");
        }
    }
}