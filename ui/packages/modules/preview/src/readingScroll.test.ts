import { describe, expect, it } from "vitest";

import { headingIdAtOffset, scrollTopToReveal } from "./readingScroll";

describe("headingIdAtOffset", () => {
  it("picks the last heading that has crossed the reading line", () => {
    const headings = [
      { id: "a", top: 0 },
      { id: "b", top: 120 },
      { id: "c", top: 400 },
    ];
    expect(headingIdAtOffset(headings, 0)).toBe("a");
    expect(headingIdAtOffset(headings, 130)).toBe("b");
    expect(headingIdAtOffset(headings, 500)).toBe("c");
  });

  it("returns null when there are no headings", () => {
    expect(headingIdAtOffset([], 40)).toBeNull();
  });

  it("keeps an earlier heading when the last one cannot reach the top", () => {
    const headings = [
      { id: "a", top: 0 },
      { id: "b", top: 800 },
    ];
    expect(headingIdAtOffset(headings, 600)).toBe("a");
  });
});

describe("scrollTopToReveal", () => {
  const view = { scrollTop: 40, clientHeight: 200 };

  it("does not move when the item is fully visible", () => {
    expect(scrollTopToReveal(view, { top: 80, height: 24 })).toBeNull();
  });

  it("scrolls up when the item is above the viewport", () => {
    expect(scrollTopToReveal(view, { top: 10, height: 24 })).toBe(10);
  });

  it("scrolls down when the item is below the viewport", () => {
    expect(scrollTopToReveal(view, { top: 230, height: 24 })).toBe(54);
  });
});
