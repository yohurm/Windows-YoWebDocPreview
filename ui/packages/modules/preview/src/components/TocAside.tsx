import { For, Show } from "solid-js";

import { IconList } from "@yohu/ui";

import type { PreviewStore } from "../store";

export function TocAside(props: { store: PreviewStore }) {
  const { store } = props;

  const scrollToAnchor = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside classList={{ "yo-outline": true, "yo-outline--collapsed": !store.inspectorOpen() }}>
      <div class="yo-outline__header">
        <div class="yo-outline__title">
          <IconList class="yo-icon-base yo-text-muted" />
          <span>本页大纲</span>
        </div>
        <Show when={store.session().tocList.length > 0}>
          <span class="yo-sidebar__badge">{store.session().tocList.length}</span>
        </Show>
      </div>
      <div class="yo-outline__list">
        <Show
          when={store.session().tocList.length > 0}
          fallback={<div class="yo-sidebar__empty">本篇文档无多级大纲</div>}
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
  );
}
