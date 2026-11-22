"""Split a Figma optical-size export sheet into per-size SVGs.

The sheet is a frame of cloned Size=N variants: one row per icon, one column
per style (Regular, Filled, Duocolor, Duotone), on a pitch of N + 32 px.
Duo paints are swapped to the sentinel colors before export. Figma's SVG
export drops layer IDs, so each top-level element is assigned to the cell
that holds its first coordinate.
"""

import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from import_figma import SVG, extract_icon
from sizes import OPTICAL_SIZES, SIZE_PATH, SIZES, STROKES, icon_path

ROOT = Path(__file__).resolve().parents[1]
STYLES = ("regular", "filled", "duocolor", "duotone")
PAINT_ROLES = {"primary": "#123456", "secondary": "#654321"}
NUMBER = re.compile(r"-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?")


def first_point(element):
    for node in element.iter():
        if node.get("d"):
            x, y = NUMBER.findall(node.get("d"))[:2]
            return float(x), float(y)
        for a, b in (("cx", "cy"), ("x", "y"), ("x1", "y1")):
            if node.get(a) is not None:
                return float(node.get(a)), float(node.get(b) or 0)
    raise ValueError("Element without coordinates")


def mask_type_attribute(svg):
    """Figma writes style="mask-type:…"; the library allows no style attributes."""
    return re.sub(r'style="mask-type:\s*(alpha|luminance);?"', r'mask-type="\1"', svg)


def register_sizes(root=ROOT):
    """Record every optical size in the manifest (digests of the files on disk).

    Presets are skipped: build_presets.py composes and records their sizes.
    """
    root = Path(root)
    path = root / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    presets = {
        row["name"] for row in json.loads(
            (root / "metadata/presets.json").read_text(encoding="utf-8"),
        )["presets"]
    }
    manifest["sizes"] = list(SIZES)
    manifest["sizePath"] = SIZE_PATH
    manifest["strokeWidths"] = {str(size): STROKES[size] for size in SIZES}
    for row in manifest["icons"]:
        if row["name"] in presets:
            continue
        row["sizes"] = {
            str(size): {
                style: hashlib.sha256(
                    (root / icon_path(row["name"], style, size)).read_bytes(),
                ).hexdigest()
                for style in manifest["styles"]
            }
            for size in OPTICAL_SIZES
        }
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return manifest


def split_sheet(text, size, names, root=ROOT, styles=STYLES):
    if size not in OPTICAL_SIZES:
        raise ValueError(f"Unsupported optical size: {size}")
    pitch = size + 32
    sheet = ET.fromstring(text)
    cells = {}
    for element in list(sheet):
        if element.tag == f"{{{SVG}}}defs":
            continue
        x, y = first_point(element)
        match = re.search(r"translate\(([-\d.]+)[ ,]+([-\d.]+)", element.get("transform") or "")
        if match:
            x, y = x + float(match.group(1)), y + float(match.group(2))
        cell = (int(x // pitch), int(y // pitch))
        if not (0 <= cell[0] < len(STYLES) and 0 <= cell[1] < len(names)):
            raise ValueError(f"Element outside the sheet grid at {x:.2f},{y:.2f}")
        cells.setdefault(cell, []).append(element)
    grouped = ET.Element(f"{{{SVG}}}svg")
    for defs in sheet.findall(f"{{{SVG}}}defs"):
        grouped.append(defs)
    for (column, row), elements in cells.items():
        group = ET.SubElement(grouped, f"{{{SVG}}}g", id=f"cell-{column}-{row}")
        group.extend(elements)
    wanted = [(column, style) for column, style in enumerate(STYLES) if style in styles]
    missing = [
        f"{name}/{style}" for row, name in enumerate(names)
        for column, style in wanted if (column, row) not in cells
    ]
    extra = sorted({STYLES[column] for column, _ in cells} - set(styles))
    if extra:
        raise ValueError(f"Sheet has columns outside --styles: {extra}")
    if missing:
        raise ValueError(f"Empty cells: {missing}")
    written = []
    for row, name in enumerate(names):
        for column, style in wanted:
            svg = extract_icon(
                grouped, {"id": f"cell-{column}-{row}", "x": column * pitch, "y": row * pitch},
                f"{name}-{size}-{style}", style=style, paint_roles=PAINT_ROLES, size=size,
            )
            svg = mask_type_attribute(svg)
            path = Path(root) / icon_path(name, style, size)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(svg, encoding="utf-8")
            written.append(path)
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheet", type=Path, nargs="?")
    parser.add_argument("size", type=int, nargs="?")
    parser.add_argument("names", nargs="?", help="Comma-separated icon names, one per sheet row")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--styles", default=",".join(STYLES),
                        help="Comma-separated styles present in the sheet (columns keep their places)")
    parser.add_argument("--register", action="store_true",
                        help="Record the optical-size digests in manifest.json")
    args = parser.parse_args()
    if args.register:
        manifest = register_sizes(args.root)
        print(f"Registered {len(OPTICAL_SIZES)} optical sizes for {manifest['iconCount']} icons")
        raise SystemExit
    files = split_sheet(
        args.sheet.read_text(encoding="utf-8"), args.size, args.names.split(","), args.root,
        styles=tuple(args.styles.split(",")),
    )
    print(f"Wrote {len(files)} SVGs at {args.size}px")
