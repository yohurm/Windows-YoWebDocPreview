/** 阅读面滚动：大纲与正文共用同一套偏移，只滚动给定容器，不走 scrollIntoView。 */

export function headingIdAtOffset(
  headings: { id: string; top: number }[],
  line: number
): string | null {
  if (headings.length === 0) return null;
  let current = headings[0]?.id ?? null;
  for (const heading of headings) {
    if (heading.top <= line) current = heading.id;
    else break;
  }
  return current;
}

/** 元素上沿相对滚动容器内容原点的距离。 */
export function offsetWithin(scroller: HTMLElement, el: HTMLElement): number {
  const frame = scroller.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  return box.top - frame.top + scroller.scrollTop;
}

export function scrollTopToReveal(
  view: { scrollTop: number; clientHeight: number },
  el: { top: number; height: number }
): number | null {
  const viewBottom = view.scrollTop + view.clientHeight;
  const elBottom = el.top + el.height;
  if (el.top < view.scrollTop) return el.top;
  if (elBottom > viewBottom) return elBottom - view.clientHeight;
  return null;
}

export function collectHeadingOffsets(scroller: HTMLElement): { id: string; top: number }[] {
  return [...scroller.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id]")].map((el) => ({
    id: el.id,
    top: offsetWithin(scroller, el),
  }));
}

export function activeHeadingId(scroller: HTMLElement): string | null {
  return headingIdAtOffset(collectHeadingOffsets(scroller), scroller.scrollTop);
}

export function headingIn(root: ParentNode, id: string): HTMLElement | null {
  const doc = root.nodeType === Node.DOCUMENT_NODE ? (root as Document) : (root as Node).ownerDocument;
  const found = doc?.getElementById(id);
  if (found && (root === found || (root as Node).contains(found))) return found;
  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
  try {
    return root.querySelector(`#${escaped}`);
  } catch {
    return null;
  }
}

export function scrollToHeading(scroller: HTMLElement, id: string): boolean {
  const el = headingIn(scroller, id);
  if (!el) return false;
  const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  scroller.scrollTop = Math.min(Math.max(0, offsetWithin(scroller, el)), max);
  return true;
}

export function revealChild(scroller: HTMLElement, el: HTMLElement): void {
  const next = scrollTopToReveal(
    { scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight },
    { top: offsetWithin(scroller, el), height: el.offsetHeight }
  );
  if (next != null) scroller.scrollTop = next;
}

export function createReadingNav() {
  let pinned: string | null = null;
  return {
    pin(id: string) {
      pinned = id;
    },
    release() {
      pinned = null;
    },
    current(scroller: HTMLElement): string | null {
      return pinned ?? activeHeadingId(scroller);
    },
  };
}

export function markdownScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-yo-read='md']");
}

export function webScroller(): HTMLElement | null {
  const frame = document.querySelector<HTMLIFrameElement>("iframe.yo-web__frame[data-active]");
  return frame?.contentDocument?.querySelector<HTMLElement>("[data-yo-read='article']") ?? null;
}

export function readScroller(surface: "web" | "markdown"): HTMLElement | null {
  return surface === "web" ? webScroller() : markdownScroller();
}

export function bindScroller(
  scroller: HTMLElement,
  nav: ReturnType<typeof createReadingNav>,
  onChange: (id: string | null) => void
): () => void {
  const notify = () => onChange(nav.current(scroller));
  const release = () => {
    nav.release();
    notify();
  };
  scroller.addEventListener("scroll", notify, { passive: true });
  scroller.addEventListener("wheel", release, { passive: true });
  scroller.addEventListener("pointerdown", release);
  notify();
  return () => {
    scroller.removeEventListener("scroll", notify);
    scroller.removeEventListener("wheel", release);
    scroller.removeEventListener("pointerdown", release);
  };
}
