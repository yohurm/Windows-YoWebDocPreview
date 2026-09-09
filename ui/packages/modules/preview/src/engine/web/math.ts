import katex from "katex";

const DISPLAY_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;
const INLINE_RE = /\\\(([\s\S]+?)\\\)|(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;

/** Typeset TeX delimiters outside pre/code. Native MathML is left untouched. */
export function renderWebMath(html: string): string {
  return withProtectedCode(html, (plain) => {
    let out = plain.replace(DISPLAY_RE, (_all, dollar?: string, bracket?: string) =>
      typeset(dollar ?? bracket ?? "", true)
    );
    out = out.replace(INLINE_RE, (_all, paren?: string, dollar?: string) =>
      typeset(paren ?? dollar ?? "", false)
    );
    return out;
  });
}

function typeset(tex: string, displayMode: boolean): string {
  const source = tex.trim();
  if (!source) return "";
  try {
    return katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      trust: false,
      maxExpand: 1000,
      output: "mathml",
    });
  } catch {
    return escapeHtml(source);
  }
}

function withProtectedCode(html: string, fn: (plain: string) => string): string {
  const blocks: string[] = [];
  const protectedHtml = html.replace(/<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>/gi, (block) => {
    const i = blocks.length;
    blocks.push(block);
    return `\u0000WEBCODE${i}\u0000`;
  });
  let out = fn(protectedHtml);
  for (let i = 0; i < blocks.length; i++) {
    out = out.replace(`\u0000WEBCODE${i}\u0000`, () => blocks[i] ?? "");
  }
  return out;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
