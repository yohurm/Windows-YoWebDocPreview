import type { JSX } from "solid-js";
import { For, Show } from "solid-js";

import { YoChromeButton } from "./ChromeButton";
import { IconMonitor, IconMoon, IconSun } from "./components";
import { oppositeAppearance, type Appearance, type ThemePreference } from "./theme";

export function YoThemeChromeButton(props: {
  appearance: Appearance;
  onSelect: (theme: "light" | "dark") => void;
}): JSX.Element {
  const next = () => oppositeAppearance(props.appearance);
  const title = () => (next() === "dark" ? "切换深色模式" : "切换浅色模式");
  return (
    <YoChromeButton title={title()} onClick={() => props.onSelect(next())}>
      <Show when={next() === "dark"} fallback={<IconSun class="yo-icon-md" />}>
        <IconMoon class="yo-icon-md" />
      </Show>
    </YoChromeButton>
  );
}

const THEME_CARDS: {
  id: ThemePreference;
  label: string;
  hint: string;
  preview: "light" | "dark" | "system";
  icon: (iconProps: { class?: string }) => JSX.Element;
}[] = [
  {
    id: "light",
    label: "浅色",
    hint: "始终使用浅色工作台",
    preview: "light",
    icon: IconSun,
  },
  {
    id: "dark",
    label: "深色",
    hint: "始终使用深色工作台",
    preview: "dark",
    icon: IconMoon,
  },
  {
    id: "system",
    label: "跟随系统",
    hint: "与 Windows 浅色/深色同步",
    preview: "system",
    icon: IconMonitor,
  },
];

export function YoThemeCards(props: {
  preference: ThemePreference;
  onSelect: (theme: ThemePreference) => void;
}): JSX.Element {
  return (
    <div class="yo-theme-cards" role="radiogroup" aria-label="主题">
      <For each={THEME_CARDS}>
        {(card) => {
          const Icon = card.icon;
          const selected = () => props.preference === card.id;
          return (
            <button
              type="button"
              role="radio"
              aria-label={card.label}
              aria-checked={selected()}
              classList={{ "yo-theme-card": true, "is-on": selected() }}
              onClick={() => props.onSelect(card.id)}
            >
              <span
                class={`yo-theme-card__preview yo-theme-card__preview--${card.preview}`}
                aria-hidden="true"
              >
                <span class="yo-theme-card__chrome" />
                <span class="yo-theme-card__body">
                  <span class="yo-theme-card__sidebar" />
                  <span class="yo-theme-card__canvas" />
                </span>
              </span>
              <span class="yo-theme-card__meta">
                <span class="yo-theme-card__label">
                  <Icon class="yo-icon-md" />
                  {card.label}
                </span>
                <span class="yo-theme-card__hint">{card.hint}</span>
              </span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
