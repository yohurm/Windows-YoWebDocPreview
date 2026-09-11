import type { CatalogNode } from "@yohu/api";

import { resolveGithubCatalogUrl } from "./githubSource";

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

export function isCatalogBranch(node: CatalogNode): boolean {
  return node.isLeaf === false || (node.children?.length ?? 0) > 0;
}

export function collectExpandableIds(
  nodes: CatalogNode[],
  maxLevel: number,
  currentLevel = 0
): string[] {
  const ids: string[] = [];
  if (currentLevel >= maxLevel) return ids;
  for (const node of nodes) {
    if (isCatalogBranch(node)) {
      ids.push(node.id);
      ids.push(...collectExpandableIds(node.children ?? [], maxLevel, currentLevel + 1));
    }
  }
  return ids;
}

export function findCatalogNode(nodes: CatalogNode[], id: string): CatalogNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findCatalogNode(node.children ?? [], id);
    if (found) return found;
  }
}

export function replaceCatalogChildren(
  nodes: CatalogNode[],
  id: string,
  children: CatalogNode[]
): CatalogNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, children };
    if ((node.children?.length ?? 0) === 0) return node;
    return { ...node, children: replaceCatalogChildren(node.children, id, children) };
  });
}

export function filePathAncestorIds(slug: string): string[] {
  const parts = slug.split("/").filter(Boolean);
  if (parts.length <= 1) return [];
  const ids: string[] = [];
  let acc = "";
  for (const part of parts.slice(0, -1)) {
    acc = acc ? `${acc}/${part}` : part;
    ids.push(acc);
  }
  return ids;
}

export function catalogContainsSlug(node: CatalogNode, slug: string): boolean {
  if (node.slug === slug) return true;
  return (node.children ?? []).some((child) => catalogContainsSlug(child, slug));
}

export function filterCatalogTree(nodes: CatalogNode[], query: string): CatalogNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return nodes;
  const keep = (node: CatalogNode): CatalogNode | null => {
    const children = (node.children ?? []).map(keep).filter((child): child is CatalogNode => child !== null);
    if (node.name.toLowerCase().includes(needle) || children.length > 0) {
      return { ...node, children };
    }
    return null;
  };
  return nodes.map(keep).filter((node): node is CatalogNode => node !== null);
}

export function resolveCatalogDocUrl(
  slugOrUrl: string,
  currentSourceUrl: string,
  gitRef?: string | null
): string {
  if (/^https?:\/\//i.test(slugOrUrl)) {
    return slugOrUrl;
  }
  const github = resolveGithubCatalogUrl(slugOrUrl, currentSourceUrl, gitRef);
  if (github) {
    return github;
  }
  const url = new URL(currentSourceUrl);
  const segments = url.pathname.split("/");
  segments[segments.length - 1] = slugOrUrl;
  url.pathname = segments.join("/");
  url.hash = "";
  url.search = "";
  return url.toString();
}
