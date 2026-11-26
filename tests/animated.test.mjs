import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { animateSvg, buildAnimated, loadSpec, parseParts } from '../scripts/animate.mjs';

const spec = await loadSpec();
const built = await buildAnimated();

test('every animated icon is generated and committed', async () => {
  assert.ok(Object.keys(spec.icons).length >= 20);
  for (const [name, svg] of Object.entries(built)) {
    assert.equal(await readFile(new URL(`../icons/animated/${name}.svg`, import.meta.url), 'utf8'), svg, `${name} is stale: npm run animate`);
  }
});

test('styles are scoped to the icon, so several can share one page', () => {
  for (const [name, svg] of Object.entries(built)) {
    const css = /<style>([\s\S]*)<\/style>/.exec(svg)[1];
    const selectors = css.replace(/@keyframes [\w-]+\{(?:[^{}]*\{[^}]*\})*\}/g, '').replace(/@media[^{]*\{/g, '')
      .match(/(^|\})[^{}@]+(?=\{)/g).map((s) => s.replace(/^\}/, '').trim());
    for (const sel of selectors) {
      for (const part of sel.split(',')) assert.match(part.trim(), new RegExp(`^\\.fa-${name}(-\\d+)?( \\*)?$`), `${name}: unscoped selector ${part}`);
    }
    for (const [, key] of css.matchAll(/@keyframes ([\w-]+)/g)) assert.ok(key.startsWith(`fa-${name}-`), `${name}: keyframes ${key}`);
    assert.ok(css.includes(`@media (prefers-reduced-motion:reduce){.fa-${name} *{animation:none!important}}`));
  }
});

test('the static drawing is the rest pose: same geometry as Regular', async () => {
  for (const name of Object.keys(spec.icons)) {
    if (spec.icons[name].add) continue; // borrows parts from other icons
    const regular = await readFile(new URL(`../icons/regular/${spec.icons[name].source ?? name}.svg`, import.meta.url), 'utf8');
    const joined = (parts) => parts.map((p) => `${p.translate}|${p.d}`).join(' ');
    const original = parseParts(regular);
    const animated = parseParts(regular, spec.icons[name]);
    assert.equal(animated.map((p) => p.d).join(''), original.map((p) => p.d).join('').replace(/\s+(?=M)/g, ''), name);
    assert.ok(joined(animated));
  }
});

test('bad specs fail loudly', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke="currentColor" d="M1 1L2 2"/></svg>';
  assert.throws(() => animateSvg('x', svg, { motions: [{ type: 'spin', parts: [3] }] }), /out of range/);
  assert.throws(() => animateSvg('x', svg, { motions: [{ type: 'wobble', parts: [0] }] }), /Unknown motion/);
  assert.throws(() => animateSvg('Bad Name', svg, { motions: [] }), /Invalid name/);
  assert.throws(() => parseParts('<svg><circle r="1"/></svg>'), /Unsupported/);
});

test('caller CSS cannot escape the style block', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke="currentColor" d="M1 1L2 2"/></svg>';
  const frames = (f) => () => animateSvg('x', svg, { motions: [{ type: 'keyframes', parts: [0], frames: f }] });
  assert.throws(frames({ '50%': 'opacity:0}</style><script>alert(1)</script>' }), /Unsupported keyframe/);
  assert.throws(frames({ '50%': 'background:url(https://e.x)' }), /Unsupported keyframe/);
  assert.throws(frames({ '50%}body{display:none': 'opacity:0' }), /Invalid keyframe selector/);
  assert.throws(() => animateSvg('x', svg, { motions: [{ type: 'spin', parts: [0], ease: 'linear}*{color:red' }] }), /Invalid easing/);
  assert.throws(() => animateSvg('x', svg, { motions: [{ type: 'nudge', parts: [0], x: '1px}*{' }] }), /Invalid number/);
  assert.throws(() => animateSvg('x', svg, { motions: [{ type: 'spin', parts: [0], dur: -1 }] }), /dur/);
  assert.match(frames({ '0%,50%': 'transform:translate(1px,-2px) rotate(-12deg);opacity:.5' })(), /fa-x-m0\{0%,50%\{transform:translate\(1px,-2px\) rotate\(-12deg\);opacity:.5\}/);
});

test('animated presets keep the modifier clearance and move the badge alone', async () => {
  for (const name of ['edit-circle', 'edit-square']) {
    const svg = built[name];
    const parts = parseParts(await readFile(new URL(`../icons/regular/${name}.svg`, import.meta.url), 'utf8'), { split: true });
    assert.ok(parts[0].clip, `${name}: base keeps its clearance`);
    assert.ok(!parts.at(-1).clip, `${name}: badge is not clipped`);
    assert.match(svg, new RegExp(`<clipPath id="fa-${name}-clip"`));
    assert.match(svg, new RegExp(`<g class="fa-${name}-0" clip-path="url\\(#fa-${name}-clip\\)">`));
    assert.doesNotMatch(svg, /fos-[\w-]+-clearance/, `${name}: ids are scoped to the animated icon`);
  }
});
