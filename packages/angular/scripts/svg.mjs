import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';

export const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const styles = ['regular', 'filled', 'duocolor', 'duotone'];
const tags = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line',
  'polyline', 'polygon', 'defs', 'clipPath', 'mask', 'use']);
const namespace = 'http://www.w3.org/2000/svg';

export function componentName(name, style) {
  const pascal = name.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
  return `${/^\d/.test(pascal) ? 'Icon' : ''}${pascal}${style[0].toUpperCase()}${style.slice(1)}`;
}

export function parseSvg(source, filename) {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error(`${filename}: unsupported XML declarations`);
  const document = new DOMParser({
    onError(level, message) {
      throw new Error(`${filename}: ${level}: ${message}`);
    },
  }).parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  if (root.localName !== 'svg' || root.namespaceURI !== namespace
    || root.getAttribute('viewBox') !== '0 0 24 24'
    || root.getAttribute('width') !== '24' || root.getAttribute('height') !== '24'
    || root.getAttribute('fill') !== 'none') {
    throw new Error(`${filename}: expected a 24px unfilled SVG root`);
  }
  function visit(node) {
    if (!tags.has(node.localName) || node.namespaceURI !== namespace) {
      throw new Error(`${filename}: unsupported element ${node.nodeName}`);
    }
    const attributes = {};
    for (const { name, value } of Array.from(node.attributes)) {
      if (/^on/i.test(name) || name === 'style') {
        throw new Error(`${filename}: unsupported attribute ${name}`);
      }
      if (!name.startsWith('xmlns')) attributes[name] = value;
    }
    const children = [];
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 1) children.push(visit(child));
      else if (child.nodeType !== 8 && child.nodeValue.trim()) {
        throw new Error(`${filename}: unsupported SVG text`);
      }
    }
    return { tag: node.localName, attributes, children };
  }
  const parsed = visit(root);
  for (const attribute of Object.keys(parsed.attributes)) {
    if (!['width', 'height', 'fill', 'viewBox', 'color'].includes(attribute)) {
      throw new Error(`${filename}: unsupported root attribute ${attribute}`);
    }
  }
  return parsed;
}
