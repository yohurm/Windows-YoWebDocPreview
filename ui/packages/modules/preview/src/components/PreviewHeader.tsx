/**
 * 预览顶部功能区（Omnibox 现代化地址栏 + 模式分段选择器 + 快捷历史 Pills）。
 * 明确职责：输入调度、原貌/Markdown 模式切换、历史快速加载。
 */

import { For, Show } from "solid-js";
import {
  IconGlobe,
  IconDocument,
  IconCode,
  IconEye,
  IconRefresh,
  IconSearch,
  IconSidebar,
  YoButton,
  YoTabs,
} from "@yohu/ui";

import type { PreviewStore } from "../store";

export function PreviewHeader(props: { store: PreviewStore }) {
  const { store } = props;

  return (
    <header
      style={{
        padding: "10px 16px",
        background: "var(--yo-bg-sidebar)",
        "border-bottom": "1px solid var(--yo-line)",
        display: "flex",
        "flex-direction": "column",
        gap: "8px",
        "flex-shrink": 0,
        "z-index": 20,
      }}
    >
      {/* 第一行：Omnibox 智能输入栏 + 模式分段选择器 */}
      <div style={{ display: "flex", gap: "10px", "align-items": "center" }}>
        {/* Omnibox 现代沉浸式输入框 */}
        <div
          class="yo-omnibox"
          style={{
            flex: 1,
            height: "36px",
          }}
        >
          <IconSearch style={{ width: "15px", height: "15px", color: "var(--yo-text-muted)" }} />
          <input
            type="text"
            class="yo-omnibox__input"
            value={store.url()}
            onInput={(e) => store.setUrl(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void store.fetchDoc();
            }}
            placeholder="输入文档或网页 URL（支持华为开发者平台、微信公众号、掘金、MDN、GitHub、各类技术博客等）…"
            disabled={store.loading()}
          />
          <YoButton
            kind="primary"
            onClick={() => void store.fetchDoc()}
            disabled={store.loading() || !store.url().trim()}
            style={{
              height: "26px",
              padding: "0 12px",
              "font-size": "12px",
            }}
          >
            <Show
              when={store.loading()}
              fallback={<IconRefresh style={{ width: "12px", height: "12px" }} />}
            >
              <IconRefresh class="yo-rotate" style={{ width: "12px", height: "12px" }} />
            </Show>
            {store.loading() ? "加载解析中…" : "载入"}
          </YoButton>
        </div>

        {/* 主模式切换器：网页原貌 vs Markdown 视图 + 侧边栏整体折叠开关 */}
        <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
          {/* 左侧专栏目录栏折叠/展开开关（仅当存在专栏目录节点时提供） */}
          <Show when={store.catalogNodes().length > 0}>
            <button
              type="button"
              class="yo-btn yo-btn--ghost"
              style={{
                height: "30px",
                padding: "0 8px",
                color: store.showCatalog() ? "var(--yo-accent)" : "var(--yo-text-muted)",
                background: store.showCatalog() ? "var(--yo-accent-weak)" : "transparent",
                border: "1px solid var(--yo-line)",
                display: "inline-flex",
                "align-items": "center",
                gap: "4px",
                "font-size": "11.5px",
              }}
              onClick={() => store.toggleCatalog()}
              title={store.showCatalog() ? "收起左侧专栏目录" : "展开左侧专栏目录"}
            >
              <IconSidebar style={{ width: "14px", height: "14px" }} />
              <span>专栏</span>
            </button>
          </Show>

          <YoTabs
            tabs={[
              {
                id: "web",
                label: "网页原貌",
                icon: <IconGlobe style={{ width: "13px", height: "13px" }} />,
              },
              {
                id: "markdown",
                label: "Markdown 视图",
                icon: <IconDocument style={{ width: "13px", height: "13px" }} />,
              },
            ]}
            active={store.mainMode()}
            onChange={(id) => store.setMainMode(id as "web" | "markdown")}
          />

          {/* 当处于 Markdown 视图时，展示子模式切换 (排版渲染 vs 源码) 与 大纲折叠开关 */}
          <Show when={store.mainMode() === "markdown"}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--yo-bg-card)",
                padding: "2px",
                "border-radius": "var(--yo-radius-sm)",
                border: "1px solid var(--yo-line)",
                gap: "2px",
              }}
            >
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  "align-items": "center",
                  gap: "4px",
                  padding: "3px 8px",
                  border: "none",
                  background:
                    store.markdownSubMode() === "rendered" ? "var(--yo-bg-subtle)" : "transparent",
                  color:
                    store.markdownSubMode() === "rendered"
                      ? "var(--yo-accent)"
                      : "var(--yo-text-muted)",
                  "font-weight": store.markdownSubMode() === "rendered" ? "600" : "500",
                  "font-size": "11.5px",
                  "border-radius": "var(--yo-radius-xs)",
                  cursor: "pointer",
                }}
                onClick={() => store.setMarkdownSubMode("rendered")}
                title="富文本排版渲染"
              >
                <IconEye style={{ width: "12px", height: "12px" }} />
                渲染
              </button>

              <button
                type="button"
                style={{
                  display: "inline-flex",
                  "align-items": "center",
                  gap: "4px",
                  padding: "3px 8px",
                  border: "none",
                  background:
                    store.markdownSubMode() === "source" ? "var(--yo-bg-subtle)" : "transparent",
                  color:
                    store.markdownSubMode() === "source"
                      ? "var(--yo-accent)"
                      : "var(--yo-text-muted)",
                  "font-weight": store.markdownSubMode() === "source" ? "600" : "500",
                  "font-size": "11.5px",
                  "border-radius": "var(--yo-radius-xs)",
                  cursor: "pointer",
                }}
                onClick={() => store.setMarkdownSubMode("source")}
                title="Markdown 原始文本"
              >
                <IconCode style={{ width: "12px", height: "12px" }} />
                源码
              </button>
            </div>

            {/* 切换 TOC 侧栏按钮 */}
            <Show when={store.markdownSubMode() === "rendered"}>
              <button
                type="button"
                class="yo-btn yo-btn--ghost"
                style={{
                  height: "30px",
                  padding: "0 8px",
                  color: store.showToc() ? "var(--yo-accent)" : "var(--yo-text-muted)",
                  background: store.showToc() ? "var(--yo-accent-weak)" : "transparent",
                  border: "1px solid var(--yo-line)",
                }}
                onClick={() => store.toggleToc()}
                title="折叠/展开右侧大纲目录"
              >
                <IconSidebar style={{ width: "14px", height: "14px" }} />
              </button>
            </Show>
          </Show>
        </div>
      </div>

      {/* 第二行：最近访问历史记录 Pills (轻量快速导航) */}
      <Show when={store.history().length > 0}>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "6px",
            "overflow-x": "auto",
          }}
        >
          <span
            style={{
              "font-size": "11px",
              color: "var(--yo-text-muted)",
              "white-space": "nowrap",
              "font-weight": 500,
            }}
          >
            最近访问:
          </span>
          <For each={store.history().slice(0, 6)}>
            {(h) => (
              <button
                type="button"
                style={{
                  padding: "2px 8px",
                  "font-size": "11px",
                  height: "22px",
                  "border-radius": "var(--yo-radius-xs)",
                  background: "var(--yo-bg-card)",
                  border: "1px solid var(--yo-line)",
                  color: "var(--yo-text-secondary)",
                  "max-width": "180px",
                  overflow: "hidden",
                  "text-overflow": "ellipsis",
                  "white-space": "nowrap",
                  cursor: "pointer",
                  transition: "all var(--yo-transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--yo-accent)";
                  e.currentTarget.style.color = "var(--yo-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--yo-line)";
                  e.currentTarget.style.color = "var(--yo-text-secondary)";
                }}
                title={h.sourceUrl}
                onClick={() => void store.fetchDoc(h.sourceUrl)}
              >
                {h.title || h.sourceUrl}
              </button>
            )}
          </For>
        </div>
      </Show>
    </header>
  );
}
