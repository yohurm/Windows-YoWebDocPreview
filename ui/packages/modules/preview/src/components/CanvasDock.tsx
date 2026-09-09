import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";

import { IconGlobe, type Appearance } from "@yohu/ui";

import { buildWebDocument } from "../engine/web";
import type { PreviewStore } from "../store";
import { CanvasOpBar } from "./CanvasOpBar";
import { ChannelBar } from "./ChannelBar";
import { DocumentPath } from "./DocumentPath";
import { TocAside } from "./TocAside";

export function CanvasDock(props: { store: PreviewStore; appearance?: Appearance }) {
  const { store } = props;

  const webDocHtml = createMemo(() =>
    buildWebDocument({
      meta: store.session().meta,
      rawHtml: store.session().rawHtml,
      sourceUrl: store.session().url,
      catalogNodes: store.session().catalogNodes,
      appearance: props.appearance ?? "light",
    })
  );

  const [activeBuffer, setActiveBuffer] = createSignal<0 | 1>(0);
  const [html0, setHtml0] = createSignal("");
  const [html1, setHtml1] = createSignal("");
  const [webTick, setWebTick] = createSignal(0);

  createEffect(() => {
    const nextHtml = webDocHtml();
    if (!nextHtml) return;
    const current = activeBuffer() === 0 ? html0() : html1();
    if (!current) {
      if (activeBuffer() === 0) setHtml0(nextHtml);
      else setHtml1(nextHtml);
      return;
    }
    if (nextHtml === current) return;
    const nextBuffer = activeBuffer() === 0 ? 1 : 0;
    if (nextBuffer === 1) setHtml1(nextHtml);
    else setHtml0(nextHtml);
  });

  const handleFrameLoad = (bufferIdx: 0 | 1) => {
    if (activeBuffer() !== bufferIdx) setActiveBuffer(bufferIdx);
    setWebTick((n) => n + 1);
  };

  onCleanup(() => {
    setHtml0("");
    setHtml1("");
  });

  const onMarkdown = () => store.readingSurface() === "markdown";

  return (
    <div class="yo-canvas">
      <CanvasOpBar store={store} />
      <ChannelBar store={store} />

      <Show when={store.session().error}>
        <div class="yo-notice yo-notice--danger">{store.session().error}</div>
      </Show>

      <div class="yo-canvas__content">
        <Show when={store.readingSurface() === "web"}>
          <div class="yo-web">
            <Show
              when={store.session().rawHtml || store.session().meta}
              fallback={
                <div class="yo-web__placeholder">
                  <IconGlobe class="yo-icon-lg" />
                  <span>载入文档后呈现网页原文</span>
                </div>
              }
            >
              <iframe
                srcdoc={html0()}
                title="Web Buffer 0"
                data-yo-read="web"
                classList={{
                  "yo-web__frame": true,
                  "is-active": activeBuffer() === 0,
                }}
                sandbox="allow-same-origin allow-scripts allow-popups"
                onLoad={() => handleFrameLoad(0)}
              />
              <iframe
                srcdoc={html1()}
                title="Web Buffer 1"
                data-yo-read="web"
                classList={{
                  "yo-web__frame": true,
                  "is-active": activeBuffer() === 1,
                }}
                sandbox="allow-same-origin allow-scripts allow-popups"
                onLoad={() => handleFrameLoad(1)}
              />
            </Show>
          </div>
        </Show>

        <Show when={onMarkdown() && store.markdownReveal() === "rendered"}>
          <div class="yo-canvas__scroll" data-yo-read="md">
            <div class="yo-canvas__article">
              <DocumentPath crumbs={store.docCrumbs()} />
              <article class="yo-md" innerHTML={store.session().renderedHtml} />
            </div>
          </div>
        </Show>

        <Show when={onMarkdown() && store.markdownReveal() === "source"}>
          <div class="yo-canvas__source">
            <textarea readOnly value={store.session().markdownText} class="yo-canvas__source-text" />
          </div>
        </Show>
        <TocAside store={store} webTick={webTick()} />
      </div>
    </div>
  );
}
