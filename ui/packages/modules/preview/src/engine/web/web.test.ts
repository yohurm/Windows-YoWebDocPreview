import { describe, expect, it } from "vitest";

import codeLangTable from "../../../../../../../testdata/huawei-code-lang.json";
import headingTable from "../../../../../../../testdata/huawei-headings.json";
import type { DocMeta } from "@yohu/api";

import {
  assignWebSrcdoc,
  buildWebDocument,
  extractDeviceTypes,
  extractWebToc,
  identifyWebCode,
  normalizeArticleHtml,
  paintWebAppearance,
  resolveHeadingLevel,
} from "./index";

describe("resolveHeadingLevel", () => {
  it("matches testdata/huawei-headings.json", () => {
    for (const row of headingTable.cases) {
      expect(resolveHeadingLevel(row.tag, row.marker)).toBe(row.level);
    }
  });
});

describe("identifyWebCode", () => {
  it("matches testdata/huawei-code-lang.json", () => {
    for (const row of codeLangTable.cases) {
      const got = identifyWebCode(row.className, row.codehub);
      expect(got.lang, row.codehub || row.className).toBe(row.lang);
      expect(got.grammar, row.codehub || row.className).toBe(row.grammar);
      expect(got.hub?.file ?? null, row.codehub || row.className).toBe(row.file);
    }
  });
});

