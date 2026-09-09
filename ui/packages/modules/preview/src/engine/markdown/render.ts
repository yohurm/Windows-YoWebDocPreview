import DOMPurify from "dompurify";

import { createMarkdownParser } from "./parser";
import { extractMarkdownToc, type MarkdownTocItem } from "./toc";

const parser = createMarkdownParser();

export interface ParsedMarkdown {
  html: string;
  toc: MarkdownTocItem[];
}

/** Markdown → safe HTML. Never used by the web HTML parser. */
export function parseMarkdown(markdown: string): ParsedMarkdown {
  const toc = extractMarkdownToc(markdown);
  if (!markdown) return { html: "", toc };
  const rawHtml = parser.render(markdown, {});
  const html = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ["semantics", "annotation", "math", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac"],
    ADD_ATTR: ["class", "id", "style", "aria-hidden", "data-callout", "data-title"],
  });
  return { html, toc };
}

export function renderMarkdown(markdown: string): string {
  return parseMarkdown(markdown).html;
}
