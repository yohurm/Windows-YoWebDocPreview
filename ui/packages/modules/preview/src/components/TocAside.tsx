import { For, Show } from "solid-js";

import { IconList } from "@yohu/ui";

import type { PreviewStore } from "../store";

export function TocAside(props: { store: PreviewStore }) {
  const { store } = props;

  const scrollToAnchor = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Show
      when={store.inspectorOpen()}
      fallback={
        <button
          type="button"
          class="yo-pane-rail yo-pane-rail--end"
          title="展开大纲 (Ctrl+O)"
          onClick={() => store.toggleInspector()}
        >
          大纲
        </button>
      }
    >
      <aside class="yo-outline">
        <div class="yo-outline__header">
          <div class="yo-outline__title">
            <IconList class="yo-icon-base yo-text-muted" />
            <span>本页大纲</span>
          </div>
          <div class="yo-sidebar__header-actions">
            <Show when={store.session().tocList.length > 0}>
              <span class="yo-sidebar__badge">{store.session().tocList.length}</span>
            </Show>
            <button
              type="button"
              class="yo-sidebar__toggle"
              title="收起大纲 (Ctrl+O)"
              onClick={() => store.toggleInspector()}
            >
              收起
            </button>
          </div>
        </div>
        <div class="yo-outline__list">
          <Show
            when={store.session().tocList.length > 0}
            fallback={<div class="yo-sidebar__empty">打开文档后显示本页大纲</div>}
          >
            <For each={store.session().tocList}>
              {(item) => (
                <button
                  type="button"
                  class="yo-outline__item"
                  data-level={item.level}
                  onClick={() => scrollToAnchor(item.id)}
                  title={item.text}
                >
                  <span class="yo-outline__dot" />
                  <span classList={{ "yo-outline__text": true, "is-strong": item.level <= 2 }}>
                    {item.text}
                  </span>
                </button>
              )}
            </For>
          </Show>
        </div>
      </aside>
    </Show>
  );
}
