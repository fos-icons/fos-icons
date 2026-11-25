---
name: fos-icons-animate
description: Add an animated Fos icon to UI code, or animate any Fos icon with a motion (draw, spin, swing, pulse, fade, travel, nudge, twinkle, blink, flicker, or custom keyframes). Use when the user wants an animated, looping, loading, hover, or attention icon and the project uses Fos Icons. Gets the SVG from the Fos Icons MCP tools; never writes animation CSS or paths by hand.
---

# Animate Fos Icons

Animated Fos icons are Regular icons with a small `<style>` block inside the
SVG. They inherit `currentColor`, work inline or through `<img>`, and stop
animating when the user prefers reduced motion. Their still frame is the
normal icon.

## Get the SVG

1. **Use a curated animation if there is one.** Call `list_animated_icons`.
   If the icon is listed, call `get_animated_icon` with its name.
2. **Otherwise, build one with `animate_icon`.** Pass the icon name and one or
   more motions (see below). First call it with `"motions": []` to get the
   icon's numbered parts, then choose which parts move.
3. Confirm the icon name with `search_icons` or `check_icon_names` first, as
   the `fos-icons` skill requires.

Never edit the returned paths or rename the `fa-<name>-…` classes. They are
scoped to the icon, so many icons can share one page.

## Use it

- **Inline SVG** (React `dangerouslySetInnerHTML`, Vue `v-html`, a Svelte
  `{@html}`, or a plain `.svg` component import): the animation plays and the
  icon takes the text color.
- **`<img src="…svg">` or a CSS background:** the animation still plays, but
  the color is fixed (black) because `currentColor` can't reach inside.
- **Play on hover only:** stop it until hover with
  `.icon:not(:hover) svg * { animation: none !important }`. The rest pose is
  the normal icon, so nothing jumps.
- Give it an accessible name (or `aria-hidden="true"` when decorative), as for
  any icon. Don't use motion as the only signal of state.

## Motions

Parts are the icon's paths in source order. With `"split": true`, each
subpath counts as its own part. Origins are `[x, y]` on the 24px grid.

Shaping the parts:

- `"cuts": {"1": 3}` splits part 1 before its 4th command (index 3), so one
  stroke can move as two, like a clock's hands. The drawing doesn't change.
- `"source": "battery-full"` animates another icon's artwork under this
  name, for example to fill a battery from empty to five bars.
- `"add": [{"icon": "hourglass-end", "parts": [4]}]` appends parts from another
  icon, such as the bottom sand of an hourglass. Hide added parts at rest
  with a `keyframes` motion's `base`.
Every motion takes `parts`, `dur` (seconds), `delay`, and `ease`
(`"linear"` or any CSS easing).

| type | What it does | Options |
| --- | --- | --- |
| `draw` | Strokes draw in, one part after another | `span` (share of the cycle, 0.5), `reverse` (parts drawn from the end) |
| `reveal` | Parts appear one after another (none, then all) and hold | `span` (0.6) |
| `spin` | Rotates, then rests | `deg` (360), `hold` (share of cycle at rest), `steps`, `origin` |
| `pulse` | Heartbeat scale | `scale` (1.14), `origin` |
| `swing` | Decaying rotation, like a ringing bell | `deg` (14), `origin` |
| `nudge` | Moves out and back | `x`, `y` |
| `travel` | Leaves along x/y, re-enters from the other side | `x`, `y` |
| `fade` | A wave of dimming across parts, in order | `stagger` (0.15), `min` (0.2) |
| `twinkle` | Each part shrinks and returns, staggered | `origins`, `scale` (0.5), `stagger` |
| `blink` | Squashes vertically and back | `origin` |
| `flicker` | Flashes opacity | none |
| `keyframes` | Your own frames; the rest pose is implied at 0% and 100% | `frames` (`{"50%": "transform:scale(.8)"}`), `base` (resting style), `origin`, `stagger` |

Frames may only set `transform`, `opacity` and `stroke-dashoffset`.

Example: a bell that rings, with the clapper a little behind.

```json
{ "name": "bell", "split": true, "motions": [
  { "type": "swing", "parts": [1], "origin": [12, 3.5], "dur": 2 },
  { "type": "swing", "parts": [0], "origin": [12, 3.5], "dur": 2, "delay": 0.08 }
] }
```

Keep motion small and short: under 3s per loop (a slow secondary part, like
an hour hand, can take longer), and movement under 3px
or 15°. For a rotation to loop without a jump, pick a `deg` that maps the
shape onto itself: 90 for a plus sign, 72 for a star, 45 for sun rays.
