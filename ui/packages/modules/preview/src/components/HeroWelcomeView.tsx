import { createSignal, For } from "solid-js";

import { IconSearch } from "@yohu/ui";

import { HERO_PRESETS } from "../presets";

export function HeroWelcomeView(props: { onSelectUrl: (url: string) => void }) {
  const [inputValue, setInputValue] = createSignal("");

  const handleSubmit = (event?: Event) => {
    event?.preventDefault();
    const target = inputValue().trim();
    if (target) props.onSelectUrl(target);
  };

  return (
    <div class="yo-hero">
      <div class="yo-hero__center">
        <div class="yo-hero__badge">YOHU WEBDOC PREVIEW</div>
        <h1 class="yo-hero__title">聚焦阅读，纯粹探索</h1>
        <p class="yo-hero__subtitle">
          输入官方技术文档或网页链接，还原原貌并生成无干扰排版视图。
        </p>
        <form class="yo-hero__form" onSubmit={handleSubmit}>
          <IconSearch class="yo-icon-base yo-text-muted" />
          <input
            type="text"
            class="yo-hero__input"
            placeholder="输入或粘贴文档 URL，回车载入"
            value={inputValue()}
            onInput={(event) => setInputValue(event.currentTarget.value)}
            autofocus
          />
          <button type="submit" class="yo-hero__submit" disabled={!inputValue().trim()}>
            载入
          </button>
        </form>
        <div class="yo-hero__presets">
          <div class="yo-hero__presets-label">精选官方文档</div>
          <div class="yo-hero__grid">
            <For each={HERO_PRESETS}>
              {(item) => (
                <button type="button" class="yo-hero__card" onClick={() => props.onSelectUrl(item.url)}>
                  <span class="yo-hero__card-tag">{item.badge}</span>
                  <span class="yo-hero__card-title">{item.title}</span>
                  <span class="yo-hero__card-domain">{item.domain}</span>
                </button>
              )}
            </For>
          </div>
        </div>
        <div class="yo-hero__hints">
          <span>
            <kbd>Ctrl</kbd> + <kbd>B</kbd> 专栏
          </span>
          <span>
            <kbd>Ctrl</kbd> + <kbd>1/2/3</kbd> 模式
          </span>
          <span>
            <kbd>Ctrl</kbd> + <kbd>O</kbd> 大纲
          </span>
        </div>
      </div>
    </div>
  );
}
