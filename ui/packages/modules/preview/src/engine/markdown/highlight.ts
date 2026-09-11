import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("python", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("css", css);

const ALIAS: Record<string, string> = {
  typescript: "typescript",
  ts: "typescript",
  arkts: "typescript",
  ets: "typescript",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  xml: "xml",
  html: "xml",
  bash: "bash",
  shell: "bash",
  cpp: "cpp",
  c: "cpp",
  rust: "rust",
  rs: "rust",
  python: "python",
  py: "python",
  go: "go",
  java: "java",
  yaml: "yaml",
  yml: "yaml",
  css: "css",
  text: "plaintext",
  plaintext: "plaintext",
};

export function highlightSource(code: string, lang: string): string {
  const colored = highlightMarkdownFence(code, lang);
  return colored || escapeHtml(code);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
