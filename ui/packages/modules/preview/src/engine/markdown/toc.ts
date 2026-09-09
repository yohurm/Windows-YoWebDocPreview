import type MarkdownIt from "markdown-it";

export interface MarkdownTocItem {
  id: string;
  text: string;
  level: number;
}

/** Source-order heading ids. Must match bindMarkdownHeadingIds. */
export function extractMarkdownToc(markdown: string): MarkdownTocItem[] {
  if (!markdown) return [];
  const rawItems: { id: string; text: string; rawLevel: number }[] = [];
  let idx = 0;
  let inCodeBlock = false;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (line.startsWith("$$")) continue;

    const match = /^(#{1,4})\s+(.+)$/.exec(line);
    if (match?.[1] && match[2]) {
      const rawLevel = match[1].length;
      let rawTitle = match[2].trim();
      rawTitle = rawTitle.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      rawTitle = rawTitle.replace(/[*_`~]/g, "");
      rawItems.push({
        id: `toc-heading-${idx++}`,
        text: rawTitle,
        rawLevel,
      });
    }
  }

  if (rawItems.length === 0) return [];

  const skipLeadingTitle = rawItems[0]?.rawLevel === 1;
  return rawItems
    .filter((_, index) => !(skipLeadingTitle && index === 0))
    .map((item) => ({
      id: item.id,
      text: item.text,
      level: item.rawLevel,
    }));
}

export function bindMarkdownHeadingIds(md: MarkdownIt): void {
  const defaultOpen =
    md.renderer.rules.heading_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const bag = env as { headingIndex?: number };
    bag.headingIndex = bag.headingIndex ?? 0;
    tokens[idx]?.attrSet("id", `toc-heading-${bag.headingIndex++}`);
    return defaultOpen(tokens, idx, options, env, self);
  };
}
