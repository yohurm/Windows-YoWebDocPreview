import { For, Show, createEffect } from "solid-js";
import type { JSX } from "solid-js";

import { IconChevron } from "@yohu/ui";
import type { CatalogNode } from "@yohu/api";

import { catalogContainsSlug } from "../catalogTree";
import { revealChild } from "../readingScroll";

export interface CatalogTreeProps {
  nodes: CatalogNode[];
  activeSlug?: string;
  expandedKeys: Set<string>;
  forceExpand?: boolean;
  onToggleNode: (id: string) => void;
  onSelectDoc: (slug: string) => void;
}

function CatalogItem(props: {
  node: CatalogNode;
  level: number;
  activeSlug?: string;
  expandedKeys: Set<string>;
  forceExpand?: boolean;
  onToggleNode: (id: string) => void;
  onSelectDoc: (slug: string) => void;
}) {
  const hasChildren = () => (props.node.children?.length ?? 0) > 0;
  const isExpanded = () => props.forceExpand || props.expandedKeys.has(props.node.id);
  const isCurrent = () => Boolean(props.activeSlug) && props.node.slug === props.activeSlug;
  const isBranchOn = () =>
    Boolean(props.activeSlug) &&
    !isCurrent() &&
    hasChildren() &&
    catalogContainsSlug(props.node, props.activeSlug!);

  const handleTwist = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (hasChildren()) props.onToggleNode(props.node.id);
  };

  const handleOpen = () => {
    if (props.node.slug) {
      props.onSelectDoc(props.node.slug);
      return;
    }
    if (hasChildren()) props.onToggleNode(props.node.id);
  };

  return (
    <div class="yo-tree__node">
      <div
        classList={{
          "yo-tree__row": true,
          "is-on": isCurrent(),
          "is-branch": isBranchOn(),
        }}
        style={{ "--yo-depth": String(props.level) } as JSX.CSSProperties}
        role="treeitem"
        aria-selected={isCurrent()}
        aria-expanded={hasChildren() ? isExpanded() : undefined}
        onClick={handleOpen}
        title={props.node.name}
      >
        <Show
          when={hasChildren()}
          fallback={<span class="yo-tree__twist yo-tree__twist--leaf" aria-hidden="true" />}
        >
          <button
            type="button"
            classList={{ "yo-tree__twist": true, "is-open": isExpanded() }}
            title={isExpanded() ? "折叠此组" : "展开此组"}
            aria-expanded={isExpanded()}
            onClick={handleTwist}
          >
            <IconChevron />
          </button>
        </Show>
        <span class="yo-tree__label" data-root={props.level === 0 ? "" : undefined}>
          {props.node.name}
        </span>
      </div>
      <Show when={hasChildren() && isExpanded()}>
        <div class="yo-tree__kids" role="group">
          <For each={props.node.children}>
            {(child) => (
              <CatalogItem
                node={child}
                level={props.level + 1}
                activeSlug={props.activeSlug}
                expandedKeys={props.expandedKeys}
                forceExpand={props.forceExpand}
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
  let root: HTMLElement | undefined;

  createEffect(() => {
    props.activeSlug;
    const row = root?.querySelector<HTMLElement>(".yo-tree__row.is-on");
    const pane = row?.closest<HTMLElement>(".yo-nav__body");
    if (row && pane) revealChild(pane, row);
  });

  return (
    <nav ref={root} class="yo-tree" aria-label="专栏目录" role="tree">
      <For each={props.nodes}>
        {(node) => (
          <CatalogItem
            node={node}
            level={0}
            activeSlug={props.activeSlug}
            expandedKeys={props.expandedKeys}
            forceExpand={props.forceExpand}
            onToggleNode={props.onToggleNode}
            onSelectDoc={props.onSelectDoc}
          />
        )}
      </For>
    </nav>
  );
}
