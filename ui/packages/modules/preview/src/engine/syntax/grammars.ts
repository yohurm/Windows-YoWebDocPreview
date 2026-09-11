import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import lua from "highlight.js/lib/languages/lua";
import makefile from "highlight.js/lib/languages/makefile";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("python", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("php", php);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("scss", scss);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("makefile", makefile);
hljs.registerLanguage("ini", ini);
hljs.registerLanguage("lua", lua);
hljs.registerLanguage("markdown", markdown);

const ALIAS: Record<string, string> = {
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  arkts: "typescript",
  ets: "typescript",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  xml: "xml",
  html: "xml",
  htm: "xml",
  svg: "xml",
  bash: "bash",
  sh: "bash",
  zsh: "bash",
  shell: "bash",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  h: "cpp",
  hpp: "cpp",
  c: "cpp",
  csharp: "csharp",
  cs: "csharp",
  rust: "rust",
  rs: "rust",
  python: "python",
  py: "python",
  go: "go",
  java: "java",
  kotlin: "kotlin",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  php: "php",
  ruby: "ruby",
  rb: "ruby",
  yaml: "yaml",
  yml: "yaml",
  css: "css",
  scss: "scss",
  sql: "sql",
  diff: "diff",
  patch: "diff",
  dockerfile: "dockerfile",
  makefile: "makefile",
  make: "makefile",
  mk: "makefile",
  ini: "ini",
  toml: "ini",
  cfg: "ini",
  lua: "lua",
  markdown: "markdown",
  md: "markdown",
  text: "plaintext",
  txt: "plaintext",
  plaintext: "plaintext",
};

export function resolveGrammar(lang: string): string | null {
  const key = lang.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!key) return null;
  const mapped = ALIAS[key] ?? (hljs.getLanguage(key) ? key : null);
  if (!mapped || mapped === "plaintext") return null;
  return mapped;
}

export { hljs };
