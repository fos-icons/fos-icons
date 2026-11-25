import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { DOMParser } from '@xmldom/xmldom';
import { build as bundle } from 'esbuild';
import * as icons from '@fos-icons/vue';
import Camera from '@fos-icons/vue/regular/camera';
import { CameraFilled } from '@fos-icons/vue/filled';
import { componentName, parseSvg } from '../scripts/build.mjs';

const require = createRequire(import.meta.url);
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(packageRoot, 'source/icons.json'), 'utf8'));
const parse = text => new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
const render = (component, props, children) =>
  renderToString(createSSRApp({ render: () => h(component, props, children) }));

function canonical(node, originalIds = []) {
  const attributes = Array.from(node.attributes)
    .filter(({ name }) => !['xmlns', 'focusable', 'aria-hidden'].includes(name))
    .map(({ name, value }) => {
      for (const id of originalIds) {
        value = value.replaceAll(`url(#${id.actual})`, `url(#${id.source})`);
        if (name === 'id' && value === id.actual) value = id.source;
        if (/^(xlink:)?href$/.test(name) && value === `#${id.actual}`) value = `#${id.source}`;
      }
      return [name, value];
    })
    .sort(([a], [b]) => a.localeCompare(b));
  return [node.nodeName, attributes, Array.from(node.childNodes)
    .filter(child => child.nodeType === 1).map(child => canonical(child, originalIds))];
}

function elements(root) {
  return [root, ...Array.from(root.getElementsByTagName('*'))];
}

async function captureWarnings(run) {
  const warnings = [];
  const original = { warn: console.warn, error: console.error };
  console.warn = (...args) => warnings.push(args);
  console.error = (...args) => warnings.push(args);
  try {
    await run();
  } finally {
    Object.assign(console, original);
  }
  return warnings;
}

test('every component preserves the canonical SVG geometry, paints, and nested viewports', async () => {
  const expected = [];
  const warnings = await captureWarnings(async () => {
    for (const icon of manifest.icons) {
      for (const style of manifest.styles) {
        const name = componentName(icon.name, style);
        expected.push(name);
        assert.ok(icons[name], `Missing ${name}`);
        assert.equal(icons[name].name, name);
        const source = parse(icon.svg[style]);
        const markup = await render(icons[name]);
        assert.doesNotMatch(markup, /<!--/, `${name} rendered placeholder comments`);
        const rendered = parse(markup);
        const sourceIds = elements(source).map(node => node.getAttribute('id')).filter(Boolean);
        const renderedIds = elements(rendered).map(node => node.getAttribute('id')).filter(Boolean);
        assert.equal(renderedIds.length, sourceIds.length, name);
        const idMap = sourceIds.map((id, index) => {
          assert.ok(renderedIds[index].endsWith(`-${id}`), name);
          return { actual: renderedIds[index], source: id };
        });
        assert.deepEqual(canonical(rendered, idMap), canonical(source), name);
      }
    }
  });
  for (const alias of Object.keys(manifest.iconAliases ?? {})) {
    expected.push(...manifest.styles.map(style => componentName(alias, style)));
  }
  assert.deepEqual(Object.keys(icons).sort(), expected.sort());
  assert.deepEqual(warnings, [], 'Vue emitted warnings while rendering');
});

test('root, style, per-icon, and CommonJS imports resolve consistently', async () => {
  assert.equal(Camera, icons.CameraRegular);
  assert.equal(CameraFilled, icons.CameraFilled);
  const common = require('@fos-icons/vue');
  assert.deepEqual(Object.keys(common).sort(), Object.keys(icons).sort());
  assert.equal(await render(common.CameraRegular), await render(Camera));
  assert.equal(
    require('@fos-icons/vue/regular/camera').default,
    require('@fos-icons/vue/regular').CameraRegular,
  );
});

test('slash-divider exports the same slash component in every style and module format', async () => {
  for (const style of manifest.styles) {
    const alias = componentName('slash-divider', style);
    const canonical = componentName('slash', style);
    const stylePath = `@fos-icons/vue/${style}`;
    assert.equal(icons[alias], icons[canonical]);
    assert.equal((await import(stylePath))[alias], icons[canonical]);
    assert.equal((await import(`${stylePath}/slash-divider`)).default, icons[canonical]);
    const target = require('@fos-icons/vue')[canonical];
    assert.equal(require('@fos-icons/vue')[alias], target);
    assert.equal(require(stylePath)[alias], target);
    assert.equal(require(`${stylePath}/slash-divider`).default, target);
  }
});

