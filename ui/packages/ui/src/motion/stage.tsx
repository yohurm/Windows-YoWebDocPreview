/**
 * YoStage —— 身份变化时先播出场再换内容进场。
 * 内容切换禁止自写交叉淡入。
 */
import { children, createEffect, createSignal } from "solid-js";
import type { JSX } from "solid-js";

import { YoPresence } from "./presence";
import type { PresenceRecipe } from "./recipes";
import { shouldSkipMotion } from "./reduced";

export interface YoStageProps {
  /** 身份；变化时淡出旧树，再挂新树。 */
  keys: string;
  recipe?: PresenceRecipe;
  children: JSX.Element;
}

export function YoStage(props: YoStageProps): JSX.Element {
  const resolved = children(() => props.children);
  const [gate, setGate] = createSignal(true);
  const [view, setView] = createSignal<JSX.Element | null>(null);
  let shownKey = "";
  let pendingKey = "";
  let pendingView: JSX.Element | null = null;

  createEffect(() => {
    const nextKey = props.keys;
    const incoming = resolved();
    pendingKey = nextKey;
    pendingView = incoming;

    if (!shownKey) {
      shownKey = nextKey;
      setView(() => incoming);
      setGate(true);
      return;
    }

    if (nextKey === shownKey) {
      setView(() => incoming);
      if (!gate()) setGate(true);
      return;
    }

    if (shouldSkipMotion()) {
      shownKey = nextKey;
      setView(() => incoming);
      setGate(true);
      return;
    }

    if (gate()) setGate(false);
  });

  return (
    <YoPresence
      when={gate()}
      recipe={props.recipe ?? "fade"}
      onExitComplete={() => {
        shownKey = pendingKey;
        setView(() => pendingView);
        setGate(true);
      }}
    >
      {view() ?? resolved()}
    </YoPresence>
  );
}
