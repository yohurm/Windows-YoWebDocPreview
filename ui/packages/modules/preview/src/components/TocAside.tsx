import { createEffect, createSignal, onCleanup, Show } from "solid-js";

import {
  bindScroller,
  createReadingNav,
  readScroller,
  revealChild,
  scrollToHeading,
} from "../readingScroll";
import type { PreviewStore } from "../store";
import { TocList } from "./TocList";

export function TocAside(props: { store: PreviewStore; webTick?: number }) {
  const { store } = props;
  const [activeId, setActiveId] = createSignal<string | null>(null);
  const nav = createReadingNav();

  createEffect(() => {
    const surface = store.readingSurface();
    store.session().renderedHtml;
    store.session().rawHtml;
    store.markdownReveal();
    props.webTick;
    nav.release();
    const scroller = readScroller(surface);
    if (!scroller) {
      setActiveId(null);
      return;
    }
    const stop = bindScroller(scroller, nav, setActiveId);
    onCleanup(stop);
  });

  const openHeading = (id: string) => {
    const scroller = readScroller(store.readingSurface());
    if (!scroller) return;
    nav.pin(id);
    scrollToHeading(scroller, id);
    setActiveId(id);
  };

  const revealActive = (item: HTMLElement) => {
    const pane = item.closest<HTMLElement>(".yo-toc__body");
    if (pane) revealChild(pane, item);
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
      <aside class="yo-toc">
        <div class="yo-toc__head">
          <span class="yo-toc__title">大纲</span>
          <button
            type="button"
            class="yo-nav__btn"
            title="收起大纲 (Ctrl+O)"
            onClick={() => store.toggleInspector()}
          >
            收起
          </button>
        </div>
        <div class="yo-toc__body">
          <Show
            when={store.tocItems().length > 0}
            fallback={<div class="yo-toc__empty">打开文档后显示本节目录</div>}
          >
            <TocList items={store.tocItems()} activeId={activeId()} onOpen={openHeading} onReveal={revealActive} />
          </Show>
        </div>
      </aside>
    </Show>
  );
}
