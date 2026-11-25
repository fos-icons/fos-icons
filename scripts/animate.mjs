#!/usr/bin/env node
/**
 * Animated icons: Regular artwork plus a scoped CSS animation, built from a
 * small motion vocabulary (metadata/animated.json). The same `animateSvg` is
 * meant to be reused by the MCP server and the fos-icons-animate skill.
 *
 *   node scripts/animate.mjs --write   regenerate icons/animated/*.svg
 *   node scripts/animate.mjs --check   fail if any file is stale or missing
 *
 * Rules every output follows:
 * - Class and keyframe names carry the icon's prefix (`fa-<name>-…`), because
 *   an inline <style> applies to the whole page it is placed in.
 * - The un-animated state is the rest pose: every keyframe set starts and
 *   ends on the original drawing, so `animation: none` (reduced motion, or a
 *   hover-to-play host) shows the normal icon.
 * - Animated wrappers are top-level <g>s with no transformed ancestor, so
 *   `transform-box: view-box` origins are plain 24px-grid coordinates.
 * - These files are not run through SVGO: collapseGroups would merge the
 *   animated wrappers into transformed paths and break them.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { animateSvg } from './animate-core.mjs';

export { animateSvg, parseParts, MOTION_TYPES } from './animate-core.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function loadSpec(root = ROOT) {
  return JSON.parse(await readFile(resolve(root, 'metadata/animated.json'), 'utf8'));
}

/** Build every animated icon. Returns { name: svg }. */
export async function buildAnimated(root = ROOT) {
  const spec = await loadSpec(root);
  const out = {};
  for (const [name, icon] of Object.entries(spec.icons)) {
    const read = (icon) => readFile(resolve(root, 'icons/regular', `${icon}.svg`), 'utf8');
    const extras = {};
    for (const { icon: extra } of icon.add ?? []) extras[extra] = await read(extra);
    out[name] = animateSvg(name, await read(icon.source ?? name), icon, extras);
  }
  return out;
}

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');

async function main() {
  const mode = process.argv[2];
  if (mode !== '--write' && mode !== '--check') {
    console.error('Usage: node scripts/animate.mjs --write|--check');
    process.exit(2);
  }
  const built = await buildAnimated();
  const dir = resolve(ROOT, 'icons/animated');
  await mkdir(dir, { recursive: true });
  const existing = new Set((await readdir(dir)).filter((f) => f.endsWith('.svg')));
  const drift = [];
  for (const [name, svg] of Object.entries(built)) {
    const file = resolve(dir, `${name}.svg`);
    existing.delete(`${name}.svg`);
    let current = null;
    try { current = await readFile(file, 'utf8'); } catch { /* missing */ }
    if (current === svg) continue;
    drift.push(name);
    if (mode === '--write') await writeFile(file, svg);
  }
  const stray = [...existing];
  if (mode === '--check' && (drift.length || stray.length)) {
    console.error(`Animated icons out of date: ${[...drift, ...stray.map((f) => `${f} (not in spec)`)].join(', ')}\nRun: npm run animate`);
    process.exit(1);
  }
  if (stray.length) console.warn(`Not in metadata/animated.json: ${stray.join(', ')}`);
  console.log(`${Object.keys(built).length} animated icons ${mode === '--write' ? `written (${drift.length} changed)` : 'up to date'}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
