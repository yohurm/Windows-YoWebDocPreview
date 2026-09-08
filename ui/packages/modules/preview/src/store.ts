/**
 * 实时在线预览状态持有者与数据链路处理中心（Store）。
 * 遵循 Windows 桌面分层规范：持有会话投影、乐观 UX、向 IPC 发起调用。
 *
 * 模式架构规范：
 * - previewMode: "web" (实时原貌渲染) | "markdown" (Markdown 预览)
 * - markdownSubMode: "rendered" (排版预览) | "source" (纯文本源码)
 * - 彻底移除清洗后的 HTML 视图 (ADR-W7)
 */

import { createSignal } from "solid-js";

import {
  docCatalog,
  docConvert,
  docExport,
  docFetch,
  docHistory,
  docHtml,
  errorMessage,
  type CatalogNode,
  type DocMeta,
} from "@yohu/api";

export type PreviewMainMode = "web" | "markdown";
export type MarkdownSubMode = "rendered" | "source";

export function createPreviewStore() {
  const [url, setUrl] = createSignal("https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts");
  const [activeUrl, setActiveUrl] = createSignal("");
  const [meta, setMeta] = createSignal<DocMeta | null>(null);
  const [rawHtml, setRawHtml] = createSignal("");
  const [markdownText, setMarkdownText] = createSignal("");
  const [catalogNodes, setCatalogNodes] = createSignal<CatalogNode[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [catalogLoading, setCatalogLoading] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);
  const [error, setError] = createSignal("");
  const [exportedPath, setExportedPath] = createSignal("");
  
  // 核心模式状态
  const [mainMode, setMainMode] = createSignal<PreviewMainMode>("web");
  const [markdownSubMode, setMarkdownSubMode] = createSignal<MarkdownSubMode>("rendered");
  const [showCatalog, setShowCatalog] = createSignal(true);
  const [showToc, setShowToc] = createSignal(true);

  const [history, setHistory] = createSignal<DocMeta[]>([]);
  const [copied, setCopied] = createSignal(false);
  const [fetchDuration, setFetchDuration] = createSignal<number | null>(null);

  // 自动触发初始 URL 载入
  setTimeout(() => {
    if (url().trim()) {
      void fetchDoc(url().trim());
    }
  }, 100);

  const loadHistory = async () => {
    try {
      const items = await docHistory();
      setHistory(items);
    } catch {
      setHistory([]);
    }
  };

  const loadCatalog = async (targetUrl: string) => {
    setCatalogLoading(true);
    try {
      const tree = await docCatalog(targetUrl);
      setCatalogNodes(tree || []);
    } catch (e) {
      console.warn("load catalog failed:", e);
      setCatalogNodes([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchDoc = async (targetUrl?: string) => {
    const rawUrl = (targetUrl ?? url()).trim();
    if (!rawUrl || loading()) return;

    setUrl(rawUrl);
    setActiveUrl(rawUrl);
    setLoading(true);
    setError("");
    setExportedPath("");
    setFetchDuration(null);
    const startTime = performance.now();

    try {
      // 1. 先通过 docFetch 获取文档元数据并写入后端缓存
      const fetchedMeta = await docFetch(rawUrl);
      setMeta(fetchedMeta);

      // 如果当前 catalog 尚无内容或换了专栏，加载分类目录树
      const currentCat = fetchedMeta.docRef?.catalog;
      if (currentCat) {
        void loadCatalog(rawUrl);
      } else {
        setCatalogNodes([]);
      }

      // 2. 并行获取原始 HTML（用于自有引擎合成完整网页原貌体验）与 Markdown（用于 Markdown 视图）
      const [fetchedHtml, fetchedMd] = await Promise.all([
        docHtml(rawUrl),
        docConvert(rawUrl),
      ]);

      setRawHtml(fetchedHtml);
      setMarkdownText(fetchedMd);
      setFetchDuration(Math.round(performance.now() - startTime));
      void loadHistory();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const selectCatalogDoc = (slugOrUrl: string) => {
    const currentMeta = meta();
    let nextUrl = slugOrUrl;
    if (!slugOrUrl.startsWith("http://") && !slugOrUrl.startsWith("https://")) {
      const catalog = currentMeta?.docRef?.catalog || "harmonyos-guides";
      nextUrl = `https://developer.huawei.com/consumer/cn/doc/${catalog}/${slugOrUrl}`;
    }
    void fetchDoc(nextUrl);
  };

  const exportCurrentDoc = async () => {
    const currentMeta = meta();
    if (!currentMeta || exporting()) return;

    setExporting(true);
    setError("");
    try {
      const saved = await docExport(currentMeta.sourceUrl);
      setExportedPath(saved);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const copyMarkdownToClipboard = async () => {
    const text = markdownText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板异常优雅降级
    }
  };

  const toggleCatalog = () => {
    setShowCatalog((prev) => !prev);
  };

  const toggleToc = () => {
    setShowToc((prev) => !prev);
  };

  return {
    url,
    setUrl,
    activeUrl,
    meta,
    rawHtml,
    markdownText,
    catalogNodes,
    loading,
    catalogLoading,
    exporting,
    error,
    exportedPath,
    mainMode,
    setMainMode,
    markdownSubMode,
    setMarkdownSubMode,
    showCatalog,
    setShowCatalog,
    toggleCatalog,
    showToc,
    setShowToc,
    toggleToc,
    history,
    copied,
    fetchDuration,
    loadHistory,
    fetchDoc,
    selectCatalogDoc,
    exportCurrentDoc,
    copyMarkdownToClipboard,
  };
}

export type PreviewStore = ReturnType<typeof createPreviewStore>;
