import type { BlobKind, DocMeta } from "@yohu/api";

import { githubTooLargeNote } from "../../githubSource";
import { syntaxColorCss } from "../syntax";
import githubMarkdownCss from "./github-markdown.css?raw";
import { rewriteGithubHtmlAssets } from "./assets";
import { renderGithubCode, renderGithubImage, renderGithubNote } from "./code";
import { parseGithubGfm } from "./gfm";

export interface RenderGithubOptions {
  meta: DocMeta | null;
  markdown: string;
}

export function parseGithubArticle(markdown: string, _pageTitle = "", meta: DocMeta | null = null) {
  const kind: BlobKind = meta?.blobKind || "markdown";
  const path = meta?.docRef.slug ?? "";
  if (kind === "code") {
    return { html: renderGithubCode(markdown, path), toc: [] };
  }
  if (kind === "image") {
    return { html: renderGithubImage(meta, meta?.title || path), toc: [] };
  }
  if (kind === "binary") {
    return { html: renderGithubNote("该文件是二进制，无法在预览中打开。"), toc: [] };
  }
  if (kind === "tooLarge") {
    return { html: renderGithubNote(githubTooLargeNote()), toc: [] };
  }
  const parsed = parseGithubGfm(markdown);
  return { html: rewriteGithubHtmlAssets(parsed.html, meta), toc: parsed.toc };
}

export function buildGithubDocument(options: RenderGithubOptions): string {
  const title = options.meta?.title?.trim() || "仓库文件";
  const { html } = parseGithubArticle(options.markdown, title, options.meta);
  const kind = options.meta?.blobKind || "markdown";
  const safeTitle = escapeHtml(title);
  const repo = options.meta?.docRef.catalog
    ? `<div class="y-meta">${escapeHtml(options.meta.docRef.catalog)}</div>`
    : "";
  const body =
    kind === "markdown"
      ? `<article class="markdown-body">${html || "<p>没有可预览的内容</p>"}</article>`
      : `<div class="y-blob">${html}</div>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${safeTitle}</title>
  <style>${githubMarkdownCss}</style>
  <style>${syntaxColorCss()}</style>
  <style>${FRAME_CHROME}</style>
</head>
<body>
  <div class="y-scroll" data-yo-read="article">
    ${repo}
    ${body}
  </div>
</body>
</html>`;
}

/** GitHub 网页表面跟 github-markdown.css，色板留在 iframe 内，不跟宿主 YoUI token 混用。 */
const FRAME_CHROME = `
html, body { height: 100%; margin: 0; }
.y-scroll { height: 100%; overflow: auto; }
.y-meta { padding: 16px 45px 0; color: #57606a; font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.markdown-body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; padding: 24px 45px 72px; }
.y-blob { max-width: 1100px; margin: 0 auto; padding: 16px 24px 72px; }
.y-blob pre {
  overflow: auto;
  padding: 16px;
  border-radius: 6px;
  background: var(--bgColor-muted, #f6f8fa);
  font-family: var(--fontStack-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 12px;
  line-height: 20px;
}
.y-blob-image img { max-width: 100%; }
.y-blob-note { color: var(--fgColor-muted, #57606a); }
.markdown-body, .y-blob {
  --yo-syntax-keyword: var(--color-prettylights-syntax-keyword);
  --yo-syntax-string: var(--color-prettylights-syntax-string);
  --yo-syntax-comment: var(--color-prettylights-syntax-comment);
  --yo-syntax-constant: var(--color-prettylights-syntax-constant);
  --yo-syntax-entity: var(--color-prettylights-syntax-entity);
  --yo-syntax-entity-tag: var(--color-prettylights-syntax-entity-tag);
  --yo-syntax-variable: var(--color-prettylights-syntax-variable);
  --yo-syntax-regexp: var(--color-prettylights-syntax-string-regexp);
}
@media (prefers-color-scheme: dark) {
  body { background: #0d1117; color: #c9d1d9; }
  .y-blob pre { background: #161b22; }
}
`;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
