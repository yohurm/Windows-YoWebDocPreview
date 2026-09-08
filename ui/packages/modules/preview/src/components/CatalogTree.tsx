import { For, Show } from "solid-js";

import type { CatalogNode } from "@yohu/api";

export interface CatalogTreeProps {
  nodes: CatalogNode[];
  activeSlug?: string;
  expandedKeys: Set<string>;
  onToggleNode: (id: string) => void;
  onSelectDoc: (slug: string) => void;
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
  const isCurrentActive = () => Boolean(props.activeSlug) && props.node.slug === props.activeSlug;

  const handleTwistieClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (hasChildren()) props.onToggleNode(props.node.id);
  };

  const handleRowClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (props.node.slug) props.onSelectDoc(props.node.slug);
    if (hasChildren()) props.onToggleNode(props.node.id);
  };

  return (
    <div class="yo-tree-node">
      <div
        classList={{
          "yo-tree-row": true,
          "yo-catalog-row": true,
          "yo-tree-row--active": isCurrentActive(),
          "yo-catalog-row--active": isCurrentActive(),
        }}
        data-depth={props.level}
        onClick={handleRowClick}
        title={props.node.name}
      >
        <Show when={hasChildren()} fallback={<span class="yo-tree-dot yo-catalog-leaf-dot" />}>
          <span
            classList={{
              "yo-tree-arrow": true,
              "yo-catalog-arrow": true,
              "yo-tree-arrow--open": isExpanded(),
              "yo-catalog-arrow--open": isExpanded(),
            }}
            onClick={handleTwistieClick}
            title={isExpanded() ? "折叠此组" : "展开此组"}
          >
            ▶
          </span>
        </Show>
        <span class="yo-tree-name yo-catalog-name">{props.node.name}</span>
      </div>
      <Show when={hasChildren() && isExpanded()}>
        <div class="yo-tree-children">
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
    <div class="yo-tree-container">
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
    </div>
  );
}
