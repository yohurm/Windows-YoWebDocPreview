import { createSignal, Show } from "solid-js";

import { IconList } from "@yohu/ui";

import type { PreviewStore } from "../store";
import { CatalogTree } from "./CatalogTree";

export function PrimarySidebar(props: { store: PreviewStore }) {
  const { store } = props;
  const [allExpanded, setAllExpanded] = createSignal(true);

  const handleToggleAll = () => {
    const next = !allExpanded();
    setAllExpanded(next);
    store.toggleAllCatalogNodes(next);
  };

  return (
    <aside classList={{ "yo-sidebar": true, "yo-sidebar--collapsed": !store.sidebarOpen() }}>
      <div class="yo-sidebar__header">
        <div class="yo-sidebar__title">
          <IconList class="yo-icon-md yo-text-muted" />
          <span>专栏章节</span>
          <Show when={store.session().catalogNodes.length > 0}>
            <span class="yo-sidebar__badge">{store.session().catalogNodes.length}</span>
          </Show>
        </div>
        <Show when={store.session().catalogNodes.length > 0}>
          <button
            type="button"
            class="yo-sidebar__toggle"
            title={allExpanded() ? "折叠所有章节" : "展开所有章节"}
            onClick={handleToggleAll}
          >
            {allExpanded() ? "全部折叠" : "全部展开"}
          </button>
        </Show>
      </div>
      <div class="yo-sidebar__body">
        <Show
          when={store.session().catalogNodes.length > 0}
          fallback={
            <div class="yo-sidebar__empty">
              <span>载入文档后显示专栏目录</span>
            </div>
          }
        >
          <CatalogTree
            nodes={store.session().catalogNodes}
            activeSlug={store.currentSlug()}
            expandedKeys={store.expandedKeys()}
            onToggleNode={(id) => store.toggleCatalogNode(id)}
            onSelectDoc={(slug) => store.selectCatalogDoc(slug)}
          />
        </Show>
      </div>
    </aside>
  );
}
