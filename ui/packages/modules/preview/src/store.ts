import { batch, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import {
  docCatalog,
  docConvert,
  docExport,
  docFetch,
  docHtml,
  errorMessage,
  type CatalogNode,
} from "@yohu/api";

import { catalogDisplayName, collectExpandableIds, findAncestorIds, resolveCatalogDocUrl } from "./catalogPolicy";
import { createEmptyDocSession, type PreviewViewMode, type UnifiedDocSession } from "./model";
import { extractTocFromMarkdown, renderMarkdownToSafeHtml } from "./toc";

export function createPreviewStore() {
  const [session, setSession] = createSignal<UnifiedDocSession>(createEmptyDocSession());
  const [urlInput, setUrlInput] = createSignal("");
  const [viewMode, setViewMode] = createSignal<PreviewViewMode>("markdown-rendered");
  const [sidebarOpen, setSidebarOpen] = createSignal(true);
  const [inspectorOpen, setInspectorOpen] = createSignal(true);
  const [exporting, setExporting] = createSignal(false);
  const [exportedPath, setExportedPath] = createSignal("");
  const [copied, setCopied] = createSignal(false);
  const [expandedKeys, setExpandedKeys] = createSignal<Set<string>>(new Set());
  const [userCollapsedKeys, setUserCollapsedKeys] = createSignal<Set<string>>(new Set());

  const catalogCache = new Map<string, CatalogNode[]>();
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;

  const hasDoc = createMemo(
    () => Boolean(session().url && (session().rawHtml || session().markdownText))
  );
  const title = createMemo(() => session().meta?.title || "未命名文档");
  const currentSlug = createMemo(() => session().meta?.docRef?.slug);
  const sourceUrl = createMemo(() => session().meta?.sourceUrl || session().url);
  const catalogLabel = createMemo(() =>
    session().catalogId ? catalogDisplayName(session().catalogId) : ""
  );

  const applyExpandedForSlug = (tree: CatalogNode[], slug?: string) => {
    if (!slug) return;
    const ancestors = findAncestorIds(tree, slug);
    if (!ancestors || ancestors.length === 0) return;
    const directParent = ancestors[ancestors.length - 1];
    const userCollapsed = userCollapsedKeys();
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      for (const id of ancestors) {
        if (id === directParent || !userCollapsed.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  };

  const loadCatalog = async (targetUrl: string, catalogId: string, slug?: string) => {
    const cached = catalogCache.get(catalogId);
    if (cached) {
      setSession((prev) => ({ ...prev, catalogNodes: cached, catalogId }));
      applyExpandedForSlug(cached, slug);
      return;
    }

    try {
      const tree = (await docCatalog(targetUrl)) || [];
      catalogCache.set(catalogId, tree);
      const nextExpanded = new Set(collectExpandableIds(tree, 2));
      if (slug) {
        const ancestors = findAncestorIds(tree, slug);
        if (ancestors) {
          for (const id of ancestors) nextExpanded.add(id);
        }
      }
      batch(() => {
        setSession((prev) => ({ ...prev, catalogNodes: tree, catalogId }));
        setExpandedKeys(nextExpanded);
      });
    } catch (cause) {
      setSession((prev) => ({ ...prev, catalogNodes: [], catalogId: "", error: errorMessage(cause) }));
    }
  };

  const fetchDoc = async (targetUrl?: string) => {
    const rawUrl = (targetUrl ?? urlInput()).trim();
    if (!rawUrl || session().status === "loading") return;

    setSession((prev) => ({ ...prev, status: "loading", error: "" }));
    setExportedPath("");
    const started = performance.now();

    try {
      const [fetchedMeta, fetchedHtml, fetchedMd] = await Promise.all([
        docFetch(rawUrl),
        docHtml(rawUrl),
        docConvert(rawUrl),
      ]);
      const nextSession: UnifiedDocSession = {
        url: rawUrl,
        status: "ready",
        error: "",
        meta: fetchedMeta,
        rawHtml: fetchedHtml,
        markdownText: fetchedMd,
        renderedHtml: renderMarkdownToSafeHtml(fetchedMd),
        tocList: extractTocFromMarkdown(fetchedMd),
        catalogNodes: session().catalogNodes,
        catalogId: session().catalogId,
        durationMs: Math.round(performance.now() - started),
        charCount: fetchedMd.length,
      };
      batch(() => {
        setUrlInput(rawUrl);
        setSession(nextSession);
      });

      const targetCat = fetchedMeta.docRef?.catalog;
      const targetSlug = fetchedMeta.docRef?.slug;
      if (targetCat) {
        if (targetCat !== session().catalogId || session().catalogNodes.length === 0) {
          void loadCatalog(rawUrl, targetCat, targetSlug);
        } else {
          applyExpandedForSlug(session().catalogNodes, targetSlug);
        }
      } else {
        setSession((prev) => ({ ...prev, catalogNodes: [], catalogId: "" }));
      }
    } catch (cause) {
      setSession((prev) => ({
        ...prev,
        status: prev.url ? "ready" : "error",
        error: errorMessage(cause),
      }));
    }
  };

  const selectCatalogDoc = (slugOrUrl: string) => {
    const current = session().meta?.sourceUrl || session().url;
    if (!current) return;
    void fetchDoc(resolveCatalogDocUrl(slugOrUrl, current));
  };

  const toggleCatalogNode = (nodeId: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        setUserCollapsedKeys((collapsed) => new Set(collapsed).add(nodeId));
      } else {
        next.add(nodeId);
        setUserCollapsedKeys((collapsed) => {
          const copy = new Set(collapsed);
          copy.delete(nodeId);
          return copy;
        });
      }
      return next;
    });
  };

  const toggleAllCatalogNodes = (expandAll: boolean) => {
    const allIds = collectExpandableIds(session().catalogNodes, 99);
    if (expandAll) {
      setExpandedKeys(new Set<string>(allIds));
      setUserCollapsedKeys(new Set<string>());
    } else {
      setExpandedKeys(new Set<string>());
      setUserCollapsedKeys(new Set<string>(allIds));
    }
  };

  const exportCurrentDoc = async () => {
    const meta = session().meta;
    if (!meta || exporting()) return;
    setExporting(true);
    setSession((prev) => ({ ...prev, error: "" }));
    try {
      setExportedPath(await docExport(meta.sourceUrl));
    } catch (cause) {
      setSession((prev) => ({ ...prev, error: errorMessage(cause) }));
    } finally {
      setExporting(false);
    }
  };

  const copyMarkdownToClipboard = async () => {
    const text = session().markdownText;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => setCopied(false), 2000);
  };

  const resetToHome = () => {
    batch(() => {
      setUrlInput("");
      setSession(createEmptyDocSession());
      setExportedPath("");
    });
  };

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "b" || event.key === "B") {
        event.preventDefault();
        setSidebarOpen((open) => !open);
      } else if (event.key === "o" || event.key === "O") {
        event.preventDefault();
        setInspectorOpen((open) => !open);
      } else if (event.key === "1") {
        event.preventDefault();
        setViewMode("web");
      } else if (event.key === "2") {
        event.preventDefault();
        setViewMode("markdown-rendered");
      } else if (event.key === "3") {
        event.preventDefault();
        setViewMode("markdown-source");
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => {
      window.removeEventListener("keydown", onKey);
      if (copiedTimer) clearTimeout(copiedTimer);
    });
  });

  return {
    session,
    urlInput,
    setUrlInput,
    viewMode,
    setViewMode,
    sidebarOpen,
    toggleSidebar: () => setSidebarOpen((open) => !open),
    inspectorOpen,
    toggleInspector: () => setInspectorOpen((open) => !open),
    exporting,
    exportedPath,
    copied,
    expandedKeys,
    hasDoc,
    title,
    currentSlug,
    sourceUrl,
    catalogLabel,
    resetToHome,
    fetchDoc,
    selectCatalogDoc,
    toggleCatalogNode,
    toggleAllCatalogNodes,
    exportCurrentDoc,
    copyMarkdownToClipboard,
  };
}

export type PreviewStore = ReturnType<typeof createPreviewStore>;
