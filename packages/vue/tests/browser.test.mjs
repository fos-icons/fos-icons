import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

// Vue's DOM renderer captures `document` when it is first loaded.
const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  ...Object.fromEntries(['Element', 'HTMLElement', 'SVGElement', 'Node', 'MathMLElement']
    .map(name => [name, dom.window[name]])),
});
const vue = await import('vue');
const { createApp, createSSRApp, h, nextTick, ref } = vue;
const { renderToString } = await import('vue/server-renderer');
const { CameraRegular, CreditCardPlusRegular } = await import('@fos-icons/vue');

function container() {
  const element = document.createElement('div');
  document.body.append(element);
  return element;
}

async function captureWarnings(run) {
  const warnings = [];
  const original = { warn: console.warn, error: console.error };
  console.warn = (...args) => warnings.push(args);
  console.error = (...args) => warnings.push(args);
  try {
    await run();
  } finally {
    Object.assign(console, original);
  }
  return warnings;
}

test('template refs expose the SVG element and listeners fall through', async () => {
  const root = container();
  const icon = ref();
  let clicks = 0;
  const app = createApp({
    render: () => h(CameraRegular, {
      ref: icon, onClick: () => { clicks += 1; }, 'aria-label': 'Camera',
    }),
  });
  try {
    app.mount(root);
    const svg = root.querySelector('svg');
    assert.equal(icon.value.$el, svg);
    assert.equal(svg.namespaceURI, 'http://www.w3.org/2000/svg');
    assert.equal(svg.getAttribute('role'), 'img');
    svg.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(clicks, 1);
  } finally {
    app.unmount();
    root.remove();
  }
});

test('reactive prop changes update size, colors, and the title association', async () => {
  const root = container();
  const state = ref({ size: 24, title: undefined, primaryColor: undefined });
  const app = createApp({ render: () => h(CameraRegular, state.value) });
  try {
    app.mount(root);
    const svg = root.querySelector('svg');
    assert.equal(svg.getAttribute('aria-hidden'), 'true');
    state.value = { size: 48, title: 'Camera', primaryColor: 'red' };
    await nextTick();
    assert.equal(svg.getAttribute('width'), '48');
    assert.equal(svg.getAttribute('aria-hidden'), null);
    assert.equal(svg.getAttribute('role'), 'img');
    assert.equal(svg.getAttribute('color'), 'red');
    assert.equal(svg.style.getPropertyValue('--fos-primary'), 'red');
    assert.equal(svg.getAttribute('aria-labelledby'), svg.querySelector('title').id);
    state.value = { size: 24 };
    await nextTick();
    assert.equal(svg.querySelector('title'), null);
    assert.equal(svg.getAttribute('aria-hidden'), 'true');
    assert.equal(svg.getAttribute('aria-labelledby'), null);
  } finally {
    app.unmount();
    root.remove();
  }
});

test('client-rendered repeated icons have unique mask and clip IDs', async () => {
  const root = container();
  const app = createApp({
    render: () => Array.from({ length: 3 }, () => h(CreditCardPlusRegular)),
  });
  try {
    app.mount(root);
    const ids = [...root.querySelectorAll('[id]')].map(node => node.id);
    assert.ok(ids.length >= 6);
    assert.equal(ids.length, new Set(ids).size);
  } finally {
    app.unmount();
    root.remove();
  }
});

test('server-rendered titles and mask IDs hydrate without mismatches', {
  skip: typeof vue.useId !== 'function' && 'hydration-stable IDs require Vue 3.5 useId()',
}, async () => {
  const root = container();
  const App = {
    render: () => [
      h(CreditCardPlusRegular, { title: 'Add card' }),
      h(CreditCardPlusRegular, { title: 'Another card' }),
    ],
  };
  root.innerHTML = await renderToString(createSSRApp(App));
  const before = root.innerHTML;
  const app = createSSRApp(App);
  let mounted = false;
  try {
    const warnings = await captureWarnings(() => { app.mount(root); mounted = true; });
    assert.deepEqual(warnings, []);
    assert.equal(root.innerHTML, before);
    const ids = [...root.querySelectorAll('[id]')].map(node => node.id);
    assert.equal(ids.length, new Set(ids).size);
    for (const svg of root.querySelectorAll(':scope > svg')) {
      assert.equal(svg.getAttribute('aria-labelledby'), svg.querySelector('title').id);
    }
  } finally {
    if (mounted) app.unmount();
    root.remove();
  }
});
