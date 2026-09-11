import { describe, expect, it } from "vitest";

import {
  catalogDisplayName,
  catalogIdFromUrl,
  HUAWEI_BRAND,
  HUAWEI_CHANNELS,
  HUAWEI_DOC_PREFIX,
  HUAWEI_SOURCE_ID,
  isHuaweiSource,
} from "./huaweiCatalog";

describe("huaweiCatalog", () => {
  it("maps known catalog ids to a single display name", () => {
    expect(catalogDisplayName("harmonyos-guides-V5")).toBe("HarmonyOS NEXT 开发指南");
    expect(catalogDisplayName("design-guides")).toBe("设计指南");
    expect(catalogDisplayName("unknown-catalog")).toBe("unknown-catalog");
  });

  it("reads catalog id from a Huawei doc url using the catalog-id allowlist", () => {
    expect(
      catalogIdFromUrl(
        "https://developer.huawei.com/consumer/cn/doc/harmonyos-references/development-intro-api"
      )
    ).toBe("harmonyos-references");
    expect(catalogIdFromUrl("https://example.com/x")).toBeNull();
    expect(catalogIdFromUrl(`${HUAWEI_DOC_PREFIX}unknown-cat/foo`)).toBeNull();
  });

  it("reads source identity from the same catalog table", () => {
    expect(HUAWEI_SOURCE_ID).toBe("huawei-harmonyos");
    expect(HUAWEI_BRAND).toBe("HarmonyOS");
    expect(isHuaweiSource(HUAWEI_SOURCE_ID)).toBe(true);
    expect(isHuaweiSource("generic-web")).toBe(false);
  });

  it("keeps channel landing urls inside their catalog family", () => {
    for (const ch of HUAWEI_CHANNELS) {
      const id = catalogIdFromUrl(ch.url);
      expect(id).not.toBeNull();
      expect(ch.catalogs).toContain(id);
    }
  });
});
