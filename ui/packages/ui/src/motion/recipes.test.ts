import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { MotionSpec, motionDurationMs } from "../tokens/motion";
import {
  INDICATOR_DURATION,
  PRESENCE_EXIT_DURATION,
  RAIL_MOTION,
  SNAP_EXIT_RECIPES,
} from "./recipes";

function loadMotionCss(): string {
  const candidates = [
    resolve(process.cwd(), "src/tokens/motion.css"),
    resolve(process.cwd(), "packages/ui/src/tokens/motion.css"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf-8");
    }
  }
  return "";
}

describe("motion recipes", () => {
  it("配方时长从 MotionSpec 派生，禁止散落毫秒", () => {
    expect(INDICATOR_DURATION).toBe(MotionSpec.spatialSmall.duration);
    expect(motionDurationMs(INDICATOR_DURATION)).toBe(150);
  });

  it("Presence 只保留合成器配方，chip 出场直切", () => {
    expect(PRESENCE_EXIT_DURATION.dialog).toBe(MotionSpec.spatialExit.duration);
    expect(PRESENCE_EXIT_DURATION.toast).toBe(MotionSpec.effectsExit.duration);
    expect(PRESENCE_EXIT_DURATION.popover).toBe(MotionSpec.effectsExit.duration);
    expect(PRESENCE_EXIT_DURATION.fade).toBe(MotionSpec.effectsExit.duration);
    expect(PRESENCE_EXIT_DURATION["fade-local"]).toBe(MotionSpec.effectsExit.duration);
    expect(PRESENCE_EXIT_DURATION.chip).toBe(MotionSpec.effectsExit.duration);
    expect(SNAP_EXIT_RECIPES.has("chip")).toBe(true);
    expect(SNAP_EXIT_RECIPES.has("fade")).toBe(false);
    expect(PRESENCE_EXIT_DURATION).not.toHaveProperty("list");
    expect(PRESENCE_EXIT_DURATION).not.toHaveProperty("rise");
  });

  it("motion.css 禁止 width / height / 0fr / swap / collapse 配方", () => {
    const css = loadMotionCss();
    expect(css).not.toContain("yohu-collapse");
    expect(css).not.toContain("yohu-swap");
    expect(css).not.toContain("yohu-recipe-dismiss-fade");
    expect(css).not.toContain('data-recipe="list"');
    expect(css).not.toContain('data-recipe="rise"');
    expect(css).not.toContain("yohu-recipe-inline-end");
    expect(css).not.toContain("yohu-presence__clip");
    expect(css).not.toContain("grid-template-rows: 0fr");
    expect(css).not.toContain("transition: height");
    expect(css).not.toContain("transition: width var(--yohu-motion-spatial-panel)");
  });

  it("补 fade-local、chip 与 crossfade", () => {
    const css = loadMotionCss();
    expect(css).toContain('data-recipe="fade-local"');
    expect(css).toContain('data-recipe="chip"');
    expect(css).toContain("yohu-recipe-crossfade");
    expect(css).toContain("yohu-recipe-tree-chevron--end");
    expect(css).toContain("yohu-slide-end-in");
  });

  it("rail 槽位直切，栏体只过渡 transform", () => {
    expect(RAIL_MOTION).toBe("overlay-transform");
    const css = loadMotionCss();
    expect(css).toContain("yohu-recipe-rail-pane");
    const railBlock = css.slice(css.indexOf("配方 rail"));
    const untilChevron = railBlock.slice(0, railBlock.indexOf("yohu-recipe-tree-chevron"));
    expect(untilChevron).toContain("transition: transform var(--yohu-motion-spatial-panel)");
    expect(untilChevron).not.toContain("transition: width");
    expect(untilChevron).not.toContain("grid-template-columns");
  });
});
