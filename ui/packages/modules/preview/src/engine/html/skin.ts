/** Neutral article reading skin. No official Huawei tokens or note/codehub chrome. */
export const GENERIC_ARTICLE_CSS = `
:root {
  --font-sans: "Segoe UI", "Microsoft YaHei", sans-serif;
  --font-mono: Consolas, ui-monospace, monospace;
}
[data-theme="light"] {
  --text: rgba(0, 0, 0, 0.88);
  --text-dim: rgba(0, 0, 0, 0.56);
  --link: #0a59f7;
  --line: rgba(0, 0, 0, 0.1);
  --bg: #ffffff;
  --code-bg: #f6f7f8;
  --th-bg: #f3f4f6;
  --title: #111827;
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
  --title: #f8fafc;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: var(--bg, transparent);
  color: var(--text, inherit);
  font-family: var(--font-sans);
}
.y-scroll { height: 100%; overflow-x: hidden; overflow-y: auto; }
.y-article { margin: 0; padding: 16px 32px 72px; }
.y-title {
  margin: 24px 0 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 36px;
  color: var(--title);
}
.y-meta {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-dim);
}
.y-meta:empty { display: none; }
.y-content { font-size: 16px; line-height: 24px; color: var(--text); }
.y-content h1, .y-content h2, .y-content h3, .y-content h4 {
  font-weight: 700;
  color: var(--text);
}
.y-content h2 { margin: 32px 0 0; font-size: 22px; }
.y-content h3 { margin: 24px 0 8px; font-size: 18px; }
.y-content h4 { margin: 20px 0 8px; font-size: 16px; }
.y-content p { margin: 16px 0 0; }
.y-content a { color: var(--link); }
.y-content img { max-width: 100%; height: auto; display: block; margin: 16px auto; }
.y-content pre {
  margin: 16px 0;
  padding: 12px 16px;
  background: var(--code-bg);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 14px;
}
.y-table-scroll { overflow-x: auto; margin: 16px 0; }
.y-content table { width: 100%; border-collapse: collapse; }
.y-content th, .y-content td {
  padding: 8px 10px;
  border: 1px solid var(--line);
  text-align: left;
}
.y-content th { background: var(--th-bg); }
math[display="block"] { display: block; margin: 16px 0; overflow-x: auto; }
`;
