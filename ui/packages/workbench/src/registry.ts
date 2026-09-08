/**
 * 模块注册表（ADR-W12）：静态组合，无插件热加载。
 * 组合点是 apps/shell（registerModule）。模块只依赖 @yohu/api + @yohu/ui；
 * 禁止依赖 @yohu/workbench 或其它模块（scripts/check-ui-deps.mjs 把守）。
 */

import type { Component } from "solid-js";

export interface ModuleDescriptor {
  /** 模块 id（与导航/事件命名一致） */
  id: string;
  title: string;
  /** 主视图组件 */
  Component: Component;
}

const registry: ModuleDescriptor[] = [];

/** 注册模块（仅 apps/shell 调用）。 */
export function registerModule(descriptor: ModuleDescriptor): void {
  if (registry.some((m) => m.id === descriptor.id)) {
    throw new Error(`模块重复注册: ${descriptor.id}`);
  }
  registry.push(descriptor);
}

/** 全部已注册模块（按注册顺序）。 */
export function modules(): readonly ModuleDescriptor[] {
  return registry;
}
