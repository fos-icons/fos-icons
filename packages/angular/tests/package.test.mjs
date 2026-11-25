import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformAsync } from '@babel/core';
import linker from '@angular/compiler-cli/linker/babel';
import { DOMParser } from '@xmldom/xmldom';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));

test('ships a tree-shakeable root, style indexes, and individual imports', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'source/icons.json'), 'utf8'));
  const rootIndex = await readFile(path.join(root, 'dist/index.js'), 'utf8');
  for (const style of manifest.styles) {
    assert.match(rootIndex, new RegExp(`\\./${style}/index\\.js`));
    const index = await readFile(path.join(root, 'dist', style, 'index.js'), 'utf8');
    assert.equal(index.match(/^export /gm).length, manifest.iconCount + Object.keys(manifest.iconAliases ?? {}).length);
  }
  const result = await build({
    stdin: {
      contents: `
        export { CameraRegular } from '@fos-icons/angular';
        export { CameraFilled } from '@fos-icons/angular/filled';
        export { default as CameraDuotone } from '@fos-icons/angular/duotone/camera';
      `,
      resolveDir: root,
    },
    bundle: true,
    format: 'esm',
    external: ['@angular/core'],
    write: false,
  });
  const bundle = result.outputFiles[0].text;
  for (const style of ['regular', 'filled', 'duotone']) assert.ok(bundle.includes(`svg[fos-camera-${style}]`));
  assert.ok(!bundle.includes('svg[fos-accordion-'));
  assert.ok(!bundle.includes('svg[fos-camera-duocolor]'));
});

test('Angular AOT consumers link and render native, accessible SVGs on the server', async () => {
  const temporary = await mkdtemp(path.join(root, '.consumer-'));
  try {
    const config = path.join(temporary, 'tsconfig.json');
    await writeFile(config, JSON.stringify({
      compilerOptions: {
        target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler',
        experimentalDecorators: true, strict: true, outDir: temporary,
      },
      angularCompilerOptions: { strictTemplates: true },
      files: [path.join(root, 'tests/consumer.ts')],
    }));
    execFileSync(process.execPath, [
      path.join(root, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js'), '-p', config,
    ], { stdio: 'inherit' });
    const outfile = path.join(temporary, 'linked.mjs');
    await build({
      entryPoints: [path.join(temporary, 'consumer.js')],
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      packages: 'external',
      plugins: [{
        name: 'angular-linker',
        setup(builder) {
          builder.onResolve({ filter: /^@fos-icons\/angular\// }, args => ({
            path: fileURLToPath(import.meta.resolve(args.path)),
          }));
          builder.onLoad({ filter: /[\\/]dist[\\/].*\.js$/ }, async ({ path: filename }) => ({
            contents: (await transformAsync(await readFile(filename, 'utf8'), {
              filename, babelrc: false, configFile: false, plugins: [linker],
            })).code,
          }));
        },
      }],
    });
    // Angular's server dependencies include components that use its JIT fallback.
    await import('@angular/compiler');
    const { render } = await import(pathToFileURL(outfile).href);
    const html = await render();
    const dom = new DOMParser().parseFromString(
      `<icons xmlns="http://www.w3.org/2000/svg">${html.match(/<icon-test[^>]*>([\s\S]*)<\/icon-test>/)[1]}</icons>`,
      'image/svg+xml',
    );
    const [decorative, titled, filled, custom, first, second, duotone, slash, alias] = Array.from(dom.documentElement.children);
    assert.equal(decorative.getAttribute('aria-hidden'), 'true');
    assert.equal(decorative.getAttribute('focusable'), 'false');
    assert.equal(decorative.getAttribute('class'), 'camera');
    assert.equal(decorative.getAttribute('viewBox'), '0 0 24 24');
    assert.equal(decorative.getAttribute('width'), '24');
    const regularPath = decorative.getElementsByTagName('path')[0];
    assert.equal(regularPath.namespaceURI, decorative.namespaceURI);
    assert.equal(regularPath.getAttribute('stroke-width'), '1.25');

    assert.equal(titled.getAttribute('width'), '32');
    assert.equal(titled.getAttribute('height'), '32');
    assert.equal(titled.getAttribute('color'), 'red');
    assert.equal(titled.getAttribute('role'), 'img');
    assert.equal(titled.getAttribute('aria-label'), 'Camera & lens');
    assert.equal(titled.getElementsByTagName('title')[0].textContent, 'Camera & lens');
    assert.equal(titled.getElementsByTagName('path')[0].getAttribute('stroke-width'), '2');
    assert.equal(filled.getAttribute('aria-label'), 'Record');
    assert.ok(!filled.getElementsByTagName('path')[0].hasAttribute('stroke-width'));
    assert.match(custom.getAttribute('style'), /--fos-primary:\s*navy/);
    assert.match(custom.getAttribute('style'), /--fos-secondary:\s*skyblue/);
    assert.equal(duotone.getAttribute('color'), 'var(--fos-primary, #245B9E)');
    const slashPath = slash.getElementsByTagName('path')[0].getAttribute('d');
    assert.ok(slashPath);
    assert.equal(alias.getElementsByTagName('path')[0].getAttribute('d'), slashPath);

    const fragmentIds = new Set();
    for (const icon of [custom, first, second]) {
      const ids = Array.from(icon.getElementsByTagName('*'))
        .filter(node => node.hasAttribute('id')).map(node => node.getAttribute('id'));
      const references = Array.from(icon.toString().matchAll(/url\(#([\w-]+)\)/g), match => match[1]);
      assert.ok(ids.length > 0);
      assert.ok(references.length > 0);
      assert.ok(references.every(id => ids.includes(id)));
      assert.ok(ids.every(id => !fragmentIds.has(id)));
      if (icon === custom) assert.ok(ids.every(id => id.startsWith('calendar-')));
      ids.forEach(id => fragmentIds.add(id));
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
