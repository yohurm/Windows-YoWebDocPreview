import { stampHeadingIds } from "./headings";
import { renderArticleMath } from "./math";
import { wrapTables } from "./tables";
import { extractArticleToc } from "./toc";
import { stripNamedAnchors, unwrapDocument } from "./unwrap";

export interface ParsedHtmlArticle {
  body: string;
  toc: ReturnType<typeof extractArticleToc>;
}

/** Generic HTML → HTML. No site heading markers, notes, or official chrome. */
export function normalizeHtmlArticle(rawHtml: string, pageTitle = ""): string {
  if (!rawHtml) return "";
  let html = unwrapDocument(rawHtml);
  html = stripNamedAnchors(html);
  html = stampHeadingIds(html, pageTitle);
  html = wrapTables(html);
  html = renderArticleMath(html);
  return html;
}

export function parseHtmlArticle(rawHtml: string, pageTitle = ""): ParsedHtmlArticle {
  const body = normalizeHtmlArticle(rawHtml, pageTitle);
  return { body, toc: extractArticleToc(body) };
}
