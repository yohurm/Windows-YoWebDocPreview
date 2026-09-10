import { batch, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import {
  docCatalog,
  docConvert,
  docFetch,
  docHtml,
  errorMessage,
  type CatalogNode,
} from "@yohu/api";

import { collectExpandableIds, findAncestorIds, resolveCatalogDocUrl } from "./catalogTree";
import { resolveContentHref, type ContentHref } from "./contentHref";
import { documentCrumbs } from "./documentCrumbs";
import { catalogIdFromUrl } from "./huaweiCatalog";
import { parseWebArticle } from "./engine/web";
import { parseMarkdown } from "./engine/markdown";
import {
  createEmptyDocSession,
  type MarkdownReveal,
  type ReadingSurface,
  type UnifiedDocSession,
} from "./model";

export function createPreviewStore() {
  const [session, setSession] = createSignal<UnifiedDocSession>(createEmptyDocSession());
  const [urlInput, setUrlInput] = createSignal("");
  const [readingSurface, setReadingSurface] = createSignal<ReadingSurface>("markdown");
  const [markdownReveal, setMarkdownReveal] = createSignal<MarkdownReveal>("rendered");
  const [sidebarOpen, setSidebarOpen] = createSignal(true);
  const [inspectorOpen, setInspectorOpen] = createSignal(true);
  const [expandedKeys, setExpandedKeys] = createSignal<Set<string>>(new Set());
  const [userCollapsedKeys, setUserCollapsedKeys] = createSignal<Set<string>>(new Set());
  const catalogCache = new Map<string, CatalogNode[]>();
  let openGen = 0;

  const hasDoc = createMemo(
    () => Boolean(session().url && (session().rawHtml || session().markdownText))
  );
  const currentSlug = createMemo(() => session().meta?.docRef?.slug);
  const docCrumbs = createMemo(() => documentCrumbs(session().meta, session().catalogNodes));
  const tocItems = createMemo(() =>
    readingSurface() === "web" ? session().webToc : session().markdownToc
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

  const loadCatalog = async (
    targetUrl: string,
    catalogId: string,
    slug: string | undefined,
    gen: number
  ) => {
    const cached = catalogCache.get(catalogId);
    if (cached) {
      if (gen !== openGen) return;
      setSession((prev) => ({ ...prev, catalogNodes: cached, catalogId }));
      applyExpandedForSlug(cached, slug);
      return;
    }

    try {
      const tree = (await docCatalog(targetUrl)) || [];
      if (gen !== openGen) return;
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
      if (gen !== openGen) return;
      setSession((prev) => ({ ...prev, catalogNodes: [], catalogId: "", error: errorMessage(cause) }));
    }
  };

  const fetchDoc = async (targetUrl?: string) => {
    const rawUrl = (targetUrl ?? urlInput()).trim();
    if (!rawUrl) return;
    const current = session();
    if (
      rawUrl === current.url &&
      (current.status === "ready" || current.status === "loading")
    ) {
      return;
    }

    const gen = ++openGen;
    const nextCat = catalogIdFromUrl(rawUrl) ?? "";
    const keepTree = Boolean(
      nextCat && nextCat === current.catalogId && current.catalogNodes.length > 0
    );

    batch(() => {
      setUrlInput(rawUrl);
      setSession((prev) => ({
        ...prev,
        url: rawUrl,
        status: "loading",
        error: "",
        catalogId: keepTree ? prev.catalogId : nextCat,
        catalogNodes: keepTree ? prev.catalogNodes : [],
      }));
      if (!keepTree) {
        setExpandedKeys(new Set<string>());
        setUserCollapsedKeys(new Set<string>());
      }
    });

    const started = performance.now();

    try {
      const [fetchedMeta, fetchedHtml, fetchedMd] = await Promise.all([
        docFetch(rawUrl),
        docHtml(rawUrl),
        docConvert(rawUrl),
      ]);
      if (gen !== openGen) return;

      const targetCat = fetchedMeta.docRef?.catalog ?? "";
      const targetSlug = fetchedMeta.docRef?.slug;
      const treeReady =
        Boolean(targetCat) &&
        targetCat === session().catalogId &&
        session().catalogNodes.length > 0;

      const markdown = parseMarkdown(fetchedMd);
      const web = parseWebArticle(fetchedHtml, fetchedMeta.title ?? "");

      const nextSession: UnifiedDocSession = {
        url: rawUrl,
        status: "ready",
        error: "",
        meta: fetchedMeta,
        rawHtml: fetchedHtml,
        markdownText: fetchedMd,
        renderedHtml: markdown.html,
        markdownToc: markdown.toc,
        webToc: web.toc,
        catalogNodes: treeReady ? session().catalogNodes : [],
        catalogId: targetCat,
        durationMs: Math.round(performance.now() - started),
        charCount: fetchedMd.length,
      };
      batch(() => {
        setUrlInput(rawUrl);
        setSession(nextSession);
      });

      if (targetCat) {
        if (!treeReady) {
          void loadCatalog(rawUrl, targetCat, targetSlug, gen);
        } else {
          applyExpandedForSlug(session().catalogNodes, targetSlug);
        }
      }
    } catch (cause) {
      if (gen !== openGen) return;
      setSession((prev) => ({
        ...prev,
        status: prev.rawHtml || prev.markdownText ? "ready" : "error",
        error: errorMessage(cause),
      }));
    }
  };

  const selectCatalogDoc = (slugOrUrl: string) => {
    const current = session().meta?.sourceUrl || session().url;
    if (!current) return;
    void fetchDoc(resolveCatalogDocUrl(slugOrUrl, current));
  };

  const openContentHref = (href: string): ContentHref => {
    const nav = resolveContentHref(href, session().meta?.sourceUrl || session().url);
    if (nav.kind === "open") {
      void fetchDoc(nav.url);
    }
    return nav;
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
      return;
    }
    setExpandedKeys(new Set<string>());
    setUserCollapsedKeys(new Set<string>(allIds));
  };

  const resetToHome = () => {
    batch(() => {
      setUrlInput("");
      setSession(createEmptyDocSession());
      setReadingSurface("markdown");
      setMarkdownReveal("rendered");
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
        setReadingSurface("web");
      } else if (event.key === "2") {
        event.preventDefault();
        setReadingSurface("markdown");
      } else if (event.key === "3") {
        event.preventDefault();
        setReadingSurface("markdown");
        setMarkdownReveal((current) => (current === "rendered" ? "source" : "rendered"));
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => {
      window.removeEventListener("keydown", onKey);
    });
  });

  return {
    session,
    urlInput,
    setUrlInput,
    readingSurface,
    setReadingSurface,
    markdownReveal,
    setMarkdownReveal,
    sidebarOpen,
    toggleSidebar: () => setSidebarOpen((open) => !open),
    inspectorOpen,
    toggleInspector: () => setInspectorOpen((open) => !open),
    expandedKeys,
    hasDoc,
    currentSlug,
    docCrumbs,
    tocItems,
    resetToHome,
    fetchDoc,
    openContentHref,
    selectCatalogDoc,
    toggleCatalogNode,
    toggleAllCatalogNodes,
  };
}

export type PreviewStore = ReturnType<typeof createPreviewStore>;
