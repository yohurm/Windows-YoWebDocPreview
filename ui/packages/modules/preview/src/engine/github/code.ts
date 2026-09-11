import { highlightSource } from "../markdown/highlight";
import { githubRawUrl, parseGithub } from "../../githubSource";
import type { DocMeta } from "@yohu/api";

export function languageFromPath(path: string): string {
  const name = path.split("/").pop() ?? path;
  const ext = name.includes(".") ? (name.split(".").pop() ?? "") : "";
  return ext.toLowerCase();
}

export function renderGithubCode(text: string, path: string): string {
  const lang = languageFromPath(path);
  return `<pre class="highlight"><code class="hljs">${highlightSource(text, lang)}</code></pre>`;
}

export function renderGithubImage(meta: DocMeta | null, title: string): string {
  const loc = meta ? parseGithub(meta.sourceUrl || meta.docRef.url) : null;
  const owner = loc?.owner ?? meta?.docRef.catalog?.split("/")[0];
  const repo = loc?.repo ?? meta?.docRef.catalog?.split("/")[1];
  const gitRef = meta?.docRef.gitRef || loc?.gitRef;
  const path = meta?.docRef.slug || loc?.path || "";
  if (!owner || !repo || !gitRef || !path) {
    return `<p class="y-blob-note">${escapeHtml(title || "图片")}</p>`;
  }
  const src = githubRawUrl(owner, repo, gitRef, path);
  return `<p class="y-blob-image"><img src="${escapeHtml(src)}" alt="${escapeHtml(title)}"></p>`;
}

export function renderGithubNote(message: string): string {
  return `<p class="y-blob-note">${escapeHtml(message)}</p>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
