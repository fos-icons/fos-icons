import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformAsync } from '@babel/core';
import solid from '@solidjs/babel-plugin';
import { DOMParser } from '@xmldom/xmldom';
import { componentName, parseSvg, styles } from '../../../scripts/framework-svg.mjs';
import { aliasModule, iconAliasExports } from '../../../scripts/icon-aliases.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const dist = path.join(packageRoot, 'dist');
const source = JSON.parse(await readFile(path.join(repoRoot, 'manifest.json'), 'utf8'));

if (source.schemaVersion !== 1 || source.grid !== 24 || source.license !== 'MIT'
  || JSON.stringify(source.styles) !== JSON.stringify(styles) || source.iconCount !== source.icons.length) {
  throw new Error('Unsupported or inconsistent SVG manifest');
}

const outputs = new Map();
const names = new Set();
const rootExports = [];
for (const style of styles) {
  const exports = [];
  for (const icon of source.icons) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(icon.name) || source.source.excludedBrands.includes(icon.name)) {
      throw new Error(`Invalid or excluded icon name: ${icon.name}`);
    }
    const relative = `icons/${style}/${icon.name}.svg`;
    if (icon.files[style] !== relative) throw new Error(`Unexpected source path: ${relative}`);
    const svg = await readFile(path.join(repoRoot, relative), 'utf8');
    if (createHash('sha256').update(svg).digest('hex') !== icon.sha256[style]) {
      throw new Error(`Source digest mismatch: ${relative}`);
    }
    const name = componentName(icon.name, style);
    if (names.has(name)) throw new Error(`Component name collision: ${name}`);
    names.add(name);
    const { children, attributes } = parseSvg(DOMParser, svg, relative);
    const data = `${JSON.stringify(children)}, ${JSON.stringify(attributes.color ?? null)}`;
    outputs.set(`${style}/${icon.name}.js`, `import { createIcon } from '#fos-renderer';\nexport const ${name} = /*#__PURE__*/ createIcon(${data});\nexport default ${name};\n`);
    outputs.set(`${style}/${icon.name}.d.ts`, `import type { FosIcon } from '../types.js';\nexport declare const ${name}: FosIcon;\nexport default ${name};\n`);
    exports.push(`export { ${name} } from './${icon.name}.js';`);
  }
  for (const { alias, target, name, original } of iconAliasExports(source, style, componentName, names)) {
    const module = aliasModule(target, original, name);
    outputs.set(`${style}/${alias}.js`, module);
    outputs.set(`${style}/${alias}.d.ts`, module);
    exports.push(`export { ${name} } from './${alias}.js';`);
  }
  const index = `${exports.join('\n')}\n`;
  outputs.set(`${style}/index.js`, index);
  outputs.set(`${style}/index.d.ts`, `export type { FosIcon, IconProps } from '../types.js';\n${index}`);
  rootExports.push(`export * from './${style}/index.js';`);
}
const index = `${rootExports.join('\n')}\n`;
outputs.set('index.js', index);
outputs.set('index.d.ts', `export type { FosIcon, IconProps } from './types.js';\n${index}`);
outputs.set('types.d.ts', await readFile(path.join(packageRoot, 'src/types.d.ts'), 'utf8'));

const runtimePath = path.join(packageRoot, 'src/runtime.jsx');
const runtime = await readFile(runtimePath, 'utf8');
for (const [file, generate] of [['client.js', 'dom'], ['server.js', 'ssr']]) {
  const { code } = await transformAsync(runtime, {
    filename: runtimePath, configFile: false, babelrc: false,
    plugins: [[solid, { generate, hydratable: true }]],
  });
  outputs.set(file, `${code}\n`);
}

await Promise.all(styles.map(style => mkdir(path.join(dist, style), { recursive: true })));
for (const relative of await readdir(dist, { recursive: true })) {
  if (/\.(js|ts)$/.test(relative) && !outputs.has(relative.split(path.sep).join('/'))) {
    await unlink(path.join(dist, relative));
  }
}
const entries = [...outputs];
for (let offset = 0; offset < entries.length; offset += 64) {
  await Promise.all(entries.slice(offset, offset + 64)
    .map(([relative, content]) => writeFile(path.join(dist, relative), content)));
}
console.log(`Built ${names.size} Solid components from ${source.iconCount} icons in four styles.`);
