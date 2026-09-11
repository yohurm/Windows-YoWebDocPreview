import table from "../../../../../testdata/huawei-catalogs.json";

const CATALOG_IDS = new Set(table.catalogs.map((c) => c.id));
const DISPLAY_NAMES = Object.fromEntries(table.catalogs.map((c) => [c.id, c.displayName]));

export const HUAWEI_DOC_PREFIX = table.prefix;
export const HUAWEI_SOURCE_ID = table.sourceId;

export function isHuaweiSource(sourceId?: string | null): boolean {
  return sourceId === HUAWEI_SOURCE_ID;
}

export const HUAWEI_CHANNELS = table.channels.map((ch) => ({
  key: ch.key,
  label: ch.label,
  catalogs: ch.catalogs,
  url: `${table.prefix}${ch.landingCatalog}/${ch.landingSlug}`,
}));

export function catalogDisplayName(catalogId: string): string {
  return DISPLAY_NAMES[catalogId] ?? catalogId;
}

export function catalogIdFromUrl(url: string): string | null {
  if (!url.startsWith(table.prefix)) return null;
  const rest = url.slice(table.prefix.length);
  const id = rest.split(/[/?#]/)[0];
  if (!id || !CATALOG_IDS.has(id)) return null;
  return id;
}

export function channelTabLabel(catalogId: string): string {
  return HUAWEI_CHANNELS.find((ch) => ch.catalogs.includes(catalogId))?.label ?? "";
}
