//! yohu-runtime — 宿主运行时（与 `yohu-protocol` 平行，互不依赖）。
//!
//! 只含跨 capability 的本机能力：原子写、OS 应用数据根。
//! 禁止产品 wire 类型、HTTP、Tauri（ADR-W10）。

pub mod os_paths;
pub mod persist;

pub use os_paths::{app_data_root, open_path};
pub use persist::{atomic_write, backup_corrupt};
