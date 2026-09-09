/**
 * iframe srcdoc 写入。
 * 只改 attribute 时 Chromium / WebView2 常常不重载，onLoad 不来。
 * 必须写 HTMLIFrameElement.srcdoc property。
 */
export function assignWebSrcdoc(frame: HTMLIFrameElement, html: string): boolean {
  if (frame.srcdoc === html) return false;
  frame.srcdoc = html;
  return true;
}
