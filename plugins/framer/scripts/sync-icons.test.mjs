import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { syncIcons } from './sync-icons.mjs';

const styles = ['regular', 'filled', 'duocolor', 'duotone'];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 2h3"/></svg>\n';

function fixture(t, count = 2) {
  // Keep disposable fixture repositories inside the project, never the system temp directory.
  const root = resolve(`.sync-icons-fixture-${randomUUID()}`);
  const source = join(root, 'source');
  const output = join(root, 'output');
  mkdirSync(source, { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '--quiet');
  git('config', 'user.name', 'Snapshot Test');
  git('config', 'user.email', 'snapshot@example.invalid');
  const write = (path, value) => {
    mkdirSync(join(source, path, '..'), { recursive: true });
    writeFileSync(join(source, path), value);
  };
  const manifest = {
    styles, grid: 24, regularStrokeWidth: 1.25, license: 'MIT', iconCount: count,
    icons: Array.from({ length: count }, (_, index) => {
      const name = `icon-${String(index).padStart(3, '0')}`;
      const icon = { name, category: index % 2 ? 'Objects' : 'Actions', tags: ['test'], aliases: [], files: {}, sha256: {} };
      for (const style of styles) {
        icon.files[style] = `icons/${style}/${name}.svg`;
        icon.sha256[style] = hash(svg);
        write(icon.files[style], svg);
      }
      return icon;
    }).reverse(),
  };
  const writeManifest = () => write('manifest.json', JSON.stringify(manifest));
  writeManifest();
  write('metadata/colors.json', JSON.stringify({
    defaultPalette: 'Blue', primaryVariable: 'ignored',
    palettes: [{ name: 'Blue', light: { primary: '#245B9E', secondary: '#5B87B7' },
      dark: { primary: '#93C5FD', secondary: '#60A5FA' }, primary: 'ignored' }],
  }));
  write('LICENSE', 'MIT License\nFixture license text\n');
  const commit = () => { git('add', '.'); git('commit', '--quiet', '-m', 'Fixture'); return git('rev-parse', 'HEAD'); };
  const revision = commit();
  const run = (options = {}) => syncIcons({ source, output, ...options });
  return { source, output, git, write, manifest, writeManifest, commit, revision, run };
}

test('preserves committed bytes, deterministic chunks, catalog and palette shapes', (t) => {
  const f = fixture(t, 97);
  f.write('icons/regular/icon-000.svg', 'dirty tracked content');
  f.write('icons/regular/untracked.svg', 'untracked content');
  const lock = f.run();
  assert.equal(lock.revision, f.revision);
  assert.equal(lock.manifestSha256, hash(f.git('show', `${f.revision}:manifest.json`)));
  assert.equal(lock.count, 97);
  const load = (path) => JSON.parse(readFileSync(join(f.output, path), 'utf8'));
  const catalog = load('src/data/catalog.json');
  assert.equal(catalog.icons[0].name, 'icon-000');
  assert.deepEqual(catalog.categories, [{ name: 'Actions', count: 49 }, { name: 'Objects', count: 48 }]);
  assert.deepEqual(catalog.styles, styles);
  assert.equal(catalog.strokeWidth, 1.25);
  assert.equal(catalog.license, 'MIT');
  for (const style of styles) {
    assert.equal(Object.keys(load(`public/icons/${style}/000.json`)).length, 96);
    assert.deepEqual(load(`public/icons/${style}/001.json`), { 'icon-096': svg });
    assert.equal(load(`public/icons/${style}/000.json`)['icon-000'], svg);
  }
  assert.deepEqual(Object.keys(load('src/data/palettes.json')), ['defaultPalette', 'palettes']);
  assert.deepEqual(Object.keys(load('src/data/palettes.json').palettes[0]), ['name', 'light', 'dark']);
  assert.equal(readFileSync(join(f.output, 'public/licenses/fos-icons-LICENSE.txt'), 'utf8'), 'MIT License\nFixture license text\n');
  assert.deepEqual(f.run({ check: true }), lock);
  assert.deepEqual(f.run(), lock);
  const digest = createHash('sha256');
  const collect = (directory, prefix = '') => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? collect(join(directory, entry.name), path) : [path];
  });
  for (const path of collect(f.output).filter((path) => path !== 'src/data/source-lock.json').sort()) {
    digest.update(path).update('\0').update(readFileSync(join(f.output, path))).update('\0');
  }
  assert.equal(lock.snapshotSha256, digest.digest('hex'));
});

