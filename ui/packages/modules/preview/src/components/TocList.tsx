import { For, createEffect } from "solid-js";
import type { JSX } from "solid-js";

import type { TocItem } from "../model";

export function TocList(props: {
  items: TocItem[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onReveal?: (item: HTMLElement) => void;
}) {
  let root: HTMLElement | undefined;

  createEffect(() => {
    const id = props.activeId;
    if (!id || !root) return;
    const item = [...root.querySelectorAll<HTMLElement>(".yo-toc__item")].find(
      (el) => el.dataset.id === id
    );
    if (item) props.onReveal?.(item);
  });

  return (
    <nav ref={root} class="yo-toc__list" aria-label="大纲">
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            data-id={item.id}
            classList={{ "yo-toc__item": true, "is-on": props.activeId === item.id }}
            style={{ "--yo-level": String(Math.max(item.level, 1)) } as JSX.CSSProperties}
            onClick={() => props.onOpen(item.id)}
            title={item.text}
          >
            {item.text}
          </button>
        )}
      </For>
    </nav>
  );
}
