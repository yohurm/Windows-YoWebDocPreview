import { MotionSpec, type MotionDurationName } from "../tokens/motion";

/**
 * Presence 配方。只保留 opacity / transform。
 */
export type PresenceRecipe = "dialog" | "toast" | "popover" | "fade" | "fade-local" | "chip";

export const PRESENCE_EXIT_DURATION: Record<PresenceRecipe, MotionDurationName> = {
  dialog: MotionSpec.spatialExit.duration,
  toast: MotionSpec.effectsExit.duration,
  popover: MotionSpec.effectsExit.duration,
  fade: MotionSpec.effectsExit.duration,
  "fade-local": MotionSpec.effectsExit.duration,
  chip: MotionSpec.effectsExit.duration,
};

export const PRESENCE_EXIT_SAFETY_MS = 50;

/** 占位立刻到位，不播出场。 */
export const SNAP_EXIT_RECIPES: ReadonlySet<PresenceRecipe> = new Set(["chip"]);

export const INDICATOR_DURATION: MotionDurationName = MotionSpec.spatialSmall.duration;

/** 栏位：槽位直切 + 栏体 translate。禁止 width / grid 插值。 */
export const RAIL_MOTION = "overlay-transform" as const;
