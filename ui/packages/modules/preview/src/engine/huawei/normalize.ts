import {
  extractArticleToc,
  renderArticleMath,
  stripNamedAnchors,
  unwrapDocument,
  wrapTables,
} from "../html";

import { renderCodeBlocks } from "./code";
import { extractDeviceTypes, mapDeviceLabels, resolveDeviceTypes } from "./devices";
import { promoteHeadings, resolveHeadingLevel } from "./headings";
import { markInlineIcons } from "./images";
import { relabelNotes } from "./notes";

export {
  extractDeviceTypes,
  mapDeviceLabels,
  resolveDeviceTypes,
  resolveHeadingLevel,
};

export interface ParsedHuaweiArticle {
  body: string;
  toc: ReturnType<typeof extractArticleToc>;
}

/** Huawei API HTML → HTML. Uses html kernel primitives; dialect owns headings/notes/icons/code. */
export function normalizeHuaweiArticle(rawHtml: string, pageTitle = ""): string {
  if (!rawHtml) return "";
  let html = unwrapDocument(rawHtml);
  html = stripNamedAnchors(html);
  html = promoteHeadings(html, pageTitle);
  html = relabelNotes(html);
  html = renderCodeBlocks(html);
  html = wrapTables(html);
  html = markInlineIcons(html);
  html = renderArticleMath(html);
  return html;
}

export function parseHuaweiArticle(rawHtml: string, pageTitle = ""): ParsedHuaweiArticle {
  const body = normalizeHuaweiArticle(rawHtml, pageTitle);
  return { body, toc: extractArticleToc(body) };
}
