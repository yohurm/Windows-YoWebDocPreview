import { describe, expect, it } from "vitest";

import { extractTocFromMarkdown, renderMarkdownToSafeHtml } from "./toc";

describe("extractTocFromMarkdown", () => {
  it("extracts h1, h2, h3 correctly", () => {
    const md = `
# 标题 1
一些正文内容
## 标题 2
### 子标题 3
## 另一个二级标题
`;
    const toc = extractTocFromMarkdown(md);
    expect(toc).toHaveLength(4);
    expect(toc[0]).toEqual({ id: "toc-heading-0", text: "标题 1", level: 1 });
    expect(toc[1]).toEqual({ id: "toc-heading-1", text: "标题 2", level: 2 });
    expect(toc[2]).toEqual({ id: "toc-heading-2", text: "子标题 3", level: 3 });
    expect(toc[3]).toEqual({ id: "toc-heading-3", text: "另一个二级标题", level: 2 });
  });

  it("handles empty markdown string gracefully", () => {
    expect(extractTocFromMarkdown("")).toEqual([]);
  });
});

describe("renderMarkdownToSafeHtml", () => {
  it("renders markdown and injects deterministic anchor ids matching toc", () => {
    const md = "# Title\n\nText\n\n## Subtitle";
    const rendered = renderMarkdownToSafeHtml(md);
    expect(rendered).toContain('<h1 id="toc-heading-0">Title</h1>');
    expect(rendered).toContain('<h2 id="toc-heading-1">Subtitle</h2>');
    expect(rendered).toContain("<p>Text</p>");
  });

  it("sanitizes dangerous script tags from markdown", () => {
    const dangerousMd = "# Title\n\n<script>alert('xss')</script>\n\nSafe text";
    const rendered = renderMarkdownToSafeHtml(dangerousMd);
    expect(rendered).not.toContain("<script>");
    expect(rendered).toContain("Safe text");
  });
});
