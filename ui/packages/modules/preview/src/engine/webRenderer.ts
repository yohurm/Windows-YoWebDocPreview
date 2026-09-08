/**
 * 自有解析内核的真实网页原貌渲染引擎 (Web Renderer Engine)
 *
 * 规范与原则：
 * 1. 绝不在应用内通过普通 <iframe> 裸加载第三方 URL（裸加载不仅失去自有解析内核的价值，
 *    而且会被 X-Frame-Options: SAMEORIGIN 与 CSP 策略拦截，导致连接拒绝与白屏）。
 * 2. 基于自有解析获取的结构化元数据（DocMeta: 标题、目录、更新时间、支持设备、通道类型、来源链接）
 *    与提取的 HTML 正文（rawHtml），合成现代化保真级完整 Web 页面体验。
 * 3. 自带高保真设计规范：
 *    - 官方级/现代技术文档顶栏与导航栏（品牌标识、所属专栏/分类面包屑、更新时间徽标、支持设备药丸标签、原网外链导航）
 *    - 侧边自适应章节导航与大纲交互
 *    - 现代化排版与代码高亮容器样式、表格自适应样式、图文居中自适应
 *    - 内置平滑锚点定位与交互脚本
 */

import type { DocMeta } from "@yohu/api";

import { catalogDisplayName } from "../catalogPolicy";

export interface RenderWebOptions {
  meta: DocMeta | null;
  rawHtml: string;
  sourceUrl: string;
}

/**
 * 生成高保真、独立闭环、无需外联外部未许可资源的完整 HTML 字符串（通过 iframe srcdoc 加载）。
 */
