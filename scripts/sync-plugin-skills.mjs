#!/usr/bin/env node
/**
 * Copy the canonical skills (skills/) into the Claude Code plugin
 * (plugins/claude/skills/). Claude Code installs a plugin by copying its own
 * folder, so the plugin can't point outside it; it carries a copy instead.
 *
 *   node scripts/sync-plugin-skills.mjs          # write
 *   node scripts/sync-plugin-skills.mjs --check  # fail if the copy differs
 */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = join(ROOT, 'skills');
export const TARGET = join(ROOT, 'plugins/claude/skills');

/** Every file under `dir`, as sorted paths relative to it. */
export function files(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current).sort()) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(dir, path));
    }
  };
  walk(dir);
  return out;
}

/** Paths that are missing, extra, or different in the plugin copy. */
export function differences() {
  const source = files(SOURCE);
  const target = files(TARGET);
  const diffs = [];
  for (const file of new Set([...source, ...target])) {
    const a = join(SOURCE, file);
    const b = join(TARGET, file);
    if (!existsSync(a)) diffs.push(`extra: ${file}`);
    else if (!existsSync(b)) diffs.push(`missing: ${file}`);
    else if (!readFileSync(a).equals(readFileSync(b))) diffs.push(`changed: ${file}`);
  }
  return diffs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const diffs = differences();
    if (diffs.length) {
      console.error(`plugins/claude/skills is out of date; run npm run sync:plugin\n  ${diffs.join('\n  ')}`);
      process.exit(1);
    }
    console.log('plugins/claude/skills matches skills/');
  } else {
    rmSync(TARGET, { recursive: true, force: true });
    cpSync(SOURCE, TARGET, { recursive: true });
    console.log(`Copied ${files(TARGET).length} files to plugins/claude/skills`);
  }
}
