import { createEffect, createSignal, For, Show } from "solid-js";

import {
  dialogPickFolder,
  DISPLAY_NAME,
  librarySync,
  systemInfo,
  type AppSettings,
  type SystemInfo,
} from "@yohu/api";
import {
  IconFolder,
  IconGlobe,
  IconInfo,
  IconSun,
  YoButton,
  YoChromeButton,
  YoSwitch,
  YoTextField,
  YoThemeCards,
  YoThemeChromeButton,
  YoTitleBar,
  YoStage,
} from "@yohu/ui";
import type { WindowCaptionButtonsProps } from "@yohu/ui";

import type { SettingsSession } from "./settingsSession";

type SettingsSection = "appearance" | "library" | "network" | "about";

const NAV: { id: SettingsSection; label: string; icon: typeof IconSun }[] = [
  { id: "appearance", label: "外观", icon: IconSun },
  { id: "library", label: "文档库", icon: IconFolder },
  { id: "network", label: "抓取与网络", icon: IconGlobe },
  { id: "about", label: "关于", icon: IconInfo },
];

export function SettingsPage(props: {
  window: WindowCaptionButtonsProps;
  onBack: () => void;
  session: SettingsSession;
}) {
  const appearance = () => props.session.resolved();

  return (
    <div class="yo-app">
      <YoTitleBar
        window={props.window}
        leading={
          <YoChromeButton title="返回工作台" onClick={props.onBack}>
            ←
          </YoChromeButton>
        }
        actions={
          <YoThemeChromeButton
            appearance={appearance()}
            onSelect={(theme) => props.session.setTheme(theme)}
          />
        }
      >
        <span class="yo-titlebar__label">设置</span>
      </YoTitleBar>
      <SettingsForm session={props.session} />
      <footer class="yo-statusbar">
        <span>工作台偏好</span>
        <Show when={props.session.saving()}>
          <span class="yo-text-muted">正在保存…</span>
        </Show>
      </footer>
    </div>
  );
}

