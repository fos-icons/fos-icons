"""Validate the paired SVG library and its searchable manifest (no dependencies)."""

import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from duo import DUO_STYLES
from sizes import BASE_SIZE, OPTICAL_SIZES, SIZE_PATH, SIZES, STROKES, icon_path

ROOT = Path(__file__).resolve().parents[1]
SVG = "http://www.w3.org/2000/svg"
STYLES = ("regular", "filled")
ALL_STYLES = (*STYLES, *DUO_STYLES)
ALLOWED = {
    "svg", "g", "path", "circle", "ellipse", "rect", "line",
    "polyline", "polygon", "defs", "clipPath", "mask", "use",
}


def validate_svg(text, style, size=BASE_SIZE):
    errors = []
    if "<!DOCTYPE" in text.upper() or "<!ENTITY" in text.upper():
        return ["XML declarations/entities are not allowed"]
    try:
        root = ET.fromstring(text)
    except ET.ParseError as error:
        return [f"Invalid XML: {error}"]
    if root.tag != f"{{{SVG}}}svg":
        errors.append("Expected an SVG namespace root")
    if size not in STROKES:
        return [f"Unsupported optical size: {size}"]
    target = STROKES[size]
    if root.get("viewBox") != f"0 0 {size} {size}":
        errors.append(f"Expected viewBox 0 0 {size} {size}")
    if root.get("width") != str(size) or root.get("height") != str(size):
        errors.append(f"Expected {size}px dimensions")
    identifiers = [node.get("id") for node in root.iter() if node.get("id")]
    if len(identifiers) != len(set(identifiers)):
        errors.append("Duplicate SVG IDs")
    references = set()
    visible_paints = 0
    geometry = 0

    stroked_styles = ("regular", *DUO_STYLES)

    def visit(node, definition=False, stroke_scale=1.0, width=None, painted=False):
        nonlocal visible_paints, geometry
        tag = node.tag.rsplit("}", 1)[-1]
        definition = definition or tag in {"defs", "mask", "clipPath"}
        if tag == "svg" and node is not root:
            try:
                box = [float(value) for value in node.get("viewBox", "").split()]
                stroke_scale *= min(
                    float(node.get("width")) / box[2],
                    float(node.get("height")) / box[3],
                )
            except (TypeError, ValueError, IndexError, ZeroDivisionError):
                errors.append("Invalid nested SVG viewport")
        if tag not in ALLOWED or not node.tag.startswith(f"{{{SVG}}}"):
            errors.append(f"Unsupported SVG element: {tag}")
        if node.get("stroke-width") is not None:
            width = node.get("stroke-width")
        if node.get("stroke") is not None:
            painted = node.get("stroke") != "none"
        if not definition and tag in {"path", "circle", "ellipse", "rect", "line", "polyline", "polygon"}:
            geometry += 1
            # A stroke without any stroke-width is 1 user unit wide.
            if painted and width is None and style in stroked_styles:
                if abs(stroke_scale - target) > 0.001:
                    errors.append(f"{style.title()} stroke is not {target:g}px: default 1")
        for key, value in node.attrib.items():
            attr = key.rsplit("}", 1)[-1]
            if attr.startswith("on") or attr == "style":
                errors.append(f"Unexpected active/style attribute: {attr}")
            if re.search(r"NaN|Infinity", value):
                errors.append(f"Non-finite {attr}")
            references.update(re.findall(r"url\(#([^)]+)\)", value))
            if "url(" in value and not re.fullmatch(r"url\(#[^)]+\)", value):
                errors.append(f"External or unsupported reference: {value}")
            if attr == "href":
                if value.startswith("#"):
                    references.add(value[1:])
                else:
                    errors.append("External href")
            if attr in {"fill", "stroke"} and not definition:
                secondary = style in DUO_STYLES and re.fullmatch(
                    r"var\(--fos-secondary, #[0-9A-Fa-f]{6}\)", value,
                )
                if value not in {"none", "currentColor"} and not secondary:
                    errors.append(f"Non-themable {attr}: {value}")
                visible_paints += value == "currentColor" or bool(secondary)
            if attr == "stroke-width" and painted and style in stroked_styles and not definition:
                try:
                    if abs(float(value) * stroke_scale - target) > 0.001:
                        errors.append(f"{style.title()} stroke is not {target:g}px: {value}")
                except ValueError:
                    errors.append(f"Invalid stroke width: {value}")
        for child in node:
            visit(child, definition, stroke_scale, width, painted)

    visit(root)
    if not geometry or not visible_paints:
        errors.append("Empty or unpainted icon")
    if references - set(identifiers):
        errors.append(f"Broken references: {sorted(references - set(identifiers))}")
    return errors


