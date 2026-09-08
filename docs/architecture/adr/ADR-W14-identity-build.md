# ADR-W14 — 身份构建期校验

**状态：** 已采纳（v2）  
**日期：** 2026-08-28  
**对齐：** 参考项目 identity.md（「tauri.conf.json 由壳 build.rs 校验一致」）

## 背景

身份常量单源在 `yohu-protocol::identity`（ADR-W8/W9），但 `tauri.conf.json` 的 `productName/version/identifier`、窗口标题是手工维护的第二份；前端展示名/版本也存在写死冲动。三处漂移只能在运行时才发现。

## 决策

1. **Rust 侧**：壳 `build.rs` 读取 `tauri.conf.json`，断言 `productName == PRODUCT_NAME`、`identifier == IDENTIFIER`、`version == CARGO_PKG_VERSION`（workspace 版本），不一致构建失败。
2. **前端侧**：`@yohu/api identity.ts` 暴露 `DISPLAY_NAME` / `PRODUCT_NAME`，契约测试与 `yohu-protocol::identity` 对齐。UI 展示名只从该门面读取。运行时关于/路径走 `system.info`。
3. 窗口标题使用 `DISPLAY_NAME` 同源值，由 tauri.conf.json 承载并受 1 的校验保护。

## 后果

- 身份漂移从「运行时发现」提前到「构建失败」。
- 升版本只改 workspace `version` 一处。
