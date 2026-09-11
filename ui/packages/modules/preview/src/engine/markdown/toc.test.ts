import { describe, expect, it } from "vitest";

import outlineTable from "../../../../../../../testdata/ai-outline.json";

import { extractMarkdownToc } from "./toc";

describe("extractMarkdownToc", () => {
  it("matches testdata/ai-outline.json", () => {
    for (const row of outlineTable.cases) {
      const toc = extractMarkdownToc(row.markdown);
      expect(toc.map((item) => ({ id: item.id, text: item.text, level: item.level }))).toEqual(
        row.headings,
      );
    }
  });
});
