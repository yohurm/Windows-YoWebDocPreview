import { describe, expect, it } from "vitest";

import { buildWebDocument } from "./webRenderer";
import type { DocMeta } from "@yohu/api";

describe("buildWebDocument", () => {
  it("generates complete HTML document with topbar and content", () => {
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

    const rawHtml = "<h2>资源目录分类</h2><p>支持 rawfile 与 resources 目录资源访问。</p>";

    const result = buildWebDocument({
      meta,
      rawHtml,
      sourceUrl: meta.sourceUrl,
    });

    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("资源分类与访问指南");
    expect(result).toContain("HarmonyOS NEXT 开发指南");
    expect(result).toContain("phone");
    expect(result).toContain("tablet");
    expect(result).toContain("资源目录分类");
    expect(result).toContain("id=\"doc-sidebar-toc\"");
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
});
