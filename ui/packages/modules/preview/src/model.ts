import type { CatalogNode, DocMeta } from "@yohu/api";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/** 一级阅读体验：站点原文，或解析后的 Markdown。 */
export type ReadingSurface = "web" | "markdown";

/** Markdown 阅读下的呈现：排版渲染，或源码。 */
export type MarkdownReveal = "rendered" | "source";

export type SessionStatus = "idle" | "loading" | "ready" | "error";

export interface UnifiedDocSession {
  url: string;
  status: SessionStatus;
  error: string;
  meta: DocMeta | null;
  rawHtml: string;
  markdownText: string;
  renderedHtml: string;
  markdownToc: TocItem[];
  webToc: TocItem[];
  catalogNodes: CatalogNode[];
  catalogId: string;
  durationMs: number | null;
  charCount: number;
}

export function createEmptyDocSession(): UnifiedDocSession {
  return {
    url: "",
    status: "idle",
    error: "",
    meta: null,
    rawHtml: "",
    markdownText: "",
    renderedHtml: "",
    markdownToc: [],
    webToc: [],
    catalogNodes: [],
    catalogId: "",
    durationMs: null,
    charCount: 0,
  };
}
