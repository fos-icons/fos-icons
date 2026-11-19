# Changelog

Changes are recorded under Unreleased until a release is published to npm.

## Unreleased

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

- Renamed the package to `@fos-icons/react` (Fos Icons, fosicons.com). It
  replaces `@fedora-icons/react`, which is deprecated. Component names are
  unchanged; update the import specifier.
- The color variables are now `--fos-primary`, `--fos-secondary`, and
  `--fos-modifier`, and generated definition IDs use the `fos-` prefix. CSS
  that sets the previous `--fedora-*` variables must be renamed.
- The exported component type `FedoraIcon` is now `FosIcon`.

### Changed

- Synchronized the renamed core snapshot (fos-icons@729ea30). Geometry,
  paints, and fallback colors are unchanged.

## 0.1.2 - 2026-11-13

### Fixed

- Synchronized Duotone `tool-crossed`, which now tints only the wrench and
  screwdriver handle (fos-icons@573481e).

## 0.1.1 - 2026-11-13

### Changed

- Synchronized the redrawn `thermometer`, `thermometer-cold`,
  `thermometer-warm`, and `tool-crossed` icons in all four styles.

### Documentation

- Replaced the local-tarball installation steps with `npm install @fos-icons/react`.

## 0.1.0

### Changed

- Synchronized connected image-family hill borders in all four styles and the
  transparent, two-stroke-color `head-profile` Duocolor correction.
- Synchronized the verified core SVG snapshot: 1,252 icons in four styles,
  generating 5,008 React components.
- Included the new currency, music, image-resolution, fuel-pump, pause, and
  vertical-dataflow artwork.
- Synchronized curved battery terminals, rounded receipts, and the balanced
  podcast, cupped-hand/two-coin, and circular pie-chart redraws in all styles.
- Synchronized the smaller foreground-panel radius in `layers-offset` across
  all four styles, retaining the offset lines.
- Synchronized the anatomical torso, clearer wheelchair, and articulated-spine
  redraws, including optically balanced Filled details.
- Synchronized the straight test-tube redraw with its rounded base, rim,
  graduation marks, and liquid-level details.
- Synchronized hot-dog, tea, and wavy-noodle redraws, the slimmer bandage, and
  the recognizable flexed-arm silhouette across all four styles.
- Updated cake and triangle-arrow redraws, rounded play triangles, image hills,
  and home-family corners.
- Synchronized matched L-shaped corner radii, softer triangle-arrow bends, and
  rounded navigation pointers, retaining stroke caps and semantic modifier colors.
- Carried through Filled cutout repairs, solid sparkle accents, modifier
  clearances, and corrected scissors stroke geometry.
- Synchronized conservatively optimized SVG markup without changing the icon
  names, component API, color roles, or transparent cutouts.
- Retained source commit and content hashes in the synchronization lockfile,
  including the dirty-source state of local artwork updates.

### Documentation

- Added this changelog to the repository and npm package contents.
