/** 外观解析：设置偏好 → 实际浅色/深色。不读 IPC。 */

export type ThemePreference = "system" | "light" | "dark";
export type Appearance = "light" | "dark";

export const THEME_HINT_KEY = "yo-theme";
export const APPEARANCE_HINT_KEY = "yo-appearance";

export function systemPrefersDark(
  media: { matches: boolean } = window.matchMedia("(prefers-color-scheme: dark)"),
): boolean {
  return media.matches;
}

export function resolveAppearance(theme: ThemePreference, systemDark: boolean): Appearance {
  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}

export function oppositeAppearance(appearance: Appearance): Appearance {
  return appearance === "dark" ? "light" : "dark";
}

export function readThemeHint(
  storage: Pick<Storage, "getItem"> | undefined = storageOrUndefined(),
): ThemePreference | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(THEME_HINT_KEY);
    if (value === "system" || value === "light" || value === "dark") return value;
  } catch {
    /* private mode */
  }
  return null;
}

export function applyAppearance(
  appearance: Appearance,
  root: HTMLElement = document.documentElement,
): void {
  root.setAttribute("data-theme", appearance);
  root.style.colorScheme = appearance;
}

export function persistThemeHint(
  theme: ThemePreference,
  appearance: Appearance,
  storage: Pick<Storage, "setItem"> | undefined = storageOrUndefined(),
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_HINT_KEY, theme);
    storage.setItem(APPEARANCE_HINT_KEY, appearance);
  } catch {
    /* private mode */
  }
}

/** 启动画一帧用：有缓存偏好则解析，否则跟随系统。 */
export function bootAppearance(
  systemDark = systemPrefersDark(),
  storage?: Pick<Storage, "getItem">,
): Appearance {
  return resolveAppearance(readThemeHint(storage) ?? "system", systemDark);
}

export function applyThemePreference(
  theme: ThemePreference,
  systemDark = systemPrefersDark(),
  root?: HTMLElement,
  storage?: Pick<Storage, "getItem" | "setItem">,
): Appearance {
  const appearance = resolveAppearance(theme, systemDark);
  applyAppearance(appearance, root);
  persistThemeHint(theme, appearance, storage);
  return appearance;
}

function storageOrUndefined(): Pick<Storage, "getItem" | "setItem"> | undefined {
  try {
    const storage = globalThis.localStorage;
    if (storage && typeof storage.getItem === "function" && typeof storage.setItem === "function") {
      return storage;
    }
  } catch {
    /* private mode / jsdom stub */
  }
  return undefined;
}
