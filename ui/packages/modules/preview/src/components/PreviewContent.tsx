/**
 * 预览主体内容区域：
 * 现代化技术文档布局架构：
 * 1. 左侧：专栏章节目录树（Catalog Tree，支持折叠展开，支持多网页无缝切换联动）
 * 2. 中间：主阅读画布（网页原貌 vs Markdown 排版 / 源码）
 * 3. 右侧：本页文章大纲（TOC，支持折叠）
 */

import { createMemo, For, Show } from "solid-js";
import { IconCheck, IconDocument, IconGlobe, IconList, IconSidebar } from "@yohu/ui";

import { CatalogTree } from "./CatalogTree";
import { buildWebDocument } from "../engine/webRenderer";
import type { PreviewStore } from "../store";
import type { TocItem } from "../toc";

export function PreviewContent(props: {
  store: PreviewStore;
  tocList: () => TocItem[];
  displayHtml: () => string;
}) {
  const { store, tocList, displayHtml } = props;

  // 自有解析内核合成的原貌网页 HTML
  const webDocHtml = createMemo(() => {
    return buildWebDocument({
      meta: store.meta(),
      rawHtml: store.rawHtml(),
      sourceUrl: store.activeUrl(),
    });
  });

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const currentSlug = () => store.meta()?.docRef?.slug;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        "flex-direction": "column",
        overflow: "hidden",
        position: "relative",
        background: "var(--yo-bg-app)",
      }}
    >
      {/* 导出成功提示浮条 */}
      <Show when={store.exportedPath()}>
        <div
          style={{
            margin: "8px 16px 0",
            padding: "8px 14px",
            background: "var(--yo-accent-weak)",
            border: "1px solid var(--yo-accent)",
            "border-radius": "var(--yo-radius-sm)",
            "font-size": "12px",
            color: "var(--yo-accent)",
            display: "flex",
            "align-items": "center",
            gap: "8px",
            "flex-shrink": 0,
            "z-index": 10,
          }}
        >
          <IconCheck style={{ width: "14px", height: "14px" }} />
          <span>Markdown 文档已成功导出保存:</span>
          <code
            style={{
              "font-family": "var(--yo-mono)",
              background: "var(--yo-bg-card)",
              padding: "2px 6px",
              "border-radius": "3px",
              border: "1px solid var(--yo-line)",
              color: "var(--yo-text)",
            }}
          >
            {store.exportedPath()}
          </code>
        </div>
      </Show>

      {/* 主视图画板区域：左侧目录树 + 中间画板 + 右侧 TOC */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* ── 左侧：专栏章节目录树（当存在节点且未被折叠时渲染） ── */}
        <Show when={store.showCatalog() && store.catalogNodes().length > 0}>
          <CatalogTree
            nodes={store.catalogNodes()}
            activeSlug={currentSlug()}
            loading={store.catalogLoading()}
            onSelectDoc={(slug) => store.selectCatalogDoc(slug)}
          />
        </Show>

        {/* ── 中间区域：核心画板 ── */}
        <div style={{ flex: 1, display: "flex", "flex-direction": "column", overflow: "hidden", position: "relative" }}>
          {/* 视图模式 A: 自有解析内核的网页原貌渲染 */}
          <Show when={store.mainMode() === "web"}>
            <div
              style={{
                flex: 1,
                display: "flex",
                "flex-direction": "column",
                height: "100%",
                width: "100%",
                background: "var(--yo-bg-card)",
                position: "relative",
              }}
            >
              <Show
                when={store.activeUrl() && (store.rawHtml() || store.meta())}
                fallback={
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      "flex-direction": "column",
                      "align-items": "center",
                      "justify-content": "center",
                      gap: "12px",
                      color: "var(--yo-text-muted)",
                    }}
                  >
                    <IconGlobe style={{ width: "40px", height: "40px", opacity: 0.4 }} />
                    <div style={{ "font-size": "14px", "font-weight": 500 }}>
                      输入或选择在线文档地址并载入，自有解析内核将高保真还原完整网页体验
                    </div>
                  </div>
                }
              >
                <iframe
                  srcdoc={webDocHtml()}
                  title="Web Original Preview"
                  class="yo-web-view-frame"
                  sandbox="allow-same-origin allow-scripts allow-popups"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                    background: "#f8fafc",
                  }}
                />
              </Show>
            </div>
          </Show>

          {/* 视图模式 B: Markdown 预览 (渲染态 / 源码态) */}
          <Show when={store.mainMode() === "markdown"}>
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* 子模式 1: 渲染排版 (支持文章排版 + TOC 侧边大纲) */}
              <Show when={store.markdownSubMode() === "rendered"}>
                <div
                  style={{
                    flex: 1,
                    "overflow-y": "auto",
                    padding: "32px 48px",
                    background: "var(--yo-bg-card)",
                  }}
                >
                  <article
                    class="yo-md"
                    innerHTML={displayHtml()}
                    style={{
                      "max-width": "860px",
                      margin: "0 auto",
                      color: "var(--yo-text)",
                    }}
                  />
                </div>

                {/* 沉浸式大纲侧栏 TOC */}
                <Show when={store.showToc() && tocList().length > 0}>
                  <aside
                    class="yo-toc-sidebar"
                    style={{
                      width: "250px",
                      background: "var(--yo-bg-sidebar)",
                      "border-left": "1px solid var(--yo-line)",
                      padding: "16px 14px",
                      display: "flex",
                      "flex-direction": "column",
                      gap: "8px",
                      "overflow-y": "auto",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        "align-items": "center",
                        "justify-content": "space-between",
                        "padding-bottom": "8px",
                        "border-bottom": "1px solid var(--yo-line)",
                      }}
                    >
                      <span
                        style={{
                          "font-size": "11px",
                          "font-weight": 700,
                          color: "var(--yo-text-muted)",
                          "text-transform": "uppercase",
                          "letter-spacing": "0.5px",
                          display: "flex",
                          "align-items": "center",
                          gap: "6px",
                        }}
                      >
                        <IconList style={{ width: "13px", height: "13px" }} />
                        文档大纲 ({tocList().length})
                      </span>
                      <button
                        type="button"
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "var(--yo-text-muted)",
                          padding: "2px",
                        }}
                        onClick={() => store.toggleToc()}
                        title="折叠目录"
                      >
                        <IconSidebar style={{ width: "13px", height: "13px" }} />
                      </button>
                    </div>

                    <div style={{ display: "flex", "flex-direction": "column", gap: "2px" }}>
                      <For each={tocList()}>
                        {(item) => (
                          <button
                            type="button"
                            style={{
                              border: "none",
                              background: "transparent",
                              "text-align": "left",
                              cursor: "pointer",
                              "font-size": "12px",
                              color: "var(--yo-text-secondary)",
                              padding: "6px 8px",
                              "padding-left": `${(item.level - 1) * 12 + 8}px`,
                              "border-radius": "var(--yo-radius-xs)",
                              overflow: "hidden",
                              "text-overflow": "ellipsis",
                              "white-space": "nowrap",
                              transition: "all var(--yo-transition-fast)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--yo-bg-hover)";
                              e.currentTarget.style.color = "var(--yo-accent)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "var(--yo-text-secondary)";
                            }}
                            onClick={() => scrollToAnchor(item.id)}
                            title={item.text}
                          >
                            {item.text}
                          </button>
                        )}
                      </For>
                    </div>
                  </aside>
                </Show>
              </Show>

              {/* 子模式 2: Markdown 源码 */}
              <Show when={store.markdownSubMode() === "source"}>
                <div
                  style={{
                    flex: 1,
                    "overflow-y": "auto",
                    padding: "24px 32px",
                    background: "var(--yo-code-bg)",
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      "font-family": "var(--yo-mono)",
                      "font-size": "12.5px",
                      "line-height": 1.6,
                      color: "var(--yo-text)",
                      "white-space": "pre-wrap",
                      "word-break": "break-word",
                    }}
                  >
                    <code>{store.markdownText()}</code>
                  </pre>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
