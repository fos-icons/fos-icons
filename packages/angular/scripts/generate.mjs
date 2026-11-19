import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { componentName, packageRoot, parseSvg, styles } from './svg.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const generated = path.join(packageRoot, '.generated');
const snapshot = await readFile(path.join(packageRoot, 'source/icons.json'), 'utf8');
const lock = JSON.parse(await readFile(path.join(packageRoot, 'source/lock.json'), 'utf8'));
if (digest(snapshot) !== lock.snapshotSha256) {
  throw new Error('SVG snapshot digest mismatch; synchronize the canonical sources again');
}
const manifest = JSON.parse(snapshot);
if (manifest.schemaVersion !== 1 || manifest.grid !== 24 || manifest.license !== 'MIT'
  || JSON.stringify(manifest.styles) !== JSON.stringify(styles)
  || manifest.iconCount !== manifest.icons.length) {
  throw new Error('Unsupported or inconsistent SVG snapshot');
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('{', '&#123;').replaceAll('}', '&#125;');
}

function renderAttribute(name, value) {
  let expression;
  if (name === 'id') {
    expression = `fragmentId(${JSON.stringify(value)})`;
  } else if (name === 'stroke-width') {
    expression = `strokeWidth() ?? ${JSON.stringify(value)}`;
  } else if (['href', 'xlink:href'].includes(name)) {
    if (!/^#[\w-]+$/.test(value)) throw new Error(`Unsupported SVG link: ${value}`);
    expression = `'#' + fragmentId(${JSON.stringify(value.slice(1))})`;
  } else if (value.includes('url(')) {
    const match = /^url\(#([\w-]+)\)$/.exec(value);
    if (!match) throw new Error(`Unsupported SVG reference: ${value}`);
    expression = `'url(#' + fragmentId(${JSON.stringify(match[1])}) + ')'`;
  }
  return expression
    ? ` [attr.${name}]="${escapeAttribute(expression)}"`
    : ` ${name}="${escapeAttribute(value)}"`;
}

function renderNode({ tag, attributes, children }) {
  const attrs = Object.entries(attributes).map(([key, value]) => renderAttribute(key, value)).join('');
  // The component host is an SVG element. Explicit namespaces also put its template nodes in SVG.
  return `<svg:${tag}${attrs}>${children.map(renderNode).join('')}</svg:${tag}>`;
}

function componentSource(name, icon, style, svg) {
  const defaultColor = JSON.stringify(svg.attributes.color ?? null);
  const template = '@if (title(); as text) { <svg:title>{{ text }}</svg:title> }'
    + svg.children.map(renderNode).join('');
  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconBase } from '../icon-base.js';

@Component({
  selector: 'svg[fos-${icon}-${style}]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    viewBox: '0 0 24 24',
    fill: 'none',
    focusable: 'false',
    '[attr.color]': 'color() ?? primaryColor() ?? ${defaultColor}',
  },
  template: ${JSON.stringify(template)},
})
export class ${name} extends IconBase {}

export default ${name};
`;
}

const outputs = new Map();
const names = new Set();
const iconNames = new Set();
const rootExports = [];
for (const style of styles) {
  const exports = [];
  for (const icon of manifest.icons) {
    if (style === styles[0]) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(icon.name)
        || iconNames.has(icon.name) || manifest.excludedBrands.includes(icon.name)) {
        throw new Error(`Invalid, duplicate, or excluded icon name: ${icon.name}`);
      }
      iconNames.add(icon.name);
    }
    const filename = `icons/${style}/${icon.name}.svg`;
    const source = icon.svg[style];
    if (typeof source !== 'string' || digest(source) !== icon.sha256[style]) {
      throw new Error(`Source digest mismatch: ${filename}`);
    }
    const name = componentName(icon.name, style);
    if (names.has(name)) throw new Error(`Component name collision: ${name}`);
    names.add(name);
    outputs.set(`${style}/${icon.name}.ts`, componentSource(name, icon.name, style, parseSvg(source, filename)));
    exports.push(`export { ${name} } from './${icon.name}.js';`);
  }
  outputs.set(`${style}/index.ts`, exports.join('\n') + '\n');
  rootExports.push(`export * from './${style}/index.js';`);
}
outputs.set('index.ts', rootExports.join('\n') + '\n');

await rm(generated, { recursive: true, force: true });
await mkdir(generated, { recursive: true });
await Promise.all(styles.map(style => mkdir(path.join(generated, style))));
await copyFile(path.join(packageRoot, 'src/icon-base.ts'), path.join(generated, 'icon-base.ts'));
const entries = [...outputs];
for (let offset = 0; offset < entries.length; offset += 64) {
  await Promise.all(entries.slice(offset, offset + 64).map(([filename, content]) =>
    writeFile(path.join(generated, filename), content)));
}
await rm(path.join(packageRoot, 'dist'), { recursive: true, force: true });
console.log(`Generated ${names.size} Angular components from ${iconNames.size} icons in four styles.`);
