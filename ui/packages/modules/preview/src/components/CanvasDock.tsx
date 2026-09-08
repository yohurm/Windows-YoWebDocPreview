import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";

import { IconCheck, IconCopy, IconDownload, IconExternal, IconGlobe } from "@yohu/ui";

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
        <div class="yo-canvas__actions">
          <button
            type="button"
            class="yo-btn yo-canvas__action-btn"
            onClick={() => void store.exportCurrentDoc()}
            disabled={store.exporting() || !store.session().markdownText}
            title="导出当前文档为 Markdown 文件"
          >
            <IconDownload class="yo-icon-sm" />
            <span>{store.exporting() ? "导出中…" : "导出"}</span>
          </button>
          <button
            type="button"
            class="yo-btn yo-btn--secondary yo-canvas__action-btn"
            onClick={() => void store.copyMarkdownToClipboard()}
            disabled={!store.session().markdownText}
            title="复制 Markdown 全文"
          >
            <Show when={store.copied()} fallback={<IconCopy class="yo-icon-sm" />}>
              <IconCheck class="yo-icon-sm yo-text-ok" />
            </Show>
            <span>{store.copied() ? "已复制" : "复制"}</span>
          </button>
          <Show when={store.sourceUrl()}>
            <a
              href={store.sourceUrl()}
              target="_blank"
              rel="noreferrer"
              class="yo-btn yo-btn--ghost yo-canvas__action-btn"
              title="在默认浏览器中打开源网页"
            >
              <IconExternal class="yo-icon-sm" />
              <span>外部打开</span>
            </a>
          </Show>
        </div>
      </div>

      <Show when={store.exportedPath()}>
        <div class="yo-notice yo-notice--ok">
          <IconCheck class="yo-icon-md" />
          <span>文件已导出至</span>
          <code class="yo-notice__code">{store.exportedPath()}</code>
        </div>
      </Show>
      <Show when={store.session().error}>
        <div class="yo-notice yo-notice--danger">{store.session().error}</div>
      </Show>

      <div class="yo-canvas__content">
        <Show when={store.viewMode() === "web"}>
          <div class="yo-web">
            <Show
              when={store.session().rawHtml || store.session().meta}
              fallback={
                <div class="yo-web__placeholder">
                  <IconGlobe class="yo-icon-lg" />
                  <span>载入文档后由解析内核呈现原貌</span>
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

        <Show when={store.viewMode() === "markdown-rendered"}>
          <div class="yo-canvas__scroll">
            <article class="yo-md yo-canvas__article" innerHTML={store.session().renderedHtml} />
          </div>
        </Show>

        <Show when={store.viewMode() === "markdown-source"}>
          <div class="yo-canvas__source">
            <textarea readOnly value={store.session().markdownText} class="yo-canvas__source-text" />
          </div>
        </Show>

        <TocAside store={store} />
      </div>
    </div>
  );
}
