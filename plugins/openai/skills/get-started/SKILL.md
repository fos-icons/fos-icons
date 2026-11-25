---
name: get-started
description: Run once after installing the Fos Icons plugin. Checks that the Fos Icons tools respond, finds which framework the current project uses, and shows the user how to ask for icons.
---

# Get started with Fos Icons

Welcome the user in one or two sentences, then:

1. **Check the connection.** Call `search_icons` with `queries: ["home"]` and
   `limit: 1`. If it fails, say the Fos Icons server at
   `https://www.fosicons.com/mcp` isn't reachable right now and stop here.
2. **Look at the project, if there is one.** In Codex, read `package.json` or
   `pubspec.yaml`:
   - `@fos-icons/*` or `fos_icons` already installed: say so.
   - Another icon library (lucide, heroicons, react-icons…): say Fos Icons
     won't replace it unless they ask, and that "switch my icons to Fos Icons"
     starts a migration.
   - A framework with no icon library: offer to set up Fos Icons, using
     `get_framework_setup` for the steps. Don't install anything yet.
   In ChatGPT, with no project, ask which framework they use, if any.
3. **Show three things they can ask**, adapted to what you found, for example:
   - "Find icons for a settings page: profile, notifications, security, sign out"
   - "Add a delete button with a trash icon to this table row"
   - "Is `GearRegular` a real Fos icon? Suggest the right one"

Keep it short. Don't list every tool.
