import MarkdownIt from "markdown-it";

import { markdownAlerts } from "./alerts";
import { highlightMarkdownFence } from "../syntax";
import { markdownMath } from "./math";
import { markdownTables } from "./tables";
import { bindMarkdownHeadingIds } from "./toc";

export function createMarkdownParser(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight: highlightMarkdownFence,
  });
  md.use(markdownAlerts);
  md.use(markdownMath);
  md.use(markdownTables);
  bindMarkdownHeadingIds(md);
  return md;
}
