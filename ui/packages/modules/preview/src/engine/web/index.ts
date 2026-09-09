export { buildWebDocument, type RenderWebOptions } from "./document";
export { identifyWebCode, type WebCodeIdentity } from "./language";
export {
  extractDeviceTypes,
  mapDeviceLabels,
  normalizeArticleHtml,
  parseWebArticle,
  resolveDeviceTypes,
  resolveHeadingLevel,
  type ParsedWebArticle,
} from "./normalize";
export { extractWebToc, type WebTocItem } from "./toc";
