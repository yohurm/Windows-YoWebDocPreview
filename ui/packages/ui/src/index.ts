/** @yohu/ui — 组件库对外名 YoUI。 */

export * from "./components";
export * from "./ChromeButton";
export * from "./TitleBar";
export * from "./WindowCaptionButtons";
export * from "./theme";
export * from "./themeControls";
export {
  MotionDuration,
  MotionEasing,
  MotionSpec,
  motionDurationMs,
  motionSpecMs,
} from "./tokens/motion";
export type {
  MotionDurationName,
  MotionEasingName,
  MotionSpecName,
} from "./tokens/motion";
export {
  YoPresence,
  YoIndicator,
  YoStage,
  prefersReducedMotion,
  shouldSkipMotion,
  RAIL_MOTION,
  SNAP_EXIT_RECIPES,
} from "./motion";
export type {
  YoPresenceProps,
  YoIndicatorProps,
  IndicatorVariant,
  YoStageProps,
  PresenceRecipe,
} from "./motion";
