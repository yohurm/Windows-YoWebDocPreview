/**
 * Article skin measured from Chrome on
 * https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts
 * (2026-09-08, testdata/chrome-compare/official-computed.json).
 */
export const OFFICIAL_ARTICLE_CSS = `
:root {
  --font-sans: HarmonyOSHans-Regular, HarmonyOSHans-fallback, PingFangSC-Regular, "Microsoft YaHei", Arial, Helvetica, sans-serif;
  --font-mono: "JetBrains Mono", Consolas, ui-monospace, Menlo, monospace;
  --text: rgba(0, 0, 0, 0.9);
  --text-dim: rgba(0, 0, 0, 0.6);
  --link: #0a59f7;
  --line: rgba(0, 0, 0, 0.1);
  --bg: #ffffff;
  --code-bg: #fafafa;
  --th-bg: #f1f3f5;
  --note-bg: #f2f5fc;
  --caution-bg: #fff6e8;
  --danger-bg: #fff2f0;
  --note-accent: #0a59f7;
  --caution-accent: #c87d12;
  --danger-accent: #d94838;
  --title: #000000;
  color-scheme: light;
}
[data-theme="dark"] {
  --text: rgba(248, 250, 252, 0.92);
  --text-dim: rgba(148, 163, 184, 0.95);
  --link: #7db0ff;
  --line: rgba(255, 255, 255, 0.12);
  --bg: #131926;
  --code-bg: #0b0f19;
  --th-bg: #182030;
  --note-bg: rgba(10, 89, 247, 0.16);
  --caution-bg: rgba(200, 125, 18, 0.16);
  --danger-bg: rgba(217, 72, 56, 0.18);
  --note-accent: #7db0ff;
  --caution-accent: #e0a54a;
  --danger-accent: #f07167;
  --title: #f8fafc;
  color-scheme: dark;
}

* { box-sizing: border-box; }
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
}
.y-scroll {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}
.y-article {
  max-width: none;
  margin: 0;
  padding: 16px 40px 80px;
}
.y-crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-size: 14px;
  line-height: 20px;
  color: var(--text-dim);
}
.y-crumb__sep {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 19px;
  margin: 0 4px;
  color: var(--text-dim);
}
.y-crumb__sep svg {
  display: block;
  width: 6px;
  height: 12px;
}
.y-crumb__curr { color: var(--text-dim); }
.y-title {
  margin: 40px 0 0;
  font-size: 36px;
  font-weight: 700;
  line-height: 48px;
  color: var(--title);
}
.y-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  font-size: 14px;
  line-height: 21px;
  color: var(--text-dim);
}
.y-meta:empty { display: none; }
.y-device {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-dim);
}
.y-content {
  font-size: 16px;
  line-height: 24px;
  color: var(--text);
}
.y-content h1 { display: none; }
.y-content h2 {
  margin: 48px 0 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  color: var(--text);
}
.y-content h3 {
  margin: 32px 0 12px;
  font-size: 20px;
  font-weight: 700;
  line-height: 24px;
  color: var(--text);
}
.y-content h4 {
  margin: 24px 0 8px;
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
}
.y-content p { margin: 24px 0 0; }
.y-content ul, .y-content ol { margin: 8px 0 16px; padding-left: 1.4em; }
.y-content li { margin: 4px 0; }
.y-content a { color: var(--link); text-decoration: none; }
.y-content a:hover { text-decoration: underline; }
.y-content strong { font-weight: 700; }
.y-content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px auto;
}
.y-code {
  margin: 16px 0;
  background: var(--code-bg);
  border-radius: 12px;
  overflow: hidden;
}
.y-code__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-dim);
}
.y-code__hub { color: var(--link); text-decoration: none; }
.y-content pre, .y-code pre {
  margin: 0;
  padding: 0 16px 54px;
  background: transparent;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 22px;
  overflow-x: auto;
  white-space: pre;
}
.y-content code:not(pre code) {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--code-bg);
  padding: 1px 4px;
  border-radius: 3px;
}
.y-content table {
  width: 100%;
  margin: 16px 0;
  border-collapse: collapse;
  font-size: 16px;
  line-height: 24px;
  border-radius: 16px;
  overflow: hidden;
}
.y-content th, .y-content td {
  padding: 10px 12px;
  border: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
.y-content th { background: var(--th-bg); font-weight: 600; }
.tablenoborder { overflow-x: auto; }
.note {
  margin: 16px 0;
  padding: 12px 16px 12px 14px;
  border-radius: 8px;
  background: var(--note-bg);
  border-left: 3px solid var(--note-accent);
}
.note--caution { background: var(--caution-bg); border-left-color: var(--caution-accent); }
.note--danger { background: var(--danger-bg); border-left-color: var(--danger-accent); }
.note::before {
  content: attr(data-note);
  display: block;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
  text-transform: capitalize;
}
.note[data-note="note"]::before { content: "说明"; color: var(--note-accent); }
.note[data-note="caution"]::before { content: "注意"; color: var(--caution-accent); }
.note[data-note="danger"]::before { content: "警告"; color: var(--danger-accent); }
.note[data-note="tip"]::before { content: "提示"; color: var(--note-accent); }
.note img { display: none; }
.notetitle { display: none; }
.notebody p { margin: 6px 0; }
.y-content sup { font-size: 12px; font-weight: 600; color: var(--link); }
.section { margin: 0; }
`;
