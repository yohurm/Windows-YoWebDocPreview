export { buildHuaweiDocument, type RenderHuaweiOptions } from "./document";
export { identifyInlineIcon, markInlineIcons, type WebImageAttrs } from "./images";
export { identifyWebCode, type WebCodeIdentity } from "./language";
export {
  extractDeviceTypes,
  mapDeviceLabels,
  normalizeHuaweiArticle,
  parseHuaweiArticle,
  resolveDeviceTypes,
  resolveHeadingLevel,
  type ParsedHuaweiArticle,
} from "./normalize";
