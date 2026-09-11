import type { CatalogNode, DocMeta } from "@yohu/api";

import { filePathAncestorIds, findCatalogNode, replaceCatalogChildren } from "./catalogTree";
import { githubTreeUrlFromMeta, isGithubSource } from "./githubSource";

export async function hydrateGithubTree(
  tree: CatalogNode[],
  slug: string | undefined,
  meta: DocMeta | null,
  listDir: (url: string) => Promise<CatalogNode[]>,
  alive: () => boolean
): Promise<CatalogNode[]> {
  if (!meta || !isGithubSource(meta.docRef.sourceId) || !slug) return tree;
  let next = tree;
  for (const id of filePathAncestorIds(slug)) {
    const node = findCatalogNode(next, id);
    if (!node || node.isLeaf !== false) break;
    if ((node.children?.length ?? 0) > 0) continue;
    const url = githubTreeUrlFromMeta(id, meta);
    if (!url) break;
    const children = await listDir(url);
    if (!alive()) return next;
    next = replaceCatalogChildren(next, id, children);
  }
  return next;
}

export function githubEmptyDirUrl(node: CatalogNode | undefined, meta: DocMeta | null): string | null {
  if (!node || node.isLeaf !== false || (node.children?.length ?? 0) > 0) return null;
  return githubTreeUrlFromMeta(node.id, meta);
}
