import { describe, expect, it, vi } from "vitest";

import type { CatalogNode, DocMeta } from "@yohu/api";

import { githubEmptyDirUrl, hydrateGithubTree } from "./githubCatalog";
import { GITHUB_SOURCE_ID } from "./githubSource";

const sha = "0123456789abcdef0123456789abcdef01234567";

function meta(): DocMeta {
  return {
    docRef: {
      sourceId: GITHUB_SOURCE_ID,
      catalog: "o/r",
      slug: "src/lib.rs",
      url: `https://github.com/o/r/blob/${sha}/src/lib.rs`,
      gitRef: sha,
    },
    title: "lib.rs",
    updateTime: null,
    sourceUrl: `https://github.com/o/r/blob/${sha}/src/lib.rs`,
    channel: "adapter",
    deviceTypes: [],
    blobKind: "code",
  };
}

function dir(id: string, children: CatalogNode[] = []): CatalogNode {
  return { id, name: id, slug: id, isLeaf: false, children };
}

describe("githubCatalog", () => {
  it("hydrates empty ancestor directories along the file path", async () => {
    const listDir = vi.fn(async () => [{ id: "src/lib.rs", name: "lib.rs", slug: "src/lib.rs", isLeaf: true, children: [] }]);
    const tree = await hydrateGithubTree([dir("src")], "src/lib.rs", meta(), listDir, () => true);
    expect(listDir).toHaveBeenCalledWith(`https://github.com/o/r/tree/${sha}/src`);
    expect(tree[0]?.children).toHaveLength(1);
  });

  it("skips directories that already have children", async () => {
    const listDir = vi.fn(async () => []);
    const filled = [dir("src", [{ id: "src/lib.rs", name: "lib.rs", slug: "src/lib.rs", isLeaf: true, children: [] }])];
    const tree = await hydrateGithubTree(filled, "src/lib.rs", meta(), listDir, () => true);
    expect(listDir).not.toHaveBeenCalled();
    expect(tree).toBe(filled);
  });

  it("returns a tree URL only for an empty directory", () => {
    expect(githubEmptyDirUrl(dir("src"), meta())).toBe(`https://github.com/o/r/tree/${sha}/src`);
    expect(githubEmptyDirUrl(dir("src", [{ id: "a", name: "a", children: [] }]), meta())).toBeNull();
    expect(githubEmptyDirUrl({ id: "README.md", name: "README.md", isLeaf: true, children: [] }, meta())).toBeNull();
  });
});
