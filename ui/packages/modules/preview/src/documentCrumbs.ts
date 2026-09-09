import type { CatalogNode, DocMeta } from "@yohu/api";

import { findAncestorChain } from "./catalogTree";
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
  const family = channelTabLabel(catalogId) || (catalogId ? catalogDisplayName(catalogId) : "");
  const slug = meta?.docRef.slug;
  const ancestors =
    slug && catalogNodes.length > 0
      ? (findAncestorChain(catalogNodes, slug)?.map((n) => n.name) ?? [])
      : [];
  const parts = [family, ...ancestors, title].filter((p) => p.length > 0);
  return parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
}
