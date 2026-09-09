import { IconCode, IconDocument, IconGlobe } from "@yohu/ui";
import { Show } from "solid-js";

import type { PreviewStore } from "../store";

export function CanvasOpBar(props: { store: PreviewStore }) {
  const { store } = props;
  const onMarkdown = () => store.readingSurface() === "markdown";

  return (
    <div class="yo-canvas__opbar" role="toolbar" aria-label="操作栏">
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
  );
}
