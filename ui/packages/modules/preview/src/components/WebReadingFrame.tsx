import { createEffect, createSignal } from "solid-js";

import type { Appearance } from "@yohu/ui";

import { assignWebSrcdoc, paintWebAppearance } from "../engine/web";

export function WebReadingFrame(props: {
  html: string;
  appearance: Appearance;
  onReady?: () => void;
}) {
  const [frame, setFrame] = createSignal<HTMLIFrameElement>();

  const paint = (): void => {
    const doc = frame()?.contentDocument;
    if (!doc?.documentElement) return;
    paintWebAppearance(doc, props.appearance);
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

  return (
    <iframe
      ref={setFrame}
      title="网页阅读"
      data-yo-read="web"
      class="yo-web__frame"
      data-active=""
      sandbox="allow-same-origin allow-scripts allow-popups"
      onLoad={() => {
        paint();
        props.onReady?.();
      }}
    />
  );
}
