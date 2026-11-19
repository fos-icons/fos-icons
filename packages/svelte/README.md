# Svelte Fos Icons

Fos Icons for Svelte 5.20 and later: 1,319 icons in Regular, Filled, Duocolor,
and Duotone styles. The 5,276 components are generated from the canonical SVGs
in `fos-icons/fos-icons` without changing their geometry, transparent cutouts,
default 1.25px strokes, or duo colors. Third-party brand assets are not included.

This package is prepared for publication; the branch does not publish it to npm.

## Installation

After publication:

```sh
npm install @fos-icons/svelte
```

Use a Svelte-enabled build tool, such as SvelteKit or Vite with the Svelte
plugin. The package ships JavaScript icon modules, typed ESM indexes, and
**one shared `.svelte` renderer** for the entire library, not a `.svelte` file
per icon. It does not bundle Svelte or provide CommonJS. Svelte 4 is not supported.

This follows [SvelteKit's icon-library guidance](https://svelte.dev/docs/kit/icons):
thousands of `.svelte` files can slow Vite's dependency optimization, especially
when mixing root and subpath imports. Icon geometry stays in tree-shakeable
JavaScript data; Vite only needs to compile the shared renderer. Root imports
still require scanning the JavaScript export graph, so individual imports
remain useful when minimizing development-time dependency traversal.

## Usage

```svelte
<script lang="ts">
  import { CameraRegular, CameraFilled, CameraDuotone } from '@fos-icons/svelte';
</script>

<button type="button" aria-label="Take a photo">
  <CameraRegular size={24} />
</button>
<CameraDuotone size="2em" primaryColor="#245B9E" secondaryColor="#5B87B7" />
<CameraFilled title="Camera" />
<CameraRegular size={32} strokeWidth={1.5} />
```

Canonical names become PascalCase with the same style suffix as the React
and Vue packages: `fuel-pump` becomes `FuelPumpRegular`, `FuelPumpFilled`,
`FuelPumpDuocolor`, and `FuelPumpDuotone`. Names beginning with a digit gain
an `Icon` prefix. Import only the icons you use; root and style indexes are
tree-shakeable, and individual paths avoid importing an index altogether.
Choose one import style consistently in your app:

```ts
// Style-scoped alternative:
import { CameraFilled } from '@fos-icons/svelte/filled';

// Individual-icon alternative:
import CameraRegular from '@fos-icons/svelte/regular/camera';
```

Mixed root/subpath imports are covered by Vite integration checks, but the
[Vite plugin FAQ](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md#what-is-going-on-with-vite-and-pre-bundling-dependencies)
still recommends a consistent import style. No import-rewriting plugin or
`optimizeDeps.exclude` workaround is required by this package.

## Props

| Prop | Behavior |
| --- | --- |
| `size` | Width and height; defaults to `24`. Accepts a number or CSS size string. |
| `color` | SVG color; takes precedence over `primaryColor`. Regular/Filled inherit `currentColor` when omitted. |
| `primaryColor` | Sets `--fos-primary` and the SVG color unless `color` is provided. |
| `secondaryColor` | Sets `--fos-secondary` for duo accents and tints. |
| `modifierColor` | Sets `--fos-modifier` for named presets with an independently colored glyph. |
| `strokeWidth` | Overrides existing stroked elements only; does not add strokes to Filled shapes or redesign optical sizes. |
| `title` | Adds an escaped SVG title, accessible name, and `role="img"`. |
| `titleId` | Overrides the generated title ID; provide a page-unique value. |

Native SVG attributes, `class`, string `style`, and Svelte event handlers such
as `onclick` pass through to the SVG. Explicit `width` and `height` override
`size`. Caller CSS custom properties in `style` override the color-prop
variables. Duo icons retain their canonical blue defaults when not customized.

Decorative icons default to `aria-hidden="true"` and `focusable="false"`.
Provide `title`, `aria-label`, or `aria-labelledby` for meaningful standalone
icons. Explicit ARIA attributes take precedence, and an explicit label takes
precedence over the title's generated `aria-labelledby`. Icon-only buttons
still need an accessible name on the button itself.

Svelte's instance IDs keep titles, masks, and clip paths unique within a
rendered tree and stable during server rendering and hydration. These IDs
are internal implementation details; do not target them with application CSS.
When using multiple independent Svelte roots, use Svelte's `idPrefix` render
and mount/hydrate option consistently to distinguish those roots.

`IconProps` and `FosIcon` types are exported from the root and style entry points.
All styles are separate components, not runtime variants.

## Local development and release

From `packages/svelte`:

```sh
npm ci
npm run build
npm test
npm pack --dry-run
```

The checked-in `source/icons.json` snapshot makes builds independent of a
separate checkout or network access. To refresh it from the core library:

```sh
npm run sync -- --source ../..
```

Synchronization verifies `manifest.json` and SVG digests, records the core
revision and snapshot digest in `source/lock.json`, and copies the MIT license.
The build verifies the snapshot and each SVG, generates per-icon JavaScript
modules and declarations, validates the single shared renderer with the Svelte
compiler for client and server, and regenerates the ignored `dist/` folder.
Tests enforce the one-`.svelte`-file distribution and exercise exports,
tree-shaking, SVG pixel parity, prop overrides, accessibility, cutout isolation,
hydration, reactive updates, and events. A packed-package Vite consumer checks
mixed root/subpath dependency optimization, client and server builds, and
hydration; a Svelte/TypeScript fixture checks public imports.
The core SVG repository is not modified by synchronization or building.

To try the package in another local Svelte app, run
`npm pack` from this repository and install
the resulting tarball in that app. Publishing is a separate release action
and is never performed by building or testing.
