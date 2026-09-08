export interface HeroPreset {
  id: string;
  title: string;
  domain: string;
  badge: string;
  url: string;
}

export const HERO_PRESETS: HeroPreset[] = [
  {
    id: "harmonyos",
    title: "HarmonyOS NEXT 开发指南",
    domain: "developer.huawei.com",
    badge: "官方指南",
    url: "https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/introduction-to-arkts",
  },
  {
    id: "react",
    title: "React Documentation",
    domain: "react.dev",
    badge: "前端",
    url: "https://react.dev/reference/react",
  },
  {
    id: "rust",
    title: "Rust Standard Library",
    domain: "doc.rust-lang.org",
    badge: "系统",
    url: "https://doc.rust-lang.org/std/",
  },
  {
    id: "mdn",
    title: "MDN Web Docs",
    domain: "developer.mozilla.org",
    badge: "Web",
    url: "https://developer.mozilla.org/zh-CN/docs/Web",
  },
];
