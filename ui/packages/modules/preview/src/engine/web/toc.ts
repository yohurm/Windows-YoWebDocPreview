export interface WebTocItem {
  id: string;
  text: string;
  level: number;
}

/** Outline from normalized article headings. Ids are those stamped by heading promotion. */
export function extractWebToc(html: string): WebTocItem[] {
  if (!html) return [];
  const items: WebTocItem[] = [];
  const headingRe = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html))) {
    const level = Number(match[1]);
    const attrs = match[2] ?? "";
    const text = (match[3] ?? "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const id = /\bid=["']([^"']+)["']/i.exec(attrs)?.[1];
    if (!text || !id) continue;
    items.push({ id, text, level });
  }
  return items;
}
