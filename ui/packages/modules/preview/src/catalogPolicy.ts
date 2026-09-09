import type { CatalogNode, DocMeta } from "@yohu/api";

export function findAncestorChain(
  nodes: CatalogNode[],
  targetSlug: string,
  currentPath: CatalogNode[] = []
): CatalogNode[] | null {
  for (const node of nodes) {
    if (node.slug === targetSlug) return currentPath;
    if (node.children && node.children.length > 0) {
      const found = findAncestorChain(node.children, targetSlug, [...currentPath, node]);
      if (found) return found;
    }
  }
  return null;
}

export function findAncestorIds(nodes: CatalogNode[], targetSlug: string): string[] | null {
  const chain = findAncestorChain(nodes, targetSlug);
  return chain ? chain.map((n) => n.id) : null;
}

export function collectExpandableIds(
  nodes: CatalogNode[],
  maxLevel: number,
  currentLevel = 0
): string[] {
  const ids: string[] = [];
  if (currentLevel >= maxLevel) return ids;
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      ids.push(node.id);
      ids.push(...collectExpandableIds(node.children, maxLevel, currentLevel + 1));
    }
  }
  return ids;
}

export function resolveCatalogDocUrl(slugOrUrl: string, currentSourceUrl: string): string {
  if (/^https?:\/\//i.test(slugOrUrl)) {
    return slugOrUrl;
  }
  const url = new URL(currentSourceUrl);
  const segments = url.pathname.split("/");
  segments[segments.length - 1] = slugOrUrl;
  url.pathname = segments.join("/");
  url.hash = "";
  url.search = "";
  return url.toString();
}

/** 与 yohu-domain::HUAWEI_CATALOGS / HUAWEI_CHANNELS 对齐。 */
const HUAWEI_DOC_PREFIX = "https://developer.huawei.com/consumer/cn/doc/";

const CATALOG_LABELS: Record<string, string> = {
  "design-guides": "设计指南",
  "harmonyos-guides": "HarmonyOS 开发指南",
  "harmonyos-guides-V5": "HarmonyOS NEXT 开发指南",
  "harmonyos-references": "HarmonyOS API 参考",
  "harmonyos-references-V5": "HarmonyOS NEXT API 参考",
  "harmonyos-faqs": "常见问题",
  "best-practices": "最佳实践",
  "harmonyos-releases": "版本说明",
  "harmonyos-roadmap": "变更预告",
};

export function catalogDisplayName(catalogId: string): string {
  return CATALOG_LABELS[catalogId] ?? catalogId;
}

export function catalogIdFromUrl(url: string): string | null {
  if (!url.startsWith(HUAWEI_DOC_PREFIX)) return null;
  const rest = url.slice(HUAWEI_DOC_PREFIX.length);
  const id = rest.split(/[/?#]/)[0];
  if (!id || CATALOG_LABELS[id] === undefined) return null;
  return id;
}

/** 工作台频道栏：key/落地页与 domain::HUAWEI_CHANNELS 对齐，中文标签仅 UI。 */
export const HUAWEI_CHANNELS: { key: string; label: string; catalogs: string[]; url: string }[] = [
  {
    key: "releases",
    label: "版本说明",
    catalogs: ["harmonyos-releases"],
    url: `${HUAWEI_DOC_PREFIX}harmonyos-releases/2600`,
  },
  {
    key: "guides",
    label: "指南",
    catalogs: ["harmonyos-guides", "harmonyos-guides-V5"],
    url: `${HUAWEI_DOC_PREFIX}harmonyos-guides/application-dev-guide`,
  },
  {
    key: "references",
    label: "API参考",
    catalogs: ["harmonyos-references", "harmonyos-references-V5"],
    url: `${HUAWEI_DOC_PREFIX}harmonyos-references/development-intro-api`,
  },
  {
    key: "practices",
    label: "最佳实践",
    catalogs: ["best-practices"],
    url: `${HUAWEI_DOC_PREFIX}best-practices/bpta-best-practices-overview`,
  },
  {
    key: "faqs",
    label: "FAQ",
    catalogs: ["harmonyos-faqs"],
    url: `${HUAWEI_DOC_PREFIX}harmonyos-faqs/faqs-ability-kit`,
  },
  {
    key: "roadmap",
    label: "变更预告",
    catalogs: ["harmonyos-roadmap"],
    url: `${HUAWEI_DOC_PREFIX}harmonyos-roadmap/changelogs-overview-pre`,
  },
];

export function channelTabLabel(catalogId: string): string {
  return HUAWEI_CHANNELS.find((ch) => ch.catalogs.includes(catalogId))?.label ?? "";
}

/** 文档路径单源：专栏展示名 + 标题，只给文档表面消费，不进操作栏。 */
export function documentPath(
  meta: DocMeta | null,
  untitled = "未命名文档"
): { catalogLabel: string; title: string } {
  const catalogId = meta?.docRef.catalog;
  return {
    catalogLabel: catalogId ? catalogDisplayName(catalogId) : "",
    title: meta?.title?.trim() || untitled,
  };
}

/** 网页阅读面包屑：频道短名 + 专栏祖先 + 标题（对齐官网 指南 > 基础入门 > …）。 */
export function documentCrumbs(
  meta: DocMeta | null,
  catalogNodes: CatalogNode[] = [],
  untitled = "未命名文档"
): string[] {
  const { title } = documentPath(meta, untitled);
  const catalogId = meta?.docRef.catalog ?? "";
  const channel = channelTabLabel(catalogId);
  const slug = meta?.docRef.slug;
  const ancestors =
    slug && catalogNodes.length > 0
      ? (findAncestorChain(catalogNodes, slug)?.map((n) => n.name) ?? [])
      : [];
  const parts = [channel, ...ancestors, title].filter((p) => p.length > 0);
  return parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
}
