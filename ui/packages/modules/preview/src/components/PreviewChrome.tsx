import { Show } from "solid-js";

import {
  IconCode,
  IconDocument,
  IconGear,
  IconGlobe,
  IconList,
  IconRefresh,
  IconSearch,
  IconSidebar,
  YoChromeButton,
  YoTitleBar,
  type WindowCaptionButtonsProps,
} from "@yohu/ui";

import type { PreviewStore } from "../store";

export function PreviewChrome(props: {
  store: PreviewStore;
  window: WindowCaptionButtonsProps;
  onOpenSettings?: () => void;
}) {
  const { store } = props;

  return (
    <YoTitleBar
      window={props.window}
      leading={
        <>
          <Show when={store.hasDoc()}>
            <YoChromeButton
              title={store.sidebarOpen() ? "收起专栏目录 (Ctrl+B)" : "展开专栏目录 (Ctrl+B)"}
              pressed={store.sidebarOpen()}
              onClick={() => store.toggleSidebar()}
            >
              <IconSidebar class="yo-icon-lg" />
            </YoChromeButton>
          </Show>
          <button
            type="button"
            class="yo-chrome-btn yo-chrome-brand"
            title="返回欢迎台"
            onClick={() => store.resetToHome()}
          >
            YoDoc
          </button>
        </>
      }
      actions={
        <>
          <Show when={store.hasDoc()}>
            <div class="yo-segmented">
              <button
                type="button"
                classList={{ "yo-segmented__btn": true, "is-on": store.viewMode() === "web" }}
                onClick={() => store.setViewMode("web")}
                title="网页原貌"
              >
                <IconGlobe class="yo-icon-sm" />
                原貌
              </button>
              <button
                type="button"
                classList={{
                  "yo-segmented__btn": true,
                  "is-on": store.viewMode() === "markdown-rendered",
                }}
                onClick={() => store.setViewMode("markdown-rendered")}
                title="Markdown 排版"
              >
                <IconDocument class="yo-icon-sm" />
                排版
              </button>
              <button
                type="button"
                classList={{
                  "yo-segmented__btn": true,
                  "is-on": store.viewMode() === "markdown-source",
                }}
                onClick={() => store.setViewMode("markdown-source")}
                title="Markdown 源码"
              >
                <IconCode class="yo-icon-sm" />
                源码
              </button>
            </div>
            <YoChromeButton
              title={store.inspectorOpen() ? "收起本页大纲 (Ctrl+O)" : "展开本页大纲 (Ctrl+O)"}
              pressed={store.inspectorOpen()}
              onClick={() => store.toggleInspector()}
            >
              <IconList class="yo-icon-md" />
            </YoChromeButton>
          </Show>
          <Show when={props.onOpenSettings}>
            <YoChromeButton title="工作台设置" onClick={() => props.onOpenSettings?.()}>
              <IconGear class="yo-icon-md" />
            </YoChromeButton>
          </Show>
        </>
      }
    >
      <Show when={store.hasDoc()}>
        <div class="yo-omnibox">
          <IconSearch class="yo-icon-base yo-text-muted" />
          <input
            type="text"
            class="yo-omnibox__input"
            value={store.urlInput()}
            onInput={(event) => store.setUrlInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void store.fetchDoc();
            }}
            placeholder="文档 URL，回车载入"
            disabled={store.session().status === "loading"}
          />
          <button
            type="button"
            class="yo-chrome-btn yo-omnibox__go"
            onClick={() => void store.fetchDoc()}
            disabled={store.session().status === "loading" || !store.urlInput().trim()}
            title="载入"
          >
            <IconRefresh
              class={`yo-icon-sm ${store.session().status === "loading" ? "yo-rotate" : ""}`}
            />
          </button>
        </div>
      </Show>
    </YoTitleBar>
  );
}
