import { For, Show } from "solid-js";

import { channelTabLabel, HUAWEI_CHANNELS } from "../catalogPolicy";
import type { PreviewStore } from "../store";

export function ChannelBar(props: { store: PreviewStore }) {
  const catalogId = () =>
    props.store.session().catalogId || props.store.session().meta?.docRef.catalog || "";
  const active = () => channelTabLabel(catalogId());
  const visible = () =>
    Boolean(active()) || props.store.session().meta?.docRef.sourceId === "huawei-harmonyos";
  const loading = () => props.store.session().status === "loading";

  return (
    <Show when={visible()}>
      <div class="yo-channelbar" role="navigation" aria-label="文档频道">
        <span class="yo-channelbar__brand">HarmonyOS</span>
        <div class="yo-channelbar__nav">
          <For each={HUAWEI_CHANNELS}>
            {(ch) => (
              <button
                type="button"
                classList={{ "yo-channelbar__item": true, "is-on": ch.label === active() }}
                disabled={loading() && props.store.session().url === ch.url}
                onClick={() => void props.store.fetchDoc(ch.url)}
              >
                {ch.label}
              </button>
            )}
          </For>
        </div>
        <Show when={loading()}>
          <span class="yo-channelbar__status">正在打开…</span>
        </Show>
      </div>
    </Show>
  );
}
