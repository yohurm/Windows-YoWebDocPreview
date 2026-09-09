/** Normalize Huawei API HTML so heading markers and notes match the live docs site. */

const HEADING_RE = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
const MARKER_RE = /\[h([2-4])\]\s*/i;

const DEVICE_LABELS: Record<string, string> = {
  phone: "Phone",
  "2in1": "PC/2in1",
  tablet: "Tablet",
  wearable: "Wearable",
  tv: "TV",
};

export function mapDeviceLabels(ids: string[]): string[] {
  return ids
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => DEVICE_LABELS[d.toLowerCase()] ?? d);
}

export function extractDeviceTypes(html: string): string[] {
  const match = /<h1[^>]*device-type="([^"]+)"/i.exec(html);
  const raw = match?.[1];
  if (!raw) return [];
  return mapDeviceLabels(raw.split(","));
}

export function resolveDeviceTypes(
  meta: { deviceTypes?: string[] } | null,
  rawHtml: string
): string[] {
  if (meta?.deviceTypes?.length) return mapDeviceLabels(meta.deviceTypes);
  return extractDeviceTypes(rawHtml);
}

export function normalizeArticleHtml(rawHtml: string, pageTitle = ""): string {
  if (!rawHtml) return "";
  let html = unwrapDocument(rawHtml);
  html = html.replace(/<a\s+name="[^"]*"><\/a>/gi, "");
  html = promoteHeadings(html, pageTitle);
  html = relabelNotes(html);
  html = wrapCodeBlocks(html);
  return html;
}

function unwrapDocument(html: string): string {
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (body?.[1] != null) return body[1];
  return html.replace(/<\/?html[^>]*>/gi, "").replace(/<head[\s\S]*?<\/head>/gi, "");
}

function promoteHeadings(html: string, pageTitle: string): string {
  return html.replace(HEADING_RE, (_all, tag: string, attrs: string, inner: string) => {
    const marked = inner.match(MARKER_RE);
    const text = inner.replace(MARKER_RE, "").trim();
    if (tag === "1") {
      const plain = text.replace(/<[^>]+>/g, "").trim();
      if (pageTitle && plain === pageTitle) return "";
      return `<h1${attrs}>${text}</h1>`;
    }
    // Live site: unmarked section h4 → h2; [h2] under the page title → h3.firsth2
    let level: number;
    if (marked) {
      const marker = Number(marked[1]);
      level = marker === 2 ? 3 : Math.min(4, marker + 1);
    } else {
      level = tag === "4" ? 2 : Number(tag);
    }
    const extra = marked && marked[1] === "2" ? " class=\"firsth2\"" : "";
    const idBit = /(?:^|\s)id=/.test(attrs) ? attrs : `${attrs} id="${slugId(text)}"`;
    return `<h${level}${idBit}${extra}>${text}</h${level}>`;
  });
}

function slugId(inner: string): string {
  const text = inner.replace(/<[^>]+>/g, "").trim();
  return encodeURIComponent(text).replace(/%/g, "").slice(0, 48) || "section";
}

function relabelNotes(html: string): string {
  return html.replace(
    /<div class="note">([\s\S]*?)<div class="notebody">/gi,
    (_all, head: string) => {
      const src = /src="([^"]+)"/i.exec(head)?.[1] ?? "";
      const kind = noteKindFromSrc(src);
      return `<div class="note note--${kind}" data-note="${kind}"><div class="notebody">`;
    }
  );
}

function noteKindFromSrc(src: string): string {
  const lower = src.toLowerCase();
  if (lower.includes("caution") || lower.includes("warning") || lower.includes("注意")) return "caution";
  if (lower.includes("danger") || lower.includes("危险")) return "danger";
  if (lower.includes("tip") || lower.includes("提示")) return "tip";
  return "note";
}

function wrapCodeBlocks(html: string): string {
  return html.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi, (_all, attrs: string, body: string) => {
    const lang = /\bclass="([^"]+)"/i.exec(attrs)?.[1]?.split(/\s+/)[0] ?? "";
    const hub = /\bcodehub="([^"]+)"/i.exec(attrs)?.[1] ?? "";
    const langLabel = lang && !/^prettyprint|hljs|linenums$/i.test(lang) ? lang : "";
    const fileName = hub ? hub.split("/").pop()?.split("#")[0] ?? "" : "";
    const meta = [
      langLabel ? `<span class="y-code__lang">${escapeHtml(langLabel)}</span>` : "",
      hub
        ? `<a class="y-code__hub" href="${escapeHtml(hub)}" target="_blank" rel="noreferrer">${escapeHtml(fileName || "示例")}</a>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    const bar = meta ? `<div class="y-code__bar">${meta}</div>` : `<div class="y-code__bar"></div>`;
    return `<div class="y-code">${bar}<pre${attrs}>${body}</pre></div>`;
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
