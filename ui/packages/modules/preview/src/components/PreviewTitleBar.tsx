import { DISPLAY_NAME, type Theme } from "@yohu/api";
import {
  IconGear,
  YoAppNameButton,
  YoChromeButton,
  YoThemeChromeButton,
  YoTitleBar,
  type Appearance,
  type WindowCaptionButtonsProps,
} from "@yohu/ui";
import { Show } from "solid-js";

import type { PreviewStore } from "../store";

export function PreviewTitleBar(props: {
  store: PreviewStore;
  window: WindowCaptionButtonsProps;
  appearance?: Appearance;
  onSetTheme?: (theme: Theme) => void;
  onOpenSettings?: () => void;
}) {
  return (
    <YoTitleBar
      window={props.window}
      actions={
        <Show when={props.onSetTheme || props.onOpenSettings}>
          <Show when={props.onSetTheme}>
            <YoThemeChromeButton
              appearance={props.appearance ?? "light"}
              onSelect={(theme) => props.onSetTheme?.(theme)}
            />
          </Show>
          <Show when={props.onOpenSettings}>
            <YoChromeButton title="工作台设置" onClick={() => props.onOpenSettings?.()}>
              <IconGear class="yo-icon-md" />
            </YoChromeButton>
          </Show>
        </Show>
      }
    >
      <YoAppNameButton name={DISPLAY_NAME} onClick={() => props.store.resetToHome()} />
    </YoTitleBar>
  );
}
