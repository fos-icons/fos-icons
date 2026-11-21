# Changelog

Changes are recorded under Unreleased until a release is tagged.

## Unreleased

### Breaking

- Split the **Time & weather** category into **Time & calendar** (62 icons:
  clocks, alarms, calendars, hourglasses, stopwatch, timer, watches) and
  **Weather** (51 icons: sky, clouds, precipitation, wind, temperature). Code
  that filters `manifest.json` by the old category name needs updating.
- Renamed the project from Fedora Icons to **Fos Icons** (`fos-icons`,
  fosicons.com). The SVG color variables are now `--fos-primary`,
  `--fos-secondary`, `--fos-modifier`, and `--fos-glyph-color`, and definition
  IDs use the `fos-` prefix. The previous `--fedora-*` names are no longer read.
  Only names changed: geometry, paints, and fallback colors are identical.
- Renamed `airpods` to `earbuds` to avoid a trademarked product name. The
  `icons/*/airpods.svg` files are now `icons/*/earbuds.svg`.
- Renamed the numbered calendars to one `calendar-month-<n>` family:
  `calendar-day` is now `calendar-month-1`, `calendar-week` is now
  `calendar-month-7`, and `calendar-month` is now `calendar-month-31`. The old
  names stay in each icon's `aliases`; the old SVG files are removed.

### Added

- 22 four-style icons, bringing the library to 1,530 icons and 6,120 SVGs:
  - Legal (Professions): `person-judge`, `copyright`, `registered`,
    `trademark`, `handcuffs`, `police-badge`, `police-cap`, `prison`,
    `sheriff-star`, `legal-document`.
  - Construction (Professions, tagged `construction`): `hard-hat`, `crane`,
    `traffic-cone`, `road-barrier`, `brick-wall`, `drill`, `pickaxe`, `hammer`,
    `excavator`, `blueprint`, `trowel`, plus `cement-mixer` in Transport & space.

### Changed

- Redrew the whole **Nature & animals** category (26 icons) with consistent
  viewpoints: pets as faces, sea and land animals in side profile, insects and
  octopus from the front or top.
- Redrew `person-doctor`, `person-engineer`, `person-lawyer`, and
  `person-professional` on one shared person master.
- Moved `gavel` and `scales` to **Professions** and redrew them.

- 16 four-style icons, bringing the library to 1,508 icons and 6,032 SVGs:
  `send-folded`, `shopping-basket`, `plane-takeoff`, `plane-landing`,
  `annotation-24`, `annotation-7`, `bill-tag`, `money`, `money-square`,
  `home-wifi`, `gift-bow`, `phone-out`, `phone-in`, `calendar-month-go`,
  `microphone-live`, and `sms`.
- A **Money** modifier (`modifiers/money.svg`): a curled bank note in the new
  `commerce` group, with clearance contours for all four corners.

### Changed

- `send`, `send-right`, and `send-up` have softer rounded corners, and the
  midline now stops halfway to the tip.
- `globe` has curved parallels (a slightly tilted view).
- `gift`, `microphone`, `microphone-off`, `headset`, `headset-mic`, and
  `microscope` are redrawn with rounder, fuller forms.
- The `calendar-month-*` family moves the divider below the number, near the
  bottom edge, and the number moves up into the open space.

- Added 34 four-style icons from the Figma Scratchpad, including lightbulbs,
  typography tools, hand gestures, and two recycling bins. The library now has
  1,492 icons and 5,968 SVGs.

- `bookmark-off`, `bookmark-block`, `bookmark-square`, and `book-bookmark` in
  all four styles, bringing the library to 1,458 icons and 5,832 SVGs.

- 135 icons in all four styles, bringing the library to 1,454 icons and 5,816
  SVGs, and the presets to 138.
  - Chevrons: `chevron-outline-*` (hollow, bold) and `chevron-large-*` (longer
    than the compact `chevron-*`), in four directions.
  - Filters and sort: `filter-off`, `filter-dollar`, `filter-circle`,
    `filter-square`, `sort-a-z-*`, `sort-z-a-*`, `sort-0-9-*`, `sort-9-0-*`
    (down and up), `sort-lines-ascending`, `sort-lines-descending`,
    `sort-vertical`, `sort-swap`, and the presets `filter-plus`, `filter-x`,
    `filter-check`, `filter-edit`, `filter-search`, `filter-lines-plus`,
    `filter-lines-x`, `filter-lines-edit`.
  - Cursors: `cursor-hand`, `cursor-hand-click`, `cursor-lasso`,
    `cursor-select`, `cursor-target`, `cursor-window`, `cursor-busy`,
    `cursor-text`, and the presets `cursor-plus`, `cursor-minus`,
    `cursor-block`, `cursor-check`, `cursor-question`, `cursor-sparkle`,
    `cursor-hand-plus`, `cursor-hand-block`.
  - Devices: `mouse-scroll`, `mouse-left-click`, `mouse-right-click`,
    `mouse-wired`, `loader-spinner`, `loader-rays`, `network-3g`, `network-4g`,
    `network-5g`, `network-6g` (signal bars over the generation label),
    `game-controller`, `joystick`, `magnet-zap`.
  - Awards: `trophy-star`, `award-star`, `award-crystal`, `crown`,
    `crown-simple`, `laurel-wreath`, `laurel-wreath-1`, `laurel-branch`,
    `medal-1`, `medal-2`, `medal-3`, `medal-military`, `rosette`,
    `award-check`, `pennant`, and the presets `trophy-check`, `crown-plus`,
    `crown-minus`.
  - Numbers: `number-1` to `number-20`, in the library squircle with the
    calendar digit set.
