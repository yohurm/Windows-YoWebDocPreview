/**
 * 主窗口 chrome 控制与事件（@yohu/api 唯一 Tauri window 入口）。
 * UI 工作台与各模块禁止直接依赖 @tauri-apps/api/window。
 */
import { getCurrentWindow } from "@tauri-apps/api/window";

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

export async function windowShow(): Promise<void> {
  const win = getCurrentWindow();
  await win.show();
  try {
    await win.setFocus();
  } catch {
    // 忽略 focus 失败兜底
  }
}

export async function listenWindowResize(onChange: () => void): Promise<() => void> {
  return getCurrentWindow().onResized(() => {
    onChange();
  });
}
