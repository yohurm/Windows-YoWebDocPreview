/**
 * YoPresence —— 进场挂载、出场播完再卸载。
 * 只驱动 opacity / transform 关键帧；禁止再接 height / width / 0fr。
 * chip 占位直切，不播出场。
 */
import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";
import { motionDurationMs } from "../tokens/motion";
import {
  PRESENCE_EXIT_DURATION,
  PRESENCE_EXIT_SAFETY_MS,
  SNAP_EXIT_RECIPES,
  type PresenceRecipe,
} from "./recipes";
import { shouldSkipMotion } from "./reduced";

export type { PresenceRecipe };

export interface YoPresenceProps {
  when: boolean;
  recipe?: PresenceRecipe;
  onExitComplete?: () => void;
  children: JSX.Element;
}

export function YoPresence(props: YoPresenceProps): JSX.Element {
  const [present, setPresent] = createSignal(Boolean(props.when));
  const [state, setState] = createSignal<"open" | "closed">(props.when ? "open" : "closed");
  const [exiting, setExiting] = createSignal(false);
  let host: HTMLDivElement | undefined;
  let exitGen = 0;

  const finishExit = (gen: number): void => {
    if (gen !== exitGen) return;
    if (!present()) return;
    setPresent(false);
    setExiting(false);
    props.onExitComplete?.();
  };

  createEffect(() => {
    const want = props.when;
    const recipe = props.recipe ?? "fade";
    if (want) {
      exitGen += 1;
      setExiting(false);
      setPresent(true);
      setState("open");
      return;
    }
    if (!present()) return;
    const gen = ++exitGen;
    setExiting(true);
    setState("closed");
    if (SNAP_EXIT_RECIPES.has(recipe) || shouldSkipMotion()) {
      finishExit(gen);
      return;
    }
    const ms = motionDurationMs(PRESENCE_EXIT_DURATION[recipe]) + PRESENCE_EXIT_SAFETY_MS;
    const timer = window.setTimeout(() => finishExit(gen), ms);
    const onAnimationEnd = (event: AnimationEvent): void => {
      if (event.target !== host) return;
      if (!String(event.animationName).includes("-out")) return;
      window.clearTimeout(timer);
      finishExit(gen);
    };
    host?.addEventListener("animationend", onAnimationEnd);
    onCleanup(() => {
      window.clearTimeout(timer);
      host?.removeEventListener("animationend", onAnimationEnd);
    });
  });

  return (
    <Show when={present()}>
      <div
        ref={(el) => {
          host = el;
        }}
        class="yohu-presence"
        data-state={state()}
        data-recipe={props.recipe ?? "fade"}
        data-exiting={exiting() ? "" : undefined}
      >
        {props.children}
      </div>
    </Show>
  );
}
