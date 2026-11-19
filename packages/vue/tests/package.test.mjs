import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

test('the packed npm artifact works independently for ESM, CommonJS, and TypeScript consumers', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'fos-vue-consumer-'));
  try {
    const output = execFileSync('npm', [
      'pack', '--json', '--ignore-scripts', '--pack-destination', temporary,
    ], { cwd: packageRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const [packed] = JSON.parse(output);
    for (const file of ['LICENSE', 'README.md', 'CHANGELOG.md', 'package.json']) {
      assert.ok(packed.files.some(entry => entry.path === file), `Missing ${file}`);
    }
    assert.ok(packed.files.every(file => !/^(src|scripts|tests|source|node_modules)\//.test(file.path)));
    execFileSync('tar', ['-xzf', path.join(temporary, packed.filename), '-C', temporary]);
    const scope = path.join(temporary, 'node_modules/@fos-icons');
    await mkdir(scope, { recursive: true });
    await rename(path.join(temporary, 'package'), path.join(scope, 'vue'));
    // Link Vue and its scoped packages so the consumer resolves only the packed icons.
    for (const dependency of ['vue', '@vue', 'typescript']) {
      await symlink(path.join(packageRoot, 'node_modules', dependency),
        path.join(temporary, 'node_modules', dependency), 'dir');
    }
    await writeFile(path.join(temporary, 'package.json'), '{"type":"module"}');
    await writeFile(path.join(temporary, 'consumer.mjs'), `
      import assert from 'node:assert/strict';
      import { createSSRApp, h } from 'vue';
      import { renderToString } from 'vue/server-renderer';
      import { CameraRegular } from '@fos-icons/vue';
      import Camera from '@fos-icons/vue/regular/camera';
      assert.equal(Camera, CameraRegular);
      const html = await renderToString(createSSRApp({ render: () => h(Camera, { title: 'Camera' }) }));
      assert.match(html, /viewBox="0 0 24 24"/);
      assert.match(html, /role="img"/);
    `);
    await writeFile(path.join(temporary, 'consumer.cjs'), `
      const assert = require('node:assert/strict');
      const { createSSRApp, h } = require('vue');
      const { renderToString } = require('vue/server-renderer');
      const { CameraFilled } = require('@fos-icons/vue/filled');
      const Camera = require('@fos-icons/vue/filled/camera').default;
      assert.equal(Camera, CameraFilled);
      assert.equal(require('@fos-icons/vue').CameraFilled, CameraFilled);
      renderToString(createSSRApp({ render: () => h(Camera) }))
        .then(html => assert.match(html, /aria-hidden="true"/))
        .catch(error => { console.error(error); process.exitCode = 1; });
    `);
    for (const extension of ['mjs', 'cjs']) {
      execFileSync(process.execPath, [`consumer.${extension}`], { cwd: temporary, stdio: 'pipe' });
    }
    await writeFile(path.join(temporary, 'consumer.tsx'), `
      import { h } from 'vue';
      import { CameraRegular, type IconProps } from '@fos-icons/vue';
      import Camera from '@fos-icons/vue/regular/camera';
      const props: IconProps = { size: 32, style: { '--fos-primary': 'red' } };
      export const example = <><CameraRegular {...props} /><Camera title="Camera" /></>;
      export const rendered = h(CameraRegular, { size: 24 });
      // @ts-expect-error Size must be a number or CSS length.
      export const invalid = <Camera size={{ width: 24 }} />;
    `);
    await writeFile(path.join(temporary, 'consumer.cts'), `
      import icons = require('@fos-icons/vue');
      import camera = require('@fos-icons/vue/duotone/camera');
      import vue = require('vue');
      export const example = vue.h(icons.CameraDuotone, { size: 32 });
      export const same: typeof icons.CameraDuotone = camera.default;
    `);
    execFileSync(process.execPath, [
      path.join(packageRoot, 'node_modules/typescript/bin/tsc'),
      '--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext',
      '--target', 'ES2022', '--jsx', 'preserve', '--jsxImportSource', 'vue',
      'consumer.tsx', 'consumer.cts',
    ], { cwd: temporary, stdio: 'pipe' });
    const license = await readFile(path.join(scope, 'vue/LICENSE'), 'utf8');
    assert.match(license, /MIT License/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
