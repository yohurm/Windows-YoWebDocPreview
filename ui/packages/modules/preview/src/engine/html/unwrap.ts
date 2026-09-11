/** Strip document chrome; keep article body. */
export function unwrapDocument(html: string): string {
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (body?.[1] != null) return body[1];
  return html.replace(/<\/?html[^>]*>/gi, "").replace(/<head[\s\S]*?<\/head>/gi, "");
}

export function stripNamedAnchors(html: string): string {
  return html.replace(/<a\s+name="[^"]*"><\/a>/gi, "");
}
