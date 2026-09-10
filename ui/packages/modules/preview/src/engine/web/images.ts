/**
 * Inline icon identity from Huawei <img> fields only.
 * Locked by testdata/huawei-inline-icon.json. Does not read src text.
 */

export interface WebImageAttrs {
  className?: string;
  originWidth?: number | null;
  originHeight?: number | null;
  width?: number | null;
  height?: number | null;
}

const ICON_CLASSES = /^(iconpic|notenlarge)$/i;
const INLINE_ICON_MAX_PX = 48;

export function identifyInlineIcon(attrs: WebImageAttrs): boolean {
  const classes = (attrs.className ?? "").split(/\s+/).filter(Boolean);
  if (classes.some((cls) => ICON_CLASSES.test(cls))) return true;
  const w = firstPositive(attrs.originWidth, attrs.width);
  const h = firstPositive(attrs.originHeight, attrs.height);
  return w != null && h != null && w <= INLINE_ICON_MAX_PX && h <= INLINE_ICON_MAX_PX;
}

export function markInlineIcons(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (
      !identifyInlineIcon({
        className: attr(tag, "class"),
        originWidth: attrNum(tag, "originwidth"),
        originHeight: attrNum(tag, "originheight"),
        width: attrNum(tag, "width"),
        height: attrNum(tag, "height"),
      })
    ) {
      return tag;
    }
    if (/\by-icon\b/.test(tag)) return tag;
    if (/\bclass\s*=/i.test(tag)) {
      return tag.replace(/\bclass\s*=\s*(["'])/i, "class=$1y-icon ");
    }
    return tag.replace(/<img\b/i, '<img class="y-icon"');
  });
}

function firstPositive(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (value != null && value > 0) return value;
  }
  return null;
}

function attr(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  return match?.[1];
}

function attrNum(tag: string, name: string): number | null {
  const raw = attr(tag, name);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
