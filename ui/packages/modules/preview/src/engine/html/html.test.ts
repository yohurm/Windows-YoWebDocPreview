import { describe, expect, it } from "vitest";

import {
  assignWebSrcdoc,
  buildHtmlDocument,
  extractArticleToc,
  normalizeHtmlArticle,
  paintWebAppearance,
} from "./index";

describe("normalizeHtmlArticle", () => {
  it("keeps heading levels and only stamps ids", () => {
    const html = normalizeHtmlArticle(
      `<h1>Title</h1><h4>小节</h4><p>正文</p>`,
      "Title"
    );
    expect(html).not.toContain("<h1>");
    expect(html).toMatch(/<h4[^>]*>小节<\/h4>/);
    expect(html).not.toMatch(/<h2[^>]*>小节<\/h2>/);
  });

  it("unwraps a full document and wraps tables", () => {
    const html = normalizeHtmlArticle(
      `<html><head><title>x</title></head><body><h2>节</h2><table><tr><th>A</th></tr></table></body></html>`,
      "x"
    );
    expect(html).not.toContain("<html");
    expect(html).not.toContain("<body");
    expect(html).toContain('class="y-table-scroll"');
  });

  it("does not apply Huawei note or heading-marker dialect", () => {
    const html = normalizeHtmlArticle(
      `<h4>[h2]基础概念</h4><div class="note"><img src="note.png"><div class="notebody"><p>仅 ets</p></div></div>`
    );
    expect(html).toContain("[h2]基础概念");
    expect(html).not.toContain('data-note=');
    expect(html).toContain("<img");
  });

  it("typesets TeX outside code", () => {
    const html = normalizeHtmlArticle(`<p>质能 $$E=mc^2$$</p><pre>const x = "$$not-math$$";</pre>`);
    expect(html).toMatch(/<math[\s>]/);
    expect(html).toContain("$$not-math$$");
  });
});

describe("extractArticleToc", () => {
  it("reads ids from generic heading stamps", () => {
    const html = normalizeHtmlArticle(`<h2>节</h2><h4>小节</h4>`, "");
    const toc = extractArticleToc(html);
    expect(toc.map((item) => item.text)).toEqual(["节", "小节"]);
    expect(toc.map((item) => item.level)).toEqual([2, 4]);
  });
});

describe("buildHtmlDocument", () => {
  it("uses generic chrome without official Huawei title size or note skin", () => {
    const html = buildHtmlDocument({
      meta: {
        docRef: { sourceId: "generic-web", catalog: null, slug: "x", url: "https://example.com/x" },
        title: "示例",
        updateTime: "2026-01-01",
        sourceUrl: "https://example.com/x",
        channel: "genericWeb",
        deviceTypes: [],
      },
      rawHtml: "<p>普通纯文本网页</p>",
    });
    expect(html).toContain("普通纯文本网页");
    expect(html).toContain("示例");
    expect(html).toContain("更新时间: 2026-01-01");
    expect(html).toContain('data-yo-read="article"');
    expect(html).not.toContain("font-size: 36px");
    expect(html).not.toContain(".note--caution");
    expect(html).not.toContain("y-crumb");
  });
});

describe("paintWebAppearance", () => {
  it("paints data-theme onto an already-built document", () => {
    const html = buildHtmlDocument({
      meta: null,
      rawHtml: "<p>正文</p>",
    });
    const doc = new DOMParser().parseFromString(html, "text/html");
    paintWebAppearance(doc, "dark");
    expect(doc.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(doc.querySelector("#doc-body-content")?.textContent).toContain("正文");
  });
});

describe("assignWebSrcdoc", () => {
  it("writes the srcdoc property and skips identical html", () => {
    const frame = document.createElement("iframe");
    expect(assignWebSrcdoc(frame, "<p>a</p>")).toBe(true);
    expect(frame.srcdoc).toBe("<p>a</p>");
    expect(assignWebSrcdoc(frame, "<p>a</p>")).toBe(false);
  });
});
