import { DISPLAY_NAME } from "@yohu/api";
import {
  IconGear,
  YoAppNameButton,
  YoChromeButton,
  YoTitleBar,
  type WindowCaptionButtonsProps,
} from "@yohu/ui";

import type { PreviewStore } from "../store";

export function PreviewTitleBar(props: {
  store: PreviewStore;
  window: WindowCaptionButtonsProps;
  onOpenSettings?: () => void;
}) {
  return (
    <YoTitleBar
      window={props.window}
      actions={
        props.onOpenSettings ? (
          <YoChromeButton title="工作台设置" onClick={() => props.onOpenSettings?.()}>
            <IconGear class="yo-icon-md" />
          </YoChromeButton>
        ) : undefined
      }
    >
      <YoAppNameButton name={DISPLAY_NAME} onClick={() => props.store.resetToHome()} />
    </YoTitleBar>
  );
}
