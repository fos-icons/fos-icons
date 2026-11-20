"""Build and check the Fos Icons Flutter web release benchmark."""

import gzip
import os
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zlib


HERE = Path(__file__).resolve().parent
ICONS = HERE.parents[2] / "icons"
GENERATED_GLYPHS = HERE.parent / "lib" / "src" / "glyphs.g.dart"
SVG_ROOT = b'<svg xmlns="http://www.w3.org/2000/svg"'
VARIANTS = (("baseline", 0), ("one", 1), ("all", 6))
GLYPHS = (
    "regular/binoculars",
    "filled/binoculars",
    "duocolor/telescope",
    "duotone/telescope",
    "regular/credit-card-down",
    "duocolor/calendar-check",
)


def icon_count_flag(count):
    return f"--dart-define=FOS_BENCHMARK_ICON_COUNT={count}"


def path_markers():
    paths_by_glyph = {}
    for glyph in GLYPHS:
        root = ET.parse(ICONS / f"{glyph}.svg")
        paths_by_glyph[glyph] = {
            path.attrib["d"] for path in root.iter("{http://www.w3.org/2000/svg}path")
        }

    markers = {}
    for glyph, paths in paths_by_glyph.items():
        other_paths = set().union(*(p for name, p in paths_by_glyph.items() if name != glyph))
        unique_paths = [p for p in paths if not any(p in other for other in other_paths)]
        if not unique_paths:
            raise SystemExit(f"No distinguishing canonical SVG path for {glyph}")
        markers[glyph] = max(unique_paths, key=lambda path: (len(path), path)).encode()
    return markers


def main():
    markers = path_markers()
    catalog = GENERATED_GLYPHS.read_bytes()
    catalog_size = catalog.count(b" = FosGlyph._(")
    if not catalog_size or catalog.count(SVG_ROOT) != catalog_size:
        raise SystemExit("Expected one namespaced SVG root per generated catalog glyph")

    flutter = os.environ.get("FLUTTER", "flutter")
    subprocess.run([flutter, "--version"], cwd=HERE, check=True)
    subprocess.run([flutter, "pub", "get", "--enforce-lockfile"], cwd=HERE, check=True)

    results = []
    failures = []
    for variant, count in VARIANTS:
        output = f"build/benchmark/{variant}"
        subprocess.run(
            [
                flutter,
                "build",
                "web",
                "--release",
                "--no-pub",
                "--no-wasm-dry-run",
                icon_count_flag(count),
                f"--output={output}",
            ],
            cwd=HERE,
            check=True,
        )
        js = (HERE / output / "main.dart.js").read_bytes()
        present = [glyph for glyph, marker in markers.items() if marker in js]
        expected = list(GLYPHS[:count])
        if present != expected:
            failures.append(f"{variant}: expected {expected}, found {present}")
        payload_count = js.count(SVG_ROOT)
        if payload_count != count:
            failures.append(f"{variant}: expected {count} SVG payloads, found {payload_count}")
        results.append(
            (variant, len(js), len(gzip.compress(js, compresslevel=9, mtime=0)), present)
        )

    _, raw_base, gzip_base, _ = results[0]
    print(f"\nmain.dart.js bytes (gzip level 9, zlib {zlib.ZLIB_RUNTIME_VERSION})")
    print("variant   raw bytes  gzip bytes    raw delta   gzip delta  glyph markers found")
    for variant, raw, gz, present in results:
        print(
            f"{variant:<9} {raw:>9} {gz:>11} {raw - raw_base:>+12}"
            f" {gz - gzip_base:>+12}  {', '.join(present) or '(none)'}"
        )
    if failures:
        raise SystemExit("Tree-shaking check failed:\n" + "\n".join(failures))
    print(f"Tree-shaking check passed: selected payloads only ({catalog_size} catalog glyphs).")


if __name__ == "__main__":
    main()
