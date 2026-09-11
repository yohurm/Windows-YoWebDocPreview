import "./preview.css";
import "./engine/markdown/skin.css";
import "./engine/syntax/theme.css";
import "./engine/github/github-markdown.css";

import { Show } from "solid-js";
import { DISPLAY_NAME, type Theme } from "@yohu/api";
import { YoStage, type Appearance, type WindowCaptionButtonsProps } from "@yohu/ui";

import { CanvasDock } from "./components/CanvasDock";
import { HomeStage } from "./components/HomeStage";
import { PreviewTitleBar } from "./components/PreviewTitleBar";
import { PrimarySidebar } from "./components/PrimarySidebar";
import { StatusBar } from "./components/StatusBar";
import { createPreviewStore } from "./store";

export function PreviewView(props: {
  window: WindowCaptionButtonsProps;
  appearance?: Appearance;
  onSetTheme?: (theme: Theme) => void;
  onOpenSettings?: () => void;
}) {
  const store = createPreviewStore();

  return (
    <div class="yo-app">
      <PreviewTitleBar
        store={store}
        window={props.window}
        appearance={props.appearance}
        onSetTheme={props.onSetTheme}
        onOpenSettings={props.onOpenSettings}
      />
      <div class="yo-app__body">
        <YoStage keys={store.hasDoc() ? "doc" : "home"}>
          <Show
            when={store.hasDoc()}
            fallback={<HomeStage store={store} />}
          >
            <div
              class="yo-workspace yohu-recipe-rail"
              classList={{ "is-nav-collapsed": !store.sidebarOpen() }}
            >
              <PrimarySidebar store={store} />
              <CanvasDock store={store} appearance={props.appearance} />
            </div>
          </Show>
        </YoStage>
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
