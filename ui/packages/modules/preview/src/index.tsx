import "./preview.css";

import { Show } from "solid-js";
import { DISPLAY_NAME } from "@yohu/api";
import type { WindowCaptionButtonsProps } from "@yohu/ui";

import { CanvasDock } from "./components/CanvasDock";
import { HomeStage } from "./components/HomeStage";
import { PreviewTitleBar } from "./components/PreviewTitleBar";
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
      <PreviewTitleBar
        store={store}
        window={props.window}
        onOpenSettings={props.onOpenSettings}
      />
      <div class="yo-app__body">
        <Show
          when={store.hasDoc()}
          fallback={<HomeStage store={store} />}
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
  title: DISPLAY_NAME,
  Component: PreviewView,
};

export default PreviewView;
