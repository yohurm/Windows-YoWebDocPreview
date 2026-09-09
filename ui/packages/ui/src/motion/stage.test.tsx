import { describe, expect, it } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import { YoStage } from "./stage";

describe("YoStage", () => {
  it("keys 变化后面内容跟着换（测试环境跳过出场等待）", () => {
    const [key, setKey] = createSignal("home");
    render(() => (
      <YoStage keys={key()}>
        <div>{key() === "home" ? "首页" : "正文"}</div>
      </YoStage>
    ));
    expect(screen.getByText("首页")).toBeTruthy();
    setKey("doc");
    expect(screen.getByText("正文")).toBeTruthy();
    expect(screen.queryByText("首页")).toBeNull();
  });

  it("默认配方 fade，可改 fade-local", () => {
    const { container, unmount } = render(() => (
      <YoStage keys="a" recipe="fade-local">
        <span>块</span>
      </YoStage>
    ));
    expect(container.querySelector(".yohu-presence")?.getAttribute("data-recipe")).toBe("fade-local");
    unmount();
  });
});
