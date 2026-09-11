# ADR-W16 — GitHub 仓库源（代码库浏览器）

**状态：** 已采纳  
**日期：** 2026-09-11  
**对齐：** ADR-W4 双通道路由、ADR-W15 方言分 crate

## 背景

多源扩展（需求 M7）的下一个专用源是 GitHub **仓库**，不是 github.com 的站点外壳。抓 React 壳 HTML 会与 generic-web 抢同一 URL，且 DOM 不稳定。

第一版把专栏做成「全仓 recursive git tree」，随后又收成「根 Markdown + `docs/`」。两者都不对：

- OmniRoute 一类仓库默认分支是 `release/v3.8.51`、体积约 500MB，recursive 整仓树会超时。
- 只扫 Markdown 看不到源码，用户打开仓库期望的是 **GitHub.com 那样的文件浏览器**。
- 通用 `markdown-it(html:false)` 会把 README 里的 `<div align>` / `<img>` 剥成字面量，GFM 徽章和相对图全部失效。

官方 Contents API（[REST: repository contents](https://docs.github.com/en/rest/repos/contents)）按目录 **只返回当前层**。Markup / `Accept: application/vnd.github.html+json` 能出官方 HTML，但无 token 会撞配额；桌面端应本地 GFM。皮肤用 [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) 的 `.markdown-body`。

## 决策

```
testdata/github-source.json     身份 / 主机 / 文档与图片扩展名 / README 名 / 预览上限（无文档目录白名单）
yohu-domain::github             URL → owner/repo/ref/path；blob 分型；encode ref；已知 ref 纠偏
yohu-source::github             resolve / fetch / catalog
  resolve   默认分支 + 提交 SHA（不透明，禁止再按 / 切开）
  fetch     按路径分型：markdown | code | image | binary | tooLarge
  catalog   GET /contents/{path}?ref=SHA 一层；blob/仓库根从根列，tree URL 列该目录
yohu-md-github                  预览改相对链接与 HTML src/href；导出才加文档头
UI engine/github                独立 GFM（html:true + DOMPurify）/ 代码高亮 / 图 / 提示
yohu-library::convert           按 sourceId 选引擎；code 预览为原文，导出再围栏
```

`DocRef.git_ref` 回写提交 SHA。专栏点击与懒展开用 SHA 拼 blob/tree。

`RawDoc.blob_kind` + `text` 承载非 Markdown；`html` 仍为空。禁止把源码塞进假 Markdown 围栏再当文档渲染。

不引入：GitHub token 设置、gist、wiki、docs.github.com、recursive `git/trees?recursive=1` 整仓树。

## 后果

- `parse_url`：华为 → GitHub → generic-web。
- 左侧专栏是仓库文件树（目录可展开、子层现场拉），不是文档目录。
- README 走 GFM + 嵌入 HTML；`.ts` / `.rs` 走 highlight.js。
- API 路径里的 ref 一律 percent-encode（`release/v3.8.51` → `release%2Fv3.8.51`）。
