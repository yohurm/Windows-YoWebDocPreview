import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function loadPreviewFile(name: string): string {
  const candidates = [
    resolve(process.cwd(), "packages/modules/preview/src", name),
    resolve(process.cwd(), "src", name),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf-8");
    }
  }
  return "";
}

function loadPreviewCss(): string {
  return loadPreviewFile("preview.css");
}

describe("preview rail overlay", () => {
  it("栏体固定宽 + translate，槽位直切，不再插值 width", () => {
    const css = loadPreviewCss();
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain("--yo-nav-shift");
    expect(css).toContain("--yo-toc-shift");
    expect(css).toContain("transform: translate3d(var(--yo-nav-shift), 0, 0)");
    expect(css).toContain("transform: translate3d(var(--yo-toc-shift), 0, 0)");
    expect(css).toContain("transition: left var(--yohu-motion-spatial-panel)");
    expect(css).toContain("transition: right var(--yohu-motion-spatial-panel)");
    expect(css).toContain("width: var(--yo-nav-w)");
    expect(css).toContain("width: var(--yo-toc-w)");
    expect(css).not.toContain("--yo-nav-visual");
    expect(css).not.toContain("--yo-toc-visual");
    expect(css).not.toContain("yohu-collapse");
    expect(css).not.toContain("width: var(--yo-nav-visual)");
    const navBlock = css.slice(css.indexOf(".yo-nav,"), css.indexOf(".yo-nav {"));
    expect(navBlock).not.toContain("justify-content: flex-end");
  });

  it("阅读表面走 crossfade 配方，休眠不 display:none、不 visibility:hidden", () => {
    const css = loadPreviewCss();
    expect(css).toContain(".yo-canvas__surfaces");
    expect(css).toContain(".yo-md-host");
    expect(css).toContain("yohu-recipe-crossfade");
    expect(css).not.toContain(".yo-web.is-dormant");
    const surfaces = css.slice(css.indexOf(".yo-canvas__surfaces"), css.indexOf(".yo-toc {"));
    expect(surfaces).not.toContain("visibility: hidden");
    expect(surfaces).not.toContain("display: none");
  });

  it("网页 iframe 不授权弹窗，正文链接不走 target=_blank", () => {
    const frame = loadPreviewFile("components/WebReadingFrame.tsx");
    const code = loadPreviewFile("engine/huawei/code.ts");
    expect(frame).toContain("bindContentLinks");
    expect(frame).not.toContain("allow-popups");
    expect(code).toContain("y-code__hub");
    expect(code).not.toContain("target=\"_blank\"");
  });

  it("阅读表面不进 YoStage 身份，网页 iframe 不被卸掉", () => {
    const src = loadPreviewFile("components/CanvasDock.tsx");
    expect(src).toContain("openContentHref");
    expect(src.length).toBeGreaterThan(0);
    expect(src).toContain("yohu-recipe-crossfade");
    expect(src).toContain("yo-md-host");
    expect(src).toContain("yo-canvas__surfaces");
    expect(src).toMatch(/<YoStage keys=\{`\$\{store\.markdownReveal\(\)/);
    expect(src).not.toMatch(/<YoStage keys=\{`\$\{store\.readingSurface\(\)/);
    expect(src).not.toContain("is-dormant");
  });
});
