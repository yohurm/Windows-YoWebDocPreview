import { describe, expect, it } from "vitest";

import {
  GITHUB_SOURCE_ID,
  applyKnownRef,
  classifyGithubBlob,
  githubCatalogIdFromUrl,
  githubTreeUrl,
  isGithubSource,
  parseGithub,
  resolveGithubCatalogUrl,
  resolveRepoPath,
} from "./githubSource";

describe("githubSource", () => {
  it("reads identity from the catalog table", () => {
    expect(GITHUB_SOURCE_ID).toBe("github-repo");
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
  });
});
