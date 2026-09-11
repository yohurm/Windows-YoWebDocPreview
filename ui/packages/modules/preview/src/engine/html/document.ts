import type { DocMeta } from "@yohu/api";

import { parseHtmlArticle } from "./normalize";
import { GENERIC_ARTICLE_CSS } from "./skin";

export interface RenderHtmlOptions {
  meta: DocMeta | null;
  rawHtml: string;
}

export function buildHtmlDocument(options: RenderHtmlOptions): string {
  const title = options.meta?.title?.trim() || "网页原文";
  const { body } = parseHtmlArticle(options.rawHtml, title);
  const safeTitle = escapeHtml(title);
  const update = options.meta?.updateTime
    ? `<div class="y-meta">更新时间: ${escapeHtml(options.meta.updateTime)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${safeTitle}</title>
  <style>${GENERIC_ARTICLE_CSS}</style>
</head>
<body>
  <div class="y-scroll" data-yo-read="article">
    <article class="y-article">
      <h1 class="y-title">${safeTitle}</h1>
      ${update}
      <div class="y-content" id="doc-body-content">
        ${body || `<p>文档正文已加载，暂无排版内容</p>`}
      </div>
    </article>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
