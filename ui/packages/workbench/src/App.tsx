import { createSignal, For, Show } from "solid-js";

import { modules } from "./registry";
import { SettingsPage } from "./SettingsView";
import { createWindowSession } from "./windowSession";

export function App() {
  const registered = modules();
  const windowSession = createWindowSession();
  const [settingsOpen, setSettingsOpen] = createSignal(false);

  return (
    <Show
      when={!settingsOpen()}
      fallback={
        <SettingsPage window={windowSession.caption()} onBack={() => setSettingsOpen(false)} />
      }
    >
      <For each={registered}>
        {(mod) => (
          <mod.Component
            window={windowSession.caption()}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
      </For>
    </Show>
  );
}

export default App;
