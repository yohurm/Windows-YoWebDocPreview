import { batch, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import {
  docCatalog,
  docConvert,
  docFetch,
  docHtml,
  errorMessage,
  type CatalogNode,
} from "@yohu/api";

import {
  collectExpandableIds,
  filePathAncestorIds,
  findAncestorIds,
  findCatalogNode,
  replaceCatalogChildren,
  resolveCatalogDocUrl,
} from "./catalogTree";
import { resolveContentHref, type ContentHref } from "./contentHref";
import { documentCrumbs } from "./documentCrumbs";
import { parseGithubArticle } from "./engine/github";
import { githubCatalogIdFromUrl, githubTreeUrl, isGithubSource, parseGithub } from "./githubSource";
import { catalogIdFromUrl } from "./huaweiCatalog";
import { parseReadingArticle } from "./engine/reading";
import { parseMarkdown } from "./engine/markdown";
import type { DocMeta } from "@yohu/api";
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
    () => Boolean(session().url && session().meta && (session().rawHtml || session().markdownText || session().meta.blobKind))
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

  const githubDirUrl = (dirPath: string, meta: DocMeta | null): string | null => {
    if (!meta || !isGithubSource(meta.docRef.sourceId)) return null;
    const loc = parseGithub(meta.sourceUrl || meta.docRef.url);
    const owner = loc?.owner ?? meta.docRef.catalog?.split("/")[0];
    const repo = loc?.repo ?? meta.docRef.catalog?.split("/")[1];
    const gitRef = meta.docRef.gitRef || loc?.gitRef;
    if (!owner || !repo || !gitRef) return null;
    return githubTreeUrl(owner, repo, gitRef, dirPath);
  };

  const hydrateGithubTree = async (
    tree: CatalogNode[],
    slug: string | undefined,
    meta: DocMeta | null,
    gen: number
  ): Promise<CatalogNode[]> => {
    if (!meta || !isGithubSource(meta.docRef.sourceId) || !slug) return tree;
    let next = tree;
    for (const id of filePathAncestorIds(slug)) {
      const node = findCatalogNode(next, id);
      if (!node || node.isLeaf !== false) break;
      if ((node.children?.length ?? 0) > 0) continue;
      const url = githubDirUrl(id, meta);
      if (!url) break;
      const children = (await docCatalog(url)) || [];
      if (gen !== openGen) return next;
      next = replaceCatalogChildren(next, id, children);
    }
    return next;
  };

  const loadCatalog = async (
    targetUrl: string,
    catalogId: string,
    slug: string | undefined,
    gen: number,
    meta: DocMeta | null
  ) => {
    const cached = catalogCache.get(catalogId);
    let tree = cached;
    if (!tree) {
      try {
        tree = (await docCatalog(targetUrl)) || [];
      } catch (cause) {
        if (gen !== openGen) return;
        setSession((prev) => ({ ...prev, catalogNodes: [], catalogId: "", error: errorMessage(cause) }));
        return;
      }
    }
    if (gen !== openGen || !tree) return;
    tree = await hydrateGithubTree(tree, slug, meta, gen);
    if (gen !== openGen) return;
    catalogCache.set(catalogId, tree);
    const nextExpanded = new Set<string>();
    if (slug) {
      const ancestors = findAncestorIds(tree, slug) ?? filePathAncestorIds(slug);
      for (const id of ancestors) nextExpanded.add(id);
    }
    batch(() => {
      setSession((prev) => ({ ...prev, catalogNodes: tree!, catalogId }));
      setExpandedKeys((prev) => {
        const merged = new Set(prev);
        for (const id of nextExpanded) merged.add(id);
        return merged;
      });
    });
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
    const nextCat = catalogIdFromUrl(rawUrl) ?? githubCatalogIdFromUrl(rawUrl) ?? "";
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

      const markdown = isGithubSource(fetchedMeta.docRef?.sourceId)
        ? parseGithubArticle(fetchedMd, fetchedMeta.title ?? "", fetchedMeta)
        : parseMarkdown(fetchedMd);
      const web = parseReadingArticle(
        fetchedHtml,
        fetchedMeta.title ?? "",
        fetchedMeta.docRef?.sourceId,
        fetchedMd,
        fetchedMeta
      );

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
          void loadCatalog(rawUrl, targetCat, targetSlug, gen, fetchedMeta);
        } else {
          applyExpandedForSlug(session().catalogNodes, targetSlug);
          void loadCatalog(rawUrl, targetCat, targetSlug, gen, fetchedMeta);
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
    void fetchDoc(resolveCatalogDocUrl(slugOrUrl, current, session().meta?.docRef?.gitRef));
  };

  const openContentHref = (href: string): ContentHref => {
    const nav = resolveContentHref(href, session().meta?.sourceUrl || session().url);
    if (nav.kind === "open") {
      void fetchDoc(nav.url);
    }
    return nav;
  };

  const toggleCatalogNode = (nodeId: string) => {
    const wasOpen = expandedKeys().has(nodeId);
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
    if (wasOpen) return;
    const current = session();
    const node = findCatalogNode(current.catalogNodes, nodeId);
    if (!node || node.isLeaf !== false || (node.children?.length ?? 0) > 0) return;
    const url = githubDirUrl(nodeId, current.meta);
    if (!url) return;
    const gen = openGen;
    void (async () => {
      try {
        const children = (await docCatalog(url)) || [];
        if (gen !== openGen) return;
        setSession((prev) => {
          const tree = replaceCatalogChildren(prev.catalogNodes, nodeId, children);
          if (prev.catalogId) catalogCache.set(prev.catalogId, tree);
          return { ...prev, catalogNodes: tree };
        });
      } catch (cause) {
        if (gen !== openGen) return;
        setSession((prev) => ({ ...prev, error: errorMessage(cause) }));
      }
    })();
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