describe("normalizeArticleHtml", () => {
  it("promotes unmarked h4 to h2 and [h2] markers to h3", () => {
    const html = normalizeArticleHtml(
      `<h1>ArkTS语言介绍</h1><h4>基本知识</h4><h4>[h2]声明</h4><p>正文</p>`,
      "ArkTS语言介绍"
    );
    expect(html).not.toContain("<h1>");
    expect(html).toMatch(/<h2[^>]*>基本知识<\/h2>/);
    expect(html).toMatch(/<h3[^>]*>声明<\/h3>/);
    expect(html).not.toContain("[h2]");
  });

  it("reads device-type from the document h1", () => {
    expect(extractDeviceTypes(`<h1 device-type="phone,2in1,tablet">@arkts.lang</h1>`)).toEqual([
      "Phone",
      "PC/2in1",
      "Tablet",
    ]);
  });

  it("unwraps a full html document into article body", () => {
    const html = normalizeArticleHtml(
      `<html><head><title>x</title></head><body><h4>基本知识</h4></body></html>`,
      "x"
    );
    expect(html).not.toContain("<html");
    expect(html).not.toContain("<body");
    expect(html).toMatch(/<h2[^>]*>基本知识<\/h2>/);
  });

  it("turns Huawei note images into labeled callouts", () => {
    const html = normalizeArticleHtml(
      `<div class="note"><img src="https://cdn.example/note_3.0-zh-cn.png"><span class="notetitle"> </span><div class="notebody"><p>仅 ets</p></div></div>`
    );
    expect(html).toContain('data-note="note"');
    expect(html).not.toContain("<img");
  });

  it("wraps tables for overflow", () => {
    const html = normalizeArticleHtml(`<table class="tablenoborder"><tr><th>A</th></tr></table>`);
    expect(html).toContain('class="y-table-scroll"');
  });

  it("parses a Huawei pre into y-code once, without leftover official class", () => {
    const html = normalizeArticleHtml(
      `<pre class="TypeScript prettyprint linenums" codehub="https://gitcode.com/example/pages/BasicKnowledge.ets#L23-L25">let hi: string = 'hello';\n</pre>`
    );
    expect(html).toContain('class="y-code" data-lang="ArkTS"');
    expect(html).toContain('class="y-code__lang">ArkTS<');
    expect(html).toContain('class="y-code__body"');
    expect(html).toContain("BasicKnowledge.ets");
    expect(html).toContain("hljs-keyword");
    expect(html).not.toContain('class="TypeScript');
    expect(html).not.toContain("prettyprint");
    expect(html).not.toContain("linenums");
    expect(html).not.toContain("data-y-code");
    expect(html).not.toContain("codehub=");
    expect(html).not.toMatch(/y-code__lang">TypeScript</);
    expect(html).not.toMatch(/\n<\/pre>/);
  });

  it("uses class as identity only when codehub has no language file", () => {
    const html = normalizeArticleHtml(`<pre class="TypeScript">@Component\nstruct Demo {\n  build() {}\n}</pre>`);
    expect(html).toContain('data-lang="TypeScript"');
    expect(html).not.toContain('data-lang="ArkTS"');
  });

  it("keeps existing token spans and still replaces official chrome", () => {
    const html = normalizeArticleHtml(
      `<pre class="TypeScript"><span class="hljs-keyword">let</span> hi</pre>`
    );
    expect(html).toContain('<span class="hljs-keyword">let</span> hi');
    expect(html).toContain('class="y-code__body"');
    expect(html.match(/hljs-keyword/g)?.length).toBe(1);
  });

  it("typesets TeX outside code and leaves fence dollars alone", () => {
    const html = normalizeArticleHtml(
      `<p>质能 $$E=mc^2$$</p><pre class="TypeScript">const x = "$$not-math$$";</pre>`
    );
    expect(html).toMatch(/<math[\s>]/);
    expect(html).toContain("$$not-math$$");
  });
});

describe("extractWebToc", () => {
  it("reads ids stamped by article normalization, not markdown toc-heading ids", () => {
    const html = normalizeArticleHtml(
      `<h1>ArkTS语言介绍</h1><h4>基本知识</h4><h4>[h2]声明</h4>`,
      "ArkTS语言介绍"
    );
    const toc = extractWebToc(html);
    expect(toc.map((item) => item.text)).toEqual(["基本知识", "声明"]);
    expect(toc.map((item) => item.level)).toEqual([2, 3]);
    expect(toc.every((item) => item.id && !item.id.startsWith("toc-heading-"))).toBe(true);
    expect(html).toContain(`id="${toc[0]?.id}"`);
  });
});

describe("buildWebDocument", () => {
  it("composes an official-style article without a second TOC", () => {
    const meta: DocMeta = {
      docRef: {
        sourceId: "huawei-harmonyos",
        catalog: "harmonyos-guides-V5",
        slug: "resource-categories-and-access",
        url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/resource-categories-and-access",
      },
      title: "资源分类与访问指南",
      updateTime: "2024-08-20",
      sourceUrl:
        "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/resource-categories-and-access",
      channel: "adapter",
      deviceTypes: ["phone", "tablet"],
    };

    const result = buildWebDocument({
      meta,
      rawHtml: "<h4>[h2]资源目录分类</h4><p>支持 rawfile 与 resources 目录资源访问。</p>",
      sourceUrl: meta.sourceUrl,
    });

    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("资源分类与访问指南");
    expect(result).toContain("更新时间: 2024-08-20");
    expect(result).toContain("Phone");
    expect(result).toContain("Tablet");
    expect(result).toContain("资源目录分类");
    expect(result).not.toContain("doc-sidebar-toc");
    expect(result).not.toContain("HarmonyOS Developer");
    expect(result).not.toContain("y-channels");
    expect(result).not.toContain("yo-open-doc");
    expect(result).toContain('class="y-crumb__sep"');
    expect(result).not.toContain("&gt;");
    expect(result).toContain("36px");
    expect(result).not.toContain("54px");
    expect(result).toContain('data-yo-read="article"');
    expect(result).toContain('class="y-scroll"');
  });

  it("falls back to h1 device-type when meta has none", () => {
    const result = buildWebDocument({
      meta: {
        docRef: {
          sourceId: "huawei-harmonyos",
          catalog: "harmonyos-references",
          slug: "js-apis-arkts-lang",
          url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-arkts-lang",
        },
        title: "@arkts.lang",
        updateTime: null,
        sourceUrl: "https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-arkts-lang",
        channel: "adapter",
        deviceTypes: [],
      },
      rawHtml: `<h1 device-type="phone,tv">@arkts.lang</h1><div class="note"><img src="note_3.0-zh-cn.png"><span class="notetitle"> </span><div class="notebody"><p>仅 ets</p></div></div>`,
      sourceUrl: "https://example.com",
    });
    expect(result).toContain("Phone");
    expect(result).toContain("TV");
    expect(result).toContain('data-note="note"');
  });

  it("handles empty meta gracefully", () => {
    const result = buildWebDocument({
      meta: null,
      rawHtml: "<p>普通纯文本网页</p>",
      sourceUrl: "https://example.com",
    });

    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("普通纯文本网页");
    expect(result).toContain("在线文档网页原貌");
  });

  it("builds catalog crumbs and a chevron separator", () => {
    const result = buildWebDocument({
      meta: {
        docRef: {
          sourceId: "huawei-harmonyos",
          catalog: "harmonyos-guides",
          slug: "introduction-to-arkts",
          url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
        },
        title: "ArkTS语言介绍",
        updateTime: "2026-08-29 17:41",
        sourceUrl: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
        channel: "adapter",
        deviceTypes: [],
      },
      rawHtml: "<p>正文</p>",
      sourceUrl: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
      catalogNodes: [
        {
          id: "intro",
          name: "基础入门",
          slug: null,
          children: [
            {
              id: "learn",
              name: "学习ArkTS语言",
              slug: "arkts-overview",
              children: [
                {
                  id: "arkts",
                  name: "ArkTS语言介绍",
                  slug: "introduction-to-arkts",
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(result).toContain("基础入门");
    expect(result).toContain("学习ArkTS语言");
    expect(result).toContain("ArkTS语言介绍");
    expect(result).toContain('viewBox="0 0 5.726 11.817"');
  });

  it("does not bake workbench appearance into the article html", () => {
    const html = buildWebDocument({
      meta: null,
      rawHtml: "<p>正文</p>",
      sourceUrl: "https://example.com",
    });
    expect(html).toMatch(/<html lang="zh-CN">/);
    expect(html).not.toMatch(/<html[^>]*data-theme=/);
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
  });
});

describe("paintWebAppearance", () => {
  it("paints data-theme onto an already-built document without rewriting html", () => {
    const html = buildWebDocument({
      meta: null,
      rawHtml: "<p>正文</p>",
      sourceUrl: "https://example.com",
    });
    const doc = new DOMParser().parseFromString(html, "text/html");
    paintWebAppearance(doc, "dark");
    expect(doc.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(doc.documentElement.style.colorScheme).toBe("dark");
    expect(doc.querySelector("meta[name='color-scheme']")?.getAttribute("content")).toBe("dark");
    paintWebAppearance(doc, "light");
    expect(doc.documentElement.getAttribute("data-theme")).toBe("light");
    expect(doc.querySelector("#doc-body-content")?.textContent).toContain("正文");
  });
});

describe("assignWebSrcdoc", () => {
  it("writes the srcdoc property and skips identical html", () => {
    const frame = document.createElement("iframe");
    expect(assignWebSrcdoc(frame, "<p>a</p>")).toBe(true);
    expect(frame.srcdoc).toBe("<p>a</p>");
    expect(assignWebSrcdoc(frame, "<p>a</p>")).toBe(false);
    expect(assignWebSrcdoc(frame, "<p>b</p>")).toBe(true);
    expect(frame.srcdoc).toBe("<p>b</p>");
  });
});
