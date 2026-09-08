/** IPC 错误呈现：code 已是稳定枚举，message 仅作展示兜底。 */

import type { IpcError } from "./types";

export function isIpcError(e: unknown): e is IpcError {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  );
}

/** 统一错误 → 用户可读文案（IpcError 优先，裸字符串/异常兜底）。 */
export function errorMessage(e: unknown): string {
  if (isIpcError(e)) {
    return `[${e.code}] ${e.message}`;
  }
  if (typeof e === "string") return e;
  if (typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return String(e);
}
