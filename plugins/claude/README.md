# Fos Icons for Claude Code

One install adds the Fos Icons MCP server and both Fos Icons skills, so Claude
picks the library, installs it, and resolves every icon name instead of
guessing or drawing SVG.

```sh
claude plugin marketplace add fos-icons/fos-icons
claude plugin install fos-icons@fos-icons
```

Restart Claude Code, then check that it loaded:

```sh
claude plugin details fos-icons@fos-icons
```

It should list two skills and one MCP server. Run `/mcp` in a session to see
`fos-icons` connected.

## What's included

| Part | What it does |
| --- | --- |
| MCP server `fos-icons` | `https://www.fosicons.com/mcp`: `search_icons`, `get_icon_code`, `check_icon_names`, `list_icons`, `get_framework_setup`. Read-only, no account or API key. |
| Skill `fos-icons` | Loads when a task adds or changes icons: picks the library, searches once for every icon, writes the right import, style, size and accessibility. |
| Skill `fos-icons-migrate` | Loads when you ask to switch from lucide, heroicons or react-icons. |

Claude keeps using another icon library a project already has, unless you ask
it to switch.

## Share it with a project

Add `--scope project` to the install command to record the plugin in the
project's `.claude/settings.json`, so everyone on the project gets it.

## Update or remove

```sh
claude plugin update fos-icons@fos-icons
claude plugin uninstall fos-icons@fos-icons
claude plugin marketplace remove fos-icons
```

## Without the plugin

```sh
claude mcp add --transport http fos-icons https://www.fosicons.com/mcp
```

That adds the tools without the skills.

## Source

The skills in `skills/` here are copies of the canonical ones in the
repository's root [`skills/`](../../skills/) folder, made by
`npm run sync:plugin`. Edit the root copies, then run it; `npm test` fails if
the copies drift.
