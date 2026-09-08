# ADR-W10 — 宿主运行时 crate `yohu-runtime`

**状态：** 已采纳（v2）  
**日期：** 2026-08-28  
**对齐：** 参考项目 `yohu-runtime`（process/persist/os_paths，∥ yohu-protocol）

## 背景

v1 无宿主层，宿主能力散落两处：

- 原子写与损坏备份实现在 `yohu-library/src/atomic.rs`——它是跨用例的本机能力，不是文档库领域逻辑；壳的设置保存也要跨 crate 借用它。
- 数据目录根在壳 `lib.rs::data_dir()` 手拼 `std::env::var("LOCALAPPDATA")`，环境变量缺失时静默回退 `"."`；`system.openPath` 直接 `Command::new("explorer")`。

## 决策

新增 `core/yohu-runtime`，与 `yohu-protocol` **平行、互不依赖**：

| 模块 | 内容 | 来源 |
|------|------|------|
| `persist` | `atomic_write` / `backup_corrupt` | 自 yohu-library 原样迁出，不留长期 re-export |
| `os_paths` | `app_data_root(product_dir_name)` / `open_path` | 自壳拽出；环境变量缺失**报错**而非静默 `.` |

**禁止：** 产品 wire 类型、URL、HTTP、Tauri。

**不建：** `process` 模块（本项目无 adb.exe 类 sidecar 子进程，与参考项目场景不同；出现真实需求再建）；`yohu-foundation` 类杂烩 crate。

## 后果

- yohu-library / 壳 paths.rs / settings 存储全部经 runtime 读写持久化与路径根；`cargo test` 可独立验证原子写语义。
- 迁移期纪律：R1 内一次迁完并删除 `yohu-library::atomic`，禁止双写超过一个提交。
