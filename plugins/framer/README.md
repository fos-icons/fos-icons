# Fos Icons for Framer

A Framer-native icon picker with Fos branding. Search the bundled library,
choose Regular, Solid, Duocolor, or Duotone, customize size, colors and applicable
stroke weight, then insert an SVG into the canvas.

## Development

Node.js 24 and npm. The plugin uses the official Framer React/TypeScript/Vite
starter. Dependencies and packaging tools are locked in `package-lock.json`.

```sh
npm ci
npm run dev
```

In Framer, enable Developer Tools under Plugins and select **Open Development
Plugin**. Use the local URL printed by Vite. Browser-only UI preview is available
in development by appending `?preview=1`; insertion is explicitly disabled there.
Run `npm run dev:preview` and open `http://127.0.0.1:5174/?preview=1` for the
standalone browser preview without Framer's development-environment overlay.
Preview mode is not included in production builds.

The default server uses loopback HTTP and does not change the macOS trust store.
If your Framer/browser setup requires HTTPS, run `npm run dev:https` from your own
terminal. Its first run uses mkcert and may ask you to authorize a local
development certificate in the macOS trust store.

The interface inherits Framer's theme, typography and native controls. The Fos
mark is first-party identity artwork adapted from
`fosicons.com/src/brand/mark-filled.svg`, not an icon offered for export.

## Canvas behavior

- Clicking an icon selects it in the plugin; **Insert icon** performs the write.
- With exactly one SVG selected on the canvas, the action is **Replace selected
  SVG**. This follows Framer's `addSVG` behavior; it is not an always-add action.
- Multiple selected layers containing an SVG block insertion until the selection
  is unambiguous. Selection and edit permissions are rechecked before a write.
- Size accepts integer values from 8 to 512 px. Stroke weight applies to line
  styles, never Solid. Duo styles expose a second color and library palettes.
- Colors are resolved into the inserted SVG. Later editor theme changes do not
  recolor artwork already inserted.
- Search covers names, aliases, tags and categories. `/` focuses search; Escape
  clears it. Arrow keys move through the loaded grid; Home/End reach its edges.
  **Show more icons** provides keyboard access to additional results.

## Artwork and updates

Artwork is bundled in 96-icon chunks, loaded only when needed. Artwork loading
requires no website, GitHub API, backend, authentication, tracking or runtime CDN.
Framer's standard stylesheet requests Inter from its font CDN, with system-font
fallbacks when offline.
`src/data/source-lock.json` records the canonical source commit and hashes.
Brand marks and runtime modifier composition are deliberately out of scope.

The sync reads **committed Git objects**, not the source checkout's working tree.
An ordinary sync preserves the existing pin. Updating the library is explicit:

```sh
npm run sync -- --source ../.. --revision <commit>
npm run sync:check -- --source ../..
```

Every SVG is verified against the canonical manifest's SHA-256 digest before
outputs are written. Generated files under `src/data/`, `public/icons/` and
`public/licenses/` must be committed together. Core artwork is MIT licensed;
the original notice is bundled in `public/licenses/fos-icons-LICENSE.txt`.
SVG customization and search share logic with the Fos Icons website.

## Checks and packaging

```sh
npm run check
npm run pack
```

Checks cover source synchronization, lint, search, SVG fidelity, picker
interactions and production compilation. TypeScript remains strict for source;
`skipLibCheck` skips inconsistent declarations shipped by the Framer SDK.
Tests exercise the host contract, but real canvas insertion and replacement
still need acceptance testing inside Framer.

`npm run pack` produces `plugin.zip` using Framer's official packaging tool.
Upload it through **New Plugin** in the Framer Marketplace dashboard.
The plugin has not been submitted or published by this project setup.
