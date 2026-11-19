#!/usr/bin/env node
/**
 * node scripts/sync-icons.mjs [--source ../..] [--revision <commit>] [--check]
 * Omitted revisions reuse source-lock.json; only the first sync defaults to HEAD.
 * Chunks are zero-based, three-digit filenames containing at most 96 icons.
 * snapshotSha256 hashes sorted output paths + NUL + raw output bytes + NUL,
 * excluding source-lock.json itself. No artwork is rewritten.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = ['regular', 'filled', 'duocolor', 'duotone'];
const REPOSITORY = 'https://github.com/fos-icons/fos-icons';
const CHUNK_SIZE = 96;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const text = (bytes, label) => {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new Error(`${label}: invalid UTF-8`); }
};
const parse = (bytes, label) => {
  try { return JSON.parse(text(bytes, label)); }
  catch (error) { throw new Error(`${label}: ${error.message}`); }
};
const sameKeys = (value, keys) => value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).sort(compare).join('\0') === [...keys].sort(compare).join('\0');

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

export function syncIcons({ source = resolve(ROOT, '../..'), output = ROOT, revision, check = false } = {}) {
  source = resolve(source);
  output = resolve(output);
  const git = (...args) => {
    try {
      return execFileSync('git', ['--no-pager', '-C', source, ...args], {
        maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      throw new Error(`Cannot read committed source (${args[0]}): ${String(error.stderr || error.message).trim()}`);
    }
  };
  const lockPath = join(output, 'src/data/source-lock.json');
  const requested = revision ?? (existsSync(lockPath)
    ? parse(readFileSync(lockPath), 'source-lock.json').revision : 'HEAD');
  assert(typeof requested === 'string' && requested.length > 0 && !requested.startsWith('-'),
    'Revision must be a nonempty commit reference, not an option');
  const commit = git('rev-parse', '--verify', '--end-of-options', `${requested}^{commit}`).toString().trim();
  assert(/^[a-f0-9]{40,64}$/.test(commit), 'Git returned an invalid commit ID');
  const tree = new Map(text(git('ls-tree', '-r', '-z', commit), 'Git tree').split('\0').filter(Boolean).map((entry) => {
    const [header, path] = entry.split('\t');
    return [path, header.split(' ')[0]];
  }));
  const read = (path) => {
    assert(/^100(644|755)$/.test(tree.get(path) || ''), `${path}: expected a committed regular file`);
    return git('show', `${commit}:${path}`);
  };
  const manifestBytes = read('manifest.json');
  const manifest = parse(manifestBytes, 'manifest.json');
  assert(Array.isArray(manifest.styles) && manifest.styles.length === STYLES.length
    && new Set(manifest.styles).size === STYLES.length
    && STYLES.every((style) => manifest.styles.includes(style)),
  `Manifest styles must be exactly: ${STYLES.join(', ')}`);
  assert(Array.isArray(manifest.icons) && Number.isSafeInteger(manifest.iconCount)
    && manifest.iconCount > 0 && manifest.icons.length === manifest.iconCount, 'Manifest iconCount does not match icons');
  assert(Number.isFinite(manifest.grid) && manifest.grid > 0, 'Manifest grid must be positive');
  assert(Number.isFinite(manifest.regularStrokeWidth) && manifest.regularStrokeWidth > 0,
    'Manifest regularStrokeWidth must be positive');
  assert(manifest.license === 'MIT', 'Manifest license must be MIT');
  const names = new Set();
  for (const icon of manifest.icons) {
    assert(icon && typeof icon.name === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(icon.name),
      'Invalid icon name; expected lowercase kebab-case');
    assert(!names.has(icon.name), `Duplicate icon name: ${icon.name}`);
    names.add(icon.name);
    assert(typeof icon.category === 'string' && icon.category.trim().length > 0,
      `${icon.name}: missing category`);
    for (const field of ['tags', 'aliases']) {
      assert(Array.isArray(icon[field]) && icon[field].every((value) => typeof value === 'string' && value.trim()),
        `${icon.name}: ${field} must be an array of nonempty strings`);
    }
    assert(sameKeys(icon.files, STYLES) && sameKeys(icon.sha256, STYLES),
      `${icon.name}: files and sha256 must define exactly all four styles`);
    for (const style of STYLES) {
      assert(icon.files[style] === `icons/${style}/${icon.name}.svg`,
        `${icon.name}/${style}: unsafe or unexpected source path`);
      assert(typeof icon.sha256[style] === 'string' && /^[a-f0-9]{64}$/.test(icon.sha256[style]),
        `${icon.name}/${style}: invalid SHA256`);
    }
  }
  const colors = parse(read('metadata/colors.json'), 'metadata/colors.json');
  assert(Array.isArray(colors.palettes) && colors.palettes.length > 0, 'Colors must contain palettes');
  const paletteNames = new Set();
  const palettes = colors.palettes.map((palette) => {
    assert(palette && typeof palette.name === 'string' && palette.name.trim() && !paletteNames.has(palette.name),
      'Palette names must be nonempty and unique');
    paletteNames.add(palette.name);
    const result = { name: palette.name };
    for (const mode of ['light', 'dark']) {
      assert(palette[mode] && ['primary', 'secondary'].every((key) =>
        typeof palette[mode][key] === 'string' && /^#[a-f0-9]{6}$/i.test(palette[mode][key])),
      `${palette.name}: ${mode} requires primary and secondary hex colors`);
      result[mode] = { primary: palette[mode].primary, secondary: palette[mode].secondary };
    }
    return result;
  });
  assert(paletteNames.has(colors.defaultPalette), 'Default palette must name an existing palette');
  const license = read('LICENSE');
  assert(text(license, 'LICENSE').includes('MIT License'), 'LICENSE is not an MIT license');
  const icons = [...manifest.icons].sort((a, b) => compare(a.name, b.name));
  const categoryCounts = new Map();
  for (const icon of icons) categoryCounts.set(icon.category, (categoryCounts.get(icon.category) || 0) + 1);
  const outputs = new Map([
    ['src/data/catalog.json', json({
      icons: icons.map(({ name, category, tags, aliases }) => ({ name, category, tags, aliases })),
      categories: [...categoryCounts].sort(([a], [b]) => compare(a, b)).map(([name, count]) => ({ name, count })),
      styles: STYLES, grid: manifest.grid, strokeWidth: manifest.regularStrokeWidth, license: manifest.license,
    })],
    ['src/data/palettes.json', json({ defaultPalette: colors.defaultPalette, palettes })],
    ['public/licenses/fos-icons-LICENSE.txt', license],
  ]);
  for (const style of STYLES) {
    for (let start = 0; start < icons.length; start += CHUNK_SIZE) {
      const chunk = Object.create(null);
      for (const icon of icons.slice(start, start + CHUNK_SIZE)) {
        const bytes = read(icon.files[style]);
        assert(sha256(bytes) === icon.sha256[style], `${icon.name}/${style}: SHA256 mismatch`);
        const svg = text(bytes, icon.files[style]);
        assert(/<svg(?:\s|>)/.test(svg) && /<\/svg>\s*$/.test(svg), `${icon.name}/${style}: invalid SVG document`);
        chunk[icon.name] = svg;
      }
      outputs.set(`public/icons/${style}/${String(start / CHUNK_SIZE).padStart(3, '0')}.json`, json(chunk));
    }
  }
  const digest = createHash('sha256');
  for (const [path, bytes] of [...outputs].sort(([a], [b]) => compare(a, b))) digest.update(path).update('\0').update(bytes).update('\0');
  const lock = {
    repository: REPOSITORY, revision: commit, manifestSha256: sha256(manifestBytes),
    snapshotSha256: digest.digest('hex'), count: icons.length,
  };
  outputs.set('src/data/source-lock.json', json(lock));
  const stale = filesUnder(join(output, 'public/icons')).filter((path) =>
    !outputs.has(relative(output, path).split('\\').join('/')));
  const changed = [...outputs].filter(([path, bytes]) =>
    !existsSync(join(output, path)) || !readFileSync(join(output, path)).equals(bytes)).map(([path]) => path);
  if (check) {
    const drift = [...changed, ...stale.map((path) => `${relative(output, path)} (unexpected)`)];
    assert(drift.length === 0, `Snapshot out of date (${drift.length} files): ${drift.slice(0, 12).join(', ')}${drift.length > 12 ? ', …' : ''}`);
  } else {
    // Nothing is written or removed until every source and expected output has been validated.
    for (const path of changed) {
      mkdirSync(dirname(join(output, path)), { recursive: true });
      writeFileSync(join(output, path), outputs.get(path));
    }
    for (const path of stale) rmSync(path);
  }
  return lock;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {};
    for (let index = 2; index < process.argv.length; index++) {
      const argument = process.argv[index];
      if (argument === '--check') options.check = true;
      else if (argument === '--source' || argument === '--revision') {
        const value = process.argv[++index];
        assert(value && !value.startsWith('--'), `${argument} requires a value`);
        options[argument.slice(2)] = value;
      } else if (argument === '--help') {
        console.log('Usage: node scripts/sync-icons.mjs [--source ../..] [--revision <commit>] [--check]\nWithout --revision, reuse source-lock.json revision (HEAD on first sync only).');
        process.exit(0);
      } else throw new Error(`Unknown argument: ${argument}`);
    }
    const result = syncIcons(options);
    console.log(`${options.check ? 'Verified' : 'Synced'} ${result.count} icons × ${STYLES.length} styles at ${result.revision}`);
  } catch (error) {
    console.error(`sync-icons: ${error.message}`);
    process.exitCode = 1;
  }
}
