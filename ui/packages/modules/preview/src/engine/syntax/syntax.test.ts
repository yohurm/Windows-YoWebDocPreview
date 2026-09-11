import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { resolveGrammar } from "./grammars";
import { highlightByGrammar, highlightMarkdownFence, highlightSource } from "./highlight";
import { SYNTAX_ROLE_CLASSES, SYNTAX_ROLES } from "./roles";
import { syntaxColorCss } from "./theme";

const themeCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "theme.css"), "utf8");

describe("resolveGrammar", () => {
  it("maps aliases used by GitHub paths and Huawei fences", () => {
    expect(resolveGrammar("rs")).toBe("rust");
    expect(resolveGrammar("ArkTS")).toBe("typescript");
    expect(resolveGrammar("ets")).toBe("typescript");
    expect(resolveGrammar("kt")).toBe("kotlin");
  });

  it("rejects empty, plaintext, and unknown languages", () => {
    expect(resolveGrammar("")).toBeNull();
    expect(resolveGrammar("text")).toBeNull();
    expect(resolveGrammar("not-a-language")).toBeNull();
  });
});

describe("highlightSource", () => {
  it("colors distinct token roles in Rust", () => {
    const html = highlightSource('// note\nfn main() {\n  let n = 1;\n  println!("hi");\n}\n', "rs");
    expect(html).toContain("hljs-comment");
    expect(html).toContain("hljs-keyword");
    expect(html).toContain("hljs-number");
    expect(html).toContain("hljs-string");
    expect(html).not.toContain("<script");
  });

  it("escapes unknown languages instead of guessing", () => {
    expect(highlightSource("<script>alert(1)</script>", "unknown")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("escapes empty source", () => {
    expect(highlightSource("", "ts")).toBe("");
  });
});

describe("highlightMarkdownFence", () => {
  it("colors ArkTS fences", () => {
    expect(highlightMarkdownFence("let hi: string = 'hello';", "ArkTS")).toContain("hljs-keyword");
  });

  it("returns empty so markdown-it can escape unknown fences", () => {
    expect(highlightMarkdownFence("<b>x</b>", "plaintext")).toBe("");
    expect(highlightMarkdownFence("<b>x</b>", "")).toBe("");
  });
});

describe("highlightByGrammar", () => {
  it("colors a resolved grammar and escapes a missing one", () => {
    expect(highlightByGrammar("const x = 1;", "typescript")).toContain("hljs-keyword");
    expect(highlightByGrammar("<em>x</em>", null)).toBe("&lt;em&gt;x&lt;/em&gt;");
  });
});

describe("syntax theme", () => {
  it("maps every role class onto a --yo-syntax token", () => {
    const css = syntaxColorCss();
    for (const role of SYNTAX_ROLES) {
      expect(css).toContain(`var(--yo-syntax-${role})`);
      for (const cls of SYNTAX_ROLE_CLASSES[role]) {
        expect(css).toContain(`.${cls}`);
      }
    }
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("keeps the host stylesheet aligned with the generated role CSS", () => {
    const normalize = (css: string) => css.replace(/\s+/g, " ").trim();
    expect(normalize(themeCss)).toBe(normalize(syntaxColorCss()));
  });
});
