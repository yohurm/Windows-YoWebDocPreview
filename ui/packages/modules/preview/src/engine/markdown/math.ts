import katex from "katex";
import type MarkdownIt from "markdown-it";

const KATEX = {
  throwOnError: false,
  trust: false,
  maxExpand: 1000,
  output: "html" as const,
};

export function markdownMath(md: MarkdownIt): void {
  md.inline.ruler.after("escape", "yo_md_math_inline", (state, silent) => {
    if (state.src[state.pos] !== "$") return false;
    if (state.src[state.pos + 1] === "$") return false;
    const start = state.pos + 1;
    let pos = start;
    let found = -1;
    while (pos < state.posMax) {
      const ch = state.src[pos];
      if (ch === "\\" && pos + 1 < state.posMax) {
        pos += 2;
        continue;
      }
      if (ch === "$") {
        found = pos;
        break;
      }
      pos += 1;
    }
    if (found < 0 || found === start) return false;
    if (state.src[found + 1] === "$") return false;
    const content = state.src.slice(start, found);
    if (content.includes("\n")) return false;
    if (!silent) {
      const token = state.push("yo_md_math_inline", "span", 0);
      token.markup = "$";
      token.content = content;
    }
    state.pos = found + 1;
    return true;
  });

  md.block.ruler.before("fence", "yo_md_math_block", (state, start, end, silent) => {
    const mark = state.bMarks[start];
    const shift = state.tShift[start];
    const max = state.eMarks[start];
    if (mark == null || shift == null || max == null) return false;
    const startPos = mark + shift;
    if (startPos + 2 > max) return false;
    if (state.src.slice(startPos, startPos + 2) !== "$$") return false;

    let firstLine = state.src.slice(startPos + 2, max).trim();
    let haveEnd = firstLine.endsWith("$$");
    if (haveEnd) firstLine = firstLine.slice(0, -2).trim();
    if (silent) return true;

    let next = start;
    let content = firstLine;
    if (!haveEnd) {
      for (next = start + 1; next < end; next++) {
        const lineStart = state.bMarks[next];
        const lineShift = state.tShift[next];
        const lineEnd = state.eMarks[next];
        if (lineStart == null || lineShift == null || lineEnd == null) return false;
        const line = state.src.slice(lineStart + lineShift, lineEnd).trim();
        if (line.endsWith("$$")) {
          const body = line.slice(0, -2).trim();
          if (body) content = content ? `${content}\n${body}` : body;
          haveEnd = true;
          break;
        }
        content = content ? `${content}\n${line}` : line;
      }
    }
    if (!haveEnd) return false;

    const token = state.push("yo_md_math_block", "div", 0);
    token.block = true;
    token.markup = "$$";
    token.content = content;
    token.map = [start, next + 1];
    state.line = next + 1;
    return true;
  }, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  md.renderer.rules.yo_md_math_inline = (tokens, idx) =>
    typeset(tokens[idx]?.content ?? "", false);
  md.renderer.rules.yo_md_math_block = (tokens, idx) =>
    `<div class="yo-md-math">${typeset(tokens[idx]?.content ?? "", true)}</div>\n`;
}

function typeset(tex: string, displayMode: boolean): string {
  const source = tex.trim();
  if (!source) return "";
  try {
    return katex.renderToString(source, { ...KATEX, displayMode });
  } catch {
    return escapeHtml(source);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
