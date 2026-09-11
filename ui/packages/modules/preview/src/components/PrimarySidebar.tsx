import { createMemo, createSignal, Show } from "solid-js";

import { IconCollapseAll, IconExpandAll, IconPanelLeft, IconSearch } from "@yohu/ui";

import { collectExpandableIds, filterCatalogTree } from "../catalogTree";
import type { PreviewStore } from "../store";
import { CatalogTree } from "./CatalogTree";

export function PrimarySidebar(props: { store: PreviewStore }) {
  const { store } = props;
  const [query, setQuery] = createSignal("");
  const allExpanded = createMemo(() => {
    const allIds = collectExpandableIds(store.session().catalogNodes, 99);
    if (allIds.length === 0) return false;
    const expanded = store.expandedKeys();
    return allIds.every((id) => expanded.has(id));
  });

  const visibleNodes = createMemo(() =>
    filterCatalogTree(store.session().catalogNodes, query())
  );
  const filtering = () => query().trim().length > 0;
  const open = () => store.sidebarOpen();

  const handleToggleAll = () => {
    store.toggleAllCatalogNodes(!allExpanded());
  };

  return (
    <aside class="yo-nav yohu-recipe-rail-pane" data-collapsed={open() ? undefined : ""}>
      <div class="yo-nav__inner">
        <div class="yo-nav__head">
          <span class="yo-nav__title">专栏</span>
          <div class="yo-nav__actions">
            <Show when={store.session().catalogNodes.length > 0 && !filtering()}>
              <button
                type="button"
                class="yo-nav__icon-btn"
                title={allExpanded() ? "折叠所有章节" : "展开所有章节"}
                onClick={handleToggleAll}
              >
                {allExpanded() ? <IconCollapseAll /> : <IconExpandAll />}
              </button>
            </Show>
            <button
              type="button"
              class="yo-nav__icon-btn"
              title={open() ? "收起专栏 (Ctrl+B)" : "展开专栏 (Ctrl+B)"}
              aria-expanded={open()}
              onClick={() => store.toggleSidebar()}
            >
              <IconPanelLeft />
            </button>
          </div>
        </div>
        <div class="yo-nav__rest" inert={!open() ? true : undefined} aria-hidden={!open() || undefined}>
          <Show when={store.session().catalogNodes.length > 0}>
            <label class="yo-nav__filter">
              <IconSearch class="yo-icon-sm" />
              <input
                type="search"
                value={query()}
                placeholder="筛选名称"
                onInput={(event) => setQuery(event.currentTarget.value)}
              />
            </label>
          </Show>
          <div class="yo-nav__body">
            <Show
              when={store.session().catalogNodes.length > 0}
              fallback={<div class="yo-nav__empty">打开页面后显示目录</div>}
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
        </div>
        <span class="yo-nav__rail-label" aria-hidden="true">
          专栏
        </span>
      </div>
    </aside>
  );
}
