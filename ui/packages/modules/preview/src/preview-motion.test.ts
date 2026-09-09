import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function loadPreviewCss(): string {
  const candidates = [
    resolve(process.cwd(), "packages/modules/preview/src/preview.css"),
    resolve(process.cwd(), "src/preview.css"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf-8");
    }
  }
  return "";
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
});
