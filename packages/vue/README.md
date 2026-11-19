# Vue Fos Icons

Fos Icons for Vue: an open-source SVG icon library in **Regular, Filled,
Duocolor, and Duotone**. Drawn on a 24 x 24 grid, with 1.25px line strokes and
transparent cutouts.

TypeScript declarations (including SFC template checking), tree-shakeable ESM
exports, CommonJS imports, and server rendering are included. Vue 3.3 and later
are supported; Vue is not bundled. The components are plain render functions,
so no SFC compiler or build plugin is needed.

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Installation

```sh
npm install @fos-icons/vue
```

## Usage

```vue
<script setup lang="ts">
import { CameraRegular } from '@fos-icons/vue';
</script>

<template>
  <CameraRegular color="currentColor" :size="24" />
</template>
```

For an icon-only button, give the button an accessible name:

```vue
<template>
  <button type="button" aria-label="Take a photo">
    <CameraRegular :size="24" />
  </button>
</template>
```

Render functions and JSX work the same way:

```ts
import { h } from 'vue';
import { CameraRegular } from '@fos-icons/vue';

h(CameraRegular, { size: 32, title: 'Camera' });
```

## Four styles

```vue
<script setup lang="ts">
import {
  CameraRegular,
  CameraFilled,
  CameraDuocolor,
  CameraDuotone,
} from '@fos-icons/vue';
</script>

<template>
  <CameraRegular />
  <CameraFilled />
  <CameraDuocolor />
  <CameraDuotone />
</template>
```

Canonical names become PascalCase with a style suffix: `fuel-pump` becomes
`FuelPumpRegular`, `FuelPumpFilled`, `FuelPumpDuocolor`, or `FuelPumpDuotone`.
All four styles are separate components, not runtime variants. Names are the
same as in `@fos-icons/react`.

## Imports

Root ESM exports are tree-shakeable. Style and individual-icon entry points
are also available, including matching TypeScript and CommonJS exports:

```ts
import { CameraFilled } from '@fos-icons/vue/filled';
import Camera from '@fos-icons/vue/regular/camera';
```

```js
const { CameraRegular } = require('@fos-icons/vue');
```

Import the icons you use rather than registering the whole library globally;
global registration defeats tree-shaking.

## Size and color

```vue
<template>
  <CameraRegular :size="32" color="currentColor" class="camera" />
  <CameraDuocolor
    size="2em"
    primary-color="#245B9E"
    secondary-color="#60A5FA"
  />
</template>
```

| Prop | Type | Effect |
| --- | --- | --- |
| `size` | `number \| string` | Width and height; defaults to `24`. |
| `color` | `string` | SVG `color`; takes precedence over `primaryColor`. |
| `primaryColor` | `string` | `--fos-primary`, and `color` when `color` is absent. |
| `secondaryColor` | `string` | `--fos-secondary` for duo accents. |
| `modifierColor` | `string` | `--fos-modifier` for presets with an independent glyph color. |
| `title` | `string` | Accessible name (see below). |
| `titleId` | `string` | Explicit ID for the generated `<title>`. |

Explicit `width` and `height` attributes override `size`. Preserve equal
dimensions for the intended square canvas. Sizing scales the original artwork;
it does not select a separately drawn optical size.

Every other attribute and listener (`class`, `style`, `data-*`, `@click`,
`stroke-width`, ...) falls through to the `<svg>`. A template ref on an icon
is the component instance; its `$el` is the SVG element. Default-slot content
is appended inside the SVG.

Regular and Filled inherit `currentColor`. Duo styles retain their original
blue defaults. Other glyphs keep the paint roles encoded in their source SVGs.

The library's CSS variables also work on the SVG or an ancestor:

```vue
<template>
  <CameraDuocolor
    :style="{ '--fos-primary': '#245B9E', '--fos-secondary': '#60A5FA' }"
  />
</template>
```

Inline `style` values override custom properties supplied by the color props.
Strokes, fills, masks, and nested SVG viewports are preserved rather than
overwritten globally.

## Unique IDs and server rendering

Definition IDs (masks and clip paths) are scoped per rendered instance, so
the same masked icon can appear any number of times on a page.

On Vue 3.5 and later the IDs come from `useId()`, so they are identical on the
server and client and hydrate without mismatches (Nuxt included). On Vue 3.3
and 3.4, which have no `useId()`, IDs fall back to a per-runtime counter: still
unique, but server-rendered titled or masked icons can report hydration
attribute mismatches. Upgrade to Vue 3.5 for SSR.

## Accessibility

Icons are decorative by default (`aria-hidden="true"`, `focusable="false"`).
Label the containing button or link for icon-only controls.

For a meaningful standalone icon, provide `title`, `aria-label`, or
`aria-labelledby`; the SVG then gets `role="img"`:

```vue
<template>
  <CameraRegular title="Photography" />
  <CameraRegular aria-label="Photography" />
  <CameraRegular aria-labelledby="photography-heading" />
</template>
```

`title` creates an escaped SVG `<title>` with a unique associated ID (it is not
rendered as a `title` attribute). `titleId` can supply an explicit ID; ensure
custom IDs are unique. Explicit ARIA labels take precedence over the generated
title association. Caller-provided `role` and `aria-hidden` remain
authoritative.

## Source and development

The canonical artwork lives in [the root icons directory](../../icons/). This
package owns the Vue API, build, tests, and releases. It shares the snapshot
format used by the [React package](../react/). Update canonical SVGs at the
repository root, then synchronize the package snapshots.

Until the core library has a package dependency, `source/icons.json` contains
an explicit snapshot of its SVGs. `source/lock.json` records the originating
Git revision, whether local changes were included, and manifest/snapshot
SHA-256 digests. The snapshot can be built without the core checkout or network
access.

To synchronize a local core checkout and verify the package:

```sh
npm run sync -- --source ../..
npm test
npm pack
```

Review and commit snapshot changes alongside the lock file. `dirty: true` in
the lock means the core checkout had uncommitted changes when it was synchronized.

`npm run build` verifies the snapshot and per-SVG SHA-256 digests, then generates
ESM, CommonJS, and declarations for all four styles. Generated output is ignored
by git. Building requires Node.js 20 or later; consumers do not need the XML
parser, SVG snapshot, or build scripts.

`npm test` builds the package and checks all components against their source
SVGs, repeated-instance IDs, accessibility, props, attribute and listener
fallthrough, reactivity, server rendering and hydration, tree-shaking,
TypeScript (TSX and SFC templates via `vue-tsc`), and an isolated packed-package
consumer.

The package does not generate animation, runtime modifier composition, a
global plugin, or a dynamic icon-name registry; existing named modifier icons
are exported like every other icon.

## License

MIT. The original Fos Icons license is included in every package.