def validate_library(root):
    errors = []
    try:
        manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        return [f"Cannot read manifest: {error}"]
    icons = manifest.get("icons", [])
    if manifest.get("schemaVersion") != 1 or manifest.get("grid") != 24:
        errors.append("Unsupported manifest schema/grid")
    styles = manifest.get("styles", [])
    if styles not in (list(STYLES), list(ALL_STYLES)) or manifest.get("license") != "MIT":
        errors.append("Unexpected styles/license")
    sizes = manifest.get("sizes", [BASE_SIZE])
    if sizes not in ([BASE_SIZE], list(SIZES)):
        errors.append(f"Unsupported sizes: {sizes}")
    elif sizes != [BASE_SIZE] and (
        manifest.get("sizePath") != SIZE_PATH
        or manifest.get("strokeWidths") != {str(size): STROKES[size] for size in SIZES}
    ):
        errors.append("Size path/stroke widths do not match the optical size spec")
    if manifest.get("iconCount") != len(icons):
        errors.append("Icon count does not match manifest")
    names = [row.get("name", "") for row in icons]
    if names != sorted(set(names)):
        errors.append("Canonical names must be unique and sorted")
    exclusions = set(manifest.get("source", {}).get("excludedBrands", []))
    expected = set()
    source_ids = []
    for row in icons:
        name = row.get("name", "")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
            errors.append(f"Invalid canonical name: {name}")
            continue
        if name in exclusions:
            errors.append(f"Excluded brand in core: {name}")
        if not row.get("category") or not row.get("componentSet"):
            errors.append(f"Missing category/component set: {name}")
        if not isinstance(row.get("tags"), list) or not isinstance(row.get("aliases"), list):
            errors.append(f"Invalid search metadata: {name}")
        for style in styles:
            relative = f"icons/{style}/{name}.svg"
            expected.add(relative)
            if row.get("files", {}).get(style) != relative:
                errors.append(f"Invalid manifest path: {name}/{style}")
            source = row.get("source", {}).get(style)
            if not source:
                errors.append(f"Missing Figma source: {name}/{style}")
            source_ids.append(source)
            path = root / relative
            try:
                data = path.read_bytes()
                if hashlib.sha256(data).hexdigest() != row.get("sha256", {}).get(style):
                    errors.append(f"Digest mismatch: {relative}")
                for error in validate_svg(data.decode("utf-8"), style):
                    errors.append(f"{relative}: {error}")
            except (OSError, UnicodeError) as error:
                errors.append(f"{relative}: {error}")
            for size in sizes:
                if size == BASE_SIZE:
                    continue
                relative = icon_path(name, style, size)
                expected.add(relative)
                try:
                    data = (root / relative).read_bytes()
                    digest = row.get("sizes", {}).get(str(size), {}).get(style)
                    if hashlib.sha256(data).hexdigest() != digest:
                        errors.append(f"Digest mismatch: {relative}")
                    for error in validate_svg(data.decode("utf-8"), style, size):
                        errors.append(f"{relative}: {error}")
                except (OSError, UnicodeError) as error:
                    errors.append(f"{relative}: {error}")
        if sizes != [BASE_SIZE] and set(row.get("sizes", {})) != {str(size) for size in OPTICAL_SIZES}:
            errors.append(f"Missing optical sizes: {name}")
    if len(source_ids) != len(set(source_ids)):
        errors.append("Figma source IDs must be unique")
    actual = {str(path.relative_to(root)) for path in (root / "icons").rglob("*.svg")}
    if actual != expected:
        errors.append(f"Unmanifested/missing SVGs: {sorted(actual ^ expected)}")
    if not icons:
        errors.append("Library is empty")
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path, default=ROOT)
    args = parser.parse_args()
    failures = validate_library(args.root)
    if failures:
        print("\n".join(failures))
        raise SystemExit(1)
    count = len(json.loads((args.root / "manifest.json").read_text())["icons"])
    manifest = json.loads((args.root / "manifest.json").read_text())
    files = count * len(manifest["styles"]) * len(manifest.get("sizes", [BASE_SIZE]))
    print(f"PASS: {count} icons / {files} SVGs; XML, themes, sizes, strokes, links, metadata and SHA-256")
