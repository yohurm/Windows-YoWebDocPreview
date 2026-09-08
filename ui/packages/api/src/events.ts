/**
 * 事件名单源镜像（core/yohu-protocol::event_names）。
 * 事件名 `/` 分层（Tauri 2.9+ 禁点号）；invoke 命令名仍点分。
 */

export const EVENT_NAMES = {
  settingsChanged: "settings/changed",
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
