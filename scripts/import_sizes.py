"""Split a Figma optical-size export sheet into per-size SVGs.

The sheet is a frame of cloned Size=N variants: one row per icon, one column
per style (Regular, Filled, Duocolor, Duotone), on a fixed pitch (N + 32 px by
default). Long lists wrap into side-by-side blocks of `rows` icons, because
Figma writes about six significant digits: keeping the sheet under 1000 px
keeps every coordinate to at least 0.001 px. Duo paints are swapped to the
sentinel colors before export. Figma's SVG export drops layer IDs, so each
top-level element is assigned to the cell that holds its first coordinate,
then moved to the origin so the files carry no sheet offset.
"""

import argparse
import hashlib
import json
import re
from decimal import Decimal
import xml.etree.ElementTree as ET
from pathlib import Path

from import_figma import SVG, extract_icon, references
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


COMMAND = re.compile(r"[A-Za-z]|" + NUMBER.pattern)
# Coordinates per command, as (x, y) roles: 0 = x, 1 = y.
ROLES = {"M": (0, 1), "L": (0, 1), "C": (0, 1) * 3, "H": (0,), "V": (1,), "Z": ()}


def number(value):
    """Exact decimal text: whole-pixel offsets never round a coordinate."""
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def shift_path(d, dx, dy):
    """Move absolute path data by (dx, dy). Figma exports only M L H V C Z."""
    out, command, index = [], None, 0
    for token in COMMAND.findall(d):
        if token.isalpha():
            if token not in ROLES:
                raise ValueError(f"Unsupported path command: {token}")
            command, index = token, 0
            out.append(token)
            continue
        roles = ROLES[command]
        out.append(number(Decimal(token) + (dx, dy)[roles[index % len(roles)]]))
        index += 1
    text = ""
    for token in out:
        if text and not token.isalpha() and not text[-1].isalpha() and not token.startswith("-"):
            text += " "
        text += token
    return text


TRANSLATE = re.compile(r"translate\(\s*(" + NUMBER.pattern + r")[\s,]+(" + NUMBER.pattern + r")\s*\)")


def shift(node, dx, dy):
    """Move an exported element (and its children) by (dx, dy)."""
    transform = node.get("transform")
    if transform:
        match = TRANSLATE.fullmatch(transform.strip())
        if not match:
            raise ValueError(f"Unsupported sheet transform: {transform}")
        # Children sit in the translated frame: moving the translate moves them.
        x, y = (number(Decimal(match.group(i)) + d) for i, d in ((1, dx), (2, dy)))
        if x == y == "0":
            node.attrib.pop("transform")
        else:
            node.set("transform", f"translate({x} {y})")
        return
    if node.get("d"):
        node.set("d", shift_path(node.get("d"), dx, dy))
    for attr, delta in (("x", dx), ("y", dy), ("cx", dx), ("cy", dy), ("x1", dx), ("y1", dy), ("x2", dx), ("y2", dy)):
        if node.get(attr) is not None:
            node.set(attr, number(Decimal(node.get(attr)) + delta))
    for child in node:
        shift(child, dx, dy)


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


def split_sheet(text, size, names, root=ROOT, styles=STYLES, pitch=None, rows=None):
    if size not in SIZES:
        raise ValueError(f"Unsupported optical size: {size}")
    pitch = pitch or size + 32
    rows = rows or len(names)
    if pitch < size:
        raise ValueError("The pitch must fit the icon")
    sheet = ET.fromstring(text)
    definitions = {
        node.get("id"): node for defs in sheet.findall(f"{{{SVG}}}defs") for node in defs
    }
    cells = {}
    for element in list(sheet):
        if element.tag == f"{{{SVG}}}defs":
            continue
        x, y = first_point(element)
        match = TRANSLATE.fullmatch((element.get("transform") or "").strip())
        if match:
            x, y = x + float(match.group(1)), y + float(match.group(2))
        column, row = int(x // pitch), int(y // pitch)
        block, column = divmod(column, len(STYLES))
        cell = (column, block * rows + row)
        if not (0 <= row < rows and 0 <= block and cell[1] < len(names)):
            raise ValueError(f"Element outside the sheet grid at {x:.2f},{y:.2f}")
        offset = (-(block * len(STYLES) + column) * pitch, -row * pitch)
        # Definitions (e.g. a clipped frame's clipPath) move with the cell that uses them.
        used = [definitions.pop(key) for key in sorted(references(element)) if key in definitions]
        for node in [element, *used]:
            shift(node, *offset)
        cells.setdefault(cell, []).extend([*used, element])
    if definitions:
        raise ValueError(f"Unused sheet definitions: {sorted(definitions)}")
    grouped = ET.Element(f"{{{SVG}}}svg")
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
                grouped, {"id": f"cell-{column}-{row}", "x": 0, "y": 0},
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
    parser.add_argument("--pitch", type=int, help="Cell pitch in px (default: size + 32)")
    parser.add_argument("--rows", type=int, help="Icons per block before the sheet wraps")
    parser.add_argument("--register", action="store_true",
                        help="Record the optical-size digests in manifest.json")
    args = parser.parse_args()
    if args.register:
        manifest = register_sizes(args.root)
        print(f"Registered {len(OPTICAL_SIZES)} optical sizes for {manifest['iconCount']} icons")
        raise SystemExit
    files = split_sheet(
        args.sheet.read_text(encoding="utf-8"), args.size, args.names.split(","), args.root,
        styles=tuple(args.styles.split(",")), pitch=args.pitch, rows=args.rows,
    )
    print(f"Wrote {len(files)} SVGs at {args.size}px")
