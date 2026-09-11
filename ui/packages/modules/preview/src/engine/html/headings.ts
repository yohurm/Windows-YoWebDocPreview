const HEADING_RE = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;

/** Stamp ids. Do not rewrite heading levels — that is a site dialect. */
export function stampHeadingIds(html: string, pageTitle: string): string {
  return html.replace(HEADING_RE, (_all, tag: string, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    if (tag === "1" && pageTitle && text === pageTitle) return "";
    const idBit = /(?:^|\s)id=/.test(attrs) ? attrs : `${attrs} id="${slugId(inner)}"`;
    return `<h${tag}${idBit}>${inner}</h${tag}>`;
  });
}

function slugId(inner: string): string {
  const text = inner.replace(/<[^>]+>/g, "").trim();
  return encodeURIComponent(text).replace(/%/g, "").slice(0, 48) || "section";
}
