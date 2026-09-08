import "./preview.css";

import { Show } from "solid-js";

import type { WindowCaptionButtonsProps } from "@yohu/ui";

import { CanvasDock } from "./components/CanvasDock";
import { HeroWelcomeView } from "./components/HeroWelcomeView";
import { PreviewChrome } from "./components/PreviewChrome";
import { PrimarySidebar } from "./components/PrimarySidebar";
import { StatusBar } from "./components/StatusBar";
import { createPreviewStore } from "./store";

export function PreviewView(props: {
  window: WindowCaptionButtonsProps;
  onOpenSettings?: () => void;
}) {
  const store = createPreviewStore();

  return (
    <div class="yo-app">
      <PreviewChrome store={store} window={props.window} onOpenSettings={props.onOpenSettings} />
      <Show when={store.session().error && !store.hasDoc()}>
        <div class="yo-notice yo-notice--danger">{store.session().error}</div>
      </Show>
      <div class="yo-app__body">
        <Show
          when={store.hasDoc()}
          fallback={<HeroWelcomeView onSelectUrl={(url) => void store.fetchDoc(url)} />}
        >
          <div class="yo-workspace">
            <PrimarySidebar store={store} />
            <CanvasDock store={store} />
          </div>
        </Show>
      </div>
      <StatusBar store={store} />
    </div>
  );
}

export const descriptor = {
  id: "preview",
  title: "在线预览",
  Component: PreviewView,
};

export default PreviewView;
