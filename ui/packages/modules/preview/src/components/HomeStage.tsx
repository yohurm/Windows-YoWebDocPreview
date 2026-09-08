import { createEffect, Show } from "solid-js";

import { DISPLAY_NAME } from "@yohu/api";
import { IconSearch } from "@yohu/ui";

import type { PreviewStore } from "../store";

export function HomeStage(props: { store: PreviewStore }) {
  const { store } = props;
  let urlInput: HTMLInputElement | undefined;

  createEffect(() => {
    if (!store.hasDoc()) {
      queueMicrotask(() => urlInput?.focus());
    }
  });

  return (
    <div class="yo-home">
      <div class="yo-home__aura" aria-hidden="true" />
      <div class="yo-home__stage">
        <div class="yo-home__mark" aria-hidden="true">
          <span class="yo-home__sheet yo-home__sheet--back" />
          <span class="yo-home__sheet yo-home__sheet--front" />
        </div>
        <h1 class="yo-home__name">{DISPLAY_NAME}</h1>
        <p class="yo-home__lead">打开一篇网页，用原始页面或 Markdown 阅读</p>
        <form
          class="yo-home__form"
          onSubmit={(event) => {
            event.preventDefault();
            void store.fetchDoc();
          }}
        >
          <IconSearch class="yo-icon-base yo-text-muted" />
          <input
            ref={urlInput}
            type="text"
            class="yo-home__input"
            value={store.urlInput()}
            onInput={(event) => store.setUrlInput(event.currentTarget.value)}
            placeholder="文档 URL"
            spellcheck={false}
            autocomplete="off"
            disabled={store.session().status === "loading"}
          />
          <button
            type="submit"
            class="yo-home__submit"
            disabled={store.session().status === "loading" || !store.urlInput().trim()}
          >
            {store.session().status === "loading" ? "打开中…" : "打开"}
          </button>
        </form>
        <p class="yo-home__hint">
          <kbd>Enter</kbd>
          <span>打开文档</span>
        </p>
        <Show when={store.session().error}>
          <div class="yo-notice yo-notice--danger">{store.session().error}</div>
        </Show>
      </div>
    </div>
  );
}
