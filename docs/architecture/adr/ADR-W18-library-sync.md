# ADR-W18 — 文档库对照更新走应用引擎

**状态：** 已采纳  
**日期：** 2026-09-11  
**对齐：** ADR-W3 转换在 core、ADR-W10 路径由 runtime/设置注入、ADR-W13 library 用例层、ADR-W15 方言只经 library 选择

## 背景

知识库（`开发/` `设计/`）原先用 Linux 脚本 `check_updates.py` / `fetch_docs.py` 对照官网。脚本把库根写死为 `/home/yohurm/yovo-harmonyos-docs`，并自带一份 HTML→MD。Windows 上再改 `BASE` 是在错误层打补丁。

本应用已经有：`libraryRoot`（按 OS 解析，设置注入）、`source` 华为 API、`yohu-md-huawei` 转换、`LibraryStore::export_one` 写盘与图片。缺的是「扫描多份 manifest + 目录树差集 + 下线标记」这条用例。

## 决策

```
yohu-domain     catalog_from_rel / catalogs_in_scope / 头信息 / 树路径匹配（零 IO）
                localRoot 写在 testdata/huawei-catalogs.json
yohu-source     导出 fetch_catalog_tree(catalog)；probe_meta / fetch_any 不变
yohu-library    scan → plan_sync → apply_sync
                正文只经 convert/export_document，不复制脚本转换器
commands        library.plan / library.sync 薄转发；库根 = 启动冻结的 libraryRoot
app/yohu-docs-cli  二进制 yohu-docs；sync --root | YOHU_DOCS_ROOT
设置「文档库」     全量更新按钮走 library.sync
```

平台差只在**路径怎么注入**：Windows / Linux 都设 `libraryRoot` 或 `--root` / `YOHU_DOCS_ROOT`。禁止 crate 内写盘符、用户名或 `/home/...`。

Linux 脚本仍是历史参考，不是 Windows 更新入口。不在脚本上做跨平台补丁。

下线：保留文件，只在 `更新时间` 行追加 `（官网已下线）`。

## 后果

- 工作台与 CLI 共用同一条 library 用例，转换单源。
- 知识库 manifest 的 `file` 仍相对 manifest 目录；扫描时拼成库内路径。
- 不引入第二套 Python 转换、不把脚本拷进本仓。
