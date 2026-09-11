/** 契约测试：EVENT_NAMES 与 wire JSON 形态逐字对齐 Rust 侧（yohu-protocol 单测镜像）。 */

import { describe, expect, it } from "vitest";

import { EVENT_NAMES } from "./events";
import { DISPLAY_NAME, PRODUCT_NAME } from "./identity";
import type { AgentDocument, AppSettings, DocMeta, SyncReport } from "./types";

describe("EVENT_NAMES", () => {
  it("uses slash layering, never dots", () => {
    for (const name of Object.values(EVENT_NAMES)) {
      expect(name).not.toContain(".");
      expect(name).toMatch(/^\w+\/\w+$/);
    }
  });
});

describe("identity contract", () => {
  it("mirrors protocol display name", () => {
    expect(DISPLAY_NAME).toBe("YoDocPreview");
    expect(PRODUCT_NAME).toBe("YoDocPreview");
  });
});

describe("wire contract", () => {
  it("DocMeta JSON parses to mirror type", () => {
    const raw = `{
      "docRef": {
        "sourceId": "huawei-harmonyos",
        "catalog": "harmonyos-guides",
        "slug": "x",
        "url": "https://developer.huawei.com/x"
      },
      "title": "标题",
      "updateTime": "2026-05-26 06:48:54",
      "sourceUrl": "https://developer.huawei.com/x",
      "channel": "genericWeb",
      "deviceTypes": ["Phone"]
    }`;
    const m = JSON.parse(raw) as DocMeta;
    expect(m.docRef.slug).toBe("x");
    expect(m.channel).toBe("genericWeb");
  });

  it("AgentDocument JSON uses camelCase keys", () => {
    const raw = `{
      "meta": {
        "docRef": { "sourceId": "generic-web", "catalog": null, "slug": "a", "url": "https://example.com/a" },
        "title": "A",
        "updateTime": null,
        "sourceUrl": "https://example.com/a",
        "channel": "genericWeb",
        "deviceTypes": []
      },
      "markdown": "## Hi\\n",
      "outline": [{ "id": "toc-heading-0", "text": "Hi", "level": 2, "children": [] }],
      "sections": [{
        "id": "toc-heading-0",
        "heading": "Hi",
        "level": 2,
        "markdown": "## Hi\\n",
        "startOffset": 0,
        "endOffset": 6
      }]
    }`;
    const d = JSON.parse(raw) as AgentDocument;
    expect(d.sections[0]?.startOffset).toBe(0);
    expect(d.outline[0]?.text).toBe("Hi");
  });

  it("AppSettings JSON uses camelCase keys", () => {
    const raw = `{
      "libraryRoot": "C:/lib", "concurrency": 4,
      "requestTimeoutSec": 15, "imageDownload": true, "theme": "system"
    }`;
    const s = JSON.parse(raw) as AppSettings;
    expect(s.requestTimeoutSec).toBe(15);
    expect(s.theme).toBe("system");
  });

  it("SyncReport JSON uses camelCase keys", () => {
    const raw = `{
      "planned": 2, "updated": 1, "created": 1, "markedOffline": 0, "failed": 0,
      "items": [{
        "file": "开发/指南/x.md", "url": "https://developer.huawei.com/x",
        "slug": "x", "catalog": "harmonyos-guides", "status": "UPDATE",
        "localTime": "2026-01-01 00:00:00", "officialTime": "2026-02-01 00:00:00",
        "title": "X", "treeParts": []
      }]
    }`;
    const r = JSON.parse(raw) as SyncReport;
    expect(r.markedOffline).toBe(0);
    expect(r.items[0]?.treeParts).toEqual([]);
  });
});
