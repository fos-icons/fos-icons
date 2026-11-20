#!/usr/bin/env python3
import argparse
import base64
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

PACKAGE = Path(__file__).resolve().parents[1]
ROOT = PACKAGE.parents[1]


def canonical(case):
    source = (ROOT / "icons" / case["style"] / f'{case["icon"]}.svg').read_text()
    props = ["color:" + case.get("primary", "#000000")]
    for role in ("primary", "secondary", "modifier"):
        if role in case:
            props.append(f'--fos-{role}:{case[role]}')
    # External CSS supplies currentColor for monochrome artwork. Its nested badge
    # can also be themed separately, without changing its cutout path.
    if "modifier" in case and "--fos-modifier" not in source:
        source, count = re.subn(
            r'(<svg\b[^>]*\bx="(?:12\.75|1\.25)"[^>]*\bcolor=)"currentColor"',
            rf'\1"{case["modifier"]}"',
            source,
        )
        if count != 1:
            raise ValueError(f"No unique monochrome badge in {case}")
    # Root `color` may carry the authored multicolor default. Don't override it.
    if 'color="var(--fos-primary' in source.split(">", 1)[0]:
        props.pop(0)
    source = source.replace("<svg ", f'<svg style="{";".join(props)}" ', 1)
    if "stroke" in case:
        source = re.sub(r'stroke-width="[^"]+"', f'stroke-width="{case["stroke"]}"', source)
    return base64.b64encode(source.encode()).decode()


def main():
    parser = argparse.ArgumentParser(description="Compare Flutter pixels with canonical SVGs in Chrome.")
    parser.add_argument("--chrome", default=os.environ.get("CHROME_EXECUTABLE") or shutil.which("chromium")
                        or shutil.which("google-chrome") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    parser.add_argument("--flutter", default="flutter")
    args = parser.parse_args()
    cases = json.loads((PACKAGE / "test/cases.json").read_text())
    with tempfile.TemporaryDirectory(prefix="fos-svg-reference-") as directory:
        directory = Path(directory)
        document = directory / "reference.html"
        image = directory / "canonical.png"
        tiles = "".join(
            f'<img width="96" height="96" src="data:image/svg+xml;base64,{canonical(case)}">'
            for case in cases
        )
        document.write_text(
            '<!doctype html><meta charset="utf-8"><style>'
            'body{margin:0;background:#fff;display:grid;grid-template-columns:repeat(3,96px);'
            'align-content:start}img{display:block}</style>' + tiles
        )
        subprocess.run(
            [args.chrome, "--headless", "--hide-scrollbars", "--disable-background-networking",
             "--force-device-scale-factor=1",
             f"--window-size=420,{96 * ((len(cases) + 2) // 3) + 100}",
             "--force-color-profile=srgb",
             f"--user-data-dir={directory / 'chrome'}", f"--screenshot={image}", document.as_uri()],
            check=True,
        )
        subprocess.run(
            [args.flutter, "test", "--reporter=expanded", f"--dart-define=FOS_REFERENCE={image}",
             "test"],
            cwd=PACKAGE, check=True,
        )


if __name__ == "__main__":
    main()
