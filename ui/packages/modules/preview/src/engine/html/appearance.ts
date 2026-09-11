/**
 * 只涂已挂载的文章文档，不参与 srcdoc 合成。
 */
import type { Appearance } from "@yohu/ui";

export function paintWebAppearance(doc: Document, appearance: Appearance): void {
  const root = doc.documentElement;
  if (!root) return;
  root.setAttribute("data-theme", appearance);
  root.style.colorScheme = appearance;
  const head = doc.head;
  if (!head) return;
  let meta = head.querySelector("meta[name='color-scheme']");
  if (!meta) {
    meta = doc.createElement("meta");
    meta.setAttribute("name", "color-scheme");
    head.appendChild(meta);
  }
  meta.setAttribute("content", appearance);
}
