import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createComponent, flush } from 'solid-js';
import { generateHydrationScript, renderToString } from '@solidjs/web';
import solid from '@solidjs/vite-plugin';
import { build as bundle } from 'esbuild';
import { JSDOM } from 'jsdom';
import { build as viteBuild } from 'vite';
import * as icons from '@fos-icons/solid';
import { BinocularsRegular } from '@fos-icons/solid/regular';
import CreditCardDown from '@fos-icons/solid/regular/credit-card-down';
import TelescopeDuocolor from '@fos-icons/solid/duocolor/telescope';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../../../manifest.json', import.meta.url), 'utf8'));
const cardProps = { title: 'Download card', size: 24, strokeWidth: 1.25 };

test('exports every canonical icon and selects the server renderer for SSR', () => {
  assert.equal(Object.keys(icons).length, (manifest.iconCount + Object.keys(manifest.iconAliases ?? {}).length) * 4);
  assert.equal(icons.BinocularsRegular, BinocularsRegular);
  assert.equal(icons.TelescopeDuocolor, TelescopeDuocolor);
  const html = renderToString(() => [
    createComponent(BinocularsRegular, {}),
    createComponent(CreditCardDown, cardProps),
    createComponent(CreditCardDown, cardProps),
    createComponent(TelescopeDuocolor, {
      size: 32, primaryColor: '#123456', secondaryColor: '#654321',
      strokeWidth: 2, 'aria-label': 'Observe',
    }),
  ]);
  const elements = [...new JSDOM(html).window.document.querySelectorAll('body > svg')];
  assert.equal(elements.length, 4);
  assert.equal(elements[0].getAttribute('aria-hidden'), 'true');
  for (const svg of elements.slice(1, 3)) {
    const titleId = svg.getAttribute('aria-labelledby');
    assert.equal(svg.getAttribute('role'), 'img');
    assert.equal(svg.querySelector('title').id, titleId);
    const clip = svg.querySelector('clipPath');
    assert.ok(svg.querySelector(`[clip-path="url(#${clip.id})"]`));
  }
  assert.notEqual(elements[1].querySelector('clipPath').id, elements[2].querySelector('clipPath').id);
  assert.equal(elements[3].getAttribute('width'), '32');
  assert.equal(elements[3].getAttribute('aria-label'), 'Observe');
  assert.equal(elements[3].querySelector('path').getAttribute('stroke-width'), '2');
  assert.equal(elements[3].style.getPropertyValue('--fos-secondary'), '#654321');
});

test('slash-divider re-exports slash in each style', async () => {
  for (const style of manifest.styles) {
    const suffix = style[0].toUpperCase() + style.slice(1);
    const target = icons[`Slash${suffix}`];
    assert.ok(target);
    assert.equal(icons[`SlashDivider${suffix}`], target);
    assert.equal((await import(`@fos-icons/solid/${style}`))[`SlashDivider${suffix}`], target);
    assert.equal((await import(`@fos-icons/solid/${style}/slash-divider`)).default, target);
  }
});

test('hydrates the existing SVG, then updates reactive attributes and handles events', () => {
  const output = renderToString(() => createComponent(CreditCardDown, cardProps));
  flush();
  execFileSync(process.execPath, ['--conditions=browser', 'tests/hydrate.mjs'], {
    cwd: root,
    input: JSON.stringify({ output, script: generateHydrationScript() }),
    stdio: ['pipe', 'inherit', 'inherit'],
  });
});

test('a browser bundle includes just the selected glyph and the client renderer', async () => {
  const result = await bundle({
    stdin: {
      contents: "export { BinocularsRegular } from '@fos-icons/solid';",
      resolveDir: root,
    },
    platform: 'browser', format: 'esm', bundle: true, write: false, metafile: true,
    external: ['solid-js', '@solidjs/web'],
  });
  const inputs = Object.values(result.metafile.outputs)[0].inputs;
  assert.ok(Object.keys(inputs).includes('dist/client.js'));
  assert.ok(!Object.keys(inputs).includes('dist/server.js'));
  const glyphs = Object.keys(inputs).filter(file => /dist\/(regular|filled|duocolor|duotone)\/(?!index\.js).+\.js$/.test(file));
  assert.deepEqual(glyphs, ['dist/regular/binoculars.js']);
});

test('a Solid 2 Vite consumer compiles TSX and bundles the client renderer', async () => {
  const [result] = await viteBuild({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [solid({ compiler: 'babel' })],
    build: {
      write: false,
      lib: { entry: 'tests/usage.tsx', formats: ['es'] },
    },
  });
  const modules = result.output.flatMap(chunk => chunk.type === 'chunk' ? Object.keys(chunk.modules) : []);
  assert.ok(modules.some(id => id.endsWith('/dist/client.js')));
  assert.ok(!modules.some(id => id.endsWith('/dist/server.js')));
});
