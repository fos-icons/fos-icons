import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build as bundle } from 'esbuild';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { JSDOM } from 'jsdom';
import { componentName, componentSource, packageRoot, parseSvg } from '../scripts/build.mjs';
import { assertVisualParity } from './svg-parity.mjs';
import { scopeAttributes } from '../src/attributes.js';

const manifest = JSON.parse(await readFile(path.join(packageRoot, 'source/icons.json'), 'utf8'));
const styles = manifest.styles;

function sveltePlugin(client = false) {
  return {
    name: 'svelte',
    setup(build) {
      build.onLoad({ filter: /\.svelte$/ }, async ({ path: filename }) => {
        const source = await readFile(filename, 'utf8');
        const { js } = compile(source, { filename, generate: client ? 'client' : 'server', dev: client });
        return { contents: js.code, loader: 'js', resolveDir: path.dirname(filename) };
      });
    },
  };
}

async function temporary(t) {
  const directory = await mkdtemp(path.join(packageRoot, '.test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('exports cover every canonical icon and style with matching declarations', async () => {
  const snapshot = await readFile(path.join(packageRoot, 'source/icons.json'), 'utf8');
  const lock = JSON.parse(await readFile(path.join(packageRoot, 'source/lock.json'), 'utf8'));
  assert.equal(createHash('sha256').update(snapshot).digest('hex'), lock.snapshotSha256);
  const root = await readFile(path.join(packageRoot, 'dist/index.js'), 'utf8');
  for (const style of styles) {
    assert.ok(root.includes(`./${style}/index.js`));
    const index = await readFile(path.join(packageRoot, `dist/${style}/index.js`), 'utf8');
    const files = await readdir(path.join(packageRoot, 'dist', style));
    assert.equal(files.filter(file => file.endsWith('.svelte')).length, 0);
    assert.equal(files.filter(file => file.endsWith('.js') && file !== 'index.js').length, manifest.iconCount);
    assert.equal(files.filter(file => file.endsWith('.d.ts') && file !== 'index.d.ts').length, manifest.iconCount);
    for (const icon of manifest.icons) {
      assert.ok(index.includes(`${componentName(icon.name, style)} } from './${icon.name}.js'`));
      assert.equal(createHash('sha256').update(icon.svg[style]).digest('hex'), icon.sha256[style]);
    }
  }
  const files = await readdir(path.join(packageRoot, 'dist'), { recursive: true });
  assert.deepEqual(files.filter(file => file.endsWith('.svelte')), ['Icon.svelte']);
  assert.ok(!files.some(file => file.endsWith('.svelte.d.ts')), 'stale per-icon declarations must be removed');
  assert.equal(componentName('4k-camera', 'regular'), 'Icon4kCameraRegular');
});

test('root imports tree-shake unused icons and do not bundle the Svelte runtime', async () => {
  const result = await bundle({
    stdin: {
      contents: "import { CameraRegular } from '@fos-icons/svelte'; export default CameraRegular;",
      resolveDir: packageRoot,
    },
    bundle: true, platform: 'node', format: 'esm', write: false, metafile: true,
    external: ['svelte', 'svelte/*'], plugins: [sveltePlugin()],
  });
  const included = Object.entries(Object.values(result.metafile.outputs)[0].inputs)
    .filter(([, details]) => details.bytesInOutput > 0).map(([filename]) => filename);
  assert.deepEqual(included.filter(filename => /dist\/(?:regular|filled|duocolor|duotone)\/.*\.js$/.test(filename)),
    ['dist/regular/camera.js']);
  assert.deepEqual(included.filter(filename => filename.endsWith('.svelte')), ['dist/Icon.svelte']);
  assert.ok(included.every(filename => !filename.includes('node_modules/svelte/')));
});

test('SVG parsing fails explicitly for unsupported input', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M1 1"/></svg>';
  assert.throws(() => parseSvg(source.replace('<path', '<script'), 'bad.svg'), /bad.svg/);
  assert.throws(() => parseSvg(source.replace('width="24"', 'width="32"'), 'bad.svg'), /24px/);
  assert.throws(() => parseSvg(source.replace('<path', '<path onclick="alert(1)"'), 'bad.svg'), /unsupported attribute/);
  assert.throws(() => parseSvg(`<!DOCTYPE svg>${source}`, 'bad.svg'), /XML declarations/);
  assert.throws(() => parseSvg(source.replace('<path', 'text<path'), 'bad.svg'), /SVG text/);
});

