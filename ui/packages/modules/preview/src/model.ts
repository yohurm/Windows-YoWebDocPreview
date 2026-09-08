import type { CatalogNode, DocMeta } from "@yohu/api";

export interface TocNode {
  id: string;
  text: string;
  level: number;
}

export type PreviewViewMode = "web" | "markdown-rendered" | "markdown-source";

export type SessionStatus = "idle" | "loading" | "ready" | "error";

export interface UnifiedDocSession {
  url: string;
  status: SessionStatus;
  error: string;
  meta: DocMeta | null;
  rawHtml: string;
  markdownText: string;
  renderedHtml: string;
  tocList: TocNode[];
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
    tocList: [],
    catalogNodes: [],
    catalogId: "",
    durationMs: null,
    charCount: 0,
  };
}
