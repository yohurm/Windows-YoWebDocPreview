/**
 * 目录大纲策略与 Markdown HTML 渲染器（纯逻辑计算）。
 */

import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

const mdParser = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

/** 从 Markdown 文本提取层级目录树 */
export function extractTocFromMarkdown(markdown: string): TocItem[] {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const items: TocItem[] = [];
  let idx = 0;

  for (const line of lines) {
    const match = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (match && match[1] && match[2]) {
      const level = match[1].length;
      const rawTitle = match[2].trim();
      items.push({
        id: `toc-heading-${idx++}`,
        text: rawTitle,
        level,
      });
    }
  }
  return items;
}

/**
 * 将 Markdown 渲染为安全的带有 TOC 锚点的 HTML
 */
export function renderMarkdownToSafeHtml(markdown: string): string {
  if (!markdown) return "";
  const rawHtml = mdParser.render(markdown);
  
  // 注入锚点 id 便于 TOC 跳转
  let idx = 0;
  const anchoredHtml = rawHtml.replace(/<h([1-4])>(.*?)<\/h\1>/g, (_m, level, content) => {
    const anchorId = `toc-heading-${idx++}`;
    return `<h${level} id="${anchorId}">${content}</h${level}>`;
  });

  return DOMPurify.sanitize(anchoredHtml, {
    ADD_ATTR: ["target", "id"],
  });
}
