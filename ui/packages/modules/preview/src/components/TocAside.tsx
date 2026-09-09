import { createEffect, createSignal, onCleanup, Show } from "solid-js";

import { IconPanelRight } from "@yohu/ui";

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
  const open = () => store.inspectorOpen();

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
    <aside class="yo-toc yohu-recipe-rail-pane" data-collapsed={open() ? undefined : ""}>
      <div class="yo-toc__inner">
        <div class="yo-toc__head">
          <span class="yo-toc__title">大纲</span>
          <button
            type="button"
            class="yo-nav__icon-btn"
            title={open() ? "收起大纲 (Ctrl+O)" : "展开大纲 (Ctrl+O)"}
            aria-expanded={open()}
            onClick={() => store.toggleInspector()}
          >
            <IconPanelRight />
          </button>
        </div>
        <div class="yo-toc__rest" inert={!open() ? true : undefined} aria-hidden={!open() || undefined}>
          <div class="yo-toc__body">
            <Show
              when={store.tocItems().length > 0}
              fallback={<div class="yo-toc__empty">打开文档后显示本节目录</div>}
            >
              <TocList items={store.tocItems()} activeId={activeId()} onOpen={openHeading} onReveal={revealActive} />
            </Show>
          </div>
        </div>
        <span class="yo-toc__rail-label" aria-hidden="true">
          大纲
        </span>
      </div>
    </aside>
  );
}
