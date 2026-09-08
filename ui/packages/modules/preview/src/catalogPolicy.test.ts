import { describe, expect, it } from "vitest";

import {
  catalogDisplayName,
  collectExpandableIds,
  findAncestorIds,
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
});
