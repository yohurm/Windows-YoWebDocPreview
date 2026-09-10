import { renderCodeBlocks } from "./code";
import { extractDeviceTypes, mapDeviceLabels, resolveDeviceTypes } from "./devices";
import { promoteHeadings, resolveHeadingLevel } from "./headings";
import { markInlineIcons } from "./images";
import { renderWebMath } from "./math";
import { relabelNotes } from "./notes";
import { wrapTables } from "./tables";
import { extractWebToc } from "./toc";

export {
  extractDeviceTypes,
  mapDeviceLabels,
  resolveDeviceTypes,
  resolveHeadingLevel,
};

export interface ParsedWebArticle {
  body: string;
  toc: ReturnType<typeof extractWebToc>;
}

/** HTML → HTML. Huawei API article only; never used by the Markdown parser. */
export function normalizeArticleHtml(rawHtml: string, pageTitle = ""): string {
  if (!rawHtml) return "";
  let html = unwrapDocument(rawHtml);
  html = html.replace(/<a\s+name="[^"]*"><\/a>/gi, "");
  html = promoteHeadings(html, pageTitle);
  html = relabelNotes(html);
  html = renderCodeBlocks(html);
  html = wrapTables(html);
  html = markInlineIcons(html);
  html = renderWebMath(html);
  return html;
}

export function parseWebArticle(rawHtml: string, pageTitle = ""): ParsedWebArticle {
  const body = normalizeArticleHtml(rawHtml, pageTitle);
  return { body, toc: extractWebToc(body) };
}

function unwrapDocument(html: string): string {
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (body?.[1] != null) return body[1];
  return html.replace(/<\/?html[^>]*>/gi, "").replace(/<head[\s\S]*?<\/head>/gi, "");
}
