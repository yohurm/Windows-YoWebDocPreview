const HEADING_RE = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
const MARKER_RE = /\[h([2-4])\]\s*/i;

/** Huawei API HTML tag + optional `[hN]` marker → live-site heading level. Locked by testdata/huawei-headings.json. */
export function resolveHeadingLevel(tag: number, marker: number | null): number {
  if (tag <= 1) return 1;
  if (marker === 2) return 3;
  if (marker != null) return Math.min(4, marker + 1);
  return tag === 4 ? 2 : tag;
}

export function promoteHeadings(html: string, pageTitle: string): string {
  return html.replace(HEADING_RE, (_all, tag: string, attrs: string, inner: string) => {
    const marked = inner.match(MARKER_RE);
    const text = inner.replace(MARKER_RE, "").trim();
    if (tag === "1") {
      const plain = text.replace(/<[^>]+>/g, "").trim();
      if (pageTitle && plain === pageTitle) return "";
      return `<h1${attrs}>${text}</h1>`;
    }
    const marker = marked ? Number(marked[1]) : null;
    const level = resolveHeadingLevel(Number(tag), Number.isFinite(marker) ? marker : null);
    const extra = marked && marked[1] === "2" ? ' class="firsth2"' : "";
    const idBit = /(?:^|\s)id=/.test(attrs) ? attrs : `${attrs} id="${slugId(text)}"`;
    return `<h${level}${idBit}${extra}>${text}</h${level}>`;
  });
}

function slugId(inner: string): string {
  const text = inner.replace(/<[^>]+>/g, "").trim();
  return encodeURIComponent(text).replace(/%/g, "").slice(0, 48) || "section";
}
