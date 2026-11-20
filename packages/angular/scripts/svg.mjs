import { fileURLToPath } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';
import { parseSvg as parseFrameworkSvg } from '../../../scripts/framework-svg.mjs';

export { componentName, styles } from '../../../scripts/framework-svg.mjs';

export const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const parseSvg = (source, filename) => parseFrameworkSvg(DOMParser, source, filename);
