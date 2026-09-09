import { createMemo, createSignal, Show } from "solid-js";

import { IconSearch } from "@yohu/ui";

import { filterCatalogTree } from "../catalogTree";
import type { PreviewStore } from "../store";
import { CatalogTree } from "./CatalogTree";

export function PrimarySidebar(props: { store: PreviewStore }) {
  const { store } = props;
  const [allExpanded, setAllExpanded] = createSignal(true);
  const [query, setQuery] = createSignal("");

  const visibleNodes = createMemo(() =>
    filterCatalogTree(store.session().catalogNodes, query())
  );
  const filtering = () => query().trim().length > 0;

  const handleToggleAll = () => {
    const next = !allExpanded();
    setAllExpanded(next);
    store.toggleAllCatalogNodes(next);
  };

  return (
    <Show
      when={store.sidebarOpen()}
      fallback={
        <button
          type="button"
          class="yo-pane-rail"
          title="展开专栏 (Ctrl+B)"
          onClick={() => store.toggleSidebar()}
        >
          专栏
        </button>
      }
    >
      <aside class="yo-nav">
        <div class="yo-nav__head">
          <span class="yo-nav__title">专栏</span>
          <div class="yo-nav__actions">
            <Show when={store.session().catalogNodes.length > 0 && !filtering()}>
              <button
                type="button"
                class="yo-nav__btn"
                title={allExpanded() ? "折叠所有章节" : "展开所有章节"}
                onClick={handleToggleAll}
              >
                {allExpanded() ? "折叠" : "展开"}
              </button>
            </Show>
            <button
              type="button"
              class="yo-nav__btn"
              title="收起专栏 (Ctrl+B)"
              onClick={() => store.toggleSidebar()}
            >
              收起
            </button>
          </div>
        </div>
        <Show when={store.session().catalogNodes.length > 0}>
          <label class="yo-nav__filter">
            <IconSearch class="yo-icon-sm" />
            <input
              type="search"
              value={query()}
              placeholder="筛选文档标题"
              onInput={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
        </Show>
        <div class="yo-nav__body">
          <Show
            when={store.session().catalogNodes.length > 0}
            fallback={<div class="yo-nav__empty">打开文档后显示专栏目录</div>}
          >
            <Show
              when={visibleNodes().length > 0}
              fallback={<div class="yo-nav__empty">没有匹配的章节</div>}
            >
              <CatalogTree
                nodes={visibleNodes()}
                activeSlug={store.currentSlug()}
                expandedKeys={store.expandedKeys()}
                forceExpand={filtering()}
                onToggleNode={(id) => store.toggleCatalogNode(id)}
                onSelectDoc={(slug) => store.selectCatalogDoc(slug)}
              />
            </Show>
          </Show>
        </div>
      </aside>
    </Show>
  );
}
