import { createSignal, onCleanup, onMount } from "solid-js";

import {
  onSettingsChanged,
  settingsGet,
  settingsSet,
  windowApplyAppearance,
  type AppSettings,
  type Theme,
} from "@yohu/api";
import {
  applyThemePreference,
  bootAppearance,
  readThemeHint,
  systemPrefersDark,
  type Appearance,
} from "@yohu/ui";

const FALLBACK_SETTINGS: AppSettings = {
  libraryRoot: "",
  concurrency: 4,
  requestTimeoutSec: 15,
  imageDownload: true,
  theme: "system",
};

export function createSettingsSession() {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [theme, setThemeState] = createSignal<Theme>(readThemeHint() ?? "system");
  const [resolved, setResolved] = createSignal<Appearance>(bootAppearance());
  const [error, setError] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);
  let pendingTheme: Theme | null = null;

  const paint = (next: Theme) => {
    setThemeState(next);
    const appearance = applyThemePreference(next, systemPrefersDark());
    setResolved(appearance);
    void windowApplyAppearance(next, appearance);
  };

  onMount(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (theme() === "system") paint("system");
    };
    media.addEventListener("change", onSystemChange);

    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const snapshot = await settingsGet();
        setSettings(snapshot);
        if (pendingTheme) {
          const queued = pendingTheme;
          pendingTheme = null;
          await patch({ theme: queued });
        } else {
          paint(snapshot.theme);
        }
        setError(null);
      } catch (cause) {
        setError(toUserError(cause));
        setSettings(FALLBACK_SETTINGS);
        paint(theme());
      }
      try {
        unlisten = await onSettingsChanged((event) => {
          setSettings(event.settings);
          paint(event.settings.theme);
        });
      } catch {
        /* vite / 无事件总线 */
      }
    })();

    onCleanup(() => {
      media.removeEventListener("change", onSystemChange);
      unlisten?.();
    });
  });

  const patch = async (partial: Partial<AppSettings>) => {
    const current = settings();
    if (!current) {
      if (partial.theme) pendingTheme = partial.theme;
      return;
    }
    const next = { ...current, ...partial };
    setSettings(next);
    if (partial.theme) paint(partial.theme);
    setSaving(true);
    try {
      setSettings(await settingsSet(next));
      setError(null);
    } catch (cause) {
      setError(toUserError(cause));
      try {
        const snapshot = await settingsGet();
        setSettings(snapshot);
        paint(snapshot.theme);
      } catch {
        /* keep optimistic */
      }
    } finally {
      setSaving(false);
    }
  };

  const setTheme = (next: Theme) => {
    paint(next);
    void patch({ theme: next });
  };

  return { settings, theme, resolved, error, saving, patch, setTheme };
}

export type SettingsSession = ReturnType<typeof createSettingsSession>;

function toUserError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/invoke/i.test(message)) {
    return "未能连接工作台服务，当前显示默认可预览值。";
  }
  return message;
}
