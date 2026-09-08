# ADR-W12 — workbench 模块契约

**状态：** 已采纳（v2）  
**日期：** 2026-08-28  
**对齐：** 参考项目 `@yohu/workbench`（ADR-v6-012）；本 v1 §7.3 升级

## 背景

v1 规划了 `ui/` pnpm workspace 与模块注册，但实现停留在一张手写静态 `ui-dist/index.html`（vanilla JS 直调 invoke）：无类型契约、无依赖纪律、无组件库、无模块边界。v1 称前端壳包为 `@yohu/app`——与产品名/壳 crate 语义撞车（参考项目已因此改名 `@yohu/workbench`）。

## 决策

1. 前端壳包命名 **`@yohu/workbench`**（`ui/packages/workbench`），承载 `ModuleDescriptor` 契约、`registerModule` 注册表与 App 壳（导航/设置/状态栏）。
2. `apps/shell/src/main.tsx` 是**唯一组合点**：`registerModule(preview | library | tasks)`；模块只依赖 `@yohu/api` + `@yohu/ui`。
3. 模块契约（对齐参考项目，按本项目需要裁剪）：

```typescript
interface ModuleDescriptor {
  id: string;                    // 与数据目录/命名一致
  title: string;
  icon: IconName;
  Component: Component<AppSession>;   // 壳注入会话；模块不读壳 store、不自行 settings.get
}
```

4. 依赖纪律脚本化：`scripts/check-ui-deps.mjs` 扫描 `packages/modules/*` 的 package.json 依赖与源码 import，命中 `@yohu/workbench` / `@yohu/module-*` / `@tauri-apps/*` 即失败；`@tauri-apps/*` 全仓库只允许出现在 `@yohu/api`。接入 `pnpm lint`。
5. 静态组合，无插件热加载（继承 ADR-v6-012）。

## 后果

- 迁移路径：静态页功能逐一迁入三模块（preview/library/tasks），对齐后删除 `ui-dist`。
- `tauri.conf.json` 的 `frontendDist` 切至 `ui/apps/shell/dist`，`beforeDev/BuildCommand` 接 pnpm。
