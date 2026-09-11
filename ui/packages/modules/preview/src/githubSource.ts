import table from "../../../../../testdata/github-source.json";

export const GITHUB_SOURCE_ID = table.sourceId;
export const GITHUB_WEB_PREFIX = table.webPrefix;
export const GITHUB_RAW_PREFIX = table.rawPrefix;

const DOC_EXTS = table.docExtensions.map((ext) => ext.toLowerCase());
const README_NAMES = table.readmeNames.map((name) => name.toLowerCase());
const RESERVED = new Set(table.reservedRepoSegments);

export function isGithubSource(sourceId?: string | null): boolean {
  return sourceId === GITHUB_SOURCE_ID;
}

function isGithubReadmeName(name: string): boolean {
  return README_NAMES.includes(name.toLowerCase());
}

function isGithubDocPath(path: string): boolean {
  const name = path.split("/").pop() ?? path;
  if (isGithubReadmeName(name)) return true;
  const lower = path.toLowerCase();
  return DOC_EXTS.some((ext) => lower.endsWith(ext));
}

export interface GithubLoc {
  owner: string;
  repo: string;
  gitRef: string | null;
  path: string;
}

function stripUrl(url: string): string {
  return url.split(/[#?]/)[0]?.replace(/\/+$/, "") ?? "";
}

function canonicalizeGithubUrl(url: string): string {
  const stripped = stripUrl(url);
  const https = stripped.replace(/^http:\/\//i, "https://");
  for (const alias of table.webAliases) {
    const httpsAlias = alias.replace(/^http:\/\//i, "https://");
    if (https.startsWith(alias)) {
      return `${table.webPrefix}${https.slice(alias.length)}`;
    }
    if (https.startsWith(httpsAlias)) {
      return `${table.webPrefix}${https.slice(httpsAlias.length)}`;
    }
  }
  return https;
}

export function parseGithub(url: string): GithubLoc | null {
  const stripped = canonicalizeGithubUrl(url);
  if (stripped.startsWith(table.webPrefix)) {
    return parseWebRest(stripped.slice(table.webPrefix.length));
  }
  if (stripped.startsWith(table.rawPrefix)) {
    return parseRawRest(stripped.slice(table.rawPrefix.length));
  }
  return null;
}

function parseWebRest(rest: string): GithubLoc | null {
  const parts = rest.split("/").filter(Boolean);
  const owner = parts[0];
  const repo = parts[1];
  if (!owner || !repo) return null;
  const kind = parts[2];
  if (!kind) {
    return { owner, repo, gitRef: null, path: "" };
  }
  if (kind === "blob" || kind === "raw") {
    const gitRef = parts[3];
    const path = parts.slice(4).join("/");
    if (!gitRef || !path) return null;
    return { owner, repo, gitRef, path };
  }
  if (kind === "tree") {
    const gitRef = parts[3];
    if (!gitRef) return null;
    return { owner, repo, gitRef, path: parts.slice(4).join("/") };
  }
  if (RESERVED.has(kind)) return null;
  return null;
}

function parseRawRest(rest: string): GithubLoc | null {
  const parts = rest.split("/").filter(Boolean);
  const owner = parts[0];
  const repo = parts[1];
  const gitRef = parts[2];
  const path = parts.slice(3).join("/");
  if (!owner || !repo || !gitRef || !path) return null;
  return { owner, repo, gitRef, path };
}

export function githubCatalogIdFromUrl(url: string): string | null {
  const loc = parseGithub(url);
  return loc ? `${loc.owner}/${loc.repo}` : null;
}

export function isGithubCommitSha(value: string): boolean {
  return /^[0-9a-f]{40}$/i.test(value);
}

export function applyKnownRef(parsed: GithubLoc, knownRef: string): GithubLoc {
  if (!knownRef) return parsed;
  if (!parsed.gitRef) return { ...parsed, gitRef: knownRef };
  if (isGithubCommitSha(parsed.gitRef)) return parsed;
  const rest = parsed.path ? `${parsed.gitRef}/${parsed.path}` : parsed.gitRef;
  if (rest === knownRef) return { ...parsed, gitRef: knownRef, path: "" };
  if (rest.startsWith(`${knownRef}/`)) {
    return { ...parsed, gitRef: knownRef, path: rest.slice(knownRef.length + 1) };
  }
  return parsed;
}

export function githubBlobUrl(owner: string, repo: string, gitRef: string, path: string): string {
  return `${table.webPrefix}${owner}/${repo}/blob/${gitRef}/${path}`;
}

export function githubRawUrl(owner: string, repo: string, gitRef: string, path: string): string {
  return `${table.rawPrefix}${owner}/${repo}/${gitRef}/${path}`;
}

export function githubTreeUrl(owner: string, repo: string, gitRef: string, path: string): string {
  return path
    ? `${table.webPrefix}${owner}/${repo}/tree/${gitRef}/${path}`
    : `${table.webPrefix}${owner}/${repo}/tree/${gitRef}`;
}

export function classifyGithubBlob(path: string): "markdown" | "image" | "code" {
  if (isGithubDocPath(path)) return "markdown";
  const lower = path.toLowerCase();
  if (table.imageExtensions.some((ext) => lower.endsWith(ext))) return "image";
  return "code";
}

export function resolveRepoPath(current: string, rel: string): string {
  const clean = rel.split(/[#?]/)[0] ?? rel;
  if (!clean) return current;
  const start = clean.startsWith("/")
    ? []
    : current.split("/").filter(Boolean).slice(0, -1);
  const segs = [...start];
  for (const part of clean.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") segs.pop();
    else segs.push(part);
  }
  return segs.join("/");
}

export function resolveGithubCatalogUrl(
  slugOrUrl: string,
  currentSourceUrl: string,
  gitRef?: string | null
): string | null {
  if (/^https?:\/\//i.test(slugOrUrl)) return slugOrUrl;
  const loc = parseGithub(currentSourceUrl);
  if (!loc) return null;
  const ref = gitRef || loc.gitRef;
  if (!ref) return null;
  return githubBlobUrl(loc.owner, loc.repo, ref, slugOrUrl);
}
