import { describe, expect, it } from "vitest";

import {
  catalogDisplayName,
  catalogIdFromUrl,
  collectExpandableIds,
  documentCrumbs,
  documentPath,
  findAncestorIds,
  HUAWEI_CHANNELS,
  resolveCatalogDocUrl,
} from "./catalogPolicy";
import type { CatalogNode } from "@yohu/api";

const tree: CatalogNode[] = [
  {
    id: "root",
    name: "根",
    slug: null,
    children: [
      { id: "child", name: "子", slug: "child-slug", children: [] },
    ],
  },
];

describe("catalogPolicy", () => {
  it("finds ancestor ids for a slug", () => {
    expect(findAncestorIds(tree, "child-slug")).toEqual(["root"]);
  });

  it("collects expandable ids up to max level", () => {
    expect(collectExpandableIds(tree, 1)).toEqual(["root"]);
    expect(collectExpandableIds(tree, 0)).toEqual([]);
  });

  it("resolves sibling urls from the current document url", () => {
    expect(
      resolveCatalogDocUrl(
        "arkts-overview",
        "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts"
      )
    ).toBe("https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-overview");
  });

  it("passes through absolute urls", () => {
    expect(resolveCatalogDocUrl("https://example.com/a", "https://other.com/b")).toBe(
      "https://example.com/a"
    );
  });

  it("maps known catalog ids to a single display name", () => {
    expect(catalogDisplayName("harmonyos-guides-V5")).toBe("HarmonyOS NEXT 开发指南");
    expect(catalogDisplayName("design-guides")).toBe("设计指南");
    expect(catalogDisplayName("unknown-catalog")).toBe("unknown-catalog");
  });

  it("builds document path from meta as the single catalog/title source", () => {
    expect(
      documentPath({
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
    ).toEqual({
      catalogLabel: "HarmonyOS 开发指南",
      title: "ArkTS语言介绍",
    });
    expect(documentPath(null, "在线文档网页原貌")).toEqual({
      catalogLabel: "",
      title: "在线文档网页原貌",
    });
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

  it("reads catalog id from a Huawei doc url", () => {
    expect(
      catalogIdFromUrl(
        "https://developer.huawei.com/consumer/cn/doc/harmonyos-references/development-intro-api"
      )
    ).toBe("harmonyos-references");
    expect(catalogIdFromUrl("https://example.com/x")).toBeNull();
  });

  it("keeps channel landing urls inside their catalog family", () => {
    for (const ch of HUAWEI_CHANNELS) {
      const id = catalogIdFromUrl(ch.url);
      expect(id).not.toBeNull();
      expect(ch.catalogs).toContain(id);
    }
  });
});
