/**
 * Language identity from Huawei <pre> fields only.
 * Locked by testdata/huawei-code-lang.json. Does not read code text.
 */

export interface WebCodeIdentity {
  lang: string;
  grammar: string | null;
  hub: { url: string; file: string } | null;
}

const NOISE = /^(prettyprint|hljs|linenums)$/i;

const FROM_EXT: Record<string, { lang: string; grammar: string }> = {
  ets: { lang: "ArkTS", grammar: "typescript" },
  ts: { lang: "TypeScript", grammar: "typescript" },
  tsx: { lang: "TypeScript", grammar: "typescript" },
  "d.ts": { lang: "TypeScript", grammar: "typescript" },
  js: { lang: "JavaScript", grammar: "javascript" },
  jsx: { lang: "JavaScript", grammar: "javascript" },
  mjs: { lang: "JavaScript", grammar: "javascript" },
  cjs: { lang: "JavaScript", grammar: "javascript" },
  json: { lang: "JSON", grammar: "json" },
  xml: { lang: "XML", grammar: "xml" },
  sh: { lang: "Bash", grammar: "bash" },
  bash: { lang: "Bash", grammar: "bash" },
  cpp: { lang: "C++", grammar: "cpp" },
  cc: { lang: "C++", grammar: "cpp" },
  cxx: { lang: "C++", grammar: "cpp" },
  h: { lang: "C++", grammar: "cpp" },
  hpp: { lang: "C++", grammar: "cpp" },
  c: { lang: "C++", grammar: "cpp" },
};

const FROM_CLASS: Record<string, { lang: string; grammar: string }> = {
  arkts: { lang: "ArkTS", grammar: "typescript" },
  ets: { lang: "ArkTS", grammar: "typescript" },
  typescript: { lang: "TypeScript", grammar: "typescript" },
  ts: { lang: "TypeScript", grammar: "typescript" },
  javascript: { lang: "JavaScript", grammar: "javascript" },
  js: { lang: "JavaScript", grammar: "javascript" },
  json: { lang: "JSON", grammar: "json" },
  xml: { lang: "XML", grammar: "xml" },
  bash: { lang: "Bash", grammar: "bash" },
  shell: { lang: "Bash", grammar: "bash" },
  cpp: { lang: "C++", grammar: "cpp" },
  c: { lang: "C++", grammar: "cpp" },
  cc: { lang: "C++", grammar: "cpp" },
};

export function identifyWebCode(className: string, codehub: string): WebCodeIdentity {
  const hub = parseHub(codehub);
  if (hub) {
    const fromFile = FROM_EXT[fileExt(hub.file)];
    if (fromFile) return { ...fromFile, hub };
  }
  const fromClass = langFromClass(className);
  if (fromClass) return { ...fromClass, hub };
  return { lang: "text", grammar: null, hub };
}

function parseHub(href: string): { url: string; file: string } | null {
  const url = href.trim();
  if (!url) return null;
  const file = url.split("#")[0]?.split("?")[0]?.split("/").pop() ?? "";
  return { url, file };
}

function fileExt(file: string): string {
  const lower = file.toLowerCase();
  if (lower.endsWith(".d.ts")) return "d.ts";
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot + 1) : "";
}

function langFromClass(className: string): { lang: string; grammar: string } | null {
  for (const token of className.split(/\s+/)) {
    const key = token.replace(/^language-/i, "").toLowerCase();
    if (!key || NOISE.test(key)) continue;
    if (FROM_CLASS[key]) return FROM_CLASS[key];
  }
  return null;
}
