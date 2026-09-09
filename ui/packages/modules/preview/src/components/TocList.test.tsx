import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import { TocList } from "./TocList";

describe("TocList", () => {
  const items = [
    { id: "h-basic", text: "基本知识", level: 1 },
    { id: "h-decl", text: "声明", level: 2 },
  ];

  it("marks the active heading and opens it on click", async () => {
    const onOpen = vi.fn();
    const { container, unmount } = render(() => (
      <TocList items={items} activeId="h-decl" onOpen={onOpen} />
    ));

    expect(screen.getByText("基本知识")).toBeTruthy();
    expect(container.querySelector(".yo-toc__item.is-on")?.textContent).toBe("声明");
    await fireEvent.click(screen.getByText("声明"));
    expect(onOpen).toHaveBeenCalledWith("h-decl");
    unmount();
  });
});
