import { hljs, resolveGrammar } from "./grammars";

export function highlightByGrammar(code: string, grammar: string | null): string {
  if (!grammar || !hljs.getLanguage(grammar)) return escapeHtml(code);
  try {
    return hljs.highlight(code, { language: grammar, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(code);
  }
}

export function highlightSource(code: string, lang: string): string {
  return highlightByGrammar(code, resolveGrammar(lang));
}

/** markdown-it highlight(): inner HTML, or empty so the parser escapes. */
export function highlightMarkdownFence(code: string, lang: string): string {
  const grammar = resolveGrammar(lang);
  if (!grammar) return "";
  try {
    return hljs.highlight(code, { language: grammar, ignoreIllegals: true }).value;
  } catch {
    return "";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
