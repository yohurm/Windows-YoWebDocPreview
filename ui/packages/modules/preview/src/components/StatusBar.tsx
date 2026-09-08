import { Show } from "solid-js";

import type { PreviewStore } from "../store";

export function StatusBar(props: { store: PreviewStore }) {
  const { store } = props;
  const session = () => store.session();

  return (
    <footer class="yo-statusbar">
      <div class="yo-statusbar__metrics">
        <Show when={session().durationMs !== null}>
          <span>耗时 {session().durationMs}ms</span>
        </Show>
        <Show when={session().meta?.updateTime}>
          <span>更新于 {session().meta?.updateTime}</span>
        </Show>
        <Show when={session().charCount > 0}>
          <span>规模 {session().charCount.toLocaleString()} 字</span>
        </Show>
        <Show when={session().meta?.channel}>
          <span>{session().meta?.channel === "adapter" ? "适配通道" : "通用网页"}</span>
        </Show>
      </div>
      <div class="yo-statusbar__side">
        <span>{store.hasDoc() ? "在线预览" : "就绪"}</span>
      </div>
    </footer>
  );
}
