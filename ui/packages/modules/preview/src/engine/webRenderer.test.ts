import { describe, expect, it } from "vitest";

import { extractDeviceTypes, normalizeArticleHtml } from "./normalizeArticleHtml";
import { buildWebDocument } from "./webRenderer";
import type { DocMeta } from "@yohu/api";

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
    expect(
      extractDeviceTypes(
        `<h1 device-type="phone,2in1,tablet">@arkts.lang</h1>`
      )
    ).toEqual(["Phone", "PC/2in1", "Tablet"]);
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
    expect(result).toContain("viewBox=\"0 0 5.726 11.817\"");
  });
});
