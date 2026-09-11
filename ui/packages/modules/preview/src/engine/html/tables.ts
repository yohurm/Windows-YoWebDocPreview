/** Wrap tables for horizontal overflow. Markup stays as-is. */
export function wrapTables(html: string): string {
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (table) => {
    if (/y-table-scroll/.test(table)) return table;
    return `<div class="y-table-scroll">${table}</div>`;
  });
}
