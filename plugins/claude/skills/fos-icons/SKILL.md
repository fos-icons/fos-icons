---
name: fos-icons
description: Add or change icons in UI code with Fos Icons (React, Vue, Svelte, SolidJS, Angular, Flutter, or plain SVG). Use when a task adds an icon, icon button, or icon-labeled control and the project uses @fos-icons/* or fos_icons, when the user asks for Fos Icons, or when a UI needs icons and the project has no icon library yet. Resolves every icon name through the Fos Icons tools instead of guessing, and never hand-draws SVG.
---

# Fos Icons

Fos Icons is an MIT icon library: about 1,600 icons in four styles (Regular,
Filled, Duocolor, Duotone), drawn on a 24px grid with 1.25px strokes.

## Two rules

1. **Never guess an icon name.** Every name you write must come from
   `search_icons` or pass `check_icon_names`. Names from memory, from another
   library, or already in the code count as guesses until checked.
2. **Never draw or edit SVG paths.** Use the package component, or the SVG
   that `get_icon_code` returns. If no icon fits, say so. Don't draw one.

## Pick the library first

Read `package.json`, or `pubspec.yaml` for Flutter.

- **`@fos-icons/*` or `fos_icons` is already a dependency:** use it. Match how the
  code already imports and sizes icons.
- **Another icon library is in use** (lucide, heroicons, react-icons, Material,
  Font Awesome…): keep using it. Only switch when the user asks; then use the
  `fos-icons-migrate` skill.
- **No icon library:** use Fos Icons. Call `get_framework_setup` and install the
  package for the framework.

Only `@fos-icons/react` and `@fos-icons/vue` are on npm. Svelte, SolidJS and
Angular install from a local build, and Flutter from a path dependency;
`get_framework_setup` gives the exact steps. Tell the user before you install
one of those.

## Workflow

1. **List every icon the task needs** before searching. For a screen, that's
   one entry per control: "close", "search", "settings", "delete", "user avatar".
2. **Search once, for all of them.** Call `search_icons` with every query in
   the `queries` array. Choose from the results by meaning, not by the first
   hit. If a query comes back empty, try a synonym ("trash" for "delete",
   "gear" for "settings") or take one of the suggestions.
3. **Get the code.** Call `get_icon_code` for one icon to get the import and
   props for this framework and style. The rest follow the same pattern:
   component name = icon name in PascalCase + style (`fuel-pump` →
   `FuelPumpRegular`). Flutter: `FosIcons.fuelPumpRegular`.
4. **Check before you finish.** Run `check_icon_names` on every component or
   constant you wrote. Fix any that come back invalid.

## Style

- **Regular** is the default. Keep one style per UI. Use Filled for a selected
  or active state (the selected tab in a tab bar), not at random.
- The website calls Filled "Solid". In code it is always the `Filled` suffix.
- Duocolor and Duotone are for larger, illustrative spots (empty states,
  feature cards), not dense toolbars.
- **Size:** 24 is the default. Use 16 or 20 in dense UI and inline with small
  text. Set `size` once per context instead of sizing every icon differently.
- **Color:** Regular and Filled inherit `currentColor`, so set color on the
  parent (text color) instead of on every icon.

## Accessibility

Icons are decorative (`aria-hidden`) by default.

- Icon next to a text label: leave it decorative.
- Icon-only button: put `aria-label` on the **button**, not on the icon.
- Standalone icon that carries meaning (a status icon with no text): pass
  `title` (`semanticLabel` in Flutter).

## Without the tools

If the Fos Icons MCP tools aren't connected, tell the user it can be added from
`https://www.fosicons.com/mcp`. Meanwhile, confirm names another way, and
still don't guess:

- An installed package lists every export: search
  `node_modules/@fos-icons/react/dist/types/index.d.ts` for the component name.
- The website: `https://www.fosicons.com/icons/<name>` exists only for real
  icons, and `https://www.fosicons.com/llms.txt` describes the library.
