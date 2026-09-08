# ADR-W13 — yohu-library 重定位为 capability 用例层

**状态：** 已采纳（v2）  
**日期：** 2026-08-28  
**对齐：** 参考项目 capability 层（yohu-files / yohu-logsrv / yohu-mirror）

## 背景

v1 §3.2 规定「yohu-source 与 yohu-library 平级，由壳层编排组合」。实现走了另一条路：`yohu-library` 依赖 source + md-convert，`export_one`（拉取→图片→转换→写盘→upsert）编排在 `LibraryStore` 内。两种选择：

- **回退 v1**：把编排上移到壳——壳变厚，且批量执行器（batch.rs）也要跟着上移，违背薄命令层。
- **固化现状**：承认 library 是用例编排层。

## 决策

**固化现状**：`yohu-library` 定位为 capability 用例层，对齐参考项目 capability 概念：

- 持有用例编排：`export_one`（单篇导出）、`batch`（批量抓取）、`check`（更新检查，v2 新增）、`import`（清单导入，v2 新增）。
- 依赖：source + md-convert + domain + protocol + runtime；capability 之间不互引（本仓库现仅此一个 capability，纪律预先立下）。
- 壳只做：发号 run_id、token 树、事件转发（TaskCenter），不含检查/编排逻辑——`probe_official` 这类业务代码必须从壳下沉（配合 `source::probe_meta`）。

## 后果

- v1 §3.2/§3.3 的表述由本文档修订；v2 主文档 §2.2 依赖图为准。
- 错误模型随之类型化：`LibraryError`（thiserror + code()）取代跨层 String，壳统一映射 `IpcError { code, message }`（对齐参考项目「各 crate 自有 Error，不设统一 YohuError」）。
