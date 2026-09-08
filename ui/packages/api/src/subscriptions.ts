/**
 * 事件订阅：Rust 侧 dispatcher 以 `AppEvent` 外部标签信封发射
 * （`{"settingsChanged": {...}}`），此处按变体名解包为内层 wire 类型。
 */

import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import { EVENT_NAMES } from "./events";
import type { AppSettings } from "./types";

type SettingsChangedPayload = { key: string | null; settings: AppSettings };

function unwrap<T>(variant: string, payload: unknown): T {
  const rec = payload as Record<string, unknown> | null;
  if (rec && typeof rec === "object" && variant in rec) {
    return rec[variant] as T;
  }
  return payload as T;
}

export function onSettingsChanged(cb: (s: SettingsChangedPayload) => void): Promise<UnlistenFn> {
  return listen<unknown>(EVENT_NAMES.settingsChanged, (e) =>
    cb(unwrap("settingsChanged", e.payload)),
  );
}
