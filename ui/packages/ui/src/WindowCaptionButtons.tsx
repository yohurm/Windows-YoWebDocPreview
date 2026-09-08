/**
 * Windows 11 自绘标题栏三键。几何与命中区对齐 WinUI AppWindowTitleBar：
 * 宽 46px、高与标题栏齐平、直角、贴窗口右上角；关闭键悬停用系统红。
 */

import { Show, type JSX } from "solid-js";

export interface WindowCaptionButtonsProps {
  maximized: boolean;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

export function WindowCaptionButtons(props: WindowCaptionButtonsProps): JSX.Element {
  return (
    <div class="yo-win-caption">
      <button
        type="button"
        class="yo-win-caption__btn"
        title="最小化"
        aria-label="最小化"
        onClick={(event) => {
          event.stopPropagation();
          props.onMinimize();
        }}
      >
        <svg class="yo-win-caption__glyph" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M0 5h10v1H0z" />
        </svg>
      </button>
      <button
        type="button"
        class="yo-win-caption__btn"
        title={props.maximized ? "向下还原" : "最大化"}
        aria-label={props.maximized ? "向下还原" : "最大化"}
        onClick={(event) => {
          event.stopPropagation();
          props.onToggleMaximize();
        }}
      >
        <Show
          when={props.maximized}
          fallback={
            <svg class="yo-win-caption__glyph" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 1h8v8H1zm1 1v6h6V2z" />
            </svg>
          }
        >
          <svg class="yo-win-caption__glyph" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M3 1h6v6H8V2H3zm-2 2h6v6H1zm1 1v4h4V4z" />
          </svg>
        </Show>
      </button>
      <button
        type="button"
        class="yo-win-caption__btn yo-win-caption__btn--close"
        title="关闭"
        aria-label="关闭"
        onClick={(event) => {
          event.stopPropagation();
          props.onClose();
        }}
      >
        <svg class="yo-win-caption__glyph" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M0.85 0.15 5 4.3 9.15 0.15 9.85 0.85 5.7 5 9.85 9.15 9.15 9.85 5 5.7 0.85 9.85 0.15 9.15 4.3 5 0.15 0.85z" />
        </svg>
      </button>
    </div>
  );
}