test('repeated icons have unique, locally resolving mask and clip IDs', async () => {
  const svg = await renderToString(createSSRApp({
    render: () => h('main', Array.from({ length: 3 }, () => h(icons.CreditCardPlusRegular))),
  }));
  const document = new DOMParser().parseFromString(svg, 'text/xml');
  const allIds = Array.from(document.getElementsByTagName('*'))
    .map(node => node.getAttribute('id')).filter(Boolean);
  assert.equal(new Set(allIds).size, allIds.length);
  assert.ok(allIds.length >= 6);
  for (const root of Array.from(document.documentElement.childNodes)) {
    const localIds = new Set(elements(root).map(node => node.getAttribute('id')).filter(Boolean));
    for (const node of elements(root)) {
      for (const attribute of Array.from(node.attributes)) {
        for (const [, id] of attribute.value.matchAll(/url\(#([^)]+)\)/g)) {
          assert.ok(localIds.has(id), `Broken local reference ${id}`);
        }
      }
    }
  }
});

test('icons are decorative by default and support titles and caller-provided labels', async () => {
  let svg = parse(await render(Camera));
  assert.equal(svg.getAttribute('aria-hidden'), 'true');
  assert.equal(svg.getAttribute('focusable'), 'false');
  assert.equal(svg.getAttribute('role'), null);
  assert.equal(svg.getAttribute('title'), null);
  svg = parse(await render(Camera, { title: 'A <camera> & photo' }));
  assert.equal(svg.getAttribute('role'), 'img');
  assert.equal(svg.getAttribute('aria-hidden'), null);
  assert.equal(svg.getAttribute('title'), null, 'title is a prop, not a tooltip attribute');
  const title = svg.getElementsByTagName('title')[0];
  assert.equal(svg.firstChild, title);
  assert.equal(title.textContent, 'A <camera> & photo');
  assert.equal(svg.getAttribute('aria-labelledby'), title.getAttribute('id'));
  svg = parse(await render(Camera, {
    title: 'Tooltip', titleId: 'camera-title', 'aria-label': 'Take a photo',
  }));
  assert.equal(svg.getAttribute('role'), 'img');
  assert.equal(svg.getAttribute('aria-label'), 'Take a photo');
  assert.equal(svg.getAttribute('aria-labelledby'), null);
  assert.equal(svg.getElementsByTagName('title')[0].getAttribute('id'), 'camera-title');
  svg = parse(await render(Camera, { 'aria-label': 'Camera' }));
  assert.equal(svg.getAttribute('role'), 'img');
  assert.equal(svg.getAttribute('aria-hidden'), null);
  svg = parse(await render(Camera, {
    title: 'Tooltip', 'aria-labelledby': 'external-label', role: 'presentation',
    'aria-hidden': 'true',
  }));
  assert.equal(svg.getAttribute('aria-labelledby'), 'external-label');
  assert.equal(svg.getAttribute('role'), 'presentation');
  assert.equal(svg.getAttribute('aria-hidden'), 'true');
});

test('size, attributes, color roles, style overrides, and slots reach the SVG', async () => {
  const svg = parse(await render(icons.CreditCardPlusDuocolor, {
    size: '2em',
    width: 40,
    color: 'purple',
    primaryColor: 'red',
    secondaryColor: 'orange',
    modifierColor: 'green',
    class: 'example',
    'data-testid': 'icon',
    style: { '--fos-secondary': 'pink', opacity: 0.5 },
  }, () => [h('desc', 'Extra content')]));
  assert.equal(svg.getAttribute('width'), '40');
  assert.equal(svg.getAttribute('height'), '2em');
  assert.equal(svg.getAttribute('viewBox'), '0 0 24 24');
  assert.equal(svg.getAttribute('color'), 'purple');
  assert.equal(svg.getAttribute('class'), 'example');
  assert.equal(svg.getAttribute('data-testid'), 'icon');
  for (const name of ['primaryColor', 'secondaryColor', 'modifierColor', 'size']) {
    assert.equal(svg.getAttribute(name), null, `${name} leaked as an attribute`);
  }
  const style = svg.getAttribute('style');
  assert.match(style, /--fos-primary:red/);
  assert.match(style, /--fos-secondary:pink/);
  assert.doesNotMatch(style, /orange/);
  assert.match(style, /--fos-modifier:green/);
  assert.match(style, /opacity:0.5/);
  assert.equal(svg.lastChild.nodeName, 'desc');
  const primary = parse(await render(Camera, { primaryColor: 'teal', size: 32 }));
  assert.equal(primary.getAttribute('color'), 'teal');
  assert.equal(primary.getAttribute('width'), '32');
  assert.equal(primary.getAttribute('height'), '32');
  const stringStyle = parse(await render(Camera, { style: 'opacity: 0.25' }));
  assert.match(stringStyle.getAttribute('style'), /opacity:\s*0.25/);
});

test('root named imports tree-shake down to the requested icon and shared runtime', async () => {
  const result = await bundle({
    stdin: {
      contents: "export { CameraRegular } from '@fos-icons/vue';",
      resolveDir: packageRoot,
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['vue'],
    write: false,
    metafile: true,
    logLevel: 'silent',
  });
  const retained = Object.values(result.metafile.outputs).flatMap(output =>
    Object.entries(output.inputs)
      .filter(([name, data]) => /dist\/esm\/(regular|filled|duocolor|duotone)\/[^/]+\.js$/.test(name)
        && !name.endsWith('/index.js') && data.bytesInOutput > 0)
      .map(([name]) => name));
  assert.equal(retained.length, 1);
  assert.ok(retained[0].endsWith('/regular/camera.js'));
});

test('SVG conversion preserves attribute names and rejects malformed input', () => {
  const [, props, nodes] = parseSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
      + 'width="24" height="24" viewBox="0 0 24 24"><use xlink:href="#a" '
      + 'stroke-width="1.25" mask-type="luminance" aria-label="test"/></svg>',
    'fixture',
  );
  assert.equal(props.xmlns, undefined);
  assert.equal(props['xmlns:xlink'], undefined);
  assert.equal(nodes[0][1]['xlink:href'], '#a');
  assert.equal(nodes[0][1]['stroke-width'], '1.25');
  assert.equal(nodes[0][1]['mask-type'], 'luminance');
  assert.equal(nodes[0][1]['aria-label'], 'test');
  assert.throws(() => parseSvg('<svg><path></svg>', 'broken'));
  assert.throws(() => parseSvg('<!DOCTYPE svg><svg/>', 'broken'));
  assert.throws(() => parseSvg('<svg xmlns="http://www.w3.org/2000/svg"/>', 'broken'));
  assert.throws(() => parseSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" onload="x()"/>',
    'broken',
  ));
  assert.equal(componentName('4k-sparkles', 'duocolor'), 'Icon4kSparklesDuocolor');
});