- 36 Security icons in all four styles, taking the Security category from 22
  to 58 icons.
  - Shields: `shield-alert`, `shield-dots`, `shield-wifi`, `shield-block`,
    `shield-user`, `shield-star`, `bug-shield`.
  - Locks: `lock-dots`, plus the presets `lock-check`, `lock-plus`,
    `lock-minus`, `lock-x`, and `lock-question`.
  - Biometrics: `fingerprint-scan`, `iris-scan`, and the presets
    `fingerprint-check`, `fingerprint-plus`, `fingerprint-minus`, and
    `fingerprint-x`.
  - Identity: `id-card`, `id-badge`, `key-card`, and the preset
    `id-card-check`.
  - Devices: `phone-lock`, `monitor-lock`, `monitor-shield`, `laptop-shield`,
    `usb-lock`.
  - Threats and credentials: `cctv-camera`, `firewall`, `incognito`, `siren`,
    `encryption`, `password-manager`, `key-skeleton`, `signature`.
  The ten presets reuse the shared modifier badges, bringing the catalog to
  119 presets.

- 39 Navigation icons in all four styles, bringing the library to 1,319 icons
  and 5,276 SVGs.
  - Arrows: `arrow-up-to-line`, `arrow-down-to-line`, `arrow-left-to-line`,
    `arrow-right-to-line`, `arrows-diagonal`, `arrows-diagonal-reverse`,
    `arrow-uturn-up`, `arrow-uturn-down`, `arrow-wave-right`, `refresh-off`.
  - Chevrons: `chevron-circle-*` and `chevron-square-*` (up, down, left,
    right), `chevrons-collapse-vertical`, `resize-horizontal`,
    `resize-vertical`.
  - Buildings and places: `buildings`, `building-office`, `building-apartment`,
    `hotel`, `school`, `factory`, `warehouse`, `barn`, `water-tower`, `fence`,
    `castle`, `lighthouse`, `bridge`, `stadium`, `monument`, `tent`,
    `ferris-wheel`, `beach-umbrella`. Windows use the calendar-dots square, in
    a slightly larger size.

- `head-profile-man` and `head-profile-woman` in all four styles, bringing the
  library to 1,280 icons and 5,120 SVGs. Both use the new `head-profile` head.
  The man has short hair: a hairline from the forehead to the temple with a small
  sideburn, passing above the ear. The woman has long hair to the shoulder that
  stops above the neck base, with a hairline framing the face; the hair covers
  the ear.
- Ten icons in all four styles, bringing the library to 1,278 icons and 5,112
  SVGs:
  - `hourglass-start`, `hourglass-half`, `hourglass-end`, `hourglass-horizontal`,
    and `hourglass-horizontal-sand`: sand states with rounded sand inset from the glass.
  - `temperature-celsius`, `temperature-fahrenheit`, and their `-square`
    versions, sharing one °C/°F glyph; the badges use the library `squircle`.
  - `tornado`: a storm seen from the ground, with curved bands.
- `clock-check` and `clock-plus` are now named presets (`clock` + Check / Add,
  bottom-left so both hands stay whole), bringing the catalog to 109 presets.

- Sixteen calendar icons in all four styles, bringing the library to 1,268
  icons and 5,072 SVGs:
  - `calendar-month-5`, `-25`, `-28`, `-29`, and `-30`, sharing one fixed-size
    digit set with `calendar-month-1`, `-7`, and `-31`.
  - `calendar-3-day`, `calendar-agenda`, `calendar-copy` (alias
    `calendar-multiple`), `calendar-dots-rtl`, and `calendar-event`.
  - `calendar-reply`, `calendar-note`, `calendar-record`, `calendar-link`,
    `calendar-person`, and `calendar-phone` as calendar + modifier presets.
- Five modifiers: `reply`, `note`, `record`, `link`, and `phone`, in all four
  corners, in both the colour and monochrome Figma wrappers.
