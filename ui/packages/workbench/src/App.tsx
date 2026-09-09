import { createSignal, For, Show } from "solid-js";
import { YoStage } from "@yohu/ui";

import { modules } from "./registry";
import { createSettingsSession } from "./settingsSession";
import { SettingsPage } from "./SettingsView";
import { createWindowSession } from "./windowSession";

export function App() {
  const registered = modules();
  const windowSession = createWindowSession();
  const settingsSession = createSettingsSession();
  const [settingsOpen, setSettingsOpen] = createSignal(false);

  const appearance = () => settingsSession.resolved();

  return (
    <YoStage keys={settingsOpen() ? "settings" : "workbench"}>
      <Show
        when={!settingsOpen()}
        fallback={
          <SettingsPage
            window={windowSession.caption()}
            session={settingsSession}
            onBack={() => setSettingsOpen(false)}
          />
        }
      >
        <For each={registered}>
          {(mod) => (
            <mod.Component
              window={windowSession.caption()}
              appearance={appearance()}
              onSetTheme={settingsSession.setTheme}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </For>
      </Show>
    </YoStage>
  );
}

export default App;
