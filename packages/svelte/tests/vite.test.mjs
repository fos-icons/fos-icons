import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { build, optimizeDeps, resolveConfig } from 'vite';
import { JSDOM } from 'jsdom';
import { packageRoot } from '../scripts/build.mjs';

test('packed package uses one Svelte source for mixed imports in Vite optimization, build, and hydration', async t => {
  const directory = await mkdtemp(path.join(packageRoot, '.test-vite-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const packed = JSON.parse(execFileSync('npm', [
    'pack', '--ignore-scripts', '--json', '--pack-destination', directory,
  ], { cwd: packageRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }))[0];
  const packageFiles = packed.files.map(file => file.path);
  const snapshot = JSON.parse(await readFile(path.join(packageRoot, 'source/icons.json'), 'utf8'));
  const exportCount = snapshot.iconCount + Object.keys(snapshot.iconAliases ?? {}).length;
  assert.deepEqual(packageFiles.filter(file => file.endsWith('.svelte')), ['dist/Icon.svelte']);
  assert.equal(packageFiles.filter(file => file.endsWith('.svelte.d.ts')).length, 0);
  assert.equal(packageFiles.filter(file => /^dist\/(?:regular|filled|duocolor|duotone)\/[^/]+\.js$/.test(file)
    && !file.endsWith('/index.js')).length, exportCount * snapshot.styles.length);
  assert.ok(!packageFiles.some(file => /^(?:source|src|tests|node_modules)\//.test(file)));

  const root = path.join(directory, 'app');
  const installed = path.join(root, 'node_modules/@fos-icons/svelte');
  await mkdir(installed, { recursive: true });
  execFileSync('tar', ['-xzf', path.join(directory, packed.filename), '-C', installed, '--strip-components=1']);
  await writeFile(path.join(root, 'package.json'), JSON.stringify({
    name: 'fos-svelte-consumer', private: true, type: 'module',
    dependencies: { '@fos-icons/svelte': '0.1.0', svelte: '^5.20.0' },
  }));
  await writeFile(path.join(root, 'App.svelte'),
    await readFile(path.join(packageRoot, 'tests/Hydration.svelte'), 'utf8'));
  await writeFile(path.join(root, 'index.html'), '<html><body><main></main><script type="module" src="/main.js"></script></body></html>');
  await writeFile(path.join(root, 'main.js'), `
import App from './App.svelte';
import { hydrate, flushSync, unmount } from 'svelte';
import { CameraRegular, SlashRegular } from '@fos-icons/svelte';
import Camera from '@fos-icons/svelte/regular/camera';
import SlashDivider from '@fos-icons/svelte/regular/slash-divider';
if (CameraRegular !== Camera) throw new Error('Mixed imports must resolve to the same component');
if (SlashRegular !== SlashDivider) throw new Error('Legacy imports must resolve to the canonical component');
window.app = hydrate(App, { target: document.querySelector('main') });
window.flush = flushSync;
window.cleanup = () => unmount(window.app);
`);
  await writeFile(path.join(root, 'server.js'),
    "import App from './App.svelte';\nimport { render } from 'svelte/server';\nexport const renderApp = () => render(App).body;\n");

  const compiled = new Set();
  const options = () => ({
    root, configFile: false, logLevel: 'error',
    plugins: [svelte({
      configFile: false,
      preprocess: {
        markup({ filename }) {
          if (filename.startsWith(installed)) compiled.add(path.relative(installed, filename));
        },
      },
    })],
    optimizeDeps: {
      noDiscovery: true,
      include: ['@fos-icons/svelte', '@fos-icons/svelte/regular/camera', '@fos-icons/svelte/duotone'],
    },
  });
  const optimized = await optimizeDeps(await resolveConfig(options(), 'serve'), true);
  for (const specifier of ['@fos-icons/svelte', '@fos-icons/svelte/regular/camera', '@fos-icons/svelte/duotone']) {
    assert.ok(optimized.optimized[specifier], `${specifier} was prebundled`);
  }
  assert.deepEqual([...compiled], ['dist/Icon.svelte'], 'only the shared renderer needs Svelte compilation');

  compiled.clear();
  await build({
    ...options(),
    ssr: { noExternal: ['@fos-icons/svelte'] },
    build: {
      ssr: path.join(root, 'server.js'), outDir: path.join(directory, 'server'),
      rollupOptions: { output: { entryFileNames: 'entry.mjs' } },
    },
  });
  assert.deepEqual([...compiled], ['dist/Icon.svelte']);
  const { renderApp } = await import(pathToFileURL(path.join(directory, 'server/entry.mjs')));
  const html = renderApp();
  const dom = new JSDOM(`<main>${html}</main>`, { runScripts: 'outside-only', url: 'http://localhost/' });
  t.after(() => dom.window.close());
  const ids = [...dom.window.document.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(new Set(ids).size, ids.length);

  compiled.clear();
  const built = await build({ ...options(), build: { write: false, minify: false } });
  assert.deepEqual([...compiled], ['dist/Icon.svelte']);
  const entry = built.output.find(output => output.type === 'chunk' && output.isEntry);
  assert.deepEqual(entry.imports, []);
  dom.window.eval(entry.code);
  dom.window.flush();
  assert.deepEqual([...dom.window.document.querySelectorAll('[id]')].map(node => node.id), ids);
  assert.equal(dom.window.document.querySelectorAll('main > svg').length, 5);
  dom.window.document.querySelector('button').click();
  dom.window.flush();
  assert.equal(dom.window.document.querySelector('svg').getAttribute('width'), '32');
  assert.equal(dom.window.document.querySelector('title').textContent, 'After');
  await dom.window.cleanup();
});
