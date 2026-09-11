/** highlight.js class → reading role. Skins only bind `--yo-syntax-*`. */
export const SYNTAX_ROLE_CLASSES = {
  keyword: [
    "hljs-keyword",
    "hljs-doctag",
    "hljs-template-tag",
    "hljs-template-variable",
    "hljs-variable.language_",
  ],
  string: ["hljs-string", "hljs-char.escape_"],
  comment: ["hljs-comment"],
  constant: [
    "hljs-number",
    "hljs-literal",
    "hljs-attr",
    "hljs-attribute",
    "hljs-meta",
    "hljs-selector-attr",
    "hljs-selector-class",
    "hljs-selector-id",
    "hljs-operator",
  ],
  entity: [
    "hljs-title",
    "hljs-title.class_",
    "hljs-title.class_.inherited__",
    "hljs-title.function_",
    "hljs-title.function_.invoke__",
    "hljs-type",
    "hljs-section",
  ],
  "entity-tag": ["hljs-name", "hljs-tag", "hljs-selector-tag", "hljs-quote", "hljs-selector-pseudo"],
  variable: ["hljs-built_in", "hljs-variable", "hljs-params", "hljs-symbol", "hljs-bullet"],
  regexp: ["hljs-regexp"],
} as const;

export type SyntaxRole = keyof typeof SYNTAX_ROLE_CLASSES;

export const SYNTAX_ROLES = Object.keys(SYNTAX_ROLE_CLASSES) as SyntaxRole[];
