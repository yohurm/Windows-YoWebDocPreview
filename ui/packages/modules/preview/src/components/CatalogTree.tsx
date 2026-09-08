/**
 * 官方专栏文档分类导航树组件（Catalog Tree）。
 * 深度参照 VS Code Tree / VitePress Sidebar 架构模型：
 * 1. 受控/扁平化折叠展开状态管理器（支持点击箭头切换当前节点，点击整行定位切换文档）；
 * 2. 区分用户显式操作折叠与路径自动探测展开（用户折叠的节点不被自动强制反复展开）；
 * 3. 头部提供整栏快捷折叠操作，并支持加载中与空状态指示。
 */

import { createEffect, createMemo, For, Show } from "solid-js";
import { IconSidebar } from "@yohu/ui";
import type { CatalogNode } from "@yohu/api";

export interface CatalogTreeProps {
  nodes: CatalogNode[];
  activeSlug?: string;
  expandedKeys: Set<string>;
  onToggleNode: (id: string) => void;
  onToggleAll?: (expandAll: boolean) => void;
  onSelectDoc: (slug: string) => void;
  onCloseSidebar?: () => void;
  loading?: boolean;
}

function CatalogItem(props: {
  node: CatalogNode;
  level: number;
  activeSlug?: string;
  expandedKeys: Set<string>;
  onToggleNode: (id: string) => void;
  onSelectDoc: (slug: string) => void;
}) {
  const hasChildren = () => (props.node.children?.length ?? 0) > 0;
  const isExpanded = () => props.expandedKeys.has(props.node.id);

  const isCurrentActive = () => {
    if (!props.activeSlug) return false;
    return props.node.slug === props.activeSlug;
  };

  const handleTwistieClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (hasChildren()) {
      props.onToggleNode(props.node.id);
    }
  };

  const handleRowClick = (e: MouseEvent) => {
    e.stopPropagation();
    // 参照 VS Code 与 VitePress 规范：
    // 若叶子节点或具有独立文档 slug 的节点，优先触发文档跳转联动
    if (props.node.slug) {
      props.onSelectDoc(props.node.slug);
    }
    // 若同时包含子章节且用户点击行（非外链），顺带联动展开以提升连贯交互感
    if (hasChildren()) {
      if (!isExpanded()) {
        props.onToggleNode(props.node.id);
      }
    }
  };

  return (
    <div class="yo-catalog-node" style={{ "margin-left": `${props.level * 10}px` }}>
      <div
        class={`yo-catalog-row ${isCurrentActive() ? "yo-catalog-row--active" : ""}`}
        onClick={handleRowClick}
        title={props.node.name}
      >
        <Show
          when={hasChildren()}
          fallback={<span class="yo-catalog-leaf-dot" />}
        >
          <span
            class={`yo-catalog-arrow ${isExpanded() ? "yo-catalog-arrow--open" : ""}`}
            onClick={handleTwistieClick}
            title={isExpanded() ? "折叠本组" : "展开本组"}
          >
            ▶
          </span>
        </Show>

        <span class="yo-catalog-name">{props.node.name}</span>
      </div>

      <Show when={hasChildren() && isExpanded()}>
        <div class="yo-catalog-children">
          <For each={props.node.children}>
            {(child) => (
              <CatalogItem
                node={child}
                level={props.level + 1}
                activeSlug={props.activeSlug}
                expandedKeys={props.expandedKeys}
                onToggleNode={props.onToggleNode}
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
        <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
          <span class="yo-catalog-title">专栏章节目录</span>
          <Show when={props.loading}>
            <span class="yo-catalog-loading-badge">加载中…</span>
          </Show>
        </div>

        <div style={{ display: "flex", "align-items": "center", gap: "4px" }}>
          <Show when={props.onToggleAll}>
            <button
              type="button"
              class="yo-catalog-btn-icon"
              onClick={() => props.onToggleAll?.(true)}
              title="全部展开"
            >
              <span style={{ "font-size": "13px", "font-weight": "700", "line-height": 1 }}>+</span>
            </button>
            <button
              type="button"
              class="yo-catalog-btn-icon"
              onClick={() => props.onToggleAll?.(false)}
              title="全部折叠"
            >
              <span style={{ "font-size": "13px", "font-weight": "700", "line-height": 1 }}>−</span>
            </button>
          </Show>

          <Show when={props.onCloseSidebar}>
            <button
              type="button"
              class="yo-catalog-btn-icon"
              onClick={props.onCloseSidebar}
              title="收起左侧专栏目录栏"
            >
              <IconSidebar style={{ width: "14px", height: "14px" }} />
            </button>
          </Show>
        </div>
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
                expandedKeys={props.expandedKeys}
                onToggleNode={props.onToggleNode}
                onSelectDoc={props.onSelectDoc}
              />
            )}
          </For>
        </Show>
      </div>
    </aside>
  );
}
