import { describe, expect, it, vi } from "vitest";

import { bindContentLinks, resolveContentHref } from "./contentHref";

const base = "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts";

describe("resolveContentHref", () => {
  it("opens a sibling Huawei doc as an absolute url", () => {
    expect(resolveContentHref("arkts-overview", base)).toEqual({
      kind: "open",
      url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-overview",
    });
  });

  it("opens a site-root doc path against the current page", () => {
    expect(resolveContentHref("/consumer/cn/doc/harmonyos-guides/arkts-overview", base)).toEqual({
      kind: "open",
      url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-overview",
    });
  });

  it("opens an absolute document url and drops its hash", () => {
    expect(
      resolveContentHref("https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-overview#sec", base)
    ).toEqual({
      kind: "open",
      url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-overview",
    });
  });

  it("scrolls a same-document hash", () => {
    expect(resolveContentHref("#声明", base)).toEqual({ kind: "scroll", id: "声明" });
    expect(resolveContentHref(`${base}#sec-2`, base)).toEqual({ kind: "scroll", id: "sec-2" });
  });

  it("ignores non-document schemes", () => {
    expect(resolveContentHref("javascript:alert(1)", base)).toEqual({ kind: "ignore" });
    expect(resolveContentHref("mailto:a@b.c", base)).toEqual({ kind: "ignore" });
    expect(resolveContentHref("", base)).toEqual({ kind: "ignore" });
  });
});

describe("bindContentLinks", () => {
  it("prevents default navigation and forwards the raw href", () => {
    const root = document.createElement("div");
    root.innerHTML = `<p><a href="/consumer/cn/doc/harmonyos-guides/arkts-overview">下一篇</a></p>`;
    const onHref = vi.fn();
    const stop = bindContentLinks(root, { baseUrl: () => base, onHref });
    root.querySelector("a")?.click();
    expect(onHref).toHaveBeenCalledWith("/consumer/cn/doc/harmonyos-guides/arkts-overview");
    stop();
  });
});
