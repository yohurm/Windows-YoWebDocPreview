import { describe, expect, it } from "vitest";

import { extractMarkdownToc, parseMarkdown, renderMarkdown } from "./index";

describe("extractMarkdownToc", () => {
  it("extracts h1, h2, h3 correctly", () => {
    const md = `
# 标题 1
一些正文内容
## 标题 2
### 子标题 3
## 另一个二级标题
`;
    const toc = extractMarkdownToc(md);
    expect(toc).toHaveLength(3);
    expect(toc[0]).toEqual({ id: "toc-heading-1", text: "标题 2", level: 2 });
    expect(toc[1]).toEqual({ id: "toc-heading-2", text: "子标题 3", level: 3 });
    expect(toc[2]).toEqual({ id: "toc-heading-3", text: "另一个二级标题", level: 2 });
  });

  it("handles empty markdown string gracefully", () => {
    expect(extractMarkdownToc("")).toEqual([]);
  });
});

describe("parseMarkdown", () => {
  it("renders markdown and injects deterministic anchor ids matching toc", () => {
    const md = "# Title\n\nText\n\n## Subtitle";
    const { html, toc } = parseMarkdown(md);
    expect(html).toContain('<h1 id="toc-heading-0">Title</h1>');
    expect(html).toContain('<h2 id="toc-heading-1">Subtitle</h2>');
    expect(html).toContain("<p>Text</p>");
    expect(toc[0]).toEqual({ id: "toc-heading-1", text: "Subtitle", level: 2 });
  });

  it("does not execute raw HTML", () => {
    const dangerousMd = "# Title\n\n<script>alert('xss')</script>\n\nSafe text";
    const rendered = renderMarkdown(dangerousMd);
    expect(rendered).not.toContain("<script>");
    expect(rendered).toContain("Safe text");
  });

  it("renders GitHub alerts from the convert dialect", () => {
    const html = renderMarkdown("> [!NOTE]\n> 仅 ets 文件\n\n> [!WARNING]\n> 注意混淆\n");
    expect(html).toContain("yo-md-callout--note");
    expect(html).toContain("yo-md-callout--warning");
    expect(html).toContain("说明");
    expect(html).toContain("注意");
    expect(html).toContain("仅 ets 文件");
    expect(html).not.toContain("<blockquote");
  });

  it("highlights fenced ArkTS and wraps GFM tables", () => {
    const html = renderMarkdown("```ArkTS\nlet hi: string = 'hello';\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n");
    expect(html).toContain("hljs-keyword");
    expect(html).toContain("hljs-string");
    expect(html).toContain("yo-md-table");
    expect(html).toContain("<th>");
  });

  it("keeps adjacent menu labels and inline icons in one sentence", () => {
    const md =
      "1. 点击**File > Settings**（macOS为**DevEco Studio > Preferences/Settings**）**> Plugins**，点击![icon](https://example.com/gear.png) **> Install Plugin from Disk…** 安装本地插件。";
    const html = renderMarkdown(md);
    expect(html).not.toContain("**");
    expect(html).toContain("<strong>File &gt; Settings</strong>");
    expect(html).toContain("<strong>DevEco Studio &gt; Preferences/Settings</strong>");
    expect(html).toContain("<strong>&gt; Plugins</strong>");
    expect(html).toContain("<strong>&gt; Install Plugin from Disk…</strong>");
    expect(html).toContain('src="https://example.com/gear.png"');
    expect(html).toContain('alt="icon"');
    expect(html).toContain("点击<img");
    expect(html).toContain("安装本地插件");
  });

  it("typesets $ and $$ outside fences", () => {
    const html = renderMarkdown("行内 $E=mc^2$\n\n$$\na^2+b^2=c^2\n$$\n\n```text\n$keep$\n```\n");
    expect(html).toContain("katex");
    expect(html).toContain("$keep$");
  });
});
