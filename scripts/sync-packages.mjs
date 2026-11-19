import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePaths = ['manifest.json', 'icons', 'LICENSE'];
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

if (git('status', '--porcelain', '--untracked-files=normal', '--', ...sourcePaths)) {
  throw new Error('Commit the canonical SVG, manifest, and license changes before syncing the packages.');
}

const revision = git('rev-parse', 'HEAD');
const frameworkPackages = ['react', 'vue', 'svelte', 'angular'];

for (const name of frameworkPackages) {
  const cwd = path.join(root, 'packages', name);
  execFileSync(process.execPath, ['scripts/sync.mjs', '--source', root], { cwd, stdio: 'inherit' });
}

const framer = path.join(root, 'plugins', 'framer');
execFileSync(process.execPath, ['scripts/sync-icons.mjs', '--source', root, '--revision', revision], {
  cwd: framer,
  stdio: 'inherit',
});
