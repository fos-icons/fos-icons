import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';
import { compile } from 'svelte/compiler';
import { aliasModule, iconAliasExports } from '../../../scripts/icon-aliases.mjs';

export const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const styles = ['regular', 'filled', 'duocolor', 'duotone'];
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

export function componentSource(root, name) {
  const data = `${JSON.stringify(root.children)}, ${JSON.stringify(root.attributes.color ?? null)}`;
  return `import { createIcon } from '../runtime.js';\n`
    + `export const ${name} = /*#__PURE__*/ createIcon(${data});\n`
    + `export default ${name};\n`;
}

export async function build() {
  const snapshot = await readFile(path.join(packageRoot, 'source/icons.json'), 'utf8');
  const lock = JSON.parse(await readFile(path.join(packageRoot, 'source/lock.json'), 'utf8'));
  if (createHash('sha256').update(snapshot).digest('hex') !== lock.snapshotSha256) {
    throw new Error('SVG snapshot digest mismatch; synchronize the canonical sources again');
  }
  const manifest = JSON.parse(snapshot);
  if (manifest.schemaVersion !== 1 || manifest.grid !== 24 || manifest.license !== 'MIT'
    || JSON.stringify(manifest.styles) !== JSON.stringify(styles)
    || manifest.iconCount !== manifest.icons.length) {
    throw new Error('Unsupported or inconsistent SVG manifest');
  }
  const outputs = new Map();
  const canonicalNames = new Set();
  const names = new Set();
  const rootExports = [];
  for (const style of styles) {
    const exports = [];
    for (const icon of manifest.icons) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(icon.name)
        || (style === styles[0] && canonicalNames.has(icon.name))) {
        throw new Error(`Invalid or duplicate icon name: ${icon.name}`);
      }
      if (manifest.excludedBrands.includes(icon.name)) {
        throw new Error(`Excluded brand in core manifest: ${icon.name}`);
      }
      canonicalNames.add(icon.name);
      const relative = `icons/${style}/${icon.name}.svg`;
      const source = icon.svg[style];
      if (typeof source !== 'string') throw new Error(`Missing SVG source: ${relative}`);
      if (createHash('sha256').update(source).digest('hex') !== icon.sha256[style]) {
        throw new Error(`Source digest mismatch: ${relative}`);
      }
      const name = componentName(icon.name, style);
      if (names.has(name)) throw new Error(`Component name collision: ${name}`);
      names.add(name);
      outputs.set(`${style}/${icon.name}.js`, componentSource(parseSvg(source, relative), name));
      outputs.set(`${style}/${icon.name}.d.ts`,
        `import type { FosIcon } from '../types.js';\nexport declare const ${name}: FosIcon;\nexport default ${name};\n`);
      exports.push(`export { ${name} } from './${icon.name}.js';`);
    }
    for (const { alias, target, name, original } of iconAliasExports(manifest, style, componentName, names)) {
      const source = aliasModule(target, original, name);
      outputs.set(`${style}/${alias}.js`, source);
      outputs.set(`${style}/${alias}.d.ts`, source);
      exports.push(`export { ${name} } from './${alias}.js';`);
    }
    const index = `${exports.join('\n')}\n`;
    outputs.set(`${style}/index.js`, index);
    outputs.set(`${style}/index.d.ts`, `export type { FosIcon, IconProps } from '../types.js';\n${index}`);
    rootExports.push(`export * from './${style}/index.js';`);
  }
  outputs.set('index.js', `${rootExports.join('\n')}\n`);
  outputs.set('index.d.ts', `export type { FosIcon, IconProps } from './types.js';\n${rootExports.join('\n')}\n`);
  outputs.set('types.d.ts', await readFile(path.join(packageRoot, 'src/types.ts'), 'utf8'));
  const wrapper = await readFile(path.join(packageRoot, 'src/Icon.svelte'), 'utf8');
  compile(wrapper, { filename: 'Icon.svelte', generate: 'server' });
  compile(wrapper, { filename: 'Icon.svelte', generate: 'client' });
  outputs.set('Icon.svelte', wrapper);
  for (const filename of ['runtime.js', 'attributes.js']) {
    outputs.set(filename, await readFile(path.join(packageRoot, 'src', filename), 'utf8'));
  }
  const dist = path.join(packageRoot, 'dist');
  await mkdir(dist, { recursive: true });
  for (const relative of await readdir(dist, { recursive: true })) {
    if (/\.(svelte|js|ts)$/.test(relative) && !outputs.has(relative.split(path.sep).join('/'))) {
      await unlink(path.join(dist, relative));
    }
  }
  const entries = [...outputs];
  for (let offset = 0; offset < entries.length; offset += 64) {
    await Promise.all(entries.slice(offset, offset + 64).map(async ([relative, content]) => {
      await mkdir(path.dirname(path.join(dist, relative)), { recursive: true });
      await writeFile(path.join(dist, relative), content);
    }));
  }
  console.log(`Built ${names.size} Svelte components from ${canonicalNames.size} icons in four styles.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
