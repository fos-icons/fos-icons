# Changelog

Changes are recorded under Unreleased until a release is published to npm.

## Unreleased

### Breaking

- `Mark*` components (for example `MarkRegular`) are now `MarkerPinAdd*`,
  following the core `mark` → `marker-pin-add` rename. Update the imports.
  `MarkerPin*` and `MarkerPinAdd*` are redrawn with a symmetric pin.

### Changed

- Synchronized the core snapshot (fos-icons@8af0d8b): 1,319 icons and 5,276
  components.
  - New, in every style: `ArrowUpToLine*`, `ArrowDownToLine*`,
    `ArrowLeftToLine*`, `ArrowRightToLine*`, `ArrowsDiagonal*`,
    `ArrowsDiagonalReverse*`, `ArrowUturnUp*`, `ArrowUturnDown*`,
    `ArrowWaveRight*`, `RefreshOff*`, `ChevronCircle{Up,Down,Left,Right}*`,
    `ChevronSquare{Up,Down,Left,Right}*`, `ChevronsCollapseVertical*`,
    `ResizeHorizontal*`, `ResizeVertical*`, `HeadProfileMan*`,
    `HeadProfileWoman*`, and the buildings `Buildings*`, `BuildingOffice*`,
    `BuildingApartment*`, `Hotel*`, `School*`, `Factory*`, `Warehouse*`,
    `Barn*`, `WaterTower*`, `Fence*`, `Castle*`, `Lighthouse*`, `Bridge*`,
    `Stadium*`, `Monument*`, `Tent*`, `FerrisWheel*`, `BeachUmbrella*`.
  - Redrawn: chevrons are straight with a rounded corner, `Building*` has a
    grid of rounded-square windows, `HeadProfile*` is redrawn, and every
    person figure (`User*`, `Users*`, `HomeUser*`, `ImageUser*`) has a
    squircle-curved base.

## 0.3.0 - 2026-11-18

### Breaking

- The `CalendarDay*`, `CalendarWeek*`, and `CalendarMonth*` components (for
  example `CalendarDayRegular`) are now `CalendarMonth1*`, `CalendarMonth7*`,
  and `CalendarMonth31*`, following the core `calendar-month-<n>` rename.
  Update the imports.

### Changed

- Synchronized the core snapshot (fos-icons@2f2217a): 1,268 icons and 5,072
  components. Adds sixteen calendar icons in every style (`CalendarMonth5*`,
  `CalendarMonth25*`, `CalendarMonth28*`, `CalendarMonth29*`,
  `CalendarMonth30*`, `Calendar3Day*`, `CalendarAgenda*`, `CalendarCopy*`,
  `CalendarDotsRtl*`, `CalendarEvent*`, `CalendarReply*`, `CalendarNote*`,
  `CalendarRecord*`, `CalendarLink*`, `CalendarPerson*`, `CalendarPhone*`)
  and the redrawn calendar family fitted to the 24px keyline grid.

## 0.2.0 - 2026-11-14

### Breaking

- Renamed the package to `@fos-icons/vue` (Fos Icons, fosicons.com). It
  replaces `@fedora-icons/vue`, which is deprecated. Component names are
  unchanged; update the import specifier.
- The color variables are now `--fos-primary`, `--fos-secondary`, and
  `--fos-modifier`, and generated definition IDs use the `fos-` prefix. CSS
  that sets the previous `--fedora-*` variables must be renamed.
- The exported component type `FedoraIcon` is now `FosIcon`.

### Changed

- Synchronized the renamed core snapshot (fos-icons@729ea30). Geometry,
  paints, and fallback colors are unchanged.

## 0.1.1 - 2026-11-13

### Fixed

- Synchronized Duotone `tool-crossed`, which now tints only the wrench and
  screwdriver handle (fos-icons@573481e).

## 0.1.0 - 2026-11-13

### Added

- Initial `@fos-icons/vue` package: 1,252 Fos icons in Regular, Filled,
  Duocolor, and Duotone, generating 5,008 typed Vue 3 components from the
  verified core snapshot at `fos-icons/fos-icons@460a047` (the same
  snapshot as `@fos-icons/react` 0.1.1).
- Render-function components with `size`, `color`, `primaryColor`,
  `secondaryColor`, `modifierColor`, `title`, and `titleId` props; other
  attributes, listeners, and default-slot content fall through to the SVG.
- Decorative-by-default accessibility, with `role="img"` and an associated
  `<title>` when labelled.
- Per-instance mask and clip IDs, hydration-stable through `useId()` on
  Vue 3.5 and later.
- Root, per-style, and per-icon entry points for ESM and CommonJS, with
  TypeScript declarations that type-check TSX and SFC templates.
