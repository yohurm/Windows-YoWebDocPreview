/**
 * wire 类型镜像（单源：core/yohu-protocol）。
 *
 * 契约纪律：字段名与 Rust serde 输出逐字对齐（types.test.ts 守护）：
 * - 多数类型 camelCase（serde rename_all = "camelCase"）
 * - FetchChannel / Theme / IpcErrorCode 为小写 camel 枚举值
 * - IpcErrorCode 为 snake_case 枚举值
 * - AppEvent 为外部标签枚举：{ settingsChanged: ... } 形态
 */

// ── 文档域 ──

export interface DocRef {
  sourceId: string;
  catalog: string | null;
  slug: string;
  url: string;
  gitRef?: string | null;
}

/** "adapter" | "genericWeb" */
export type FetchChannel = "adapter" | "genericWeb";

/** 仓库 blob 分型；HTML 文档源不填 */
export type BlobKind = "markdown" | "code" | "image" | "binary" | "tooLarge";

export interface DocMeta {
  docRef: DocRef;
  title: string;
  updateTime: string | null;
  sourceUrl: string;
  channel: FetchChannel;
  deviceTypes: string[];
  blobKind?: BlobKind | null;
}

export interface CatalogNode {
  id: string;
  name: string;
  slug?: string | null;
  isLeaf?: boolean;
  children: CatalogNode[];
}

export interface OutlineNode {
  id: string;
  text: string;
  level: number;
  children: OutlineNode[];
}

export interface AgentSection {
  id: string;
  heading: string;
  level: number;
  markdown: string;
  startOffset: number;
  endOffset: number;
}

export interface AgentDocument {
  meta: DocMeta;
  markdown: string;
  outline: OutlineNode[];
  sections: AgentSection[];
}

// ── 设置域 ──

/** "system" | "light" | "dark" */
export type Theme = "system" | "light" | "dark";

export interface AppSettings {
  libraryRoot: string;
  concurrency: number;
  requestTimeoutSec: number;
  imageDownload: boolean;
  theme: Theme;
}

export type SettingsKey =
  | "libraryRoot"
  | "concurrency"
  | "requestTimeoutSec"
  | "imageDownload"
  | "theme";

// ── 系统域 ──

export interface SystemInfo {
  name: string;
  version: string;
  dataDir: string;
  libraryRoot: string;
}

// ── 事件 ──

export interface SettingsChangedEvent {
  settings: AppSettings;
}

export type AppEvent = { settingsChanged: SettingsChangedEvent };

// ── 错误码 ──

export type IpcErrorCode =
  | "invalid_args"
  | "not_found"
  | "network"
  | "extract_failed"
  | "api"
  | "io"
  | "cancelled"
  | "internal";

export interface IpcErrorWire {
  code: IpcErrorCode;
  message: string;
}

export type IpcError = IpcErrorWire;
