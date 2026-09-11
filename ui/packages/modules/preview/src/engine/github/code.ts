import { highlightSource } from "../markdown/highlight";
import { githubRawUrl, githubRepoFromMeta } from "../../githubSource";
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
  const repo = githubRepoFromMeta(meta);
  if (!repo || !repo.path) {
    return `<p class="y-blob-note">${escapeHtml(title || "图片")}</p>`;
  }
  const src = githubRawUrl(repo.owner, repo.repo, repo.gitRef, repo.path);
  return `<p class="y-blob-image"><img src="${escapeHtml(src)}" alt="${escapeHtml(title)}"></p>`;
}

export function renderGithubNote(message: string): string {
  return `<p class="y-blob-note">${escapeHtml(message)}</p>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
