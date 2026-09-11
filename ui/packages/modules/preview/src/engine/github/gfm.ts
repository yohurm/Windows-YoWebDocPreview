import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

import { markdownAlerts } from "../markdown/alerts";
import { highlightMarkdownFence } from "../syntax";
import { markdownTables } from "../markdown/tables";
import { bindMarkdownHeadingIds, extractMarkdownToc, type MarkdownTocItem } from "../markdown/toc";

/** GitHub README 方言：允许嵌入 HTML，事后消毒。通用 markdown-it 仍保持 html:false。 */
function createGithubMarkdownParser(): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: highlightMarkdownFence,
  });
  md.use(markdownAlerts);
  md.use(markdownTables);
  bindMarkdownHeadingIds(md);
  return md;
}

const parser = createGithubMarkdownParser();

export interface ParsedGithubMarkdown {
  html: string;
  toc: MarkdownTocItem[];
}

export function parseGithubGfm(markdown: string): ParsedGithubMarkdown {
  const toc = extractMarkdownToc(markdown);
  if (!markdown) return { html: "", toc };
  const rawHtml = parser.render(markdown, {});
  const html = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ["img", "picture", "source", "figure", "figcaption", "details", "summary", "kbd"],
    ADD_ATTR: [
      "align",
      "width",
      "height",
      "target",
      "rel",
      "src",
      "srcset",
      "alt",
      "class",
      "id",
      "style",
    ],
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
  });
  return { html, toc };
}
