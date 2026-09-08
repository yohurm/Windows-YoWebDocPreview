import { createSignal, onMount, Show } from "solid-js";

import {
  dialogPickFolder,
  DISPLAY_NAME,
  settingsGet,
  settingsSet,
  type AppSettings,
} from "@yohu/api";
import {
  IconCheck,
  IconFolder,
  YoAppNameButton,
  YoButton,
  YoCard,
  YoChromeButton,
  YoTextField,
  YoTitleBar,
} from "@yohu/ui";
import type { WindowCaptionButtonsProps } from "@yohu/ui";

export function SettingsPage(props: {
  window: WindowCaptionButtonsProps;
  onBack: () => void;
}) {
  return (
    <div class="yo-app">
      <YoTitleBar
        window={props.window}
        leading={
          <YoChromeButton title="返回工作台" onClick={props.onBack}>
            ←
          </YoChromeButton>
        }
      >
        <YoAppNameButton name={DISPLAY_NAME} onClick={props.onBack} />
      </YoTitleBar>
      <SettingsForm />
      <footer class="yo-statusbar">
        <span>工作台偏好</span>
      </footer>
    </div>
  );
}

function SettingsForm() {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      setSettings(await settingsGet());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  });

  const pickFolder = async () => {
    const path = await dialogPickFolder();
    if (path && settings()) {
      setSettings({ ...settings()!, libraryRoot: path });
    }
  };

  const handleSave = async () => {
    const current = settings();
    if (!current) return;
    setSaving(true);
    setError(null);
    try {
      setSettings(await settingsSet(current));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="yo-settings">
      <div class="yo-settings__inner">
        <Show when={loading()}>
          <div class="yo-muted">载入设置中…</div>
        </Show>
        <Show when={error()}>
          <div class="yo-error">{error()}</div>
        </Show>
        <Show when={settings()}>
          <h2 class="yo-settings__title">工作台偏好设置</h2>
          <YoCard>
            <div class="yo-settings__stack">
              <div class="yo-settings__label">本地文档与导出根目录</div>
              <div class="yo-settings__row">
                <YoTextField
                  value={settings()!.libraryRoot}
                  onInput={(value) => setSettings({ ...settings()!, libraryRoot: value })}
                  placeholder="留空则保存至系统默认 AppData 目录"
                />
                <YoButton kind="secondary" onClick={() => void pickFolder()}>
                  <IconFolder class="yo-icon-md" />
                  <span>浏览</span>
                </YoButton>
              </div>
            </div>
          </YoCard>
          <YoCard>
            <div class="yo-settings__stack">
              <div class="yo-settings__label">网络请求超时时间 (秒)</div>
              <YoTextField
                value={String(settings()!.requestTimeoutSec)}
                onInput={(value) =>
                  setSettings({
                    ...settings()!,
                    requestTimeoutSec: Math.max(5, Number.parseInt(value, 10) || 30),
                  })
                }
              />
            </div>
          </YoCard>
          <div class="yo-settings__row">
            <YoButton kind="primary" onClick={() => void handleSave()} disabled={saving()}>
              <Show when={saved()} fallback={<span>保存设置</span>}>
                <span class="yo-settings__row">
                  <IconCheck class="yo-icon-md" />
                  已保存
                </span>
              </Show>
            </YoButton>
          </div>
        </Show>
      </div>
    </div>
  );
}
