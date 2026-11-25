#!/usr/bin/env node
/**
 * Copy the canonical skills (skills/) into each plugin package. Claude Code
 * and OpenAI install a plugin by copying its own folder, so a plugin can't
 * point outside it; it carries a copy instead.
 *
 *   node scripts/sync-plugin-skills.mjs          # write
 *   node scripts/sync-plugin-skills.mjs --check  # fail if a copy differs
 */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = join(ROOT, 'skills');

/** Plugin skill folders, and the skills each one has of its own (not synced). */
export const TARGETS = [
  { dir: join(ROOT, 'plugins/claude/skills'), own: [] },
  { dir: join(ROOT, 'plugins/openai/skills'), own: ['get-started'] },
];

const sharedSkills = () => readdirSync(SOURCE).filter((name) => statSync(join(SOURCE, name)).isDirectory()).sort();

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

/** Paths that are missing, extra, or different in the plugin copies. */
export function differences() {
  const diffs = [];
  for (const target of TARGETS) {
    const label = relative(ROOT, target.dir);
    const ownPrefix = (file) => target.own.some((own) => file.startsWith(`${own}/`));
    const source = files(SOURCE);
    const copied = files(target.dir).filter((file) => !ownPrefix(file));
    for (const file of new Set([...source, ...copied])) {
      const a = join(SOURCE, file);
      const b = join(target.dir, file);
      if (!existsSync(a)) diffs.push(`${label}: extra ${file}`);
      else if (!existsSync(b)) diffs.push(`${label}: missing ${file}`);
      else if (!readFileSync(a).equals(readFileSync(b))) diffs.push(`${label}: changed ${file}`);
    }
  }
  return diffs;
}

function sync() {
  for (const target of TARGETS) {
    for (const entry of existsSync(target.dir) ? readdirSync(target.dir) : []) {
      if (!target.own.includes(entry)) rmSync(join(target.dir, entry), { recursive: true, force: true });
    }
    for (const skill of sharedSkills()) cpSync(join(SOURCE, skill), join(target.dir, skill), { recursive: true });
    console.log(`Synced ${sharedSkills().join(', ')} into ${relative(ROOT, target.dir)}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const diffs = differences();
    if (diffs.length) {
      console.error(`Plugin skills are out of date; run npm run sync:plugin\n  ${diffs.join('\n  ')}`);
      process.exit(1);
    }
    console.log('Plugin skills match skills/');
  } else {
    sync();
  }
}
