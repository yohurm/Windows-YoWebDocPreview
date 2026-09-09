/** YoUI 基础控件：图标、按钮、输入、卡片。目录树与空态由各模块自有视图承担。 */

import type { JSX } from "solid-js";
import { Show } from "solid-js";

export function IconGlobe(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );
}

export function IconCode(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );
}

export function IconSearch(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

export function IconDocument(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}

export function IconCheck(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

export function IconList(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );
}

export function IconChevron(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.2 2.2 8 6 4.2 9.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function IconFolder(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

export function IconGear(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}

export function YoButton(props: {
  onClick?: () => void;
  disabled?: boolean;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  icon?: JSX.Element;
  children: JSX.Element;
}) {
  const cls = () => {
    switch (props.kind) {
      case "secondary":
        return "yo-btn yo-btn--secondary";
      case "danger":
        return "yo-btn yo-btn--danger";
      case "ghost":
        return "yo-btn yo-btn--ghost";
      default:
        return "yo-btn";
    }
  };

  return (
    <button class={cls()} disabled={props.disabled} onClick={() => props.onClick?.()}>
      {props.icon}
      {props.children}
    </button>
  );
}

export function YoTextField(props: {
  value: string;
  onInput: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  disabled?: boolean;
  icon?: JSX.Element;
}) {
  return (
    <div class="yo-field">
      <Show when={props.icon}>
        <div class="yo-field__icon">{props.icon}</div>
      </Show>
      <input
        class="yo-input"
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") props.onEnter?.();
        }}
      />
    </div>
  );
}

export function YoCard(props: { class?: string; children?: JSX.Element }) {
  return <div class={`yo-card ${props.class ?? ""}`}>{props.children}</div>;
}
