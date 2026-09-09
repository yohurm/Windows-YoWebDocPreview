import type MarkdownIt from "markdown-it";

const MARKER = /^\[!(NOTE|TIP|WARNING)\]\s*(.*)$/i;

const LABELS: Record<string, string> = {
  note: "说明",
  tip: "提示",
  warning: "注意",
};

export function markdownAlerts(md: MarkdownIt): void {
  md.core.ruler.after("block", "yo_md_alerts", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i];
      if (open?.type !== "blockquote_open") continue;
      const closeIdx = findClose(tokens, i);
      if (closeIdx < 0) continue;
      const inline = firstInline(tokens, i, closeIdx);
      if (!inline) continue;
      const lines = inline.content.split("\n");
      const first = lines[0]?.trim() ?? "";
      const marked = MARKER.exec(first);
      if (!marked) continue;
      const kind = marked[1]?.toLowerCase() ?? "note";
      const title = marked[2]?.trim() ?? "";
      lines[0] = title;
      inline.content = lines.join("\n").replace(/^\n+/, "");
      open.type = "yo_md_callout_open";
      open.tag = "div";
      open.attrSet("class", `yo-md-callout yo-md-callout--${kind}`);
      open.attrSet("data-callout", kind);
      if (title) open.attrSet("data-title", title);
      const close = tokens[closeIdx];
      if (close) {
        close.type = "yo_md_callout_close";
        close.tag = "div";
      }
    }
  });

  md.renderer.rules.yo_md_callout_open = (tokens, idx) => {
    const token = tokens[idx];
    const kind = token?.attrGet("data-callout") ?? "note";
    const title = token?.attrGet("data-title");
    const label = title || LABELS[kind] || LABELS.note;
    return `<div class="yo-md-callout yo-md-callout--${kind}" data-callout="${kind}"><p class="yo-md-callout__label">${md.utils.escapeHtml(label ?? "说明")}</p>`;
  };
  md.renderer.rules.yo_md_callout_close = () => "</div>\n";
}

function findClose(tokens: { type: string }[], openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < tokens.length; i++) {
    const type = tokens[i]?.type;
    if (type === "blockquote_open") depth += 1;
    if (type === "blockquote_close") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function firstInline<T extends { type: string }>(tokens: T[], from: number, to: number): T | null {
  for (let i = from; i < to; i++) {
    const token = tokens[i];
    if (token?.type === "inline") return token;
  }
  return null;
}
