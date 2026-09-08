import { createSignal, onCleanup, onMount } from "solid-js";

import {
  listenWindowResize,
  windowClose,
  windowIsMaximized,
  windowMinimize,
  windowToggleMaximize,
} from "@yohu/api";
import type { WindowCaptionButtonsProps } from "@yohu/ui";

export function createWindowSession() {
  const [maximized, setMaximized] = createSignal(false);

  onMount(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      setMaximized(await windowIsMaximized());
      unlisten = await listenWindowResize(async () => {
        setMaximized(await windowIsMaximized());
      });
    })();
    onCleanup(() => unlisten?.());
  });

  const caption = (): WindowCaptionButtonsProps => ({
    maximized: maximized(),
    onMinimize: () => {
      void windowMinimize();
    },
    onToggleMaximize: () => {
      void (async () => {
        await windowToggleMaximize();
        setMaximized(await windowIsMaximized());
      })();
    },
    onClose: () => {
      void windowClose();
    },
  });

  return { maximized, caption };
}
