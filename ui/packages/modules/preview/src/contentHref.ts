/** 正文 href：本页锚点滚动，http(s) 交给 fetchDoc，不让 WebView 自己开页。 */

export type ContentHref =
  | { kind: "ignore" }
  | { kind: "scroll"; id: string }
  | { kind: "open"; url: string };

export function resolveContentHref(href: string, baseUrl: string): ContentHref {
  const raw = href.trim();
  if (!raw || /^(javascript|mailto|tel|data|blob):/i.test(raw)) {
    return { kind: "ignore" };
  }
  if (raw.startsWith("#")) {
    const id = decodeHash(raw);
    return id ? { kind: "scroll", id } : { kind: "ignore" };
  }

  let url: URL;
  try {
    url = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
  } catch {
    return { kind: "ignore" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { kind: "ignore" };
  }

  const id = decodeHash(url.hash);
  if (id && sameDocument(url, baseUrl)) {
    return { kind: "scroll", id };
  }
  url.hash = "";
  return { kind: "open", url: url.href };
}

export function bindContentLinks(
  root: ParentNode,
  handlers: {
    baseUrl: () => string;
    onHref: (href: string) => void;
  }
): () => void {
  const onClick = (event: Event) => {
    const mouse = event as MouseEvent;
    if ("button" in mouse && mouse.button !== 0 && mouse.button !== 1) return;
    const anchor = event
      .composedPath()
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && node.hasAttribute("href"));
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
    handlers.onHref(anchor.getAttribute("href") ?? "");
  };
  root.addEventListener("click", onClick, true);
  root.addEventListener("auxclick", onClick, true);
  return () => {
    root.removeEventListener("click", onClick, true);
    root.removeEventListener("auxclick", onClick, true);
  };
}

function decodeHash(hash: string): string {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!id) return "";
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function sameDocument(url: URL, baseUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    return url.origin === base.origin && url.pathname === base.pathname && url.search === base.search;
  } catch {
    return false;
  }
}
