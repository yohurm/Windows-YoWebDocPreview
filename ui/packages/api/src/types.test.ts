/** 契约测试：EVENT_NAMES 与 wire JSON 形态逐字对齐 Rust 侧（yohu-protocol 单测镜像）。 */

import { describe, expect, it } from "vitest";

import { EVENT_NAMES } from "./events";
import { DISPLAY_NAME, PRODUCT_NAME } from "./identity";
import type { AppSettings, DocMeta } from "./types";

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

  it("AppSettings JSON uses camelCase keys", () => {
    const raw = `{
      "libraryRoot": "C:/lib", "concurrency": 4,
      "requestTimeoutSec": 15, "imageDownload": true, "theme": "system"
    }`;
    const s = JSON.parse(raw) as AppSettings;
    expect(s.requestTimeoutSec).toBe(15);
    expect(s.theme).toBe("system");
  });
});
