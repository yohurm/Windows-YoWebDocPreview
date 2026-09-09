import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("plaintext", plaintext);

const ALIAS: Record<string, string> = {
  typescript: "typescript",
  ts: "typescript",
  arkts: "typescript",
  ets: "typescript",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  xml: "xml",
  bash: "bash",
  shell: "bash",
  cpp: "cpp",
  c: "cpp",
  text: "plaintext",
  plaintext: "plaintext",
};

/** markdown-it highlight(): return inner HTML, or empty to let the parser escape. */
export function highlightMarkdownFence(code: string, lang: string): string {
  const key = lang.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const mapped = ALIAS[key] ?? (key && hljs.getLanguage(key) ? key : null);
  if (!mapped || mapped === "plaintext") return "";
  try {
    return hljs.highlight(code, { language: mapped, ignoreIllegals: true }).value;
  } catch {
    return "";
  }
}
