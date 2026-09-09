import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildWebDocument } from "../packages/modules/preview/src/engine/webRenderer.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../..");
const raw = readFileSync(join(repo, "testdata/golden/introduction-to-arkts/input.html"), "utf8");
const html = buildWebDocument({
  meta: {
    docRef: {
      sourceId: "huawei-harmonyos",
      catalog: "harmonyos-guides",
      slug: "introduction-to-arkts",
      url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
    },
    title: "ArkTS语言介绍",
    updateTime: "2026-08-29 17:41",
    sourceUrl: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
    channel: "adapter",
    deviceTypes: [],
  },
  rawHtml: raw,
  sourceUrl: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
  catalogNodes: [
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
  ],
});
const outDir = join(repo, "testdata/chrome-compare");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "ours-introduction-to-arkts.html");
writeFileSync(out, html, "utf8");
console.log(out);
