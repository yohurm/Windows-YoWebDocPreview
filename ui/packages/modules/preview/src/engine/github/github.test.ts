import { describe, expect, it } from "vitest";

import { GITHUB_SOURCE_ID } from "../../githubSource";
import { buildGithubDocument, parseGithubArticle } from "./index";

const sha = "0123456789abcdef0123456789abcdef01234567";

function meta(slug = "README.md", blobKind: "markdown" | "code" = "markdown") {
  return {
    docRef: {
      sourceId: GITHUB_SOURCE_ID,
      catalog: "o/r",
      slug,
      url: `https://github.com/o/r/blob/${sha}/${slug}`,
      gitRef: sha,
    },
    title: "Demo",
    updateTime: null,
    sourceUrl: `https://github.com/o/r/blob/${sha}/${slug}`,
    channel: "adapter" as const,
    deviceTypes: [],
    blobKind,
  };
}

describe("parseGithubArticle", () => {
  it("builds toc from markdown headings", () => {
    const parsed = parseGithubArticle("# Title\n\n## Install\n\ntext", "", meta());
    expect(parsed.toc.some((item) => item.text === "Install")).toBe(true);
    expect(parsed.html).toContain("Install");
  });

  it("keeps embedded HTML used by GitHub READMEs", () => {
    const parsed = parseGithubArticle(
      `<div align="center">\n\n# OmniRoute\n\n<img src="./docs/screenshots/x.png" width="120">\n</div>`,
      "",
      meta()
    );
    expect(parsed.html).toContain("align");
    expect(parsed.html).toContain("<img");
    expect(parsed.html).toContain(
      `https://raw.githubusercontent.com/o/r/${sha}/docs/screenshots/x.png`
    );
    expect(parsed.html).not.toContain("&lt;div");
  });

  it("renders source files as highlighted code, not markdown", () => {
    const parsed = parseGithubArticle(
      '// note\nfn main() {\n  let n = 1;\n  println!("hi");\n}\n',
      "lib.rs",
      meta("src/lib.rs", "code")
    );
    expect(parsed.html).toContain("<pre");
    expect(parsed.html).toContain("hljs-keyword");
    expect(parsed.html).toContain("hljs-comment");
    expect(parsed.html).toContain("hljs-string");
    expect(parsed.html).toContain("hljs-number");
    expect(parsed.html).not.toContain("<h1");
  });

  it("reads the too-large note from testdata previewMaxBytes", () => {
    const parsed = parseGithubArticle("", "huge.bin", {
      ...meta("huge.bin", "code"),
      blobKind: "tooLarge",
    });
    expect(parsed.html).toContain("文件超过 1MB");
  });
});

describe("buildGithubDocument", () => {
  it("renders markdown into github-markdown-css chrome", () => {
    const html = buildGithubDocument({
      meta: meta(),
      markdown: "# Demo\n\nHello **world**.",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("markdown-body");
    expect(html).toContain("Demo");
    expect(html).toContain("o/r");
    expect(html).toContain("world");
    expect(html).not.toContain('class="y-title"');
    expect(html).not.toContain("HarmonyOS");
  });

  it("binds GitHub prettylights onto syntax roles instead of hardcoded hljs hex", () => {
    const html = buildGithubDocument({
      meta: meta("src/lib.rs", "code"),
      markdown: "fn main() {}\n",
    });
    expect(html).toContain("--yo-syntax-keyword: var(--color-prettylights-syntax-keyword)");
    expect(html).toContain("--yo-syntax-variable: var(--color-prettylights-syntax-variable)");
    expect(html).toContain("var(--yo-syntax-keyword)");
    expect(html).not.toContain(".hljs-keyword, .hljs-selector-tag { color: #cf222e; }");
  });
});
