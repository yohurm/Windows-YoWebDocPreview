/** invoke 命令封装：UI 唯一的后端调用入口（模块禁直连 @tauri-apps/*）。 */

import { invoke } from "@tauri-apps/api/core";

import type {
  AppSettings,
  CatalogNode,
  DocMeta,
  SystemInfo,
} from "./types";

// ── 文档域 ──

export const docFetch = (url: string) => invoke<DocMeta>("doc.fetch", { url });
export const docHtml = (url: string) => invoke<string>("doc.html", { url });
export const docConvert = (url: string) => invoke<string>("doc.convert", { url });
export const docCatalog = (url: string) => invoke<CatalogNode[]>("doc.catalog", { url });
export const docHistory = () => invoke<DocMeta[]>("doc.history");
export const docExport = (url: string, targetDir?: string) =>
  invoke<string>("doc.export", { url, targetDir: targetDir ?? null });

// ── 设置域 ──

export const settingsGet = () => invoke<AppSettings>("settings.get");
export const settingsSet = (settings: AppSettings) =>
  invoke<AppSettings>("settings.set", { settings });

// ── 系统域 ──

export const systemInfo = () => invoke<SystemInfo>("system.info");
export const systemOpenPath = (path: string) => invoke<void>("system.openPath", { path });
export const dialogPickFolder = () => invoke<string | null>("dialog.pickFolder");
export const dialogPickFile = () => invoke<string | null>("dialog.pickFile");
export const dialogSaveFile = (defaultName?: string) =>
  invoke<string | null>("dialog.saveFile", { defaultName: defaultName ?? null });