- Search tags for every icon: 3–8 lowercase synonyms, alternate names, glyph
  names, and common uses each (for example `chevron-down`: caret, angle
  bracket, expand, dropdown), 7,966 in all. Tags that only repeated the icon's
  name, its category, or a broad group such as "lifestyle" were removed.
  `tests/test_search_tags.py` keeps new tags to these rules.
- Eighteen icons in all four styles, bringing the library to 1,252 icons and
  5,008 SVGs:
  - `dataflow-vertical`, `fuel-pump`, and `pause`.
  - `image-4k`, `image-4k-sparkles`, and `image-hd`.
  - Franc, lira, won, and yuan currency symbols and their circle variants.
  - `music-clef-treble`, `music-note-half`, `music-note-single`, and `music-sharp`.
- Expanded reusable modifier assets and style-safe compositions, with 92 named
  presets and preserved source metadata.
- Added the first-party Fos Icons mark to a separate Figma Brands page in
  Regular and Filled only; it is not part of the four-style core exports.
- `brand-assets/`: 32 third-party marks (28 social, plus Google Chrome and
  Microsoft Edge, Teams, and Windows) with a manifest of owners, sources, and
  SHA-256 digests. They sit outside `icons/` and the MIT core; see `BRANDS.md`.

### Changed

- Redrew 18 existing icons in four styles, including block arrows, batteries,
  gaming pad, mobile phone, tablet, hard drive, graduation hat, and calculator.
  The battery artwork uses the latest small-bar revision.

- Rounder bookmarks: `bookmark`, `bookmark-add`, `bookmark-check`,
  `bookmark-minus`, `bookmark-x`, and `bookmarks` have rounded corners and a
  softened notch instead of the folded corner and sharp points.
- A softer heart (fuller lobes, a rounded tip) in `heart`, `hearts`,
  `heart-circle`, `heart-square`, `heart-hexagon`, `heart-octagon`,
  `heart-hand`, `heart-pulse`, `heart-medical`, `check-heart`,
  `activity-heart`, `annotation-heart`, `calendar-heart`, `file-heart`, and
  `message-heart-*`.
- Redrawn: the `alert-*` exclamation is now a tapered stem, thicker at the
  top; `id-badge` is wider and uses the `user` figure; `cursor` (rounded corners); `magnet` (a horseshoe with pole
  bands); `log-in-circle` and `log-out-circle` (the squircle is pulled in so it
  clears the arrowhead, with shorter arrows); and the knobs in
  `settings-sliders`, `sliders-square`, and `sliders-vertical`, which are now
  squircles.
- Chevrons (`chevron-*`, `chevrons-*`, `chevron-selector-*`) are now straight
  lines with a rounded corner instead of curves. The single chevrons are more
  compact (13 × 6.5).
- `building` has larger windows: a 3 × 3 grid of rounded squares in place of
  dashes.
- Redrew `head-profile`. The nose tip, chin and jaw are rounded, and the jaw
  curves back into the neck. The neck ends in the same curved base as the `user`
  body. The ear is a rounder curl with a lobe, with its rim at the back of the
  head. Filled is now the full silhouette (the outer edge of the Regular stroke)
  with the ear cut out. The nose now stays inside the portrait keyline.
- Redrew the person figure across every icon that uses it. The body has fuller
  shoulders and a base that curves like the bottom of the `user-circle`
  squircle, with the same 0.86 handle ratio, in place of the flat base and
  sharp corners. Width, head, and lowest point are unchanged. This covers
  `user`, `users`, `user-square`, `user-circle`, `user-focus`, and `home-user`;
  the 20 `user-*` and `users-*` modifier icons; and, through the `user`
  modifier glyph and its 1.25px clearance contour, `home-profile`,
  `image-user`, its eight variants, `calendar-person`, and `settings-user`.
- The second person's head in `users` and the `users-*` icons now has the same
  radius as the front head (2.5px; 3.05px outer in Filled) and sits at the
  same height. Before, it was a taller 5.8px arc.
- Filled `user-square` and `user-circle` now cut out the body as well as the
  head.
- `user-badge` now uses the same closed person body, slightly narrower
  (7.3–16.7), in place of the open shoulder arc. The badge outline stops
  earlier to keep a 1.25px gap around the body. Duotone tints the body and
  Duocolor draws it in the secondary colour. Filled has a solid badge with
  the head cut out and the body set in a 1.25px gap.
- Redrew the weather family on one shared cloud fitted to the landscape keyline,
  with an inner mark. Every `cloud-*` icon uses the same cloud and opens its
  stroke around the sun, moon, rain, snow, hail, lightning, fog, wind, rainbow,
  or slash with a 1.25px clearance; Filled cuts the elements out of a solid
  cloud. The sun's rays now clear the disc, and the lightning bolt is
  point-symmetric.
- Redrew `wind`, `snowflake`, `umbrella`, the `thermometer` family (mercury
  level now reads empty, half, and high), and `hourglass` (round bulbs with pill
  caps).
