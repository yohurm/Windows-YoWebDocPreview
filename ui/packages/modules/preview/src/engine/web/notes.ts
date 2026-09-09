/** Turn Huawei note PNG labels into typed callouts. */

export function relabelNotes(html: string): string {
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
