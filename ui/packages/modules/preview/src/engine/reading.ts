import type { CatalogNode, DocMeta } from "@yohu/api";

import { isHuaweiSource } from "../huaweiCatalog";
import { buildHtmlDocument, parseHtmlArticle } from "./html";
import { buildHuaweiDocument, parseHuaweiArticle } from "./huawei";

export { assignWebSrcdoc, paintWebAppearance } from "./html";

export function parseReadingArticle(
  rawHtml: string,
  pageTitle: string,
  sourceId?: string | null
) {
  if (isHuaweiSource(sourceId)) {
    return parseHuaweiArticle(rawHtml, pageTitle);
  }
  return parseHtmlArticle(rawHtml, pageTitle);
}

export function buildReadingDocument(options: {
  meta: DocMeta | null;
  rawHtml: string;
  sourceUrl: string;
  catalogNodes?: CatalogNode[];
}): string {
  if (isHuaweiSource(options.meta?.docRef?.sourceId)) {
    return buildHuaweiDocument(options);
  }
  return buildHtmlDocument(options);
}
