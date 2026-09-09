import { describe, expect, it } from "vitest";

import { windowFill, WINDOW_FILL_DARK, WINDOW_FILL_LIGHT, windowThemePin } from "./window";

describe("window chrome", () => {
  it("fills match protocol Theme::FILL_* / --yo-bg-app", () => {
    expect(windowFill("light")).toEqual(WINDOW_FILL_LIGHT);
    expect(windowFill("dark")).toEqual(WINDOW_FILL_DARK);
    expect(WINDOW_FILL_LIGHT).toEqual({ red: 0xf8, green: 0xfa, blue: 0xfc, alpha: 255 });
    expect(WINDOW_FILL_DARK).toEqual({ red: 0x09, green: 0x0d, blue: 0x16, alpha: 255 });
  });

  it("does not pin WebView theme when following the system", () => {
    expect(windowThemePin("system")).toBeNull();
    expect(windowThemePin("light")).toBe("light");
    expect(windowThemePin("dark")).toBe("dark");
  });
});
