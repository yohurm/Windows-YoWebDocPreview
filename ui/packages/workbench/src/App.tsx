/**
 * 工作台应用主容器（Workbench App）：组装无边框沉浸式窗口、导航栏与注册模块。
 * 遵循 SRP 与架构纪律：workbench 不直连任何具体业务模块，完全通过 registry 动态装载。
 */

import { createSignal, onMount, For, Show } from "solid-js";

import {
  windowClose,
  windowIsMaximized,
  windowMinimize,
  windowToggleMaximize,
  listenWindowResize,
} from "@yohu/api";
import {
  IconDocument,
  IconGear,
  YoTitleBar,
  type NavItem,
} from "@yohu/ui";

import { modules } from "./registry";
import { SettingsView } from "./SettingsView";

export function App() {
  const registered = modules();
  const initialTab = registered[0]?.id ?? "settings";
  const [activeTab, setActiveTab] = createSignal<string>(initialTab);
  const [maximized, setMaximized] = createSignal<boolean>(false);

  onMount(async () => {
    try {
      const isMax = await windowIsMaximized();
      setMaximized(isMax);
      await listenWindowResize(async () => {
        try {
          const m = await windowIsMaximized();
          setMaximized(m);
        } catch {
          // ignore
        }
      });
    } catch {
      // 浏览器预览或测试环境可能无 Tauri 宿主
    }
  });

  const handleMinimize = async () => {
    try {
      await windowMinimize();
    } catch (e) {
      console.warn("window minimize failed:", e);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await windowToggleMaximize();
      const m = await windowIsMaximized();
      setMaximized(m);
    } catch (e) {
      console.warn("window toggle maximize failed:", e);
    }
  };

  const handleClose = async () => {
    try {
      await windowClose();
    } catch (e) {
      console.warn("window close failed:", e);
    }
  };

  const navItems: NavItem[] = [
    ...registered.map((m) => ({
      id: m.id,
      label: m.title,
      icon: <IconDocument style={{ width: "15px", height: "15px" }} />,
    })),
    {
      id: "settings",
      label: "设置",
      icon: <IconGear style={{ width: "15px", height: "15px" }} />,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        width: "100vw",
        height: "100vh",
        background: "var(--yo-bg-app)",
        color: "var(--yo-text-primary)",
        overflow: "hidden",
      }}
    >
      {/* 现代沉浸式无边框标题栏：集成拖拽区、分段导航与 Windows 窗口控制三键 */}
      <YoTitleBar
        title="YoDoc Preview"
        navItems={navItems}
        activeNavId={activeTab()}
        onNavSelect={(id) => setActiveTab(id)}
        maximized={maximized()}
        onMinimize={handleMinimize}
        onToggleMaximize={handleToggleMaximize}
        onClose={handleClose}
      />

      {/* 主体工作台区域 */}
      <main
        style={{
          flex: 1,
          display: "flex",
          "flex-direction": "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <For each={registered}>
          {(mod) => (
            <Show when={activeTab() === mod.id}>
              <mod.Component />
            </Show>
          )}
        </For>

        <Show when={activeTab() === "settings"}>
          <SettingsView />
        </Show>
      </main>
    </div>
  );
}

export default App;
