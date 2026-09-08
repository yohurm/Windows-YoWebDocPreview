# ADR-W11 — 事件总线与批量聚合

**状态：** 已采纳（v2）  
**日期：** 2026-08-28  
**对齐：** 参考项目壳 `events.rs`（mpsc AppEvent + spawn_dispatcher）；ADR-v6-007/020 精神

## 背景

当前实现中，批量进度由 `batch.rs` 每 100ms 轮询快照并**逐 tick 直接 `emit`**（壳闭包直接持有 AppHandle）；`settings/changed` 事件在协议中已定义但 `settings_set` 根本不发。问题：

1. 进度事件无聚合节流，事件风暴风险，违反 v1 ADR-W7（继承 ADR-v6-007 批量 IPC）；
2. 事件发送点分散，可丢/必达语义无处统一落实；
3. 命令直接持有 AppHandle，壳层耦合难测试。

## 决策

- 事件信封单源：`yohu-protocol::events::AppEvent` 枚举（serde tagged），载荷类型复用 wire。
- 壳 `events.rs`：`mpsc::channel::<AppEvent>(有界)` + `spawn_dispatcher(rx, AppHandle)`，是**唯一** `emit` 的地方。
- 聚合策略：`task/progress` 类可丢事件进 200ms 聚合器（最新快照覆盖语义，有界满则丢旧）；`task/done`、`settings/changed` 控制面必达（`send().await` 语义）。
- 命令与 TaskCenter 只 `tx.send(...)`，禁止持有 AppHandle；`tx` 满时 Progress 类 `try_send` 丢弃、控制面等待。

## 后果

- `settings.set` 后必发全量快照事件（补当前缺口）；`task.list` 提供事件丢失后的对账。
- 聚合器可用普通单测验证（喂 N 个事件、断言 200ms 窗口内合并为最后快照）。