test('server rendering preserves artwork, customization, accessibility, and scoped IDs', async t => {
  const directory = await temporary(t);
  const examples = ['camera', 'user-add', 'file-pdf', 'ai-chip', 'accordion'];
  const imports = examples.flatMap(name => styles.map(style =>
    `export { default as ${componentName(name, style)} } from '@fos-icons/svelte/${style}/${name}';`));
  const filename = path.join(directory, 'server.mjs');
  await bundle({
    stdin: { contents: imports.join('\n'), resolveDir: packageRoot },
    outfile: filename, bundle: true, platform: 'node', format: 'esm',
    external: ['svelte', 'svelte/*'],
    plugins: [sveltePlugin()],
  });
  const icons = await import(pathToFileURL(filename));
  for (const name of examples) {
    for (const style of styles) {
      const component = icons[componentName(name, style)];
      const output = render(component).body;
      const document = new JSDOM(output).window.document;
      const svg = document.querySelector('svg');
      assert.equal(svg.getAttribute('width'), '24');
      assert.equal(svg.getAttribute('aria-hidden'), 'true');
      const source = manifest.icons.find(icon => icon.name === name).svg[style];
      assertVisualParity(source, svg.outerHTML, `${style}/${name}`);
      const customized = new JSDOM(render(component, {
        props: {
          size: '2em', width: 32, color: 'red', primaryColor: 'blue',
          secondaryColor: 'green', modifierColor: 'orange', strokeWidth: 2,
          title: 'A & B <camera>', class: 'custom', style: '--fos-secondary:purple',
        },
      }).body).window.document.querySelector('svg');
      assert.equal(customized.getAttribute('width'), '32');
      assert.equal(customized.getAttribute('height'), '2em');
      assert.equal(customized.getAttribute('color'), 'red');
      assert.equal(customized.getAttribute('role'), 'img');
      assert.equal(customized.getAttribute('aria-hidden'), null);
      assert.equal(customized.querySelector('title').textContent, 'A & B <camera>');
      assert.equal(customized.getAttribute('aria-labelledby'), customized.querySelector('title').id);
      assert.equal(customized.style.getPropertyValue('--fos-secondary'), 'purple');
      for (const node of customized.querySelectorAll('[stroke-width]')) {
        assert.equal(node.getAttribute('stroke-width'), '2');
      }
      const labelled = new JSDOM(render(component, {
        props: { title: 'Camera', titleId: 'explicit-title', 'aria-label': 'Photo', 'aria-hidden': true },
      }).body).window.document.querySelector('svg');
      assert.equal(labelled.querySelector('title').id, 'explicit-title');
      assert.equal(labelled.getAttribute('aria-label'), 'Photo');
      assert.equal(labelled.getAttribute('aria-labelledby'), null);
      assert.equal(labelled.getAttribute('aria-hidden'), 'true');
    }
  }
});

test('JavaScript modules store SVG data and scope IDs, URL references, and hrefs', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><defs><path id="shape" d="M1 1"/></defs><use href="#shape" clip-path="url(#shape)" /></svg>';
  const generated = componentSource(parseSvg(source, 'fixture.svg'), 'FixtureRegular');
  assert.ok(generated.includes('/*#__PURE__*/ createIcon('));
  assert.ok(!generated.includes('.svelte'));
  assert.deepEqual(scopeAttributes({
    id: 'shape', href: '#shape', 'xlink:href': '#shape',
    'clip-path': 'url(#shape)', fill: 'url(#shape) url(#other)',
    'stroke-width': '1.25', d: 'M1 1',
  }, 'fos-instance', 2), {
    id: 'fos-instance-shape', href: '#fos-instance-shape', 'xlink:href': '#fos-instance-shape',
    'clip-path': 'url(#fos-instance-shape)', fill: 'url(#fos-instance-shape) url(#fos-instance-other)',
    'stroke-width': 2, d: 'M1 1',
  });
  assert.equal(scopeAttributes({ 'stroke-width': '1.25' }, 'fos-instance', undefined)['stroke-width'], '1.25');
});

test('client hydration keeps IDs stable, isolates cutouts, and updates props and events', async t => {
  const directory = await temporary(t);
  const fixture = path.join(packageRoot, 'tests/Hydration.svelte');
  const serverFile = path.join(directory, 'hydration-server.mjs');
  await bundle({
    entryPoints: [fixture], outfile: serverFile, bundle: true,
    platform: 'node', format: 'esm', external: ['svelte', 'svelte/*'],
    plugins: [sveltePlugin()],
  });
  const { default: App } = await import(pathToFileURL(serverFile));
  const html = render(App).body;
  const dom = new JSDOM(`<main>${html}</main>`, { runScripts: 'outside-only', url: 'http://localhost/' });
  t.after(() => dom.window.close());
  const document = dom.window.document;
  const idsBefore = [...document.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(new Set(idsBefore).size, idsBefore.length);
  assert.ok(document.querySelectorAll('defs [id]').length >= 2, 'fixture must exercise cutout definitions');
  const warnings = [];
  dom.window.console.warn = (...args) => warnings.push(args.join(' '));
  dom.window.console.error = (...args) => warnings.push(args.join(' '));
  const client = await bundle({
    stdin: {
      contents: `import App from ${JSON.stringify(fixture)}; import { hydrate, flushSync, unmount } from 'svelte'; window.app = hydrate(App, { target: document.querySelector('main') }); window.flush = flushSync; window.cleanup = () => unmount(window.app);`,
      resolveDir: packageRoot,
    },
    bundle: true, platform: 'browser', format: 'iife', write: false, conditions: ['development'],
    plugins: [sveltePlugin(true)],
  });
  dom.window.eval(client.outputFiles[0].text);
  dom.window.flush();
  assert.deepEqual([...document.querySelectorAll('[id]')].map(node => node.id), idsBefore);
  for (const node of document.querySelectorAll('[mask], [clip-path]')) {
    const reference = node.getAttribute('mask') ?? node.getAttribute('clip-path');
    const id = reference.match(/url\(#([^)]+)\)/)[1];
    assert.ok(node.closest('svg').querySelector(`[id="${id}"]`), 'reference belongs to its own icon');
  }
  document.querySelector('button').click();
  dom.window.flush();
  assert.equal(document.querySelector('svg').getAttribute('width'), '32');
  assert.equal(document.querySelector('title').textContent, 'After');
  assert.equal(document.querySelector('.duo').style.getPropertyValue('--fos-secondary'), 'green');
  for (const node of document.querySelectorAll('.duo [stroke-width]')) {
    assert.equal(node.getAttribute('stroke-width'), '2');
  }
  document.querySelector('svg').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  dom.window.flush();
  assert.equal(document.querySelector('svg').getAttribute('width'), '40');
  assert.deepEqual(warnings, []);
  await dom.window.cleanup();
});
