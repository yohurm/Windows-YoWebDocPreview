/**
 * 在线文档实时预览模块（主入口）：严格遵循 SRP 组装 Store、Policy 算法与纯渲染组件。
 *
 * 区域架构设计：
 * 1. 功能区域（Control Chrome）：
 *    - 顶部 Header：Omnibox 智能地址栏、主模式选择（网页原貌 vs Markdown 视图）、历史访问记录
 *    - 操作工具栏 MetaBar：文档标题、更新时间、抓取耗时、复制 Markdown、导出 Markdown 文件、外部打开
 * 2. 内容区域（Content Canvas）：
 *    - 网页原貌模式：全屏完整嵌入源网页（含网页自身导航、交互体验）
 *    - Markdown 预览模式：排版预览（带 TOC 目录跳转）与源码纯文本随时切换
 */

import { createMemo, onMount, Show } from "solid-js";

import { IconAlert, YoCard, YoEmpty } from "@yohu/ui";

import { PreviewContent } from "./components/PreviewContent";
import { PreviewHeader } from "./components/PreviewHeader";
import { PreviewMetaBar } from "./components/PreviewMetaBar";
import { createPreviewStore } from "./store";
import { extractTocFromMarkdown, renderMarkdownToSafeHtml } from "./toc";

export function PreviewView() {
  const store = createPreviewStore();

  onMount(() => {
    void store.loadHistory();
  });

  // TOC 目录大纲衍生计算（基于 Markdown 文本提取）
  const tocList = createMemo(() => extractTocFromMarkdown(store.markdownText()));

  // 基于 Markdown 文本直接渲染为安全带锚点的排版 HTML（无须清洗后 HTML 中间层）
  const displayHtml = createMemo(() => renderMarkdownToSafeHtml(store.markdownText()));

  return (
    <div
      class="yo-preview-module"
      style={{
        display: "flex",
        "flex-direction": "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "var(--yo-bg-app)",
      }}
    >
      {/* ── 功能区域 1: 顶部 Omnibox 地址输入与模式切换 ── */}
      <PreviewHeader store={store} />

      {/* 错误提示条 */}
      <Show when={store.error()}>
        <div
          style={{
            margin: "8px 16px 0",
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            "border-radius": "var(--yo-radius-sm)",
            "font-size": "12px",
            color: "var(--yo-danger)",
            display: "flex",
            "align-items": "center",
            gap: "8px",
            "flex-shrink": 0,
          }}
        >
          <IconAlert style={{ width: "15px", height: "15px" }} />
          <span>{store.error()}</span>
        </div>
      </Show>

      {/* ── 功能区域 2: 文档元数据工具栏（当已载入元数据时激活） ── */}
      <Show when={store.meta()}>
        <PreviewMetaBar store={store} />
      </Show>

      {/* ── 内容区域: 视图画布（原貌网页 vs Markdown） ── */}
      <Show
        when={store.activeUrl() || store.markdownText()}
        fallback={
          <div
            style={{
              flex: 1,
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              padding: "32px",
            }}
          >
            <YoCard style={{ "max-width": "540px", "text-align": "center", padding: "40px 24px" }}>
              <YoEmpty
                title="输入 URL 开启在线预览"
                description="支持华为开发者文档、微信公众号、掘金专栏、MDN、各类通用技术博客等。在顶部输入网址，即可体验实时原貌阅读（包含原生导航与交互）并一键提取转换为标准 Markdown。"
              />
            </YoCard>
          </div>
        }
      >
        <PreviewContent store={store} tocList={tocList} displayHtml={displayHtml} />
      </Show>
    </div>
  );
}

export const descriptor = {
  id: "preview",
  title: "在线预览",
  Component: PreviewView,
};

export default PreviewView;
