---
name: fos-icons-migrate
description: Switch a project's icons from lucide (lucide-react, lucide-vue-next, lucide-svelte, lucide-angular), heroicons (@heroicons/react, @heroicons/vue), or react-icons (lu, hi, hi2 sets) to Fos Icons. Use only when the user asks to migrate, replace, or switch icon libraries to Fos Icons. Maps names with verified lookup tables, confirms the rest through the Fos Icons tools, and reports every icon it couldn't match.
---

# Migrate to Fos Icons

Use the `fos-icons` skill's rules throughout: never guess a name, never draw SVG.

Only start when the user asked to switch. A migration touches many files; tell
the user the scope (how many files and icons) before editing, and do it on a
branch if the project uses git.

## 1. Inventory

Find every import from the old library. Search the source (not
`node_modules`) for:

| Library | Import patterns |
| --- | --- |
| lucide | `lucide-react`, `lucide-vue-next`, `lucide-svelte`, `@lucide/svelte`, `lucide-angular`, `lucide-solid` |
| heroicons | `@heroicons/react/24/outline`, `…/24/solid`, `…/20/solid`, `…/16/solid`, `@heroicons/vue/…` |
| react-icons | `react-icons/lu` (lucide), `react-icons/hi2` and `react-icons/hi` (heroicons) |

List each distinct icon once, with the files that use it. Icons from any other
library or react-icons set: leave them, and list them in the report.

## 2. Map names

Look each icon up in this skill's maps, by the old library's kebab-case name:

- [maps/lucide.json](maps/lucide.json): lucide and `react-icons/lu`
- [maps/heroicons.json](maps/heroicons.json): heroicons v2 and `react-icons/hi2`

`react-icons/hi` is heroicons v1, whose names aren't in the map. Run
`check_icon_names` on them first (many, like `x`, `menu` and `trash`, are Fos
names too), then search for the rest.

Code uses component names. Convert them to the key first, or search the map
for the `component` field:

- lucide: `Trash2`, `Trash2Icon`, `LucideTrash2`, `LuTrash2` → `trash-2`
- heroicons: `TrashIcon` → `trash`; react-icons/hi2 `HiOutlineTrash`, `HiTrash`, `HiMiniTrash` → `trash`

Each entry has a `match` level. Treat it as follows:

| `match` | Meaning | What to do |
| --- | --- | --- |
| `exact`, `alias` | Same icon, same or listed name | Use it. |
| `curated`, `reordered` | Same concept, different name (`x-mark` → `x`, `circle-check` → `check-circle`) | Use it. |
| `normalized` | The old name was a design variant (`trash-2` → `trash`) | Use it, and list it in the report. |
| `suggested` | A search guess | **Confirm with `search_icons`** using what the icon means where it's used, and pick the best result. List it in the report. |
| not in `map` (in `unmapped`, or missing) | No candidate | `search_icons` by meaning. If nothing fits, **keep the old import for that icon** and list it in the report. |

Do all the `search_icons` lookups in one call, with every query in the array.
Then run `check_icon_names` on the full list of new component names before you
edit any file.

## 3. Map styles and props

| Old | Fos Icons |
| --- | --- |
| lucide (all), heroicons `24/outline` | `Regular` suffix |
| heroicons `24/solid`, `20/solid`, `16/solid` | `Filled` suffix |
| `size={n}` (lucide) | `size={n}` |
| heroicons `20/solid` / `16/solid` | add `size={20}` / `size={16}` unless CSS sizes it |
| `className` / `class` (incl. Tailwind `h-5 w-5`) | keep as is |
| `color` | `color` |
| `strokeWidth`, `absoluteStrokeWidth` (lucide) | drop. Fos icons are drawn at their own stroke. List the files in the report. |
| `aria-hidden`, `aria-label`, `title` | keep (Fos icons are already `aria-hidden` by default) |

Component names: `<icon-name in PascalCase><Style>`, e.g. `TrashRegular`.
`get_icon_code` for one icon shows the exact import line for the framework.

## 4. Edit, install, verify

1. Install the package. `get_framework_setup` gives the command; only React
   and Vue are on npm. For other frameworks, ask the user before installing
   from a local build.
2. Rewrite imports and usages file by file. Keep one import statement per file
   from `@fos-icons/<framework>`.
3. Run the project's typecheck, lint and tests. A missing export means a wrong
   name: fix it with `check_icon_names`, never by guessing.
4. Remove the old package only when no imports of it remain (kept icons,
   other sets).

## 5. Report

End with a short report:

- How many icons and files changed.
- A table of every `normalized` and `suggested` mapping, and every icon you
  chose by search: old name → new name, and where it's used. The user should
  look at these on screen.
- Icons kept on the old library, and why.
- Dropped props (`strokeWidth`) and the files they were in.
- Whether the old package was removed.
