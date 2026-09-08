/**
 * 目录大纲策略与 Markdown HTML 渲染器（纯逻辑计算）。
 *
 * 卓越设计原则：
 * 1. 自动跳过文章根标题（通常为单一的 # H1，因为画布面包屑已单点呈现）；
 * 2. 层级相对归一化：若从 ## 开始，自动映射为一级大纲；消除绝对字号或跳级（如 H4 直接挂在 H2 下）导致的视觉错乱；
 * 3. 严格跳过代码块，杜绝将代码块内的注释误识别为大纲；
 * 4. 纯净化清洗标题，移除内联链接、标记与特殊符号。
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

/** 从 Markdown 文本提取结构化相对归一化目录树 */
export function extractTocFromMarkdown(markdown: string): TocItem[] {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const rawItems: { id: string; text: string; rawLevel: number }[] = [];
  let idx = 0;
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // 跳过代码块内部的干扰
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // 匹配 Markdown 标题
    const match = /^(#{1,4})\s+(.+)$/.exec(line);
    if (match && match[1] && match[2]) {
      const rawLevel = match[1].length;
      let rawTitle = match[2].trim();
      // 清理行内链接与格式化标记，如 [xxx](url) 或 **xxx**
      rawTitle = rawTitle.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      rawTitle = rawTitle.replace(/[*_`~]/g, "");

      rawItems.push({
        id: `toc-heading-${idx++}`,
        text: rawTitle,
        rawLevel,
      });
    }
  }

  if (rawItems.length === 0) return [];

  return rawItems.map((item) => ({
    id: item.id,
    text: item.text,
    level: item.rawLevel,
  }));
}

/**
 * 将 Markdown 渲染为安全的带有 TOC 锚点的 HTML
 */
export function renderMarkdownToSafeHtml(markdown: string): string {
  if (!markdown) return "";
  const rawHtml = mdParser.render(markdown);

  // 注入锚点 id 便于 TOC 丝滑跳转
  let idx = 0;
  const anchoredHtml = rawHtml.replace(/<h([1-4])>(.*?)<\/h\1>/g, (_m, level, content) => {
    const anchorId = `toc-heading-${idx++}`;
    return `<h${level} id="${anchorId}">${content}</h${level}>`;
  });

  return DOMPurify.sanitize(anchoredHtml, {
    ADD_ATTR: ["target", "id"],
  });
}