function SettingsForm(props: { session: SettingsSession }) {
  const [section, setSection] = createSignal<SettingsSection>("appearance");
  const [libraryRoot, setLibraryRoot] = createSignal("");
  const [timeoutSec, setTimeoutSec] = createSignal("15");
  const [concurrency, setConcurrency] = createSignal("4");
  const [hydrated, setHydrated] = createSignal(false);
  const [about, setAbout] = createSignal<SystemInfo | null>(null);
  const [syncing, setSyncing] = createSignal(false);
  const [syncNote, setSyncNote] = createSignal("");

  createEffect(() => {
    const current = props.session.settings();
    if (current && !hydrated()) {
      applyDraft(current);
      setHydrated(true);
    }
  });

  const applyDraft = (value: AppSettings) => {
    setLibraryRoot(value.libraryRoot);
    setTimeoutSec(String(value.requestTimeoutSec));
    setConcurrency(String(value.concurrency));
  };

  const pickFolder = async () => {
    const path = await dialogPickFolder();
    if (!path) return;
    setLibraryRoot(path);
    void props.session.patch({ libraryRoot: path });
  };

  const runLibrarySync = async () => {
    setSyncing(true);
    setSyncNote("");
    try {
      const report = await librarySync(["开发", "设计"]);
      setSyncNote(
        `计划 ${report.planned}：更新 ${report.updated}，新增 ${report.created}，下线 ${report.markedOffline}，失败 ${report.failed}`,
      );
    } catch (err) {
      setSyncNote(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  const commitLibrary = () => {
    const current = props.session.settings();
    if (!current) return;
    const next = libraryRoot().trim();
    if (next !== current.libraryRoot) void props.session.patch({ libraryRoot: next });
  };

  const commitTimeout = () => {
    const current = props.session.settings();
    if (!current) return;
    const parsed = clampInt(timeoutSec(), current.requestTimeoutSec, 5, 120);
    setTimeoutSec(String(parsed));
    if (parsed !== current.requestTimeoutSec) {
      void props.session.patch({ requestTimeoutSec: parsed });
    }
  };

  const commitConcurrency = () => {
    const current = props.session.settings();
    if (!current) return;
    const parsed = clampInt(concurrency(), current.concurrency, 1, 16);
    setConcurrency(String(parsed));
    if (parsed !== current.concurrency) {
      void props.session.patch({ concurrency: parsed });
    }
  };

  const openSection = (id: SettingsSection) => {
    setSection(id);
    if (id === "about" && !about()) {
      void systemInfo()
        .then(setAbout)
        .catch(() => setAbout(null));
    }
  };

  return (
    <div class="yo-settings">
      <nav class="yo-settings__nav" aria-label="设置分类">
        <div class="yo-settings__nav-kicker">偏好设置</div>
        <For each={NAV}>
          {(item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                classList={{
                  "yo-settings__nav-item": true,
                  "is-on": section() === item.id,
                }}
                onClick={() => openSection(item.id)}
              >
                <Icon class="yo-icon-md" />
                {item.label}
              </button>
            );
          }}
        </For>
      </nav>
      <div class="yo-settings__main">
        <div class="yo-settings__page">
          <Show when={!props.session.settings() && !props.session.error()}>
            <div class="yo-muted">载入设置中…</div>
          </Show>
          <Show when={props.session.error()}>
            <div class="yo-error">{props.session.error()}</div>
          </Show>
          <Show when={props.session.settings()}>
            {(settings) => (
              <YoStage keys={section()} recipe="fade-local">
                <>
                <Show when={section() === "appearance"}>
                  <div class="yo-settings__page-head">
                    <h2 class="yo-settings__title">外观</h2>
                    <p class="yo-settings__lead">
                      选择工作台配色。立即生效，标题栏图标可在浅色和深色之间来回切换。
                    </p>
                  </div>
                  <section class="yo-settings__group" aria-label="主题">
                    <div class="yo-settings__group-head">
                      <h3 class="yo-settings__group-title">主题</h3>
                    </div>
                    <div class="yo-settings__item yo-settings__item--stack">
                      <div class="yo-settings__item-text">
                        <div class="yo-settings__item-label">配色方案</div>
                        <div class="yo-settings__item-help">
                          浅色与深色会固定外观；跟随系统则与 Windows 设置同步。
                        </div>
                      </div>
                        <YoThemeCards
                          preference={props.session.theme()}
                          onSelect={(theme) => props.session.setTheme(theme)}
                        />
                    </div>
                  </section>
                </Show>

                <Show when={section() === "library"}>
                  <div class="yo-settings__page-head">
                    <h2 class="yo-settings__title">文档库</h2>
                    <p class="yo-settings__lead">
                      本地 Markdown 与导出文件的根目录。路径在下次启动工作台时生效。
                    </p>
                  </div>
                  <section class="yo-settings__group" aria-label="文档库路径">
                    <div class="yo-settings__item yo-settings__item--stack">
                      <div class="yo-settings__item-text">
                        <div class="yo-settings__item-label">本地文档与导出根目录</div>
                        <div class="yo-settings__item-help">
                          留空则保存至系统默认 AppData 目录。更改后需重启工作台。
                        </div>
                      </div>
                      <div class="yo-settings__item-control">
                        <YoTextField
                          value={libraryRoot()}
                          onInput={setLibraryRoot}
                          placeholder="留空则保存至系统默认 AppData 目录"
                          onEnter={commitLibrary}
                          onBlur={commitLibrary}
                        />
                        <YoButton kind="secondary" onClick={() => void pickFolder()}>
                          <IconFolder class="yo-icon-md" />
                          <span>浏览</span>
                        </YoButton>
                      </div>
                    </div>
                    <p class="yo-settings__note">失焦或回车即保存。当前会话仍使用启动时的库根。</p>
                  </section>
                  <section class="yo-settings__group" aria-label="对照官网更新">
                    <div class="yo-settings__item yo-settings__item--stack">
                      <div class="yo-settings__item-text">
                        <div class="yo-settings__item-label">全量更新开发 / 设计</div>
                        <div class="yo-settings__item-help">
                          用本应用的拉取与转换引擎对照官网：过时重写、新篇落盘、下线只打标记不删。库根须指向文档树。
                        </div>
                      </div>
                      <div class="yo-settings__item-control">
                        <YoButton
                          kind="secondary"
                          disabled={syncing()}
                          onClick={() => void runLibrarySync()}
                        >
                          <span>{syncing() ? "正在更新…" : "全量更新"}</span>
                        </YoButton>
                      </div>
                    </div>
                    <Show when={syncNote()}>
                      <p class="yo-settings__note">{syncNote()}</p>
                    </Show>
                  </section>
                </Show>

                <Show when={section() === "network"}>
                  <div class="yo-settings__page-head">
                    <h2 class="yo-settings__title">抓取与网络</h2>
                    <p class="yo-settings__lead">
                      控制在线预览请求与批量导出。超时立即生效；并发与图片下载从下一任务开始。
                    </p>
                  </div>
                  <section class="yo-settings__group">
                    <div class="yo-settings__item">
                      <div class="yo-settings__item-text">
                        <div class="yo-settings__item-label">网络请求超时</div>
                        <div class="yo-settings__item-help">单次 HTTP 等待上限，范围 5–120 秒。</div>
                      </div>
                      <div class="yo-settings__item-control">
                        <div class="yo-settings__narrow">
                          <YoTextField
                            value={timeoutSec()}
                            onInput={setTimeoutSec}
                            onEnter={commitTimeout}
                            onBlur={commitTimeout}
                          />
                        </div>
                        <span class="yo-text-muted">秒</span>
                      </div>
                    </div>
                    <div class="yo-settings__item">
                      <div class="yo-settings__item-text">
                        <div class="yo-settings__item-label">批量抓取并发</div>
                        <div class="yo-settings__item-help">同时进行的导出任务数，范围 1–16。</div>
                      </div>
                      <div class="yo-settings__item-control">
                        <div class="yo-settings__narrow">
                          <YoTextField
                            value={concurrency()}
                            onInput={setConcurrency}
                            onEnter={commitConcurrency}
                            onBlur={commitConcurrency}
                          />
                        </div>
                      </div>
                    </div>
                    <div class="yo-settings__item">
                      <div class="yo-settings__item-text">
                        <div class="yo-settings__item-label">导出时下载图片</div>
                        <div class="yo-settings__item-help">
                          将正文图片保存到本地 assets 目录；关闭则保留远程 URL。
                        </div>
                      </div>
                      <div class="yo-settings__item-control">
                        <YoSwitch
                          checked={settings().imageDownload}
                          label="导出时下载图片"
                          onChange={(value) => void props.session.patch({ imageDownload: value })}
                        />
                      </div>
                    </div>
                  </section>
                </Show>

                <Show when={section() === "about"}>
                  <div class="yo-settings__page-head">
                    <h2 class="yo-settings__title">关于</h2>
                    <p class="yo-settings__lead">{DISPLAY_NAME} 工作台身份与数据位置。</p>
                  </div>
                  <section class="yo-settings__group">
                    <dl class="yo-settings__kv">
                      <dt>应用</dt>
                      <dd>{DISPLAY_NAME}</dd>
                      <dt>版本</dt>
                      <dd>{about()?.version ?? "…"}</dd>
                      <dt>数据目录</dt>
                      <dd>{about()?.dataDir ?? "…"}</dd>
                      <dt>文档库</dt>
                      <dd>{about()?.libraryRoot ?? settings().libraryRoot}</dd>
                    </dl>
                  </section>
                </Show>
                </>
              </YoStage>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
}

function clampInt(raw: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
