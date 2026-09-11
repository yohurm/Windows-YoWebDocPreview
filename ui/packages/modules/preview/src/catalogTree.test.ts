import { describe, expect, it } from "vitest";

import type { CatalogNode } from "@yohu/api";

import {
  collectExpandableIds,
  filePathAncestorIds,
  filterCatalogTree,
  findAncestorIds,
  isCatalogBranch,
  replaceCatalogChildren,
  resolveCatalogDocUrl,
} from "./catalogTree";

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

  it("resolves github repo file slugs onto blob urls", () => {
    expect(
      resolveCatalogDocUrl("docs/b.md", "https://github.com/o/r/blob/main/docs/a.md")
    ).toBe("https://github.com/o/r/blob/main/docs/b.md");
    const sha = "0123456789abcdef0123456789abcdef01234567";
    expect(
      resolveCatalogDocUrl("docs/guide.md", "https://github.com/diegosouzapw/OmniRoute", sha)
    ).toBe(`https://github.com/diegosouzapw/OmniRoute/blob/${sha}/docs/guide.md`);
  });

  it("passes through absolute urls", () => {
    expect(resolveCatalogDocUrl("https://example.com/a", "https://other.com/b")).toBe(
      "https://example.com/a"
    );
  });

  it("treats empty github folders as expandable branches", () => {
    const folder = { id: "src", name: "src", isLeaf: false, children: [] };
    expect(isCatalogBranch(folder)).toBe(true);
    expect(collectExpandableIds([folder], 1)).toEqual(["src"]);
    expect(filePathAncestorIds("src/engine/mod.rs")).toEqual(["src", "src/engine"]);
    expect(replaceCatalogChildren([folder], "src", [{ id: "src/lib.rs", name: "lib.rs", slug: "src/lib.rs", isLeaf: true, children: [] }])[0]?.children[0]?.name).toBe("lib.rs");
  });

  it("keeps matching ancestors when filtering catalog titles", () => {
    expect(filterCatalogTree(tree, "子").map((n) => n.id)).toEqual(["root"]);
    expect(filterCatalogTree(tree, "子")[0]?.children.map((n) => n.name)).toEqual(["子"]);
    expect(filterCatalogTree(tree, "不存在")).toEqual([]);
  });
});
