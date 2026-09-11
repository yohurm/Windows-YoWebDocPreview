# ADR-W15 — 公共转换内核与华为文档方言分 crate

**状态：** 已采纳  
**日期：** 2026-09-11  
**对齐：** YoAgentDocs 架构审查（严禁兼容层；下层不持有上层）

## 背景

`yohu-md-convert` 名义上是通用 HTML→Markdown 引擎，实际把华为开发者文档方言写成了默认管线：`[hN]` 标题、`device-type`、`.note`、IconPic、`/consumer/cn/doc/` 在 `base_url=None` 时补华为域名、`$r` 占位符、`harmonyos-references` 间距。UI `engine/web` 同样把官网皮肤与标题提升套在所有网页上。

`base_url=None` 充当华为开关，是兼容层。

## 决策

```
yohu-md-convert  →  公共内核 + ConvertDialect 契约（零站点知识）
yohu-md-huawei   →  实现 ConvertDialect（只依赖 convert + domain）
UI engine/html   →  公共 HTML 文章内核
UI engine/huawei →  华为 HTML 方言（可依赖 html，禁止反向）
engine/reading   →  预览组合根：按 sourceId 选引擎
```

调用方用 `testdata/huawei-catalogs.json` 的 `sourceId`（Rust `huawei_source_id()` / UI `isHuaweiSource`）选引擎。转换 if 只许出现在 `yohu-library::convert`。禁止第三套实现，禁止把华为规则留在通用入口。

## 后果

- 黄金样本与 `convert_file` 属 `yohu-md-huawei`。
- generic-web 预览不再套官网标题提升与官方皮肤。
