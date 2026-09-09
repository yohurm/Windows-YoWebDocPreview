import { For, Show } from "solid-js";

export function DocumentPath(props: { crumbs: string[] }) {
  return (
    <div class="yo-doc-path">
      <For each={props.crumbs}>
        {(part, i) => (
          <>
            <Show when={i() > 0}>
              <span class="yo-doc-path__sep" aria-hidden="true">
                ›
              </span>
            </Show>
            <span classList={{ "yo-doc-path__title": i() === props.crumbs.length - 1 }}>{part}</span>
          </>
        )}
      </For>
    </div>
  );
}