export function buildWebDocument(options: RenderWebOptions): string {
  const { meta, rawHtml, sourceUrl } = options;
  const title = meta?.title || "在线文档网页原貌";
  const catalogLabel = meta?.docRef?.catalog ? catalogDisplayName(meta.docRef.catalog) : "";
  const deviceTypes = meta?.deviceTypes || [];
  const isHuawei = meta?.docRef?.sourceId === "huawei-harmonyos";

  // 构建设备徽标 HTML
  const deviceBadgesHtml = deviceTypes
    .map(
      (d) =>
        `<span class="y-badge y-badge-device" title="支持设备: ${d}">📱 ${d}</span>`
    )
    .join("");

  const safeCatalog = catalogLabel.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const catalogCrumb = safeCatalog
    ? `<span>${safeCatalog}</span><span class="y-breadcrumb-sep">/</span>`
    : "";
  const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    :root {
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      --font-mono: ui-monospace, "Cascadia Code", "SFMono-Regular", Consolas, Menlo, Monaco, monospace;
      --color-primary: #0a59f7;
      --color-primary-light: #f0f4ff;
      --color-primary-hover: #0847c9;
      --bg-body: #f8fafc;
      --bg-surface: #ffffff;
      --bg-subtle: #f1f5f9;
      --border-color: #e2e8f0;
      --border-subtle: #edf2f7;
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-dim: #94a3b8;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      color: var(--text-main);
      background-color: var(--bg-body);
      line-height: 1.75;
      -webkit-font-smoothing: antialiased;
      overflow-y: scroll;
    }

    /* ── 现代高保真导航顶栏 ── */
    .y-topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 54px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      box-shadow: var(--shadow-sm);
    }

    .y-topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .y-brand-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-primary);
      background: var(--color-primary-light);
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: -0.01em;
    }

    .y-brand-badge svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    .y-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .y-breadcrumb-sep {
      color: var(--text-dim);
      font-size: 11px;
    }

    .y-breadcrumb-curr {
      color: var(--text-main);
      font-weight: 600;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .y-topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .y-badge {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      line-height: 1.5;
    }

    .y-badge-time {
      background: var(--bg-subtle);
      color: var(--text-muted);
      border: 1px solid var(--border-color);
    }

    .y-badge-device {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .y-origin-link {
      font-size: 12px;
      color: var(--color-primary);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 5px;
      background: var(--bg-subtle);
      transition: all 0.15s ease;
    }

    .y-origin-link:hover {
      background: var(--color-primary-light);
      color: var(--color-primary-hover);
    }

    /* ── 主体内容布局 ── */
    .y-layout-container {
      max-width: 1100px;
      margin: 28px auto 60px;
      padding: 0 24px;
      display: flex;
      gap: 32px;
    }

    .y-main-article {
      flex: 1;
      min-width: 0;
      background: var(--bg-surface);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      padding: 48px 56px;
    }

    /* ── 页面标题头 ── */
    .y-article-header {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .y-article-title {
      font-size: 30px;
      font-weight: 700;
      line-height: 1.35;
      color: var(--text-main);
      margin-bottom: 14px;
      letter-spacing: -0.02em;
    }

    .y-article-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: var(--text-muted);
    }

    /* ── 网页正文原生还原排版 ── */
    .y-content {
      font-size: 15.5px;
      line-height: 1.8;
      color: #1e293b;
    }

    .y-content h1, .y-content h2, .y-content h3, .y-content h4 {
      color: var(--text-main);
      font-weight: 700;
      line-height: 1.4;
      margin-top: 1.8em;
      margin-bottom: 0.8em;
      scroll-margin-top: 70px;
    }

    .y-content h1 { font-size: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
    .y-content h2 { font-size: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }
    .y-content h3 { font-size: 17px; }
    .y-content h4 { font-size: 15px; }

    .y-content p {
      margin-bottom: 1.2em;
    }

    .y-content ul, .y-content ol {
      margin-bottom: 1.2em;
      padding-left: 1.6em;
    }

    .y-content li {
      margin-bottom: 0.4em;
    }

    .y-content blockquote {
      margin: 1.2em 0;
      padding: 12px 18px;
      background: var(--bg-body);
      border-left: 4px solid var(--color-primary);
      border-radius: 0 6px 6px 0;
      color: var(--text-muted);
      font-size: 14.5px;
    }

    .y-content code:not(pre code) {
      font-family: var(--font-mono);
      font-size: 0.88em;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .y-content pre {
      margin: 1.4em 0;
      background: #1e293b;
      color: #f8fafc;
      padding: 16px 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13.5px;
      line-height: 1.6;
      border: 1px solid #334155;
    }

    .y-content pre code {
      background: transparent;
      padding: 0;
      border: none;
      color: inherit;
    }

    .y-content table {
      width: 100%;
      margin: 1.4em 0;
      border-collapse: collapse;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      font-size: 14px;
    }

    .y-content th, .y-content td {
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      text-align: left;
    }

    .y-content th {
      background: var(--bg-subtle);
      font-weight: 600;
      color: var(--text-main);
    }

    .y-content tr:nth-child(even) {
      background: #fafafa;
    }

    .y-content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.4em auto;
      border-radius: 6px;
      box-shadow: var(--shadow-sm);
    }

    .y-content a {
      color: var(--color-primary);
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .y-content a:hover {
      color: var(--color-primary-hover);
    }

    /* ── 右侧悬浮自适应大纲 TOC ── */
    .y-sidebar-toc {
      width: 240px;
      flex-shrink: 0;
      position: sticky;
      top: 74px;
      max-height: calc(100vh - 90px);
      overflow-y: auto;
      padding: 12px 14px;
      background: var(--bg-surface);
      border-radius: 10px;
      border: 1px solid var(--border-color);
      font-size: 13px;
    }

    .y-toc-title {
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .y-toc-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .y-toc-item a {
      display: block;
      color: var(--text-muted);
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .y-toc-item a:hover {
      background: var(--bg-subtle);
      color: var(--color-primary);
    }

    .y-toc-item.level-3 a {
      padding-left: 18px;
      font-size: 12px;
    }

    @media (max-width: 992px) {
      .y-sidebar-toc {
        display: none;
      }
      .y-layout-container {
        padding: 0 16px;
      }
      .y-main-article {
        padding: 28px 24px;
      }
    }
  </style>
</head>
<body>
  <!-- 顶部沉浸式导航栏：仅保留来源标识与专栏面包屑，不堆砌重复时间和外网按钮 -->
  <header class="y-topbar">
    <div class="y-topbar-left">
      <div class="y-brand-badge">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        <span>${isHuawei ? "HarmonyOS Developer" : "Web Preview"}</span>
      </div>
      <div class="y-breadcrumb">
        ${catalogCrumb}
        <span class="y-breadcrumb-curr" title="${safeTitle}">${safeTitle}</span>
      </div>
    </div>
    <div class="y-topbar-right">
      ${deviceBadgesHtml}
    </div>
  </header>

  <!-- 主体技术排版与大纲布局 -->
  <div class="y-layout-container">
    <main class="y-main-article">
      <header class="y-article-header">
        <h1 class="y-article-title">${safeTitle}</h1>
      </header>

      <!-- 自有解析内核还原的正文 HTML -->
      <div class="y-content" id="doc-body-content">
        ${rawHtml || `<div style="text-align: center; padding: 40px; color: var(--text-dim);">文档正文已加载，暂无排版内容</div>`}
      </div>
    </main>

    <!-- 侧边动态目录大纲 -->
    <aside class="y-sidebar-toc" id="doc-sidebar-toc">
      <div class="y-toc-title">本页大纲</div>
      <ul class="y-toc-list" id="doc-toc-list">
        <!-- 运行时脚本自动根据正文标题探测生成 -->
      </ul>
    </aside>
  </div>

  <script>
    (function() {
      // 动态构建右侧大纲
      try {
        var content = document.getElementById('doc-body-content');
        var tocList = document.getElementById('doc-toc-list');
        var sidebar = document.getElementById('doc-sidebar-toc');
        if (!content || !tocList) return;

        var headings = content.querySelectorAll('h1, h2, h3');
        if (headings.length === 0) {
          if (sidebar) sidebar.style.display = 'none';
          return;
        }

        var counter = 0;
        headings.forEach(function(h) {
          counter++;
          var titleText = (h.textContent || '').trim();
          if (!titleText) return;

          var id = h.id;
          if (!id) {
            id = 'heading-' + counter;
            h.id = id;
          }

          var li = document.createElement('li');
          li.className = 'y-toc-item level-' + h.tagName.toLowerCase().replace('h', '');
          
          var a = document.createElement('a');
          a.href = '#' + id;
          a.textContent = titleText;
          a.title = titleText;
          a.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.getElementById(id);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });

          li.appendChild(a);
          tocList.appendChild(li);
        });
      } catch (err) {
        console.error('TOC build error:', err);
      }
    })();
  </script>
</body>
</html>`;
}
