import { describe, expect, it } from "vitest";

import {
  GITHUB_PREVIEW_MAX_BYTES,
  GITHUB_SOURCE_ID,
  githubTooLargeNote,
  applyKnownRef,
  classifyGithubBlob,
  githubCatalogIdFromUrl,
  githubRepoFromMeta,
  githubTreeUrl,
  githubTreeUrlFromMeta,
  isGithubSource,
  parseGithubCatalog,
  parseGithub,
  resolveGithubCatalogUrl,
  resolveRepoPath,
} from "./githubSource";

describe("githubSource", () => {
  it("reads identity from the catalog table", () => {
    expect(GITHUB_SOURCE_ID).toBe("github-repo");
    expect(GITHUB_PREVIEW_MAX_BYTES).toBe(1048576);
    expect(githubTooLargeNote()).toBe("文件超过 1MB，不在应用内预览。");
    expect(isGithubSource(GITHUB_SOURCE_ID)).toBe(true);
    expect(isGithubSource("huawei-harmonyos")).toBe(false);
  });

  it("parses repo root, blob, and raw urls", () => {
    expect(parseGithub("https://github.com/yohurm/Windows-YoWebDocPreview")).toEqual({
      owner: "yohurm",
      repo: "Windows-YoWebDocPreview",
      gitRef: null,
      path: "",
    });
    expect(parseGithub("https://www.github.com/yohurm/Windows-YoWebDocPreview")?.path).toBe("");
    expect(parseGithub("https://github.com/o/r/tree/main/docs")).toEqual({
      owner: "o",
      repo: "r",
      gitRef: "main",
      path: "docs",
    });
    expect(
      parseGithub(
        "https://github.com/yohurm/Windows-YoWebDocPreview/blob/main/docs/architecture/adr/README.md#w15"
      )?.path
    ).toBe("docs/architecture/adr/README.md");
    expect(
      parseGithub("https://raw.githubusercontent.com/yohurm/Windows-YoWebDocPreview/main/README.md")
        ?.gitRef
    ).toBe("main");
    expect(parseGithub("https://github.com/yohurm/repo/issues/1")).toBeNull();
  });

  it("builds sibling blob urls from a catalog slug", () => {
    expect(githubCatalogIdFromUrl("https://github.com/o/r/blob/main/docs/a.md")).toBe("o/r");
    expect(
      resolveGithubCatalogUrl("docs/b.md", "https://github.com/o/r/blob/main/docs/a.md")
    ).toBe("https://github.com/o/r/blob/main/docs/b.md");
    const sha = "0123456789abcdef0123456789abcdef01234567";
    expect(
      resolveGithubCatalogUrl("docs/b.md", "https://github.com/diegosouzapw/OmniRoute", sha)
    ).toBe(`https://github.com/diegosouzapw/OmniRoute/blob/${sha}/docs/b.md`);
  });

  it("repairs slashed default branch after first-segment parse", () => {
    const parsed = parseGithub(
      "https://github.com/diegosouzapw/OmniRoute/blob/release/v3.8.51/README.md"
    );
    expect(parsed).toEqual({
      owner: "diegosouzapw",
      repo: "OmniRoute",
      gitRef: "release",
      path: "v3.8.51/README.md",
    });
    expect(applyKnownRef(parsed!, "release/v3.8.51")).toEqual({
      owner: "diegosouzapw",
      repo: "OmniRoute",
      gitRef: "release/v3.8.51",
      path: "README.md",
    });
  });

  it("classifies blobs and resolves repo-relative paths", () => {
    expect(classifyGithubBlob("README.md")).toBe("markdown");
    expect(classifyGithubBlob("src/lib.rs")).toBe("code");
    expect(classifyGithubBlob("docs/shot.png")).toBe("image");
    expect(resolveRepoPath("README.md", "./docs/screenshots/x.png")).toBe("docs/screenshots/x.png");
    const commit = "0123456789abcdef0123456789abcdef01234567";
    expect(githubTreeUrl("o", "r", commit, "src")).toBe(
      `https://github.com/o/r/tree/${commit}/src`
    );
    expect(githubRepoFromMeta({
      docRef: {
        sourceId: GITHUB_SOURCE_ID,
        catalog: "o/r",
        slug: "src/lib.rs",
        url: `https://github.com/o/r/blob/${commit}/src/lib.rs`,
        gitRef: commit,
      },
      title: "lib.rs",
      updateTime: null,
      sourceUrl: `https://github.com/o/r/blob/${commit}/src/lib.rs`,
      channel: "adapter",
      deviceTypes: [],
      blobKind: "code",
    })).toEqual({ owner: "o", repo: "r", gitRef: commit, path: "src/lib.rs" });
    expect(parseGithubCatalog("o/r")).toEqual({ owner: "o", repo: "r" });
    expect(parseGithubCatalog("o/r/extra")).toBeNull();
    expect(
      githubTreeUrlFromMeta("src", {
        docRef: {
          sourceId: GITHUB_SOURCE_ID,
          catalog: "o/r",
          slug: "src/lib.rs",
          url: `https://github.com/o/r/blob/${commit}/src/lib.rs`,
          gitRef: commit,
        },
        title: "lib.rs",
        updateTime: null,
        sourceUrl: `https://github.com/o/r/blob/${commit}/src/lib.rs`,
        channel: "adapter",
        deviceTypes: [],
        blobKind: "code",
      })
    ).toBe(`https://github.com/o/r/tree/${commit}/src`);
  });
});
