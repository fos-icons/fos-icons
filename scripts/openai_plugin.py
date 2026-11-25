#!/usr/bin/env python3
"""Check the OpenAI plugin package (plugins/openai) and build its upload ZIP.

    python3 scripts/openai_plugin.py           # check, then build plugins/openai/dist/fos-icons-<version>.zip
    python3 scripts/openai_plugin.py --check   # check only
    python3 scripts/openai_plugin.py --test    # build a local test ZIP even without a demo video

Limits follow OpenAI's plugin docs (Package your plugin; Plugin submission
errors) for final directory submission, which are stricter than upload.
Standard library only. Run `npm run sync:plugin` first; the check fails if the
shared skills are out of date.
"""
import json
import os
import re
import struct
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, "plugins", "openai")
SHIP = ["plugin.json", "mcp.json", "skills", "assets"]
CATEGORIES = {
    "Productivity", "Creativity", "Developer Tools", "Business & Operations", "Data & Analytics",
    "Communication", "Education & Research", "Security", "Finance", "Healthcare", "Travel",
    "Entertainment", "Other",
}
LISTING_URLS = ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]


def https(url):
    return isinstance(url, str) and url.startswith("https://") and "@" not in url.split("/")[2]


def one_line(text):
    return isinstance(text, str) and "\n" not in text and "\r" not in text


def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", head[16:24])


def frontmatter(text):
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not match:
        return None, ""
    fields = {}
    for line in match.group(1).splitlines():
        key, _, value = line.partition(":")
        if value:
            fields[key.strip()] = value.strip()
    return fields, match.group(2)


