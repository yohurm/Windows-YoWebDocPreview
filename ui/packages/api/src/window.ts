/**
 * 主窗口 chrome 控制与事件（@yohu/api 唯一 Tauri window 入口）。
 * UI 工作台与各模块禁止直接依赖 @tauri-apps/api/window。
 */
import { getCurrentWindow } from "@tauri-apps/api/window";

import type { Theme } from "./types";

export async function windowMinimize(): Promise<void> {
  await getCurrentWindow().minimize();
}

export async function windowToggleMaximize(): Promise<void> {
  await getCurrentWindow().toggleMaximize();
}

export async function windowClose(): Promise<void> {
  await getCurrentWindow().close();
}

export async function windowIsMaximized(): Promise<boolean> {
  return getCurrentWindow().isMaximized();
}

export async function listenWindowResize(onChange: () => void): Promise<() => void> {
  return getCurrentWindow().onResized(() => {
    onChange();
  });
}

/** 与 `--yo-bg-app` / protocol Theme::FILL_* 对齐。 */
export const WINDOW_FILL_LIGHT = { red: 248, green: 250, blue: 252, alpha: 255 } as const;
export const WINDOW_FILL_DARK = { red: 9, green: 13, blue: 22, alpha: 255 } as const;

export function windowFill(appearance: "light" | "dark") {
  return appearance === "dark" ? WINDOW_FILL_DARK : WINDOW_FILL_LIGHT;
}

/** `system` 必须传 `null`，否则 WebView 不再跟随 Windows 应用浅/深。 */
export function windowThemePin(theme: Theme): "light" | "dark" | null {
  return theme === "system" ? null : theme;
}

export async function windowApplyAppearance(
  theme: Theme,
  appearance: "light" | "dark",
): Promise<void> {
  const win = getCurrentWindow() as unknown as {
    setBackgroundColor?: (color: {
      red: number;
      green: number;
      blue: number;
      alpha: number;
    }) => Promise<void>;
    setTheme?: (theme: "light" | "dark" | null) => Promise<void>;
  };
  try {
    await win.setBackgroundColor?.(windowFill(appearance));
    await win.setTheme?.(windowThemePin(theme));
  } catch {
    /* vite / 宿主未实现 */
  }
}
