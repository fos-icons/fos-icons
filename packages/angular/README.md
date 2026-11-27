# Angular Fos Icons

Fos Icons for Angular ships 1,593 icons in Regular, Filled, Duocolor, and
Duotone. Each of the 6,372 standalone components renders on a native SVG element
using the artwork from the core Fos Icons library.

## Install locally

Build a tarball from this folder and install it in an Angular application.

```sh
npm ci
npm pack
```

```sh
npm install /path/to/angular-fos/fos-icons-angular-0.1.0.tgz
```

The package targets Angular 20 through 22 and is tested with Angular 20. It
ships typed ESM with partial Ivy compilation for the Angular linker.
Angular CLI applications link it automatically.

## Usage

Import each icon in the standalone component that uses it. The icon selector
goes on an `svg` element.

```ts
import { Component } from '@angular/core';
import { CameraRegular, CameraDuotone } from '@fos-icons/angular';

@Component({
  selector: 'app-camera-controls',
  imports: [CameraRegular, CameraDuotone],
  template: `
    <button type="button" aria-label="Take a photo">
      <svg fos-camera-regular [size]="20"></svg>
    </button>
    <svg fos-camera-duotone size="2em" title="Camera"
         primaryColor="#245B9E" secondaryColor="#5B87B7"></svg>
  `,
})
export class CameraControls {}
```

Style entry points and individual imports are also available.

```ts
import { CameraFilled } from '@fos-icons/angular/filled';
import CameraRegular from '@fos-icons/angular/regular/camera';
```

Selectors use `fos-<icon-name>-<style>`. As in the other Fos packages,
`fuel-pump` becomes `FuelPumpRegular` in TypeScript. Component names
beginning with a digit in the source gain an `Icon` prefix.

| Input | Behavior |
| --- | --- |
| `size` | Sets width and height. Defaults to 24 and accepts a number or string such as `2em`. |
| `color` | Sets the SVG's current color and takes precedence over `primaryColor` for that attribute. |
| `primaryColor` | Sets the primary CSS custom property and the SVG color when `color` is omitted. |
| `secondaryColor` | Sets the secondary CSS custom property for duo accents and tints. |
| `modifierColor` | Sets the modifier CSS custom property for icons that use it. |
| `strokeWidth` | Overrides the width of existing strokes. |
| `title` | Adds an SVG title and provides an accessible name when `label` is omitted. |
| `label` | Provides an accessible name and takes precedence over `title`. |
| `iconId` | Supplies a stable, document-unique prefix for internal mask and clip path IDs. Use letters, digits, underscores, or hyphens. |

Regular and Filled icons inherit the current text color by default. Duo icons
keep their canonical colors until customized. Apply classes, styles, and
Angular event bindings directly to the SVG host.

Icons are decorative by default. For a meaningful standalone icon, use
`title` or `label`. For an icon-only button, label the button itself.
Masks and clip paths get unique IDs within an Angular app. Use a distinct
Angular `APP_ID` for each app mounted in the same document. For repeated
icons rendered in a different order between server and client, supply the
same unique `iconId` on both sides.

## Development

```sh
npm ci
npm test
npm pack --dry-run
```

The source snapshot allows the package to build independently from the core
files. Refresh it from the repository root with this command.

```sh
npm run sync -- --source ../..
```

The sync verifies each SVG against the canonical manifest and records source
provenance. The build generates standalone templates, then compiles the
library with Angular's partial compiler. Tests check the public entry points,
tree-shaking, AOT compilation of an Angular consumer, and linked server
rendering.
