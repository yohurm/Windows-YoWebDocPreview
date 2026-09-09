import { createSignal } from "solid-js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import type { ThemePreference } from "./theme";
import { YoThemeCards, YoThemeChromeButton } from "./themeControls";

describe("YoThemeChromeButton", () => {
  it("shows a single moon control in light mode and toggles to dark", () => {
    const onSelect = vi.fn();
    const { unmount } = render(() => (
      <YoThemeChromeButton appearance="light" onSelect={onSelect} />
    ));

    expect(screen.getByTitle("切换深色模式")).toBeTruthy();
    expect(screen.queryByTitle("切换浅色模式")).toBeNull();
    fireEvent.click(screen.getByTitle("切换深色模式"));
    expect(onSelect).toHaveBeenCalledWith("dark");
    unmount();
  });

  it("shows a single sun control in dark mode and toggles to light", () => {
    const onSelect = vi.fn();
    const { unmount } = render(() => (
      <YoThemeChromeButton appearance="dark" onSelect={onSelect} />
    ));

    expect(screen.getByTitle("切换浅色模式")).toBeTruthy();
    expect(screen.queryByTitle("切换深色模式")).toBeNull();
    fireEvent.click(screen.getByTitle("切换浅色模式"));
    expect(onSelect).toHaveBeenCalledWith("light");
    unmount();
  });
});

describe("YoThemeCards", () => {
  it("renders three appearance choices and selects dark", () => {
    const [preference, setPreference] = createSignal<ThemePreference>("system");
    const { unmount } = render(() => (
      <YoThemeCards preference={preference()} onSelect={setPreference} />
    ));

    expect(screen.getByRole("radio", { name: "浅色" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "深色" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "跟随系统" }).getAttribute("aria-checked")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: "深色" }));
    expect(preference()).toBe("dark");
    unmount();
  });
});
