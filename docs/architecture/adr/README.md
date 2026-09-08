# ADR-W 索引

W1–W9 于 v1 §12 定稿；W10 起为 v2 新增（对齐参考项目 v6 重规划）。重大决策附单文件，其余结论见下表。详细背景见 [`../架构设计-v2.md`](../架构设计-v2.md)。

| ID | 决策 | 结论 |
|----|------|------|
| [W1](#w1) | 正文提取 | 自研简化评分器先行（零依赖）；接口收敛在 `extract.rs`，可切 readability crate；否决无头浏览器 |
| [W2](#w2) | 预览安全 | 原始 HTML 经 DOMPurify 净化后注入（非 iframe）；CSP `img-src https:` 放行远程图片 |
| [W3](#w3) | 转换引擎形态 | 纯函数 crate（`html_to_markdown(&str, &ConvertOptions) -> String`），零 IO；图片映射由调用方注入 |
| [W4](#w4) | 双通道路由 | URL 匹配专用适配器优先，generic-web 兜底；通道随 DocMeta 下发，UI 徽章展示 |
| [W5](#w5) | manifest 兼容 | 字段与现有知识库格式一致（snake_case）但不绑定仓库；generic-web 条目用合成 catalog/slug |
| [W6](#w6) | 大 payload 分离 | `doc.fetch` 只回元信息，HTML 经 `doc.html` 二段获取 |
| [W7](#w7) | 进度语义 | task/progress 最新快照（可丢可覆盖、200ms 聚合）；终态必达；断点状态落盘为准 |
| [W8](#w8) | 继承约定 | core 零 Tauri、批量 IPC、原子写、事件名 `/` 分层、身份常量单源——沿用 ADBTools v6 对应 ADR 精神 |
| [W9](#w9) | 组件库复用 | 复用 `@yohu/ui`（外部依赖引入，不复制分叉）；新增组件进该库保持单源；应用身份资产独立，禁套 ADBTools 图标与身份 |
| [W10](ADR-W10-runtime.md) | 宿主运行时 | **新增 `yohu-runtime`（persist/os_paths）∥ protocol**；原子写与路径根收口；不建杂烩 crate、不建无用 process 模块 |
| [W11](ADR-W11-events.md) | 事件总线 | 壳内 mpsc `AppEvent` 单总线 + spawn_dispatcher；Progress 类 200ms 聚合可丢、控制面必达；命令与 TaskCenter 禁直接 emit |
| [W12](ADR-W12-workbench.md) | workbench 模块契约 | `@yohu/workbench` 注册表 + `apps/shell` 唯一组合点 + 静态 ModuleDescriptor；依赖纪律由 `check-ui-deps.mjs` 把守 |
| [W13](ADR-W13-capability.md) | library 重定位 | yohu-library 定位为 **capability 用例层**（export_one/batch/check/import 编排归其所有），修正 v1「与 source 平级、壳层编排」的设计 |
| [W14](ADR-W14-identity-build.md) | 身份构建期校验 | `build.rs` 校验 tauri.conf.json 与 protocol 身份常量一致；UI 身份经 `@yohu/api identity.ts` 契约测试对齐，禁止写死 |

## 术语

- **capability 用例层**：持有业务用例编排的 core crate（对齐参考项目 yohu-files/logsrv/mirror 的定位），可依赖同层或下层 crate，不可互引。
- **组合根**：唯一知晓全部服务构造的地方（壳 lib.rs），只装配不实现。