def check(require_demo=True):
    """Return (problems, warnings) for the package."""
    problems, warnings = [], []
    bad = problems.append

    def load(name):
        try:
            with open(os.path.join(PLUGIN, name), encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError) as error:
            bad(f"{name}: {error}")
            return {}

    plugin, mcp = load("plugin.json"), load("mcp.json")
    name = plugin.get("name", "")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,63}", name):
        bad("name: letters, digits, _ and -, starting with a letter or digit, at most 64")
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", plugin.get("version", "")):
        bad("version: must be semver")
    description = plugin.get("description", "")
    if not description or len(description) > 1024:
        bad("description: required, at most 1,024 characters")
    if not plugin.get("author", {}).get("name"):
        bad("author.name: required")
    if len(plugin.get("keywords", [])) > 25:
        bad("keywords: at most 25")

    openai = plugin.get("extensions", {}).get("com.openai", {})
    ui = openai.get("interface", {})
    limits = {"displayName": 30, "shortDescription": 30, "longDescription": 4000, "developerName": 80}
    for field, limit in limits.items():
        value = ui.get(field)
        if not isinstance(value, str) or not value.strip():
            bad(f"interface.{field}: required")
        elif len(value) > limit:
            bad(f"interface.{field}: {len(value)} characters, at most {limit}")
    for field in ("displayName", "shortDescription", "developerName"):
        if not one_line(ui.get(field, "")):
            bad(f"interface.{field}: must be one line")
    if ui.get("category") not in CATEGORIES:
        bad(f"interface.category: one of {sorted(CATEGORIES)}")
    capabilities = ui.get("capabilities")
    if not isinstance(capabilities, list) or len(capabilities) > 20 or any(not c or len(c) > 120 for c in capabilities):
        bad("interface.capabilities: a list of at most 20, each 1 to 120 characters")
    for field in LISTING_URLS:
        url = ui.get(field)
        if not https(url) or len(url) > 1024:
            bad(f"interface.{field}: required HTTPS URL, at most 1,024 characters")
    prompts = ui.get("defaultPrompt", [])
    prompts = [prompts] if isinstance(prompts, str) else prompts
    if len(prompts) > 3 or len(set(prompts)) != len(prompts):
        bad("interface.defaultPrompt: at most 3, all different")
    for prompt in prompts:
        if not one_line(prompt) or not prompt or len(prompt) > 128 or "@" in prompt:
            bad(f"interface.defaultPrompt: one line, 1 to 128 characters, no @mentions: {prompt!r}")
    for field in ("composerIcon", "logo", "composerIconDark", "logoDark"):
        rel = ui.get(field)
        if rel is None:
            if field in ("composerIcon", "logo"):
                bad(f"interface.{field}: required")
            continue
        path = os.path.join(PLUGIN, rel[2:]) if isinstance(rel, str) and rel.startswith("./") else None
        if not path or not os.path.isfile(path):
            bad(f"interface.{field}: {rel!r} must be a ./ path to a file in the package")
            continue
        size = png_size(path)
        if not size:
            bad(f"interface.{field}: {rel} must be a PNG")
        elif size[0] != size[1] or not 48 <= size[0] <= 4096:
            bad(f"interface.{field}: {rel} is {size[0]}x{size[1]}; must be square, 48 to 4,096 px")
        if os.path.getsize(path) > 5 * 1024 * 1024:
            bad(f"interface.{field}: {rel} is over 5 MiB")

    onboarding = openai.get("onboardingSkill", "")
    if not onboarding.startswith("./") or not os.path.isfile(os.path.join(PLUGIN, onboarding[2:])):
        bad("onboardingSkill: must point at a SKILL.md in the package")

    review = openai.get("review", {})
    cases = review.get("test_cases", {})
    positive, negative = cases.get("positive", []), cases.get("negative", [])
    if len(positive) < 5:
        bad("review.test_cases.positive: at least 5")
    for case in positive:
        missing = [k for k in ("description", "prompt", "tools_triggered", "expected_behavior") if not case.get(k)]
        if missing:
            bad(f"review positive case {case.get('description')!r}: missing {missing}")
    if len(negative) < 3:
        bad("review.test_cases.negative: at least 3")
    for case in negative:
        if not case.get("description") or not case.get("prompt"):
            bad("review negative case: needs description and prompt")
    if not https(review.get("demo_recording_url")):
        (problems if require_demo else warnings).append(
            "review.demo_recording_url: a reviewer-accessible HTTPS video is required to submit")
    if "test_credentials" in review or "reviewer_instructions" in review:
        bad("review: credentials and reviewer instructions go in the dashboard, not the ZIP")
    if not openai.get("publication", {}).get("release_notes"):
        bad("publication.release_notes: required")

    servers = mcp.get("mcpServers", {})
    if len(servers) != 1:
        bad("mcp.json: exactly one MCP server")
    for server_name, server in servers.items():
        if server.get("type") != "streamable-http" or not https(server.get("url")):
            bad(f"mcp.json {server_name}: type streamable-http with an HTTPS url")
        if server.get("headers"):
            bad(f"mcp.json {server_name}: no headers in a public submission")

    skills_dir = os.path.join(PLUGIN, "skills")
    for skill in sorted(os.listdir(skills_dir)):
        path = os.path.join(skills_dir, skill)
        if skill.startswith(".") or not os.path.isdir(path):
            bad(f"skills/{skill}: skills must be visible folders")
            continue
        try:
            with open(os.path.join(path, "SKILL.md"), encoding="utf-8") as f:
                fields, body = frontmatter(f.read())
        except OSError:
            bad(f"skills/{skill}: missing SKILL.md")
            continue
        if not fields or fields.get("name") != skill:
            bad(f"skills/{skill}: frontmatter name must match the folder")
        if not fields or not fields.get("description") or len(fields["description"]) > 1024:
            bad(f"skills/{skill}: description required, at most 1,024 characters")
        if not body.strip():
            bad(f"skills/{skill}: body is empty")
        if len(f"{name}:{skill}") > 64:
            bad(f"skills/{skill}: {name}:{skill} is over 64 characters")

    sync = subprocess.run(["node", os.path.join(ROOT, "scripts", "sync-plugin-skills.mjs"), "--check"],
                          capture_output=True, text=True)
    if sync.returncode:
        bad(sync.stderr.strip())
    return problems, warnings


def build(version, test):
    dist = os.path.join(PLUGIN, "dist")
    os.makedirs(dist, exist_ok=True)
    target = os.path.join(dist, f"fos-icons-{version}{'-test' if test else ''}.zip")
    entries = []
    for item in SHIP:
        path = os.path.join(PLUGIN, item)
        if os.path.isfile(path):
            entries.append(item)
        for folder, dirs, names in os.walk(path):
            dirs[:] = sorted(d for d in dirs if not d.startswith("."))
            for file_name in sorted(names):
                if not file_name.startswith("."):
                    entries.append(os.path.relpath(os.path.join(folder, file_name), PLUGIN))
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for entry in entries:
            info = zipfile.ZipInfo(entry.replace(os.sep, "/"), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            with open(os.path.join(PLUGIN, entry), "rb") as f:
                archive.writestr(info, f.read())
    return target, len(entries)


def main():
    test, check_only = "--test" in sys.argv, "--check" in sys.argv
    problems, warnings = check(require_demo=not (test or check_only))
    for warning in warnings:
        print(f"warning: {warning}")
    if problems:
        print("\n".join(f"error: {p}" for p in problems))
        sys.exit(1)
    print("plugins/openai passes the checks")
    if not check_only:
        with open(os.path.join(PLUGIN, "plugin.json"), encoding="utf-8") as f:
            version = json.load(f)["version"]
        target, count = build(version, test)
        print(f"Built {os.path.relpath(target, ROOT)} ({count} files){' — local test build, do not upload' if test else ''}")


if __name__ == "__main__":
    main()
