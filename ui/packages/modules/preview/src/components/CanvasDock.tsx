import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";

import { IconGlobe, YoStage, type Appearance } from "@yohu/ui";

import { bindContentLinks } from "../contentHref";
import { buildReadingDocument } from "../engine/reading";
import { readScroller, scrollToHeading } from "../readingScroll";
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
    buildReadingDocument({
      meta: store.session().meta,
      rawHtml: store.session().rawHtml,
      sourceUrl: store.session().url,
      catalogNodes: store.session().catalogNodes,
    })
  );

  const webOpen = () => store.readingSurface() === "web";
  const onMarkdown = () => store.readingSurface() === "markdown";
  const hasWebDoc = () => Boolean(store.session().rawHtml || store.session().meta);

  const followHref = (href: string) => {
    const nav = store.openContentHref(href);
    if (nav.kind !== "scroll") return;
    const scroller = readScroller(store.readingSurface());
    if (scroller) scrollToHeading(scroller, nav.id);
  };

  let markdownHost: HTMLDivElement | undefined;
  onMount(() => {
    if (!markdownHost) return;
    const stop = bindContentLinks(markdownHost, {
      baseUrl: () => store.session().meta?.sourceUrl || store.session().url,
      onHref: followHref,
    });
    onCleanup(stop);
  });

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
        <div class="yo-canvas__surfaces">
          <div
            class="yo-web yohu-recipe-crossfade"
            data-active={webOpen() ? "" : undefined}
            aria-hidden={webOpen() ? undefined : true}
            inert={webOpen() ? undefined : true}
          >
            <Show
              when={hasWebDoc()}
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
                active={webOpen()}
                baseUrl={() => store.session().meta?.sourceUrl || store.session().url}
                onHref={followHref}
                onReady={() => setWebTick((n) => n + 1)}
              />
            </Show>
          </div>

          <div
            ref={(el) => {
              markdownHost = el;
            }}
            class="yo-md-host yohu-recipe-crossfade"
            data-active={onMarkdown() ? "" : undefined}
            aria-hidden={onMarkdown() ? undefined : true}
            inert={onMarkdown() ? undefined : true}
          >
            <YoStage keys={`${store.markdownReveal()}:${store.session().url}`}>
              <Show when={store.markdownReveal() === "rendered"}>
                <div class="yo-canvas__scroll" data-yo-read="md">
                  <div class="yo-canvas__article">
                    <DocumentPath crumbs={store.docCrumbs()} />
                    <article class="yo-md" innerHTML={store.session().renderedHtml} />
                  </div>
                </div>
              </Show>
              <Show when={store.markdownReveal() === "source"}>
                <div class="yo-canvas__source">
                  <textarea readOnly value={store.session().markdownText} class="yo-canvas__source-text" />
                </div>
              </Show>
            </YoStage>
          </div>
        </div>
        <TocAside store={store} webTick={webTick()} />
      </div>
    </div>
  );
}
