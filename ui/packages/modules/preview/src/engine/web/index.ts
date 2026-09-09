export { paintWebAppearance } from "./appearance";
export { buildWebDocument, type RenderWebOptions } from "./document";
export { assignWebSrcdoc } from "./frame";
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
