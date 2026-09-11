import { SYNTAX_ROLE_CLASSES } from "./roles";

export function syntaxColorCss(): string {
  return Object.entries(SYNTAX_ROLE_CLASSES)
    .map(([role, classes]) => {
      const sel = classes.map((cls) => `.${cls}`).join(",\n");
      return `${sel} {\n  color: var(--yo-syntax-${role});\n}`;
    })
    .join("\n\n");
}
