import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import { PreviewTitleBar } from "./PreviewTitleBar";
import type { PreviewStore } from "../store";

const WINDOW = {
  maximized: false,
  onMinimize: () => undefined,
  onToggleMaximize: () => undefined,
  onClose: () => undefined,
};

describe("PreviewTitleBar", () => {
  it("puts a single theme toggle immediately left of the settings gear", () => {
    const onSetTheme = vi.fn();
    const onOpenSettings = vi.fn();
    const { unmount } = render(() => (
      <PreviewTitleBar
        store={{ resetToHome: vi.fn() } as unknown as PreviewStore}
        window={WINDOW}
        appearance="light"
        onSetTheme={onSetTheme}
        onOpenSettings={onOpenSettings}
      />
    ));

    const toggle = screen.getByTitle("切换深色模式");
    const settings = screen.getByTitle("工作台设置");
    expect(screen.queryByTitle("切换浅色模式")).toBeNull();
    expect(toggle.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(toggle);
    expect(onSetTheme).toHaveBeenCalledWith("dark");
    fireEvent.click(settings);
    expect(onOpenSettings).toHaveBeenCalled();
    unmount();
  });
});
