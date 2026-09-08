/**
 * 设置视图组件：遵循 SRP 独立承载通用设置交互。
 */

import { createSignal, onMount, Show } from "solid-js";

import {
  dialogPickFolder,
  settingsGet,
  settingsSet,
  type AppSettings,
  type Theme,
} from "@yohu/api";
import { IconCheck, IconFolder, YoButton, YoCard, YoTextField } from "@yohu/ui";

export function SettingsView() {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [saved, setSaved] = createSignal(false);

  onMount(async () => {
    try {
      const s = await settingsGet();
      setSettings(s);
    } catch {
      // 容错默认
    }
  });

  const pickFolder = async () => {
    try {
      const folder = await dialogPickFolder();
      if (folder) {
        setSettings((prev) => (prev ? { ...prev, libraryRoot: folder } : null));
      }
    } catch {
      // 容错
    }
  };

  const handleSave = async () => {
    const current = settings();
    if (!current || saving()) return;
    setSaving(true);
    try {
      const updated = await settingsSet(current);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: "32px",
        "max-width": "760px",
        margin: "0 auto",
        width: "100%",
        display: "flex",
        "flex-direction": "column",
        gap: "24px",
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 6px 0", "font-size": "20px", "font-weight": 600 }}>通用设置</h2>
        <p style={{ margin: 0, "font-size": "13px", color: "var(--yo-text-muted)" }}>
          配置文档导出默认路径、并发抓取上限与网络超时策略
        </p>
      </div>

      <Show when={settings()}>
        {(s) => (
          <YoCard style={{ display: "flex", "flex-direction": "column", gap: "20px", padding: "24px" }}>
            {/* 默认导出根目录 */}
            <div>
              <label
                style={{
                  display: "block",
                  "font-size": "13px",
                  "font-weight": 500,
                  "margin-bottom": "8px",
                }}
              >
                文档保存与导出路径
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <YoTextField
                    value={s().libraryRoot}
                    onInput={(v) => setSettings({ ...s(), libraryRoot: v })}
                    placeholder="例如: D:\Documents\YoDocs"
                  />
                </div>
                <YoButton kind="ghost" onClick={() => void pickFolder()}>
                  <IconFolder style={{ width: "14px", height: "14px" }} />
                  浏览…
                </YoButton>
              </div>
              <div
                style={{
                  "font-size": "11.5px",
                  color: "var(--yo-text-muted)",
                  "margin-top": "6px",
                }}
              >
                导出的 Markdown 文件将优先保存在此目录；若未设置将自动保存在 LocalAppData 用户数据目录。
              </div>
            </div>

            {/* 网络超时 */}
            <div>
              <label
                style={{
                  display: "block",
                  "font-size": "13px",
                  "font-weight": 500,
                  "margin-bottom": "8px",
                }}
              >
                网络请求超时时间 (秒)
              </label>
              <input
                type="number"
                class="yo-input"
                min="5"
                max="120"
                value={s().requestTimeoutSec}
                onInput={(e) =>
                  setSettings({
                    ...s(),
                    requestTimeoutSec: Number.parseInt(e.currentTarget.value, 10) || 15,
                  })
                }
                style={{ width: "160px" }}
              />
            </div>

            {/* 图片抓取开关 */}
            <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="image-download-cb"
                checked={s().imageDownload}
                onChange={(e) =>
                  setSettings({
                    ...s(),
                    imageDownload: e.currentTarget.checked,
                  })
                }
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label
                for="image-download-cb"
                style={{ "font-size": "13px", cursor: "pointer" }}
              >
                解析与导出文档时自动抓取并本地化内嵌图片资源
              </label>
            </div>

            {/* 外观主题 */}
            <div>
              <label
                style={{
                  display: "block",
                  "font-size": "13px",
                  "font-weight": 500,
                  "margin-bottom": "8px",
                }}
              >
                外观主题
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                {(["system", "light", "dark"] as Theme[]).map((theme) => (
                  <label
                    style={{
                      display: "flex",
                      "align-items": "center",
                      gap: "6px",
                      "font-size": "13px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={theme}
                      checked={s().theme === theme}
                      onChange={() => setSettings({ ...s(), theme })}
                    />
                    {theme === "system" ? "跟随系统" : theme === "light" ? "浅色" : "深色"}
                  </label>
                ))}
              </div>
            </div>

            <div
              style={{
                "margin-top": "12px",
                "padding-top": "16px",
                "border-top": "1px solid var(--yo-line)",
                display: "flex",
                "align-items": "center",
                gap: "12px",
              }}
            >
              <YoButton onClick={() => void handleSave()} disabled={saving()}>
                {saving() ? "正在保存…" : "保存设置"}
              </YoButton>
              <Show when={saved()}>
                <span
                  style={{
                    "font-size": "12px",
                    color: "var(--yo-success)",
                    display: "flex",
                    "align-items": "center",
                    gap: "4px",
                  }}
                >
                  <IconCheck style={{ width: "14px", height: "14px" }} />
                  设置已成功生效
                </span>
              </Show>
            </div>
          </YoCard>
        )}
      </Show>
    </div>
  );
}
