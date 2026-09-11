import { createEffect, createSignal, onCleanup } from "solid-js";

import type { Appearance } from "@yohu/ui";

import { bindContentLinks } from "../contentHref";
import { assignWebSrcdoc, paintWebAppearance } from "../engine/reading";

export function WebReadingFrame(props: {
  html: string;
  appearance: Appearance;
  active: boolean;
  baseUrl: () => string;
  onHref: (href: string) => void;
  onReady?: () => void;
}) {
  const [frame, setFrame] = createSignal<HTMLIFrameElement>();
  let detachLinks: (() => void) | undefined;

  const paint = (): void => {
    const doc = frame()?.contentDocument;
    if (!doc?.documentElement) return;
    paintWebAppearance(doc, props.appearance);
  };

  const attachLinks = (): void => {
    detachLinks?.();
    const doc = frame()?.contentDocument;
    if (!doc) return;
    detachLinks = bindContentLinks(doc, {
      baseUrl: () => props.baseUrl(),
      onHref: (href) => props.onHref(href),
    });
  };

  createEffect(() => {
    const el = frame();
    const html = props.html;
    if (!el || !html) return;
    assignWebSrcdoc(el, html);
  });

  createEffect(() => {
    props.appearance;
    paint();
  });

  onCleanup(() => detachLinks?.());

  return (
    <iframe
      ref={setFrame}
      title="网页阅读"
      data-yo-read="web"
      class="yo-web__frame"
      data-active={props.active ? "" : undefined}
      sandbox="allow-same-origin allow-scripts"
      onLoad={() => {
        paint();
        attachLinks();
        props.onReady?.();
      }}
    />
  );
}
