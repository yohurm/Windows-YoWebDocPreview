import type { CatalogNode, DocMeta } from "@yohu/api";

import { isGithubSource } from "../githubSource";
import { isHuaweiSource } from "../huaweiCatalog";
import { buildGithubDocument, parseGithubArticle } from "./github";
import { buildHtmlDocument, parseHtmlArticle } from "./html";
import { buildHuaweiDocument, parseHuaweiArticle } from "./huawei";

export { assignWebSrcdoc, paintWebAppearance } from "./html";

export function parseReadingArticle(
  rawHtml: string,
  pageTitle: string,
  sourceId?: string | null,
  markdownText?: string,
  meta?: DocMeta | null
) {
  if (isGithubSource(sourceId)) {
    return parseGithubArticle(markdownText ?? "", pageTitle, meta);
  }
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
  markdownText?: string;
}): string {
  if (isGithubSource(options.meta?.docRef?.sourceId)) {
    return buildGithubDocument({
      meta: options.meta,
      markdown: options.markdownText ?? "",
    });
  }
  if (isHuaweiSource(options.meta?.docRef?.sourceId)) {
    return buildHuaweiDocument(options);
  }
  return buildHtmlDocument(options);
}
