/**
 * 官方专栏文档分类导航树组件（Catalog Tree）。
 * 支持层级展开折叠、章节定位、文档点击无缝切换多网页。
 * 遵循 SRP：根据 activeSlug 自动展开所在路径并高亮。
 */

import { createEffect, createSignal, For, Show } from "solid-js";
import type { CatalogNode } from "@yohu/api";

export interface CatalogTreeProps {
  nodes: CatalogNode[];
  activeSlug?: string;
  onSelectDoc: (slug: string) => void;
  loading?: boolean;
}

/**
 * 辅助检查某个节点及其子树是否包含指定的 slug
 */
function nodeContainsSlug(node: CatalogNode, slug?: string): boolean {
  if (!slug) return false;
  if (node.slug === slug) return true;
  if (!node.children || node.children.length === 0) return false;
  return node.children.some((child) => nodeContainsSlug(child, slug));
}

function CatalogItem(props: {
  node: CatalogNode;
  level: number;
  activeSlug?: string;
  onSelectDoc: (slug: string) => void;
}) {
  const hasChildren = () => (props.node.children?.length ?? 0) > 0;
  
  // 默认展开前两层，或者当子节点包含当前激活的文档时自动展开
  const initialOpen = () => props.level < 2 || nodeContainsSlug(props.node, props.activeSlug);
  const [open, setOpen] = createSignal(initialOpen());

  // 监听 activeSlug 变化：若子树中包含新激活的文档，自动展开本节点
  createEffect(() => {
    if (nodeContainsSlug(props.node, props.activeSlug)) {
      setOpen(true);
    }
  });

  const isCurrentActive = () => {
    if (!props.activeSlug) return false;
    return props.node.slug === props.activeSlug;
  };

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (hasChildren()) {
      setOpen(!open());
    }
    if (props.node.slug) {
      props.onSelectDoc(props.node.slug);
    }
  };

  return (
    <div class="yo-catalog-node" style={{ "margin-left": `${props.level * 10}px` }}>
      <div
        class={`yo-catalog-row ${isCurrentActive() ? "yo-catalog-row--active" : ""}`}
        onClick={handleClick}
        title={props.node.name}
      >
        <Show when={hasChildren()} fallback={<span class="yo-catalog-leaf-dot" />}>
          <span class={`yo-catalog-arrow ${open() ? "yo-catalog-arrow--open" : ""}`}>
            ▶
          </span>
        </Show>

        <span class="yo-catalog-name">{props.node.name}</span>
      </div>

      <Show when={hasChildren() && open()}>
        <div class="yo-catalog-children">
          <For each={props.node.children}>
            {(child) => (
              <CatalogItem
                node={child}
                level={props.level + 1}
                activeSlug={props.activeSlug}
                onSelectDoc={props.onSelectDoc}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export function CatalogTree(props: CatalogTreeProps) {
  return (
    <aside class="yo-catalog-sidebar">
      <div class="yo-catalog-header">
        <span class="yo-catalog-title">专栏章节目录</span>
        <Show when={props.loading}>
          <span class="yo-catalog-loading-badge">加载中…</span>
        </Show>
      </div>

      <div class="yo-catalog-scroll">
        <Show
          when={props.nodes && props.nodes.length > 0}
          fallback={
            <div class="yo-catalog-empty">
              {props.loading ? "正在加载专栏目录树…" : "该文档无专栏树或为通用网页"}
            </div>
          }
        >
          <For each={props.nodes}>
            {(node) => (
              <CatalogItem
                node={node}
                level={0}
                activeSlug={props.activeSlug}
                onSelectDoc={props.onSelectDoc}
              />
            )}
          </For>
        </Show>
      </div>
    </aside>
  );
}
