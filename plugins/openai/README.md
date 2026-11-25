# Fos Icons for ChatGPT and Codex

The Fos Icons plugin package for OpenAI's plugin directory. It connects ChatGPT
and Codex to the Fos Icons MCP server at `https://www.fosicons.com/mcp` (five
read-only tools, no account) and ships the Fos Icons skills with it.

## What's here

| File | What it is |
| --- | --- |
| `plugin.json` | Package manifest. Listing copy, starter prompts, review test cases and release notes are under `extensions["com.openai"]`. |
| `mcp.json` | The remote MCP server: Streamable HTTP, no auth. |
| `skills/fos-icons/`, `skills/fos-icons-migrate/` | Copies of the root [`skills/`](../../skills/), made by `npm run sync:plugin`. Edit the root copies. |
| `skills/get-started/` | Onboarding skill, run after install. Only in this package. |
| `assets/` | Composer icon and logo (512 px PNG). |

The package has no screenshots and no UI templates: the server returns text and
structured data only.

## Install in Codex without the directory

```sh
codex plugin marketplace add fos-icons/fos-icons
codex plugin add fos-icons@fos-icons
```

The marketplace is [`.agents/plugins/marketplace.json`](../../.agents/plugins/marketplace.json).

## Check and build

```sh
npm run sync:plugin
python3 scripts/openai_plugin.py --check   # checks only
python3 scripts/openai_plugin.py --test    # local test ZIP; never upload it
python3 scripts/openai_plugin.py           # checks, then builds dist/fos-icons-<version>.zip
```

The script checks the limits for final directory submission (display name and
subtitle 30 characters, at most 3 starter prompts of 128 characters, HTTPS
listing URLs, square icons, 5 positive and 3 negative test cases, skill
frontmatter). The real build refuses to run until `review.demo_recording_url`
is set.

## Submitting

Before the first submission:

1. **The server is live.** `https://www.fosicons.com/mcp` answers (the MCP
   server and the Terms section must be deployed on fosicons.com).
2. **Organization verification.** In the OpenAI Platform, verify the
   organization (individual or business) under the name it will publish as.
   The listing's developer name comes from that identity.
3. **Demo video.** Record a short video of the plugin working in ChatGPT
   (search, get code, a name check), upload it somewhere reviewers can open,
   and set `review.demo_recording_url` in `plugin.json`.

Then:

1. Build the ZIP: `python3 scripts/openai_plugin.py`.
2. In the OpenAI Platform, open **Plugins → Upload new or existing plugin**,
   choose the verified developer identity, and upload the ZIP. Fix anything
   **Metadata & Skills** reports; skill scans can take up to 2 hours.
3. Under **MCPs**, connect the server. For domain verification, copy the token
   the portal shows into the `OPENAI_APPS_CHALLENGE` environment variable for
   Production in the fosicons.com Vercel project, redeploy, then click Verify
   (it's served at `/.well-known/openai-apps-challenge`). Then **Scan Tools**.
4. Add the annotation justifications below for each tool, check the test
   cases, and submit for review. After approval, **Publish plugin**.

### Annotation justifications

Every tool has the same values. Paste these for each one:

- **readOnlyHint: true.** The tool only looks up icon names, metadata and code
  snippets from the public Fos Icons catalog. It writes nothing, stores
  nothing, and changes no state in ChatGPT, Codex, or the user's accounts.
- **destructiveHint: false.** It cannot delete, overwrite, or change anything,
  in any mode.
- **openWorldHint: false.** It reads only the bounded Fos Icons catalog that
  ships with the server. It doesn't browse the web or reach other services.

## Updating

- Tool or server changes on fosicons.com are picked up by OpenAI's daily
  rescan. Keep tool schemas compatible.
- Listing text, skills or assets need a `version` bump in `plugin.json`, a new
  ZIP, and another review.
- The MCP URL can't change after publishing without contacting OpenAI.
