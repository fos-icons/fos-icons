#!/usr/bin/env node
/**
 * Build the name maps the fos-icons-migrate skill uses to switch a project
 * from another icon library to Fos Icons.
 *
 *   node scripts/migration-maps.mjs --lucide <lucide-static dir> --heroicons <heroicons dir>
 *   node scripts/migration-maps.mjs --check --lucide … --heroicons …
 *
 * Point each flag at an unpacked npm package (`npm pack lucide-static heroicons`,
 * then untar). The packages are read, never installed or committed.
 *
 * Every map entry records how it was matched, so the skill knows how far to
 * trust it:
 *   exact       the other library uses the same name
 *   alias       the name is one of the Fos icon's manifest aliases
 *   curated     chosen by meaning in CURATED below, for common names that differ
 *   normalized  an alternate design of the same icon: a trailing -2…-9 the other
 *               library uses for variants (trash-2 → trash). Skipped when the
 *               library also has <name>-1, where the number is meaningful
 *               (heading-1…6, clock-1…12).
 *   reordered   the same words in another order (arrow-down-circle → arrow-circle-down)
 *   suggested   best search match over Fos names, aliases and tags; the agent
 *               must confirm it with search_icons before using it
 * Names with no candidate are listed under `unmapped`.
 *
 * Output is deterministic: the same packages and manifest produce identical files.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'skills/fos-icons-migrate/maps');

function parseArgs(argv) {
  const args = { check: false, lucide: null, heroicons: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--lucide') args.lucide = argv[++i];
    else if (argv[i] === '--heroicons') args.heroicons = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.lucide || !args.heroicons) throw new Error('Pass --lucide <dir> and --heroicons <dir> (unpacked npm packages).');
  return args;
}

const manifestText = readFileSync(join(ROOT, 'manifest.json'), 'utf8');
const manifest = JSON.parse(manifestText);
const icons = manifest.icons;
const fosNames = new Set(icons.map((icon) => icon.name));
const aliasOf = new Map();
for (const icon of icons) {
  for (const alias of icon.aliases) {
    const key = alias.toLowerCase().replace(/[\s_]+/g, '-');
    if (!aliasOf.has(key)) aliasOf.set(key, icon.name);
  }
}

/**
 * Mappings for common names that differ between libraries, chosen by meaning.
 * Every target must exist (checked at build time). Keep this short, and compare
 * both icons visually before adding one.
 */
const CURATED = {
  lucide: {
    'external-link': 'link-external', 'square-arrow-out-up-right': 'link-external',
    'circle-alert': 'alert-circle', 'alert-circle': 'alert-circle', 'triangle-alert': 'alert-triangle',
    'circle-help': 'help-circle', 'circle-check': 'check-circle', 'circle-x': 'x-circle', 'circle-plus': 'plus-circle',
    'ellipsis': 'dots-horizontal', 'more-horizontal': 'dots-horizontal', 'ellipsis-vertical': 'dots-vertical', 'more-vertical': 'dots-vertical',
    'loader': 'loader-rays', 'loader-circle': 'loader-spinner', 'loader-2': 'loader-spinner',
    'map-pin': 'marker-pin', 'video': 'video-recorder', 'user-plus': 'user-add', 'lock-open': 'unlock', 'house': 'home',
    'refresh-cw': 'refresh', 'rotate-cw': 'rotate-clockwise', 'rotate-ccw': 'rotate-counterclockwise',
  },
  heroicons: {
    'x-mark': 'x', 'magnifying-glass': 'search', 'cog-6-tooth': 'settings', 'cog-8-tooth': 'settings', 'bars-3': 'menu',
    'ellipsis-horizontal': 'dots-horizontal', 'ellipsis-vertical': 'dots-vertical',
    'envelope': 'mail', 'envelope-open': 'mail-open', 'arrow-down-tray': 'download', 'arrow-up-tray': 'upload',
    'arrow-path': 'refresh', 'arrow-top-right-on-square': 'link-external',
    'exclamation-triangle': 'alert-triangle', 'exclamation-circle': 'alert-circle',
    'information-circle': 'info-circle', 'question-mark-circle': 'help-circle',
    'map-pin': 'marker-pin', 'pencil-square': 'edit', 'document': 'file', 'document-text': 'file-text',
    'paper-airplane': 'send', 'user-plus': 'user-add', 'lock-open': 'unlock', 'bolt': 'zap',
    'arrow-right-start-on-rectangle': 'log-out', 'arrow-right-end-on-rectangle': 'log-in',
    'arrow-right-on-rectangle': 'log-out', 'arrow-left-on-rectangle': 'log-in',
    'video-camera': 'video-recorder', 'device-phone-mobile': 'mobile-phone', 'squares-2x2': 'grid-2x2',
  },
};
for (const [library, table] of Object.entries(CURATED)) {
  for (const [from, to] of Object.entries(table)) {
    if (!fosNames.has(to)) throw new Error(`CURATED.${library}['${from}'] → '${to}' is not a Fos icon`);
  }
}

