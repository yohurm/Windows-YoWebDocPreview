/**
 * iframe srcdoc 写入。必须写 HTMLIFrameElement.srcdoc property。
 */
export function assignWebSrcdoc(frame: HTMLIFrameElement, html: string): boolean {
  if (frame.srcdoc === html) return false;
  frame.srcdoc = html;
  return true;
}