test('rejects tampered committed SVG without writing or deleting any outputs', (t) => {
  const f = fixture(t);
  f.run();
  const lock = readFileSync(join(f.output, 'src/data/source-lock.json'));
  const stale = join(f.output, 'public/icons/regular/999.json');
  writeFileSync(stale, 'keep');
  f.write('icons/duotone/icon-001.svg', svg.replace('M1', 'M9'));
  const revision = f.commit();
  assert.throws(() => f.run({ revision }), /icon-001\/duotone: SHA256 mismatch/);
  assert.deepEqual(readFileSync(join(f.output, 'src/data/source-lock.json')), lock);
  assert.equal(readFileSync(stale, 'utf8'), 'keep');
});

test('check detects missing, changed and unexpected chunks without fixing them', (t) => {
  const f = fixture(t);
  assert.throws(() => f.run({ check: true }), /Snapshot out of date/);
  assert.equal(existsSync(f.output), false);
  f.run();
  const path = join(f.output, 'public/icons/regular/000.json');
  writeFileSync(path, '{}');
  assert.throws(() => f.run({ check: true }), /regular\/000.json/);
  assert.equal(readFileSync(path, 'utf8'), '{}');
  f.run();
  const stale = join(f.output, 'public/icons/regular/999.json');
  writeFileSync(stale, '{}');
  assert.throws(() => f.run({ check: true }), /999.json \(unexpected\)/);
  assert.equal(existsSync(stale), true);
  f.run();
  assert.equal(existsSync(stale), false);
  f.run({ check: true });
});

test('normal sync stays pinned while explicit revision upgrades', (t) => {
  const f = fixture(t);
  const original = f.run();
  f.manifest.icons[0].tags.push('new-head');
  f.writeManifest();
  const latest = f.commit();
  assert.notEqual(latest, original.revision);
  assert.deepEqual(f.run(), original);
  assert.deepEqual(f.run({ check: true }), original);
  const next = f.run({ revision: 'HEAD' });
  assert.equal(next.revision, latest);
  assert.notEqual(next.snapshotSha256, original.snapshotSha256);
  assert.deepEqual(f.run(), next);
});

test('rejects unsafe paths, duplicates, count and style mismatches before creating output', (t) => {
  const cases = [
    [(m) => { m.icons[0].files.regular = '../outside.svg'; }, /unsafe or unexpected source path/],
    [(m) => { m.icons[0].files.regular = '/icons/regular/icon-001.svg'; }, /unsafe or unexpected source path/],
    [(m) => { m.icons[0].name = '../escape'; }, /Invalid icon name/],
    [(m) => { m.icons[1] = m.icons[0]; }, /Duplicate icon name/],
    [(m) => { m.iconCount++; }, /iconCount/],
    [(m) => { m.styles = ['regular', 'filled', 'duocolor', 'regular']; }, /Manifest styles/],
    [(m) => { delete m.icons[0].sha256.duotone; }, /exactly all four styles/],
  ];
  for (const [mutate, error] of cases) {
    const f = fixture(t);
    mutate(f.manifest);
    f.writeManifest();
    f.commit();
    assert.throws(() => f.run(), error);
    assert.equal(existsSync(f.output), false);
  }
});

test('CLI reports concise failures and rejects invalid flags', (t) => {
  const f = fixture(t);
  const script = resolve('scripts/sync-icons.mjs');
  assert.throws(() => execFileSync(process.execPath, [script, '--unknown'], { stdio: ['ignore', 'pipe', 'pipe'] }),
    (error) => error.status === 1 && error.stderr.toString().trim() === 'sync-icons: Unknown argument: --unknown');
  assert.throws(() => f.run({ revision: '--help' }), /Revision must be/);
  assert.throws(() => f.run({ revision: 'does-not-exist' }), /Cannot read committed source/);
  assert.equal(existsSync(f.output), false);
});
