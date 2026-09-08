/**
 * 实时在线预览状态持有者与数据链路处理中心（Store）。
 * 遵循 Windows 桌面分层规范：持有会话投影、乐观 UX、向 IPC 发起调用。
 *
 * 现代化架构改进：
 * 1. 专栏树缓存与状态保留：同专栏切换不重复触发 docCatalog 网络抖动；
 * 2. 目录树折叠受控管理：基于 expandedKeys 集合支持用户精细折叠，根据 slug 自动展开路径；
 * 3. 状态批处理（batch）：元数据与正文原子更新，避免中间过渡态导致渲染画布白屏闪烁；
 * 4. 模式架构：previewMode: "web" | "markdown"，markdownSubMode: "rendered" | "source"。
 */

import { batch, createSignal } from "solid-js";

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

/**
 * 查找指定 slug 在目录树中的所有祖先节点 id 集合（用于自动展开路径）
 */
function findAncestorIds(
  nodes: CatalogNode[],
  targetSlug: string,
  currentPath: string[] = []
): string[] | null {
  for (const node of nodes) {
    if (node.slug === targetSlug) {
      return currentPath;
    }
    if (node.children && node.children.length > 0) {
      const found = findAncestorIds(node.children, targetSlug, [...currentPath, node.id]);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 递归收集默认展开的节点 id（例如前 2 层）
 */
function collectInitialExpanded(nodes: CatalogNode[], maxLevel: number, currentLevel: number = 0): string[] {
  const ids: string[] = [];
  if (currentLevel >= maxLevel) return ids;

  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      ids.push(node.id);
      ids.push(...collectInitialExpanded(node.children, maxLevel, currentLevel + 1));
    }
  }
  return ids;
}

export function createPreviewStore() {
  const [url, setUrl] = createSignal(
    "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts"
  );
  const [activeUrl, setActiveUrl] = createSignal("");
  const [meta, setMeta] = createSignal<DocMeta | null>(null);
  const [rawHtml, setRawHtml] = createSignal("");
  const [markdownText, setMarkdownText] = createSignal("");
  const [catalogNodes, setCatalogNodes] = createSignal<CatalogNode[]>([]);
  const [currentCatalogId, setCurrentCatalogId] = createSignal<string>("");
  const [loading, setLoading] = createSignal(false);
  const [catalogLoading, setCatalogLoading] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);
  const [error, setError] = createSignal("");
  const [exportedPath, setExportedPath] = createSignal("");

  // 目录树受控展开集合（Set<nodeId>）
  const [expandedKeys, setExpandedKeys] = createSignal<Set<string>>(new Set());
  // 用户显式手动折叠的节点集合（避免每次切换文档被自动展开强制还原覆盖用户意图）
  const [userCollapsedKeys, setUserCollapsedKeys] = createSignal<Set<string>>(new Set());

  // 核心模式状态
  const [mainMode, setMainMode] = createSignal<PreviewMainMode>("web");
  const [markdownSubMode, setMarkdownSubMode] = createSignal<MarkdownSubMode>("rendered");
  const [showCatalog, setShowCatalog] = createSignal(true);
  const [showToc, setShowToc] = createSignal(true);

  const [history, setHistory] = createSignal<DocMeta[]>([]);
  const [copied, setCopied] = createSignal(false);
  const [fetchDuration, setFetchDuration] = createSignal<number | null>(null);

  // 专栏树内存缓存 (catalogId -> CatalogNode[])
  const catalogCache = new Map<string, CatalogNode[]>();

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

  const applyExpandedForSlug = (tree: CatalogNode[], slug?: string) => {
    if (!slug) return;
    const ancestors = findAncestorIds(tree, slug);
    if (ancestors && ancestors.length > 0) {
      // 业界成熟设计（VS Code Tree / VitePress）：
      // 自动路径探测展开必须考虑用户的显式操作：
      // 1. 若祖先在 userCollapsedKeys 中，且它是深层祖先，尊重用户的折叠意图；
      // 2. 但对于当前激活文档的直接父级（最内层祖先），确保其展开，以便用户能看见当前激活的文档条目。
      const directParent = ancestors[ancestors.length - 1];
      const userCollapsed = userCollapsedKeys();

      setExpandedKeys((prev) => {
        const next = new Set(prev);
        for (const id of ancestors) {
          // 直接父节点必须展开；非直接父节点若用户显式折叠过，则保留折叠
          if (id === directParent || !userCollapsed.has(id)) {
            next.add(id);
          }
        }
        return next;
      });
    }
  };

  const loadCatalog = async (targetUrl: string, catalogId: string, slug?: string) => {
    // 1. 若同专栏已有缓存，立即重用并仅根据 slug 扩展展开路径，杜绝网络重复抓取与闪烁
    if (catalogCache.has(catalogId)) {
      const cached = catalogCache.get(catalogId)!;
      setCatalogNodes(cached);
      setCurrentCatalogId(catalogId);
      applyExpandedForSlug(cached, slug);
      return;
    }

    setCatalogLoading(true);
    try {
      const tree = await docCatalog(targetUrl);
      const safeTree = tree || [];
      catalogCache.set(catalogId, safeTree);

      // 默认展开前 2 层节点
      const initialOpen = collectInitialExpanded(safeTree, 2);
      const newExpanded = new Set(initialOpen);

      // 合并当前文档 slug 的父链
      if (slug) {
        const ancestors = findAncestorIds(safeTree, slug);
        if (ancestors) {
          for (const id of ancestors) newExpanded.add(id);
        }
      }

      batch(() => {
        setCatalogNodes(safeTree);
        setCurrentCatalogId(catalogId);
        setExpandedKeys(newExpanded);
      });
    } catch (e) {
      console.warn("load catalog failed:", e);
      setCatalogNodes([]);
      setCurrentCatalogId("");
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchDoc = async (targetUrl?: string) => {
    const rawUrl = (targetUrl ?? url()).trim();
    if (!rawUrl || loading()) return;

    // 轻量标记 loading，但不清空旧的 meta、rawHtml 与 markdownText，
    // 保证阅读者在抓取新文档期间依然看到当前内容，消除空白闪烁。
    setLoading(true);
    setError("");
    setExportedPath("");
    setFetchDuration(null);
    const startTime = performance.now();

    try {
      // 1. 并行发起元数据、原始 HTML 与 Markdown 获取
      // (后端针对相同 URL 具备统一 LRU 缓存与管道编排)
      const [fetchedMeta, fetchedHtml, fetchedMd] = await Promise.all([
        docFetch(rawUrl),
        docHtml(rawUrl),
        docConvert(rawUrl),
      ]);

      const duration = Math.round(performance.now() - startTime);

      // 2. 状态原子批处理更新（Batching），防止多次渲染带来的画面闪烁
      batch(() => {
        setUrl(rawUrl);
        setActiveUrl(rawUrl);
        setMeta(fetchedMeta);
        setRawHtml(fetchedHtml);
        setMarkdownText(fetchedMd);
        setFetchDuration(duration);
      });

      // 3. 专栏树管理：同专栏复用，不同专栏动态拉取并保持展开路径
      const targetCat = fetchedMeta.docRef?.catalog;
      const targetSlug = fetchedMeta.docRef?.slug;
      if (targetCat) {
        if (targetCat !== currentCatalogId() || catalogNodes().length === 0) {
          void loadCatalog(rawUrl, targetCat, targetSlug);
        } else {
          applyExpandedForSlug(catalogNodes(), targetSlug);
        }
      } else {
        setCatalogNodes([]);
        setCurrentCatalogId("");
      }

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
      const catalog = currentMeta?.docRef?.catalog || currentCatalogId() || "harmonyos-guides";
      nextUrl = `https://developer.huawei.com/consumer/cn/doc/${catalog}/${slugOrUrl}`;
    }
    void fetchDoc(nextUrl);
  };

  const toggleCatalogNode = (nodeId: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        // 记录用户显式折叠意图
        setUserCollapsedKeys((collapsed) => {
          const c = new Set(collapsed);
          c.add(nodeId);
          return c;
        });
      } else {
        next.add(nodeId);
        // 用户显式展开，从折叠黑名单中移除
        setUserCollapsedKeys((collapsed) => {
          const c = new Set(collapsed);
          c.delete(nodeId);
          return c;
        });
      }
      return next;
    });
  };

  /**
   * 全部展开或全部折叠当前专栏目录树
   */
  const toggleAllCatalogNodes = (expandAll: boolean) => {
    if (expandAll) {
      const allIds = collectInitialExpanded(catalogNodes(), 99);
      setExpandedKeys(new Set<string>(allIds));
      setUserCollapsedKeys(new Set<string>());
    } else {
      setExpandedKeys(new Set<string>());
      const allIds = collectInitialExpanded(catalogNodes(), 99);
      setUserCollapsedKeys(new Set<string>(allIds));
    }
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
    expandedKeys,
    toggleCatalogNode,
    toggleAllCatalogNodes,
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
