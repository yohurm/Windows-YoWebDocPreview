const DEVICE_LABELS: Record<string, string> = {
  phone: "Phone",
  "2in1": "PC/2in1",
  tablet: "Tablet",
  wearable: "Wearable",
  tv: "TV",
};

export function mapDeviceLabels(ids: string[]): string[] {
  return ids
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => DEVICE_LABELS[d.toLowerCase()] ?? d);
}

export function extractDeviceTypes(html: string): string[] {
  const match = /<h1[^>]*device-type="([^"]+)"/i.exec(html);
  const raw = match?.[1];
  if (!raw) return [];
  return mapDeviceLabels(raw.split(","));
}

export function resolveDeviceTypes(
  meta: { deviceTypes?: string[] } | null,
  rawHtml: string
): string[] {
  if (meta?.deviceTypes?.length) return mapDeviceLabels(meta.deviceTypes);
  return extractDeviceTypes(rawHtml);
}
