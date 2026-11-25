# Icon Style Principles

Use this guide when designing or reviewing Fos Icons. Apply it across
Regular, Filled, Duocolor, and Duotone so each icon stays recognizable and
consistent with the library. The shared baseline is a 24 × 24 grid with
a 1.25 px default stroke for line styles at 24 px.

## Visual character

- Keep the icons recognizable and visually coherent as one family.
- Favor a friendly, softly rounded character. Use restrained corner rounding
  and squircle-like forms where the shape calls for them; avoid both sharp,
  mechanical corners and excessive rounding.
- Keep strokes balanced and not overly heavy. Make stroke weight editable
  through the shared variable rather than adjusting paths independently.

## Grid and geometry

- Fit each icon to the shared 24 × 24 grid and align it to the Figma pixel grid.
  Respect the intended inset and padding; optically adjust individual shapes
  when needed without making the icon feel merely scaled up or down.
- Design for clarity at the actual UI size. Check the finished icon in its grid,
  not only enlarged.
- Use outside references to understand a metaphor, then adapt custom icons to
  Fos's visual language rather than copying an unrelated style.

## Stroke and detail quality

- Keep internal strokes contained within their enclosing shapes unless an
  intentional detail calls for an extension.
- Avoid accidental overlaps, protruding strokes, and misaligned joins.
  Internal lines should sit cleanly against the outer form and remain balanced.
- Use symmetry when it supports the symbol; don't force mechanical symmetry
  onto forms that should look natural.
- Keep related geometry consistent across Regular and Filled interpretations.

## Style variants

- Make Filled a deliberate, legible filled interpretation—not simply a heavier
  outline. Preserve meaningful counters and open negative space. If a symbol
  does not naturally support a filled form, use a considered alternative rather
  than forcing a solid silhouette.
- Keep Duocolor and Duotone variants coherent with their base icon. Use color
  for meaningful details; do not split a continuous outline just to introduce
  a second color.
- Keep color and stroke controls editable so users can adapt icons without
  manually changing individual paths.

## Animated icons

Animated icons are Regular icons that move. They are generated, never drawn
by hand: add a spec to `metadata/animated.json` in `fos-icons`, then run
`npm run animate`. The motions are documented in
`skills/fos-icons-animate/SKILL.md`. Don't run SVGO on these files.

**The motion tells the icon's story.** Show what the object does in real life,
not a generic wiggle:

- Things that point move where they point: arrows and chevrons nudge in their
  direction. Double chevrons ripple one after the other; selectors spread
  outward; collapse icons move inward.
- Things that fill go from empty to full and hold. A battery adds its bars
  one by one (0 → 5, borrowed from `battery-full`). An hourglass starts with
  the top full and the bottom empty. The top drains quickly toward the neck
  while the bottom fills from the top down. Then the whole glass turns over
  (180°), so the full sand ends on top and the loop starts again seamlessly.
- Things that open, open upward. A trash lid lifts from its right-hand hinge,
  just enough to read: about 9°, never past the icon's edge.
- Parts that move at different rates in real life do so here too. A clock's
  minute hand turns 12× faster than its hour hand (3 s and 36 s).
- Signals and progress reveal in order. Wi-Fi arcs light from the dot outward,
  sound waves fade from the speaker, and checks and crosses draw their strokes
  in writing order.
- Attention icons (bell, alert) swing from their natural pivot, with a decay.
- When a motion "doesn't look right", replace it; don't tune it. A mail flap
  flipping read as broken, so mail hops and wiggles instead.

**Rest pose.** With the animation off (reduced motion, or a grid cell that
isn't hovered), the icon must look like its normal still drawing. Parts that
only exist during the motion, such as the hourglass's bottom sand, are hidden
at rest (`base` in the spec).

**Bounds.** Every frame stays inside the 24 px icon: 2–22 live area,
stroke included. Check the extreme frames, not just the rest pose. In SVG's
y-down space, a positive rotation lifts the left side of a part hinged on
its right.

**Timing.** Loops of 1–3 s, with small moves (under 3 px or 15°) and the
library easing `cubic-bezier(.65,0,.35,1)`. Only a slow secondary part, like
an hour hand, takes longer. Loops restart from the rest pose, or from a
symmetric angle (90° for a plus, 72° for a star, 45° for sun rays), so they
never visibly jump.

**Scope.** Animate the icons people use most (status, loading, actions,
navigation), not the whole library. When one icon in a family is animated,
animate the whole family (every chevron, not just one).

**Code rules** (the generator enforces these):

- Class and keyframe names are prefixed `fa-<name>-`. An inline `<style>`
  applies to the whole page, so a bare `.c` once moved the page's own cards.
- Moving parts are top-level groups with no transformed ancestor, so their
  origins are plain 24px-grid coordinates.
- Every icon stops under `prefers-reduced-motion`.

**Review.** Render frames across the loop, at rest and at about 250, 500 and
800 ms (plus later frames for long loops), with the 24 px boundary drawn.
Check the story, the rest pose, the bounds, and that the loop has no jump.
Hover-test on the site's Animated tab before calling it done.

## Brand marks

- Keep third-party logos authentic and unmodified, separate from the custom core
  icon style. Adapt non-brand reference icons to Fos's style.

## Product and workflow instructions

- Prioritize coverage of real user needs over increasing the icon count.
- Make icons easy to find with predictable names, sensible categories, useful
  previews, and relevant synonyms.
- Keep design and code aligned: preserve canonical names and geometry across
  Figma, SVG exports, and generated packages so handoff does not require
  redrawing or reinterpretation.
- Whenever the grid or icon dimensions change, recheck every icon against the
  updated grid and at its intended UI size.
- Keep icon descriptions concise and focused on the name, meaning, and useful
  synonyms. Avoid drawing-specification boilerplate such as pixel-grid or
  cap-style details.

## Review checklist

- Is the meaning clear at 24 px?
- Does the icon sit cleanly on the grid with its intended inset?
- Are its stroke weight, rounding, and optical balance consistent with the set?
- Are all internal details contained and free of accidental overlaps?
- Do its style variants preserve the same recognizable structure?
- If it's animated: does the motion tell the icon's story, does it rest as the
  still icon, and does every frame stay inside the icon?
