/** YoUI 基础组件库（SolidJS）- 现代化视觉风格。 */

import type { JSX } from "solid-js";
import { For, Show, createSignal } from "solid-js";

// ── 图标组件 (轻量 SVG 内联，零额外网络依赖) ──

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

export function IconEye(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

export function IconSidebar(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>
  );
}

export function IconHistory(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 14 14"></polyline>
      <path d="M3.05 11a9 9 0 0 1 .5-2m-.5 2H7"></path>
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

export function IconMinimize(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 8h12v1.5H2z" />
    </svg>
  );
}

export function IconMaximize(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
    </svg>
  );
}

export function IconRestore(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
      <rect x="4.5" y="1.5" width="9" height="9" rx="1" />
      <path d="M2.5 5.5v8a1 1 0 0 0 1 1h8" />
    </svg>
  );
}

export function IconClose(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.2 2.15 8 6.95l4.8-4.8.85.85L8.85 7.8l4.8 4.8-.85.85L8 8.65l-4.8 4.8-.85-.85L7.15 7.8 2.35 3z" />
    </svg>
  );
}

export function IconExternal(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}

export function IconCopy(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
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

export function IconFolder(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

export function IconAlert(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
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

export function IconRefresh(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  );
}

export function IconDownload(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  );
}

export function IconSettings(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <svg class={props.class} style={props.style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}

// ── 按钮 YoButton ──

export function YoButton(props: {
  onClick?: () => void;
  disabled?: boolean;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  icon?: JSX.Element;
  children: JSX.Element;
  style?: JSX.CSSProperties;
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
    <button
      class={cls()}
      disabled={props.disabled}
      onClick={() => props.onClick?.()}
      style={props.style}
    >
      {props.icon}
      {props.children}
    </button>
  );
}

// ── 输入框 YoTextField ──

export function YoTextField(props: {
  value: string;
  onInput: (v: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  disabled?: boolean;
  icon?: JSX.Element;
  style?: JSX.CSSProperties;
}) {
  return (
    <div style={{ position: "relative", display: "flex", "align-items": "center", flex: "1" }}>
      <Show when={props.icon}>
        <div style={{ position: "absolute", left: "10px", color: "var(--yo-text-muted)", display: "flex" }}>
          {props.icon}
        </div>
      </Show>
      <input
        class="yo-input"
        type="text"
        style={{
          "padding-left": props.icon ? "34px" : "12px",
          ...(typeof props.style === "object" ? props.style : {}),
        }}
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

// ── 徽章 YoBadge ──

export function YoBadge(props: {
  text?: string;
  children?: JSX.Element;
  tone?: "info" | "warn" | "ok" | "danger" | "primary" | "neutral";
}) {
  const cls = () => {
    switch (props.tone) {
      case "primary":
        return "yo-badge yo-badge--primary";
      case "warn":
        return "yo-badge yo-badge--warn";
      case "ok":
        return "yo-badge yo-badge--ok";
      case "danger":
        return "yo-badge yo-badge--danger";
      case "neutral":
        return "yo-badge yo-badge--neutral";
      default:
        return "yo-badge";
    }
  };
  return <span class={cls()}>{props.children ?? props.text}</span>;
}

// ── 进度条 YoProgressBar ──

export function YoProgressBar(props: { done: number; total: number }) {
  const pct = () =>
    props.total > 0 ? Math.min(100, Math.round((props.done / props.total) * 100)) : 0;
  return (
    <div class="yo-progress">
      <div class="yo-progress__bar" style={{ width: `${pct()}%` }} />
    </div>
  );
}

// ── 空状态 YoEmptyState ──

export function YoEmptyState(props: { text: string; description?: string; icon?: JSX.Element }) {
  return (
    <div class="yo-empty">
      <div class="yo-empty-icon">
        {props.icon ?? <IconDocument style={{ width: "40px", height: "40px" }} />}
      </div>
      <div style={{ "font-weight": "500", color: "var(--yo-text-secondary)" }}>{props.text}</div>
      <Show when={props.description}>
        <div style={{ "font-size": "12px", color: "var(--yo-text-muted)" }}>{props.description}</div>
      </Show>
    </div>
  );
}

export function YoEmpty(props: {
  title: string;
  description?: string;
  class?: string;
  style?: JSX.CSSProperties;
}) {
  return (
    <div
      class={`yo-empty ${props.class ?? ""}`}
      style={{
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        "justify-content": "center",
        padding: "32px 16px",
        "text-align": "center",
        ...(typeof props.style === "object" ? props.style : {}),
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          "border-radius": "50%",
          background: "var(--yo-bg-subtle)",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          color: "var(--yo-text-muted)",
          "margin-bottom": "16px",
        }}
      >
        <IconDocument style={{ width: "24px", height: "24px" }} />
      </div>
      <div
        style={{
          "font-size": "15px",
          "font-weight": 600,
          color: "var(--yo-text-primary)",
          "margin-bottom": "8px",
        }}
      >
        {props.title}
      </div>
      <Show when={props.description}>
        <div
          style={{
            "font-size": "12.5px",
            color: "var(--yo-text-muted)",
            "max-width": "380px",
            "line-height": 1.6,
          }}
        >
          {props.description}
        </div>
      </Show>
    </div>
  );
}

export function YoCard(props: {
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}) {
  return (
    <div
      class={`yo-card ${props.class ?? ""}`}
      style={{
        background: "var(--yo-bg-card)",
        border: "1px solid var(--yo-line)",
        "border-radius": "var(--yo-radius-md)",
        "box-shadow": "var(--yo-shadow-xs)",
        ...(typeof props.style === "object" ? props.style : {}),
      }}
    >
      {props.children}
    </div>
  );
}


export function YoTabs(props: {
  tabs: { id: string; label: string; icon?: JSX.Element }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      class="yo-segmented-control"
      style={{
        display: "inline-flex",
        background: "var(--yo-bg-subtle)",
        padding: "3px",
        "border-radius": "var(--yo-radius-sm)",
        border: "1px solid var(--yo-line)",
        gap: "3px",
      }}
    >
      <For each={props.tabs}>
        {(t) => {
          const isActive = () => props.active === t.id;
          return (
            <button
              type="button"
              style={{
                display: "inline-flex",
                "align-items": "center",
                gap: "6px",
                padding: "4px 12px",
                border: "none",
                background: isActive() ? "var(--yo-bg-card)" : "transparent",
                color: isActive() ? "var(--yo-accent)" : "var(--yo-text-muted)",
                "font-weight": isActive() ? "600" : "500",
                "font-size": "12.5px",
                "border-radius": "var(--yo-radius-xs)",
                cursor: "pointer",
                "box-shadow": isActive() ? "var(--yo-shadow-xs)" : "none",
                transition: "all var(--yo-transition-fast)",
              }}
              onClick={() => props.onChange(t.id)}
            >
              <Show when={t.icon}>
                <span style={{ display: "flex", "align-items": "center" }}>{t.icon}</span>
              </Show>
              <span>{t.label}</span>
            </button>
          );
        }}
      </For>
    </div>
  );
}

// ── 目录树 YoTree ──

export interface TreeLike {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeLike[];
}

export function YoTree(props: {
  nodes: TreeLike[];
  selected: string | null;
  onSelect: (node: TreeLike) => void;
}) {
  return (
    <ul class="yo-tree">
      <For each={props.nodes}>
        {(node) => (
          <TreeNodeView node={node} selected={props.selected} onSelect={props.onSelect} depth={0} />
        )}
      </For>
    </ul>
  );
}

function TreeNodeView(props: {
  node: TreeLike;
  selected: string | null;
  onSelect: (node: TreeLike) => void;
  depth: number;
}) {
  const [open, setOpen] = createSignal(true);
  const isSelected = () => props.selected === props.node.path;

  const handleClick = () => {
    if (props.node.isDir) {
      setOpen(!open());
    } else {
      props.onSelect(props.node);
    }
  };

  return (
    <li class="yo-tree-node">
      <button
        class={`yo-tree-item ${isSelected() ? "is-active" : ""}`}
        style={{ "padding-left": `${props.depth * 14 + 8}px` }}
        onClick={handleClick}
      >
        <Show
          when={props.node.isDir}
          fallback={<IconDocument style={{ width: "14px", height: "14px", opacity: 0.7 }} />}
        >
          <IconFolder style={{ width: "14px", height: "14px", color: "var(--yo-accent)" }} />
        </Show>
        <span style={{ "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
          {props.node.name}
        </span>
      </button>

      <Show when={props.node.isDir && open() && props.node.children.length > 0}>
        <ul style={{ "list-style": "none", margin: 0, padding: 0 }}>
          <For each={props.node.children}>
            {(child) => (
              <TreeNodeView
                node={child}
                selected={props.selected}
                onSelect={props.onSelect}
                depth={props.depth + 1}
              />
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
}
