import type { DocMeta } from "@yohu/api";

import {
  githubBlobUrl,
  githubRawUrl,
  parseGithub,
  resolveRepoPath,
} from "../../githubSource";

const ATTR_RE = /(\b(?:src|href)\s*=\s*["'])([^"']+)(["'])/gi;

export function rewriteGithubHtmlAssets(html: string, meta: DocMeta | null): string {
  if (!html || !meta) return html;
  const loc = parseGithub(meta.sourceUrl || meta.docRef.url);
  const owner = loc?.owner ?? meta.docRef.catalog?.split("/")[0];
  const repo = loc?.repo ?? meta.docRef.catalog?.split("/")[1];
  const gitRef = meta.docRef.gitRef || loc?.gitRef;
  const current = meta.docRef.slug || loc?.path || "";
  if (!owner || !repo || !gitRef) return html;
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
      ? githubRawUrl(owner, repo, gitRef, path)
      : githubBlobUrl(owner, repo, gitRef, path);
    return `${open}${next}${close}`;
  });
}
