import { Show, type JSX } from "solid-js";

import { WindowCaptionButtons, type WindowCaptionButtonsProps } from "./WindowCaptionButtons";

export interface YoTitleBarProps {
  leading?: JSX.Element;
  children?: JSX.Element;
  actions?: JSX.Element;
  window: WindowCaptionButtonsProps;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("button, a, input, select, textarea, [role='button']") !== null
  );
}

export function YoTitleBar(props: YoTitleBarProps): JSX.Element {
  return (
    <header
      class="yo-titlebar"
      data-tauri-drag-region
      onDblClick={(event) => {
        if (isInteractiveTarget(event.target)) return;
        props.window.onToggleMaximize();
      }}
    >
      <div class="yo-titlebar__leading" data-tauri-drag-region>
        {props.leading}
      </div>
      <div class="yo-titlebar__center" data-tauri-drag-region>
        <Show when={props.children}>
          <div class="yo-titlebar__center-slot">
            {props.children}
          </div>
        </Show>
      </div>
      <div class="yo-titlebar__trailing">
        <Show when={props.actions}>
          <div class="yo-titlebar__actions">
            {props.actions}
          </div>
        </Show>
        <WindowCaptionButtons
          maximized={props.window.maximized}
          onMinimize={props.window.onMinimize}
          onToggleMaximize={props.window.onToggleMaximize}
          onClose={props.window.onClose}
        />
      </div>
    </header>
  );
}
