import { describe, expect, it } from "vitest";

import type { CatalogNode } from "@yohu/api";

import { collectExpandableIds, filterCatalogTree, findAncestorIds, resolveCatalogDocUrl } from "./catalogTree";

const tree: CatalogNode[] = [
  {
    id: "root",
    name: "根",
    slug: null,
    children: [{ id: "child", name: "子", slug: "child-slug", children: [] }],
  },
];

describe("catalogTree", () => {
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

  it("keeps matching ancestors when filtering catalog titles", () => {
    expect(filterCatalogTree(tree, "子").map((n) => n.id)).toEqual(["root"]);
    expect(filterCatalogTree(tree, "子")[0]?.children.map((n) => n.name)).toEqual(["子"]);
    expect(filterCatalogTree(tree, "不存在")).toEqual([]);
  });
});
