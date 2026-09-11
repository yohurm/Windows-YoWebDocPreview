import type { DocMeta } from "@yohu/api";

import {
  githubBlobUrl,
  githubRawUrl,
  githubRepoFromMeta,
  resolveRepoPath,
} from "../../githubSource";

const ATTR_RE = /(\b(?:src|href)\s*=\s*["'])([^"']+)(["'])/gi;

export function rewriteGithubHtmlAssets(html: string, meta: DocMeta | null): string {
  if (!html || !meta) return html;
  const repo = githubRepoFromMeta(meta);
  if (!repo) return html;
  const { owner, gitRef } = repo;
  const current = repo.path;
  return html.replace(ATTR_RE, (_all, open: string, href: string, close: string) => {
    const target = href.trim();
    if (
      !target ||
      target.startsWith("#") ||
      target.startsWith("mailto:") ||
      target.startsWith("https://") ||
      target.startsWith("http://") ||
      target.startsWith("data:")
    ) {
      return `${open}${target}${close}`;
    }
    const path = resolveRepoPath(current, target);
    const image = open.toLowerCase().includes("src");
    const next = image
      ? githubRawUrl(owner, repo.repo, gitRef, path)
      : githubBlobUrl(owner, repo.repo, gitRef, path);
    return `${open}${next}${close}`;
  });
}
