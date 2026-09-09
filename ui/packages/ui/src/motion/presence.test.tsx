import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { YoPresence } from "./presence";

describe("YoPresence", () => {
  it("when=true 渲染子节点并带 data-state=open", () => {
    render(() => (
      <YoPresence when recipe="dialog">
        <div role="dialog">面板</div>
      </YoPresence>
    ));
    expect(screen.getByRole("dialog")).toBeTruthy();
    const host = document.querySelector(".yohu-presence");
    expect(host?.getAttribute("data-state")).toBe("open");
    expect(host?.getAttribute("data-recipe")).toBe("dialog");
  });

  it("when=false 在测试环境立刻卸载（skip motion）", () => {
    const [open, setOpen] = createSignal(true);
    const onExitComplete = vi.fn();
    render(() => (
      <YoPresence when={open()} recipe="fade" onExitComplete={onExitComplete}>
        <div>内容</div>
      </YoPresence>
    ));
    expect(screen.getByText("内容")).toBeTruthy();
    setOpen(false);
    expect(screen.queryByText("内容")).toBeNull();
    expect(onExitComplete).toHaveBeenCalledTimes(1);
  });

  it("recipe=chip 挂在宿主上，出场立刻卸载", () => {
    const [open, setOpen] = createSignal(true);
    render(() => (
      <YoPresence when={open()} recipe="chip">
        <div>芯片</div>
      </YoPresence>
    ));
    const host = document.querySelector(".yohu-presence");
    expect(host?.getAttribute("data-recipe")).toBe("chip");
    expect(host?.getAttribute("data-state")).toBe("open");
    expect(host?.querySelector(".yohu-presence__clip")).toBeNull();
    expect(host?.textContent).toBe("芯片");
    setOpen(false);
    expect(document.querySelector(".yohu-presence")).toBeNull();
  });
});
