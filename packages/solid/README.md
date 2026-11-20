# Fos Icons for SolidJS

Typed icon components in Regular, Filled, Duocolor, and Duotone. The package
targets Solid 2 and includes browser and server renderers.

## Install

The initial version is tested with Solid 2.0.0-rc.21.

```sh
npm install @fos-icons/solid solid-js@2.0.0-rc.21 @solidjs/web@2.0.0-rc.21
```

```tsx
import { BinocularsRegular, TelescopeDuocolor } from '@fos-icons/solid';

export function ExploreIcons() {
  return (
    <>
      <BinocularsRegular size={20} aria-label="Explore" />
      <TelescopeDuocolor primaryColor="#245B9E" secondaryColor="#5B87B7" />
    </>
  );
}
```

Import by style from `@fos-icons/solid/regular`, `/filled`, `/duocolor`, or
`/duotone`. Individual icons are also default exports, such as
`@fos-icons/solid/regular/binoculars`. Components accept native SVG attributes,
`size`, `strokeWidth`, and color overrides. Icons are decorative by default.
Supply `title`, `aria-label`, or `aria-labelledby` to give one an accessible name.

## Build from source

Run these commands from `packages/solid` in the monorepo.

```sh
npm ci
npm test
npm pack --dry-run
```

The build reads the root manifest and canonical SVGs. Consumers of the npm
package only need the generated components and the Solid peer dependencies.
