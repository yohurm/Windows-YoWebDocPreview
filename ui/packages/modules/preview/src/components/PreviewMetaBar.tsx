/**
 * 预览文档元数据与操作工具栏组件（唯一操作控制台）。
 * 遵循信息展示唯一性纪律：
 * 1. 更新时间在此处作为唯一权威状态胶囊展示，不在正文各处重复显示；
 * 2. 外部浏览器打开作为操作按钮唯一样式放置于右上角，消除冲突冗余；
 * 3. 包含复制 Markdown 与导出文件操作。
 */

import { For, Show } from "solid-js";
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternal,
  YoBadge,
  YoButton,
} from "@yohu/ui";

import type { PreviewStore } from "../store";

export function PreviewMetaBar(props: { store: PreviewStore }) {
  const { store } = props;

  return (
    <div
      style={{
        padding: "8px 16px",
        background: "var(--yo-bg-card)",
        "border-bottom": "1px solid var(--yo-line)",
        display: "flex",
        "align-items": "center",
        "justify-content": "space-between",
        gap: "12px",
        "flex-wrap": "wrap",
        "flex-shrink": 0,
      }}
    >
      {/* 文档基本信息与状态胶囊（唯一信息收口区） */}
      <div style={{ display: "flex", "align-items": "center", gap: "10px", "flex-wrap": "wrap" }}>
        <h2
          style={{
            margin: 0,
            "font-size": "14px",
            "font-weight": 600,
            color: "var(--yo-text)",
            "max-width": "360px",
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
          }}
          title={store.meta()?.title}
        >
          {store.meta()?.title || "未命名文档"}
        </h2>

        <YoBadge tone={store.meta()?.channel === "adapter" ? "primary" : "neutral"}>
          {store.meta()?.channel === "adapter" ? "官方结构化适配" : "智能通用提取"}
        </YoBadge>

        <Show when={store.meta()?.updateTime}>
          <span
            style={{
              "font-size": "11.5px",
              color: "var(--yo-text-muted)",
              background: "var(--yo-bg-subtle)",
              padding: "2px 8px",
              "border-radius": "4px",
              border: "1px solid var(--yo-line-subtle)",
            }}
          >
            更新: {store.meta()?.updateTime}
          </span>
        </Show>

        <Show when={store.fetchDuration() !== null}>
          <span style={{ "font-size": "11.5px", color: "var(--yo-text-muted)" }}>
            耗时: {store.fetchDuration()}ms
          </span>
        </Show>

        <Show when={(store.meta()?.deviceTypes.length ?? 0) > 0}>
          <div style={{ display: "flex", gap: "4px" }}>
            <For each={store.meta()?.deviceTypes}>
              {(d) => <YoBadge tone="neutral">{d}</YoBadge>}
            </For>
          </div>
        </Show>
      </div>

      {/* 唯一操作按钮组 */}
      <div style={{ display: "flex", gap: "6px", "align-items": "center" }}>
        <Show when={store.meta()?.sourceUrl}>
          <a
            href={store.meta()?.sourceUrl}
            target="_blank"
            rel="noreferrer"
            class="yo-btn yo-btn--ghost"
            style={{
              height: "28px",
              padding: "0 10px",
              "font-size": "12px",
              display: "inline-flex",
              "align-items": "center",
              gap: "4px",
              "text-decoration": "none",
            }}
            title="在默认外部浏览器中查看原始网页"
          >
            <IconExternal style={{ width: "12px", height: "12px" }} />
            在浏览器打开
          </a>
        </Show>

        <YoButton
          kind="secondary"
          onClick={() => void store.copyMarkdownToClipboard()}
          disabled={!store.markdownText()}
          style={{
            height: "28px",
            padding: "0 10px",
            "font-size": "12px",
          }}
        >
          <Show
            when={store.copied()}
            fallback={<IconCopy style={{ width: "12px", height: "12px" }} />}
          >
            <IconCheck style={{ width: "12px", height: "12px", color: "var(--yo-accent)" }} />
          </Show>
          {store.copied() ? "已复制" : "复制 Markdown"}
        </YoButton>

        <YoButton
          kind="primary"
          onClick={() => void store.exportCurrentDoc()}
          disabled={store.exporting() || !store.markdownText()}
          style={{
            height: "28px",
            padding: "0 12px",
            "font-size": "12px",
          }}
        >
          <Show
            when={store.exporting()}
            fallback={<IconDownload style={{ width: "12px", height: "12px" }} />}
          >
            <IconDownload class="yo-rotate" style={{ width: "12px", height: "12px" }} />
          </Show>
          {store.exporting() ? "正在导出…" : "导出 Markdown"}
        </YoButton>
      </div>
    </div>
  );
}
