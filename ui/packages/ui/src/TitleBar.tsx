/**
 * YoTitleBar 现代 Windows 沉浸式标题栏组件。
 *
 * 遵循设计系统规范：
 * 1. 拖拽区域通过 data-tauri-drag-region 标记；
 * 2. 窗口操作按钮禁用拖拽 (no-drag)；
 * 3. 集成品牌 Logo、应用名称、标题提示、自定义居中工具插槽、右上角操作与 Windows 标准三键。
 */

import { For, Show, type JSX } from "solid-js";
import { IconClose, IconMaximize, IconMinimize, IconRestore } from "./components";

export interface NavItem {
  id: string;
  label: string;
  icon?: JSX.Element;
}

export interface YoTitleBarProps {
  /** 窗口标题 */
  title: string;
  /** 副标题或文档状态提示 */
  subtitle?: string;
  /** 应用图标或 Logo */
  icon?: JSX.Element;
  /** 导航条目（用于多模块分段切换） */
  navItems?: NavItem[];
  /** 当前选中的导航条目 ID */
  activeNavId?: string;
  /** 切换导航条目回调 */
  onNavSelect?: (id: string) => void;
  /** 中间自定义区域（如全局搜索或分段指示器） */
  children?: JSX.Element;
  /** 三键左侧的操作插槽 */
  actions?: JSX.Element;
  /** 当前是否最大化 */
  maximized?: boolean;
  /** 最小化回调 */
  onMinimize?: () => void;
  /** 切换最大化/还原回调 */
  onToggleMaximize?: () => void;
  /** 关闭窗口回调 */
  onClose?: () => void;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button, a, input, select, textarea, [role='button']") !== null;
}

export function YoTitleBar(props: YoTitleBarProps): JSX.Element {
  return (
    <header
      class="yo-titlebar"
      data-tauri-drag-region
      onDblClick={(e) => {
        if (isInteractiveTarget(e.target)) return;
        props.onToggleMaximize?.();
      }}
    >
      {/* 品牌与标题 */}
      <div class="yo-titlebar__brand" data-tauri-drag-region>
        <Show when={props.icon}>
          <div class="yo-titlebar__icon">{props.icon}</div>
        </Show>
        <div class="yo-titlebar__titles" data-tauri-drag-region>
          <span class="yo-titlebar__title">{props.title}</span>
          <Show when={props.subtitle}>
            <span class="yo-titlebar__subtitle">{props.subtitle}</span>
          </Show>
        </div>
      </div>

      {/* 居中区域（地址输入/快速命令栏/分段控制） */}
      <div class="yo-titlebar__center" data-tauri-drag-region>
        <Show when={props.navItems && props.navItems.length > 0}>
          <nav class="yo-titlebar__nav" aria-label="主要导航">
            <For each={props.navItems}>
              {(item) => (
                <button
                  type="button"
                  class={`yo-titlebar__nav-btn ${props.activeNavId === item.id ? "active" : ""}`}
                  onClick={() => props.onNavSelect?.(item.id)}
                >
                  <Show when={item.icon}>
                    <span class="yo-titlebar__nav-icon">{item.icon}</span>
                  </Show>
                  <span class="yo-titlebar__nav-label">{item.label}</span>
                </button>
              )}
            </For>
          </nav>
        </Show>
        {props.children}
      </div>

      {/* 右侧动作与 Windows 标准三键 */}
      <div class="yo-titlebar__trailing">
        <Show when={props.actions}>
          <div class="yo-titlebar__actions">{props.actions}</div>
        </Show>

        <div class="yo-titlebar__controls">
          <button
            type="button"
            class="yo-titlebar__btn"
            title="最小化"
            aria-label="最小化"
            onClick={() => props.onMinimize?.()}
          >
            <IconMinimize />
          </button>
          <button
            type="button"
            class="yo-titlebar__btn"
            title={props.maximized ? "还原" : "最大化"}
            aria-label={props.maximized ? "还原" : "最大化"}
            onClick={() => props.onToggleMaximize?.()}
          >
            <Show when={props.maximized} fallback={<IconMaximize />}>
              <IconRestore />
            </Show>
          </button>
          <button
            type="button"
            class="yo-titlebar__btn yo-titlebar__btn--close"
            title="关闭"
            aria-label="关闭"
            onClick={() => props.onClose?.()}
          >
            <IconClose />
          </button>
        </div>
      </div>
    </header>
  );
}
