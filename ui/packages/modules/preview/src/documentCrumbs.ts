import type { CatalogNode, DocMeta } from "@yohu/api";

import { findAncestorChain } from "./catalogTree";
import { isGithubSource } from "./githubSource";
import { catalogDisplayName, channelTabLabel } from "./huaweiCatalog";

export function documentTitle(meta: DocMeta | null, untitled = "未命名文档"): string {
  return meta?.title?.trim() || untitled;
}

/** 文档表面路径：频道短名（无频道则专栏展示名）+ 专栏祖先 + 标题。 */
export function documentCrumbs(
  meta: DocMeta | null,
  catalogNodes: CatalogNode[] = [],
  untitled = "未命名文档"
): string[] {
  const title = documentTitle(meta, untitled);
  const catalogId = meta?.docRef.catalog ?? "";
  const family = isGithubSource(meta?.docRef.sourceId)
    ? catalogId
    : channelTabLabel(catalogId) || (catalogId ? catalogDisplayName(catalogId) : "");
  const slug = meta?.docRef.slug;
  const treeAncestors =
    slug && catalogNodes.length > 0
      ? (findAncestorChain(catalogNodes, slug)?.map((n) => n.name) ?? [])
      : [];
  const pathAncestors =
    isGithubSource(meta?.docRef.sourceId) && slug
      ? slug.split("/").filter(Boolean).slice(0, -1)
      : [];
  const ancestors = treeAncestors.length > 0 ? treeAncestors : pathAncestors;
  const parts = [family, ...ancestors, title].filter((p) => p.length > 0);
  return parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
}
