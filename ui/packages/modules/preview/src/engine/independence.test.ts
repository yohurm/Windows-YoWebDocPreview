import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...walk(path));
      continue;
    }
    if (/\.(ts|css)$/.test(name) && !name.endsWith(".test.ts")) out.push(path);
  }
  return out;
}

describe("parser isolation", () => {
  it("html kernel never imports huawei, github, or markdown", () => {
    for (const file of walk(join(here, "html"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/engine\/huawei/);
      expect(text, file).not.toMatch(/from ["']\.\.\/huawei/);
      expect(text, file).not.toMatch(/engine\/github/);
      expect(text, file).not.toMatch(/from ["']\.\.\/github/);
      expect(text, file).not.toMatch(/engine\/markdown/);
      expect(text, file).not.toMatch(/from ["']\.\.\/markdown/);
    }
  });

  it("huawei dialect never imports markdown, github, or catalog identity", () => {
    for (const file of walk(join(here, "huawei"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/engine\/markdown/);
      expect(text, file).not.toMatch(/from ["']\.\.\/markdown/);
      expect(text, file).not.toMatch(/engine\/github/);
      expect(text, file).not.toMatch(/from ["']\.\.\/github/);
      expect(text, file).not.toMatch(/from ["']\.\.\/\.\.\/huaweiCatalog/);
    }
  });

  it("markdown parser never imports html, huawei, or github", () => {
    for (const file of walk(join(here, "markdown"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/engine\/html/);
      expect(text, file).not.toMatch(/from ["']\.\.\/html/);
      expect(text, file).not.toMatch(/engine\/huawei/);
      expect(text, file).not.toMatch(/from ["']\.\.\/huawei/);
      expect(text, file).not.toMatch(/engine\/github/);
      expect(text, file).not.toMatch(/from ["']\.\.\/github/);
      expect(text, file).not.toMatch(/engine\/web/);
    }
  });

  it("github dialect never imports huawei", () => {
    for (const file of walk(join(here, "github"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/engine\/huawei/);
      expect(text, file).not.toMatch(/from ["']\.\.\/huawei/);
    }
  });
});
