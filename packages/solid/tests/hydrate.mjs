import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const { output, script } = JSON.parse(readFileSync(0, 'utf8'));
const { window } = new JSDOM(`<!doctype html><head>${script}</head><body><main>${output}</main></body>`, {
  runScripts: 'dangerously',
});
for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'MouseEvent', '_$HY']) {
  globalThis[key] = key === 'window' ? window : window[key];
}
const { createComponent, createSignal, flush } = await import('solid-js');
const { hydrate } = await import('@solidjs/web');
const { default: Icon } = await import('@fos-icons/solid/regular/credit-card-down');
const root = document.querySelector('main');
const existing = root.querySelector('svg');
const clipId = existing.querySelector('clipPath').id;
let target;
let clicked = 0;
let setSize;
const dispose = hydrate(() => {
  const [size, update] = createSignal(24);
  setSize = update;
  return createComponent(Icon, {
    get size() { return size(); },
    get strokeWidth() { return size() === 24 ? 1.25 : 2; },
    title: 'Download card',
    ref: value => { target = value; },
    onClick: () => { clicked++; },
  });
}, root);
flush();
assert.equal(root.querySelector('svg'), existing);
assert.equal(target, existing);
assert.equal(existing.querySelector('clipPath').id, clipId);
existing.dispatchEvent(new MouseEvent('click', { bubbles: true }));
assert.equal(clicked, 1);
setSize(32);
flush();
assert.equal(existing.getAttribute('width'), '32');
assert.ok(existing.querySelector('[stroke-width="2"]'));
dispose();
