/**
 * Web reading document composer.
 *
 * Bottom-up:
 * 1. Huawei API HTML (rawHtml)
 * 2. normalizeArticleHtml — heading markers, notes, code chrome
 * 3. officialSkin — tokens measured from live Chrome
 * 4. article chrome — breadcrumb + title + update time
 *
 * Channel switching is workbench session chrome (ChannelBar → fetchDoc),
 * not document HTML. Left catalog / outline also stay in the workbench.
 */

import type { CatalogNode, DocMeta } from "@yohu/api";
import type { Appearance } from "@yohu/ui";

import { documentCrumbs, documentTitle } from "../documentCrumbs";
import { normalizeArticleHtml, resolveDeviceTypes } from "./normalizeArticleHtml";
import { OFFICIAL_ARTICLE_CSS } from "./officialSkin";

export interface RenderWebOptions {
  meta: DocMeta | null;
  rawHtml: string;
  sourceUrl: string;
  catalogNodes?: CatalogNode[];
  appearance?: Appearance;
}

/** Official crumb separator is a chevron icon, not the ASCII `>`. */
const CRUMB_CHEVRON = `<svg viewBox="0 0 5.726 11.817" fill="currentColor" aria-hidden="true"><path d="M0.17 11.6C0.31 11.75 0.47 11.82 0.64 11.81C0.8 11.81 0.95 11.74 1.07 11.6L5.47 6.55C5.64 6.36 5.73 6.14 5.72 5.9C5.71 5.66 5.63 5.45 5.47 5.26L1.07 0.19C0.96 0.05 0.82 -0.01 0.64 0C0.46 0 0.31 0.06 0.19 0.19C0.07 0.3 0.01 0.45 0.01 0.61C0.01 0.78 0.07 0.93 0.19 1.06L4.37 5.9L0.17 10.72C0.06 10.85 0.01 11 0 11.17C-0.01 11.34 0.05 11.48 0.17 11.6Z" fill-opacity="0.9"/></svg>`;

export function buildWebDocument(options: RenderWebOptions): string {
  const { meta, rawHtml, catalogNodes = [], appearance = "light" } = options;
  const title = documentTitle(meta, "在线文档网页原貌");
  const body = normalizeArticleHtml(rawHtml, title);
  const safeTitle = escapeHtml(title);
  const crumbs = documentCrumbs(meta, catalogNodes, "在线文档网页原貌");
  const crumb = crumbs
    .map((part, i) => {
      const text = `<span${i === crumbs.length - 1 ? ' class="y-crumb__curr"' : ""}>${escapeHtml(part)}</span>`;
      if (i === 0) return text;
      return `<span class="y-crumb__sep">${CRUMB_CHEVRON}</span>${text}`;
    })
    .join("");
  const update = meta?.updateTime
    ? `<span>更新时间: ${escapeHtml(meta.updateTime)}</span>`
    : "";
  const devices = resolveDeviceTypes(meta, rawHtml)
    .map((d) => `<span class="y-device">${escapeHtml(d)}</span>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${appearance}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="${appearance}">
  <title>${safeTitle}</title>
  <style>${OFFICIAL_ARTICLE_CSS}</style>
</head>
<body>
  <div class="y-scroll" data-yo-read="article">
    <article class="y-article">
      <nav class="y-crumb">${crumb}</nav>
      <h1 class="y-title">${safeTitle}</h1>
      <div class="y-meta">${update}${devices}</div>
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
