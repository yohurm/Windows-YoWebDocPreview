import { describe, expect, it } from "vitest";

import { documentCrumbs, documentTitle } from "./documentCrumbs";

describe("documentCrumbs", () => {
  it("uses the document title as the last crumb", () => {
    expect(
      documentTitle({
        docRef: {
          sourceId: "huawei-harmonyos",
          catalog: "harmonyos-guides",
          slug: "introduction-to-arkts",
          url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
        },
        title: "ArkTS语言介绍",
        updateTime: null,
        sourceUrl:
          "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
        channel: "adapter",
        deviceTypes: [],
      })
    ).toBe("ArkTS语言介绍");
    expect(documentTitle(null, "在线文档网页原貌")).toBe("在线文档网页原貌");
  });

  it("uses the channel short name when there is no catalog tree", () => {
    expect(
      documentCrumbs({
        docRef: {
          sourceId: "huawei-harmonyos",
          catalog: "harmonyos-guides",
          slug: "introduction-to-arkts",
          url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
        },
        title: "ArkTS语言介绍",
        updateTime: null,
        sourceUrl:
          "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
        channel: "adapter",
        deviceTypes: [],
      })
    ).toEqual(["指南", "ArkTS语言介绍"]);
  });

  it("falls back to the catalog display name when the catalog has no channel", () => {
    expect(
      documentCrumbs({
        docRef: {
          sourceId: "huawei-harmonyos",
          catalog: "design-guides",
          slug: "harmonyos-design",
          url: "https://developer.huawei.com/consumer/cn/doc/design-guides/harmonyos-design",
        },
        title: "设计概述",
        updateTime: null,
        sourceUrl: "https://developer.huawei.com/consumer/cn/doc/design-guides/harmonyos-design",
        channel: "adapter",
        deviceTypes: [],
      })
    ).toEqual(["设计指南", "设计概述"]);
  });

  it("builds official-style crumbs from channel + catalog ancestors", () => {
    expect(
      documentCrumbs(
        {
          docRef: {
            sourceId: "huawei-harmonyos",
            catalog: "harmonyos-guides",
            slug: "introduction-to-arkts",
            url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
          },
          title: "ArkTS语言介绍",
          updateTime: null,
          sourceUrl:
            "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
          channel: "adapter",
          deviceTypes: [],
        },
        [
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
        ]
      )
    ).toEqual(["指南", "基础入门", "学习ArkTS语言", "ArkTS语言介绍"]);
  });
});
