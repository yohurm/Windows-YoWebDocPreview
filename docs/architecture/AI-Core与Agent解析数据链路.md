# AI Core 与 Agent 解析数据链路（as-built）

> 依据 YoAgentDocs architecture-design。层名：Windows 桌面 `View → store → IPC → commands → domain`；本能力叠加 agent / llm-app 类型包，但 **v1 不引入模型与编排**。  
> 决策：[ADR-W17](adr/ADR-W17-ai-core.md)。

## 设计前（将接入的邻层）

```
人：
  URL → store.fetchDoc → doc.fetch / doc.html / doc.convert
  → source::fetch_any → library::convert_document → Markdown 字符串
  → UI engine 渲染；Markdown 大纲只在 extractMarkdownToc（点击路径）

Agent：
  无入口。只能复用 doc.convert 拿到整包 Markdown，自己再拆标题。
  无章节切分、无稳定 JSON 契约、无非交互 CLI。
  标题算法没有 testdata 单源，Rust 侧不存在。
```

问题出在「转换之后」这一跳：产物只服务预览，不服务 Agent。

## 设计后（通路）

```
Agent / 脚本
  → yohu-ai parse --url <url>     拉页 + 转换 + 解析
  → yohu-ai parse --file <path>   只解析本地 Markdown
  → stdout：AgentDocument JSON
  → 失败：stderr {code,message}，非 0 退出

应用内（可选同一契约）：
  @yohu/api.aiParse(url)
  → IPC ai.parse
  → commands/ai.rs
  → 与 doc.* 共用 cached_or_fetch
  → yohu-library::parse_document(meta, raw, url)
      → convert_document（既有方言：huawei / github / generic）
      → yohu-ai::parse_document(markdown, meta)
          → 扫描 ATX 标题（与 UI extractMarkdownToc 同一 testdata）
          → 嵌套 outline
          → 按标题切 sections（含文首 h1）
          → AgentDocument { meta, markdown, outline, sections }

UTF-8 BOM：解析前剥掉，正文与偏移按去 BOM 后的 Markdown 计算。
空 Markdown：outline=[]、sections=[]、markdown=""，成功。
无标题正文：outline=[]、sections=[]，全文只在 markdown。
空 URL / 缺文件：invalid_args，不返回空文档冒充成功。
```

## 目标分层

| 包 | 做什么 | 不做什么 |
|----|--------|----------|
| `yohu-protocol` `wire/ai` | Agent 传输模型 | 不写扫描算法 |
| `yohu-ai` | 领域解析：标题、大纲树、章节、文首标题 | 不 fetch、不 convert、不选方言、不调模型、不写盘 |
| `yohu-library::parse` | 转换 + 解析编排 | 不复制标题算法；不新开一条 HTML→MD |
| `commands/ai.rs` | 反序列化 → library → 序列化 | 不扫描标题、不判定章节 |
| `@yohu/api` | `aiParse` + 类型镜像 | 不含 mock、不含第二套字段 |
| `yohu-ai-cli` | 非交互 argv → JSON | 不做 TUI、不常驻、不起窗口 |
| UI `extractMarkdownToc` | 阅读大纲点击路径镜像 | 不成为第三份表；不解析 Agent 章节 |

依赖只指向邻层：`yohu-ai → protocol`；`library → ai`；壳只到 library。下层不持有上层。

状态与副作用：

- 解析无会话状态；结果是返回值。
- 拉页缓存仍在壳 `Cache`（与预览同一份）。
- CLI 一次性进程，不写 `%LOCALAPPDATA%`。

模型转换：`RawDoc`（源）→ `convert_document` 得 Markdown 字符串（领域中间值）→ `AgentDocument`（传输/Agent 契约）。禁止把 `RawDoc` 或 UI toc 类型直接当 Agent 输出。

## 不引入

- LLM / Provider / 密钥 / 提示词仓库
- 多 Agent 编排、记忆、策略引擎
- MCP 或其他第二套工具网关
- embeddings、chunk 窗口、向量库
- 替换 UI 网页 HTML 大纲
- `yohu-ai` 依赖 library，或壳直接依赖 `yohu-ai`
- 兼容层、`ai.parse` 与 `doc.parse` 双轨、永久适配器
- 为「将来问答」预留的空字段
