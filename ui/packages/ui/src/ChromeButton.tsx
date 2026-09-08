import type { JSX } from "solid-js";

export interface YoChromeButtonProps {
  title: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: JSX.Element;
}

export function YoChromeButton(props: YoChromeButtonProps): JSX.Element {
  return (
    <button
      type="button"
      classList={{
        "yo-chrome-btn": true,
        "is-on": Boolean(props.pressed),
      }}
      title={props.title}
      aria-label={props.title}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onClick={(event) => {
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.children}
    </button>
  );
}