const words = (value) => value.toLowerCase().split(/[\s_-]+/).filter(Boolean);
const index = icons.map((icon) => ({
  name: icon.name,
  nameWords: words(icon.name),
  aliasWords: icon.aliases.map(words),
  tagWords: icon.tags.map(words),
}));

/** Every word must hit; stronger hits (name over alias over tag) score higher. */
function searchFos(term) {
  const terms = words(term).filter((w) => !/^\d+$/.test(w));
  if (!terms.length) return null;
  let best = null;
  for (const entry of index) {
    let score = 0;
    for (const t of terms) {
      if (entry.nameWords.includes(t)) score += 3;
      else if (entry.aliasWords.some((a) => a.includes(t))) score += 2;
      else if (entry.tagWords.some((tag) => tag.includes(t))) score += 1;
      else { score = 0; break; }
    }
    if (!score) continue;
    // Prefer fewer extra words in the Fos name: "user" over "user-badge".
    score -= (entry.nameWords.length - terms.length) * 0.1;
    if (!best || score > best.score || (score === best.score && entry.name < best.name)) best = { name: entry.name, score };
  }
  return best && best.score >= terms.length * 2 ? best.name : null;
}

function direct(name) {
  if (fosNames.has(name)) return { to: name, match: 'exact' };
  if (aliasOf.has(name)) return { to: aliasOf.get(name), match: 'alias' };
  return null;
}

const sortedWords = (name) => name.split('-').sort().join('-');
const byWordSet = new Map(icons.map((icon) => [sortedWords(icon.name), icon.name]));

function mapName(name, library, sourceNames) {
  const hit = direct(name);
  if (hit) return hit;
  const curated = CURATED[library][name];
  if (curated) return { to: curated, match: 'curated' };
  const variant = /^(.+)-([2-9])$/.exec(name);
  if (variant && !sourceNames.has(`${variant[1]}-1`)) {
    const variantHit = direct(variant[1]);
    if (variantHit) return { to: variantHit.to, match: 'normalized' };
  }
  const reordered = byWordSet.get(sortedWords(name));
  if (reordered) return { to: reordered, match: 'reordered' };
  const suggestion = searchFos(name);
  return suggestion ? { to: suggestion, match: 'suggested' } : null;
}

const pascal = (name) => name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');

function packageInfo(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  return `${pkg.name}@${pkg.version}`;
}

function svgNames(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
}

function build(library, source, names, componentFor, usage) {
  const map = {};
  const unmapped = [];
  const counts = { exact: 0, alias: 0, curated: 0, normalized: 0, reordered: 0, suggested: 0, unmapped: 0 };
  const sourceNames = new Set(names);
  for (const name of [...sourceNames].sort()) {
    const result = mapName(name, library, sourceNames);
    if (!result) { unmapped.push(name); counts.unmapped += 1; continue; }
    counts[result.match] += 1;
    map[name] = { component: componentFor(name), to: result.to, match: result.match };
  }
  return {
    library,
    source,
    fosIcons: { iconCount: manifest.iconCount, manifestSha256: createHash('sha256').update(manifestText).digest('hex') },
    usage,
    counts,
    map,
    unmapped,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const lucideDir = resolve(args.lucide);
  const heroDir = resolve(args.heroicons);
  for (const dir of [lucideDir, heroDir]) if (!existsSync(join(dir, 'package.json'))) throw new Error(`No package.json in ${dir}`);

  const lucide = build(
    'lucide',
    packageInfo(lucideDir),
    svgNames(join(lucideDir, 'icons')),
    pascal,
    'Keys are lucide names (kebab-case). `component` is the PascalCase name used by lucide-react, lucide-vue-next, lucide-svelte and lucide-angular (also with an Icon suffix or Lucide prefix), and by react-icons/lu with an Lu prefix.',
  );
  const heroNames = ['24/outline', '24/solid', '20/solid', '16/solid']
    .map((sub) => join(heroDir, sub))
    .filter(existsSync)
    .flatMap(svgNames);
  const heroicons = build(
    'heroicons',
    packageInfo(heroDir),
    heroNames,
    (name) => `${pascal(name)}Icon`,
    'Keys are heroicons names (kebab-case). `component` is the @heroicons/react and @heroicons/vue name (24/outline, 24/solid, 20/solid, 16/solid). react-icons/hi2 uses HiOutline<Name>, Hi<Name> and HiMini<Name> without the Icon suffix.',
  );

  const outputs = { 'lucide.json': lucide, 'heroicons.json': heroicons };
  let stale = false;
  for (const [file, data] of Object.entries(outputs)) {
    const path = join(OUT, file);
    const text = JSON.stringify(data, null, 2) + '\n';
    if (args.check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== text) { console.error(`${file} is out of date`); stale = true; }
    } else {
      writeFileSync(path, text);
    }
    console.log(`${file}: ${data.source}`, data.counts);
  }
  if (stale) process.exit(1);
}

main();
