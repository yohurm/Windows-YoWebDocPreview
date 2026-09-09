import type { Component } from "solid-js";

import type { Theme } from "@yohu/api";
import type { Appearance, WindowCaptionButtonsProps } from "@yohu/ui";

export interface ModuleViewProps {
  window: WindowCaptionButtonsProps;
  appearance?: Appearance;
  onSetTheme?: (theme: Theme) => void;
  onOpenSettings?: () => void;
}

export interface ModuleDescriptor {
  id: string;
  title: string;
  Component: Component<ModuleViewProps>;
}

const registry: ModuleDescriptor[] = [];

export function registerModule(descriptor: ModuleDescriptor): void {
  if (registry.some((item) => item.id === descriptor.id)) {
    throw new Error(`模块重复注册: ${descriptor.id}`);
  }
  registry.push(descriptor);
}

export function modules(): readonly ModuleDescriptor[] {
  return registry;
}
