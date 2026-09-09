import { createMemo, createSignal, Show } from "solid-js";

import { IconGlobe, YoStage, type Appearance } from "@yohu/ui";

import { buildWebDocument } from "../engine/web";
import type { PreviewStore } from "../store";
import { CanvasOpBar } from "./CanvasOpBar";
import { ChannelBar } from "./ChannelBar";
import { DocumentPath } from "./DocumentPath";
import { TocAside } from "./TocAside";
import { WebReadingFrame } from "./WebReadingFrame";

export function CanvasDock(props: { store: PreviewStore; appearance?: Appearance }) {
  const { store } = props;
  const [webTick, setWebTick] = createSignal(0);

  const webDocHtml = createMemo(() =>
    buildWebDocument({
      meta: store.session().meta,
      rawHtml: store.session().rawHtml,
      sourceUrl: store.session().url,
      catalogNodes: store.session().catalogNodes,
    })
  );

  const onMarkdown = () => store.readingSurface() === "markdown";

  return (
    <div class="yo-canvas">
      <CanvasOpBar store={store} />
      <ChannelBar store={store} />

      <Show when={store.session().error}>
        <div class="yo-notice yo-notice--danger">{store.session().error}</div>
      </Show>

      <div
        class="yo-canvas__content yohu-recipe-rail"
        classList={{ "is-toc-collapsed": !store.inspectorOpen() }}
      >
        <YoStage
          keys={`${store.readingSurface()}:${onMarkdown() ? store.markdownReveal() : "web"}`}
        >
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
                <WebReadingFrame
                  html={webDocHtml()}
                  appearance={props.appearance ?? "light"}
                  onReady={() => setWebTick((n) => n + 1)}
                />
              </Show>
            </div>
          </Show>

          <Show when={onMarkdown() && store.markdownReveal() === "rendered"}>
            <YoStage keys={store.session().url}>
              <div class="yo-canvas__scroll" data-yo-read="md">
                <div class="yo-canvas__article">
                  <DocumentPath crumbs={store.docCrumbs()} />
                  <article class="yo-md" innerHTML={store.session().renderedHtml} />
                </div>
              </div>
            </YoStage>
          </Show>

          <Show when={onMarkdown() && store.markdownReveal() === "source"}>
            <YoStage keys={store.session().url}>
              <div class="yo-canvas__source">
                <textarea readOnly value={store.session().markdownText} class="yo-canvas__source-text" />
              </div>
            </YoStage>
          </Show>
        </YoStage>
        <TocAside store={store} webTick={webTick()} />
      </div>
    </div>
  );
}
