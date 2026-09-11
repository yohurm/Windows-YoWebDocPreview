import { highlightByGrammar } from "../syntax";
import { identifyWebCode, type WebCodeIdentity } from "./language";

export interface WebCodeBlock extends WebCodeIdentity {
  code: string;
  tokenized: boolean;
}

/** One walk: Huawei <pre> → WebCodeBlock → y-code. Never used by the Markdown parser. */
export function renderCodeBlocks(html: string): string {
  return html.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi, (all, attrs: string, body: string) => {
    if (/\by-code__body\b/.test(attrs)) return all;
    return serializeWebCodeBlock(parseWebCodeBlock(attrs, body));
  });
}

export function parseWebCodeBlock(attrs: string, body: string): WebCodeBlock {
  const className = /\bclass="([^"]*)"/i.exec(attrs)?.[1] ?? "";
  const codehub = /\bcodehub="([^"]*)"/i.exec(attrs)?.[1] ?? "";
  const identity = identifyWebCode(className, codehub);
  const inner = trimFence(stripCodeTags(body));
  const tokenized = /<span\s+class="[^"]*(hljs-|token )/i.test(inner);
  const code = tokenized ? inner : decodeEntities(inner);
  return { ...identity, code, tokenized };
}

export function serializeWebCodeBlock(block: WebCodeBlock): string {
  const inner = block.tokenized ? block.code : highlightByGrammar(block.code, block.grammar);
  const lang = block.lang !== "text" ? block.lang : "";
  const bar = codeBar(lang, block.hub);
  const langAttr = lang ? ` data-lang="${escapeAttr(lang)}"` : "";
  return `<div class="y-code"${langAttr}>${bar}<pre class="y-code__body">${inner}</pre></div>`;
}

function codeBar(lang: string, hub: WebCodeIdentity["hub"]): string {
  const bits = [
    lang ? `<span class="y-code__lang">${escapeHtml(lang)}</span>` : "",
    hub
      ? `<a class="y-code__hub" href="${escapeAttr(hub.url)}">${escapeHtml(hub.file || "示例")}</a>`
      : "",
  ].filter(Boolean);
  return bits.length ? `<div class="y-code__bar">${bits.join("")}</div>` : "";
}

function trimFence(body: string): string {
  return body.replace(/^\n+/, "").replace(/\n+$/, "");
}

function stripCodeTags(body: string): string {
  return body.replace(/<\/?code\b[^>]*>/gi, "");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