- Redrew the alarm family on one squircle body with ears parallel to its
  corners and feet, and `clock-refresh`, `history`, `clock-forward`, and
  `rewind-clock` with an opening, a full arrowhead on the straight edge, and
  hands that point away from the arrow. Their Filled versions use a solid face
  inset from the arrow line.
- `droplets` and `hurricane` are unchanged.
- Redrew the calendar family across all four styles: a straight-sided rounded
  body in place of the egg-shaped squircle, shorter round-capped hooks, and
  rounded-square dots in `calendar-dots`. Icons with a symbol inside (star,
  home, heart, clock, settings, minus) drop the divider and centre a larger
  symbol; their Filled cut-outs are traced from Regular. `calendar-settings`
  has a new six-tooth cog.
- Fitted the calendar family to the 24px keyline grid: Filled calendar bodies
  end at 21.94 instead of 22, and `calendar-3-day` and `calendar-agenda` sit on
  the 17.9px square keyline.
- `calendar-add`, `-remove`, `-check`, `-download`, `-upload`, `-lock`,
  `-alert`, `-disabled`, and `-sparkles` are now calendar + modifier presets
  with a bottom-right badge, bringing the catalog to 107 named presets.
- `mail-sparkles` and `message-sparkles` use the monochrome sparkle in Regular
  and Filled in Figma, matching their SVGs.

- Redrew `thermometer`, `thermometer-cold`, `thermometer-warm`, and
  `tool-crossed` across all four styles.
- Curved battery-family terminals to follow their casings and rounded the
  receipt family's upper corners and torn edges across all four styles.
- Redrew `podcast` with balanced broadcast arcs, `coins-hand` with a cupped
  palm and two coins, and `chart-pie` with matching circular sectors.
- Moved the five existing third-party brand sets and their catalog instances,
  including Figma and Framer, to the Brands page with an ownership disclaimer.
- Matched the Brands catalog to the main Regular catalog's header, margins,
  category spacing, and compact 24px icon grid.
- Reduced the `layers-offset` foreground panel's corner radius across all four
  styles, preserving the two offset lines.
- Redrew `torso` with curved shoulders, a tapered waist, and separated chest
  details; rebuilt `wheelchair` with a connected seated figure and rounded
  footrest; replaced `spine`'s pill-like shapes with articulated vertebrae and
  a tapered lower end, optically balancing Filled vertebral weight.
- Rebuilt `test-tube` with straight parallel walls, a rounded bottom, a distinct
  rim, graduation marks, and a horizontal liquid level.
- Redrew `hot-dog` with separate bun lobes and flowing mustard, `tea` with curved
  steam and a hanging tea tag, and `noodles` with wavy strands.
- Slimmed `bandage` with a central dressing pad and ventilation holes; rebuilt
  `arm` as a recognizable flexed arm with fist, wrist, and bicep details.
- Redrew `cake` with connected candles, flame details, rounded corners, and
  scalloped icing; Filled uses a transparent icing cutout.
- Rebuilt `arrows-triangle` as three evenly rotated arrows with consistent turns,
  arrowheads, spacing, and softer main bends.
- Matched exposed L-shaped bends to surrounding corner radii across offset
  stacks, document folds, crop/focus marks, chart axes, and related artwork,
  retaining rounded line caps and style-safe modifier colors.
- Rounded `navigation-pointer` and `navigation-pointer-off`, preserving the
  direction, off-state slash, and transparent gaps.
- Rounded play triangles, the image family's hills, and home-family corners,
  preserving structural details and linked modifiers.
- Refined commerce, document, instrument, currency, and music artwork across
  matching styles.

### Fixed

- Duotone `tool-crossed` tints only the wrench and screwdriver handle; the
  extra 2.5px tint strokes on the shaft and crossguard broke the 1.25px
  Duotone stroke rule.
- Connected the image family's rounded hills to both frame borders in all four
  styles, including transparent Filled cutouts and the lower-left silhouette.
- Removed the opaque fill from `head-profile` Duocolor and made the ear its
  secondary-color accent, preserving the original profile geometry.
- Restored Filled details and transparent negative space.
- Preserved solid AI sparkle accents, themed modifier clearances, and modifier
  controls when changing a host icon's Style.
- Corrected `scissors-dashed` stroke scaling across Figma's 16px, 24px, and 32px
  stroke modes.

### Tooling

- Added pinned, conservative SVGO optimization for canonical and modifier SVGs.
  Geometry, numeric precision, paints, IDs, viewBoxes, and dimensions are not
  rewritten.
- Added Light, Dark, and custom-color pixel-parity checks at 24px and 48px before
  optimized assets are written, plus idempotence and manifest-hash checks.
- Added optimizer regression tests and CI validation; documented synchronization
  with the separate React package.
