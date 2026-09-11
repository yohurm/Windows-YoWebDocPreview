# ADR-W17 — yohu-ai：Agent 文档解析核心

**状态：** 已采纳  
**日期：** 2026-09-11  
**对齐：** ADR-W3 纯函数引擎、ADR-W6 大 payload、ADR-W13 capability 不互引、ADR-W15 方言只经 library 选择

## 背景

桌面预览链路在 `doc.convert` 停在「给人看的 Markdown」。Agent 若要解析同一篇文档，只能自己再拆标题，或打开工作台。标题扫描只存在于 UI `extractMarkdownToc`，没有 Agent 契约，也没有非交互入口。

「AI Core」在本仓库的含义是：**给 Agent 用的文档结构核心**，不是 LLM 应用，也不是多 Agent 编排。

## 决策

```
yohu-protocol::wire/ai     AgentDocument / OutlineNode / AgentSection（IPC 与 CLI 同一 wire）
yohu-ai                    纯函数：Markdown → 大纲树 + 章节；零 IO、零 Tauri、零站点知识、零模型
yohu-library::parse        用例编排：convert_document → yohu-ai::parse_document
commands/ai.rs             薄转发 ai.parse；拉正文走与 doc.* 同一缓存
app/yohu-ai-cli            二进制名 yohu-ai；parse --url | --file；stdout 只打 JSON
```

依赖方向：

```
yohu-ai → yohu-protocol
yohu-library → yohu-ai + 既有 convert / source
yohu-docpreview 不直接依赖 yohu-ai
yohu-ai 不依赖 library / source / 壳
```

标题算法与 UI `extractMarkdownToc` 是契约孪生：同一份 `testdata/ai-outline.json`，禁止第三套实现。网页 HTML 大纲仍只属于 UI `engine/html` / `engine/huawei`（输入不是转换后的 Markdown）。

`ai.parse` 一次返回结构 + 全文 Markdown。这不是再开一条与 `doc.convert` 并行的转换；Markdown 仍只由 `library::convert_document` 产出。

## 后果

- Agent 主路径是 CLI，不依赖工作台窗口。
- 以后若做问答 / 摘要，另开 capability 消费 `AgentDocument`，不得把模型调用写进 `yohu-ai`。
- 不在本决策引入 MCP、向量库、Provider、记忆或第二套工具网关。
