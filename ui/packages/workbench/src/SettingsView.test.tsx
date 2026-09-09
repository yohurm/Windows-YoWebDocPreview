import { createSignal } from "solid-js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import type { AppSettings, Theme } from "@yohu/api";

import { SettingsPage } from "./SettingsView";
import type { SettingsSession } from "./settingsSession";

const WINDOW = {
  maximized: false,
  onMinimize: () => undefined,
  onToggleMaximize: () => undefined,
  onClose: () => undefined,
};

function mockSession(initial?: Partial<AppSettings>): SettingsSession {
  const [settings, setSettings] = createSignal<AppSettings | null>({
    libraryRoot: "D:\\docs",
    concurrency: 4,
    requestTimeoutSec: 15,
    imageDownload: true,
    theme: "system",
    ...initial,
  });
  const [error] = createSignal<string | null>(null);
  const [saving] = createSignal(false);
  const patch = vi.fn(async (partial: Partial<AppSettings>) => {
    const current = settings();
    if (!current) return;
    setSettings({ ...current, ...partial });
  });
  return {
    settings,
    theme: () => settings()?.theme ?? "system",
    resolved: () => (settings()?.theme === "dark" ? "dark" : "light"),
    error,
    saving,
    patch,
    setTheme: (theme: Theme) => {
      void patch({ theme });
    },
  };
}

describe("SettingsPage", () => {
  it("opens on the appearance section with theme cards", () => {
    const { unmount } = render(() => (
      <SettingsPage window={WINDOW} session={mockSession()} onBack={() => undefined} />
    ));
    expect(screen.getByRole("heading", { name: "外观" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /跟随系统/ })).toBeTruthy();
    unmount();
  });

  it("lets the appearance cards change theme immediately", () => {
    const session = mockSession();
    const { unmount } = render(() => (
      <SettingsPage window={WINDOW} session={session} onBack={() => undefined} />
    ));
    fireEvent.click(screen.getByRole("radio", { name: "深色" }));
    expect(session.setTheme).toBeDefined();
    expect(session.patch).toHaveBeenCalledWith({ theme: "dark" });
    unmount();
  });

  it("navigates to library and network sections", () => {
    const { unmount } = render(() => (
      <SettingsPage window={WINDOW} session={mockSession()} onBack={() => undefined} />
    ));
    fireEvent.click(screen.getByRole("button", { name: "文档库" }));
    expect(screen.getByRole("heading", { name: "文档库" })).toBeTruthy();
    expect(screen.getByDisplayValue("D:\\docs")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "抓取与网络" }));
    expect(screen.getByText("网络请求超时")).toBeTruthy();
    expect(screen.getByText("批量抓取并发")).toBeTruthy();
    expect(screen.getByLabelText("导出时下载图片")).toBeTruthy();
    unmount();
  });
});
