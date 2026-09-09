import { afterEach, describe, expect, it } from "vitest";

import {
  APPEARANCE_HINT_KEY,
  applyAppearance,
  applyThemePreference,
  bootAppearance,
  oppositeAppearance,
  persistThemeHint,
  readThemeHint,
  resolveAppearance,
  THEME_HINT_KEY,
} from "./theme";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    snapshot: () => store,
  };
}

describe("resolveAppearance", () => {
  it("pins light and dark regardless of system", () => {
    expect(resolveAppearance("light", true)).toBe("light");
    expect(resolveAppearance("dark", false)).toBe("dark");
  });

  it("follows the system preference", () => {
    expect(resolveAppearance("system", true)).toBe("dark");
    expect(resolveAppearance("system", false)).toBe("light");
  });

  it("flips light and dark", () => {
    expect(oppositeAppearance("light")).toBe("dark");
    expect(oppositeAppearance("dark")).toBe("light");
  });
});

describe("applyAppearance", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  it("sets data-theme and color-scheme on the root", () => {
    applyAppearance("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("persists preference so the next boot can paint before IPC", () => {
    const storage = memoryStorage();
    persistThemeHint("dark", "dark", storage);
    expect(storage.snapshot()[THEME_HINT_KEY]).toBe("dark");
    expect(storage.snapshot()[APPEARANCE_HINT_KEY]).toBe("dark");
    expect(readThemeHint(storage)).toBe("dark");
    expect(bootAppearance(false, storage)).toBe("dark");
  });

  it("boot falls back to system when no hint is stored", () => {
    const storage = memoryStorage();
    expect(bootAppearance(true, storage)).toBe("dark");
    expect(bootAppearance(false, storage)).toBe("light");
  });

  it("applyThemePreference writes both the live root and the hint", () => {
    const storage = memoryStorage();
    const appearance = applyThemePreference("system", true, document.documentElement, storage);
    expect(appearance).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(readThemeHint(storage)).toBe("system");
  });
});
