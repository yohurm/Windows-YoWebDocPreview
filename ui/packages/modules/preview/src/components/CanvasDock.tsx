import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";

import { IconCode, IconDocument, IconGlobe } from "@yohu/ui";

import { buildWebDocument } from "../engine/webRenderer";
import type { PreviewStore } from "../store";
import { TocAside } from "./TocAside";

export function CanvasDock(props: { store: PreviewStore }) {
  const { store } = props;

  const webDocHtml = createMemo(() =>
    buildWebDocument({
      meta: store.session().meta,
      rawHtml: store.session().rawHtml,
      sourceUrl: store.session().url,
    })
  );

  const [activeBuffer, setActiveBuffer] = createSignal<0 | 1>(0);
  const [html0, setHtml0] = createSignal("");
  const [html1, setHtml1] = createSignal("");

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
  };

  onCleanup(() => {
    setHtml0("");
    setHtml1("");
  });

  const onMarkdown = () => store.readingSurface() === "markdown";

  return (
    <div class="yo-canvas">
      <div class="yo-canvas__header">
        <div class="yo-canvas__breadcrumb">
          <Show when={store.catalogLabel()}>
            <span>{store.catalogLabel()}</span>
            <span>›</span>
          </Show>
          <span class="yo-canvas__breadcrumb-title">{store.title()}</span>
        </div>
        <div class="yo-reader-switch">
          <div class="yo-segmented" role="tablist" aria-label="阅读体验">
            <button
              type="button"
              classList={{ "yo-segmented__btn": true, "is-on": store.readingSurface() === "web" }}
              onClick={() => store.setReadingSurface("web")}
              title="Web 原始阅读"
            >
              <IconGlobe class="yo-icon-sm" />
              网页
            </button>
            <button
              type="button"
              classList={{ "yo-segmented__btn": true, "is-on": onMarkdown() }}
              onClick={() => store.setReadingSurface("markdown")}
              title="解析为 Markdown 阅读"
            >
              <IconDocument class="yo-icon-sm" />
              Markdown
            </button>
          </div>
          <Show when={onMarkdown()}>
            <div class="yo-segmented" role="tablist" aria-label="Markdown 呈现">
              <button
                type="button"
                classList={{
                  "yo-segmented__btn": true,
                  "is-on": store.markdownReveal() === "rendered",
                }}
                onClick={() => store.setMarkdownReveal("rendered")}
                title="Markdown 渲染"
              >
                渲染
              </button>
              <button
                type="button"
                classList={{
                  "yo-segmented__btn": true,
                  "is-on": store.markdownReveal() === "source",
                }}
                onClick={() => store.setMarkdownReveal("source")}
                title="Markdown 源码"
              >
                <IconCode class="yo-icon-sm" />
                源码
              </button>
            </div>
          </Show>
        </div>
      </div>

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
          <div class="yo-canvas__scroll">
            <article class="yo-md yo-canvas__article" innerHTML={store.session().renderedHtml} />
          </div>
        </Show>

        <Show when={onMarkdown() && store.markdownReveal() === "source"}>
          <div class="yo-canvas__source">
            <textarea readOnly value={store.session().markdownText} class="yo-canvas__source-text" />
          </div>
        </Show>
        <TocAside store={store} />
      </div>
    </div>
  );
}
