import type { CatalogNode } from "@yohu/api";

export function findAncestorIds(
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

/** 与 yohu-domain::HUAWEI_CATALOGS 对齐的展示名；未知 id 原样返回。 */
const CATALOG_LABELS: Record<string, string> = {
  "design-guides": "设计指南",
  "harmonyos-guides": "HarmonyOS 开发指南",
  "harmonyos-guides-V5": "HarmonyOS NEXT 开发指南",
  "harmonyos-references": "HarmonyOS API 参考",
  "harmonyos-references-V5": "HarmonyOS NEXT API 参考",
  "harmonyos-faqs": "常见问题",
  "best-practices": "最佳实践",
  "harmonyos-releases": "版本说明",
};

export function catalogDisplayName(catalogId: string): string {
  return CATALOG_LABELS[catalogId] ?? catalogId;
}
