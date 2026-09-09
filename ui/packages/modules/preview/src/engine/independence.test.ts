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
  it("web parser never imports the markdown parser", () => {
    for (const file of walk(join(here, "web"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/engine\/markdown/);
      expect(text, file).not.toMatch(/from ["']\.\.\/markdown/);
    }
  });

  it("markdown parser never imports the web parser", () => {
    for (const file of walk(join(here, "markdown"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/engine\/web/);
      expect(text, file).not.toMatch(/from ["']\.\.\/web/);
    }
  });
});
