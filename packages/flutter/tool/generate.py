#!/usr/bin/env python3
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET

PACKAGE = Path(__file__).resolve().parents[1]
ROOT = PACKAGE.parents[1]
SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
STYLES = ("regular", "filled", "duocolor", "duotone")
NAME = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
TAGS = {"svg", "g", "path", "circle", "rect", "defs", "clipPath", "mask"}
MARKERS = {
    "primary": "#0102A1",
    "secondary": "#0102A2",
    "modifier": "#0102A3",
}
TOKEN = re.compile(r"var\(--fos-(primary|secondary|modifier),\s*(#[0-9A-Fa-f]{6})\)")
NUMBER = re.compile(r"-?(?:\d+(?:\.\d+)?|\.\d+)")


def flatten_viewports(root, filename):
    """Lower nested viewports to clipped groups with the same translation and uniform scale."""
    viewports = tuple(root.iter(f"{{{SVG}}}svg"))[1:]
    if not viewports:
        return
    defs = ET.Element(f"{{{SVG}}}defs")
    root.insert(0, defs)
    ids = {node.get("id") for node in root.iter()}
    for index, node in enumerate(viewports):
        x, y = (node.attrib.pop(axis, "0") for axis in ("x", "y"))
        width, height = (node.attrib.pop(axis, "") for axis in ("width", "height"))
        box = node.attrib.pop("viewBox", "").split()
        if not (
            len(box) == 4 and box[:2] == ["0", "0"]
            and all(NUMBER.fullmatch(value) for value in (x, y, width, height, *box[2:]))
            and float(width) > 0 and float(height) > 0
            and float(box[2]) > 0 and float(box[3]) > 0
            and set(node.attrib) <= {"fill"}
        ):
            raise ValueError(f"{filename}: cannot lower nested SVG viewport {box!r}")
        scale = float(width) / float(box[2])
        if not math.isclose(scale, float(height) / float(box[3]), rel_tol=1e-12):
            raise ValueError(f"{filename}: nested SVG viewport changes aspect ratio")
        clip_id = f"fos-flutter-viewport-{index}"
        if clip_id in ids:
            raise ValueError(f"{filename}: generated viewport clip ID collision")
        clip = ET.SubElement(defs, f"{{{SVG}}}clipPath", {"id": clip_id})
        ET.SubElement(clip, f"{{{SVG}}}rect", {"width": box[2], "height": box[3]})
        node.tag = f"{{{SVG}}}g"
        transforms = []
        if float(x) or float(y):
            transforms.append(f"translate({x} {y})")
        if scale != 1:
            transforms.append(f"scale({scale:.16g})")
        if transforms:
            node.set("transform", " ".join(transforms))
            children = list(node)
            node[:] = []
            group = ET.SubElement(node, f"{{{SVG}}}g")
            group.extend(children)
        else:
            group = node
        group.set("clip-path", f"url(#{clip_id})")


def normalize(raw, filename):
    root = ET.fromstring(raw)
    if (
        root.tag != f"{{{SVG}}}svg" or root.get("viewBox") != "0 0 24 24"
        or root.get("width") != "24" or root.get("height") != "24"
        or root.get("fill") != "none"
    ):
        raise ValueError(f"{filename}: expected a 24-unit SVG")
    if any(marker.encode().lower() in raw.lower() for marker in MARKERS.values()):
        raise ValueError(f"{filename}: authored color collides with palette marker")
    defaults = {}

    def role_token(value):
        match = TOKEN.fullmatch(value)
        if not match:
            raise ValueError(f"{filename}: unsupported color token {value!r}")
        role, fallback = match.groups()
        fallback = fallback.upper()
        if defaults.setdefault(role, fallback) != fallback:
            raise ValueError(f"{filename}: inconsistent {role} fallback")
        return role

    def visit(node, inherited):
        if not node.tag.startswith(f"{{{SVG}}}") or node.tag.split("}", 1)[1] not in TAGS:
            raise ValueError(f"{filename}: unsupported element {node.tag!r}")
        color = node.attrib.pop("color", "currentColor")
        is_badge = node.tag == f"{{{SVG}}}svg" and (
            node.get("viewBox") in ("0 0 10 10", "0 0 14 7") and node.get("x") is not None
        )
        current = ("modifier" if is_badge else inherited) if color == "currentColor" else role_token(color)
        for attr, value in node.attrib.items():
            if attr in ("fill", "stroke") and value == "currentColor":
                node.set(attr, MARKERS[current])
            elif attr in ("fill", "stroke") and value.startswith("var("):
                node.set(attr, MARKERS[role_token(value)])
            elif "var(" in value or "currentColor" in value or attr == "style":
                raise ValueError(f"{filename}: unsupported expression {attr}={value!r}")
        for child in node:
            visit(child, current)

    visit(root, "primary")
    flatten_viewports(root, filename)
    source = ET.tostring(root, encoding="unicode", short_empty_elements=True)
    if "'''" in source or "\n" in source:
        raise ValueError(f"{filename}: unexpected raw Dart literal content")
    colors = [
        f"Color(0xFF{defaults[role][1:]})" if role in defaults else "null"
        for role in MARKERS
    ]
    return source, colors


def generate():
    manifest = json.loads((ROOT / "manifest.json").read_text())
    icons = manifest["icons"]
    if (
        manifest["schemaVersion"] != 1 or manifest["grid"] != 24
        or manifest["license"] != "MIT" or tuple(manifest["styles"]) != STYLES
        or manifest["iconCount"] != len(icons)
    ):
        raise ValueError("Unsupported or inconsistent SVG manifest")
    output = [
        "// Generated by tool/generate.py. Do not edit.",
        "part of '../fos_icons.dart';",
        "",
        "/// The Fos Icons catalog. Each constant selects one icon and style.",
        "abstract final class FosIcons {",
    ]
    inventory = [
        "// Generated by tool/generate.py. Do not edit.",
        "import 'package:fos_icons/fos_icons.dart';",
        "",
        "const catalog = <String, FosGlyph>{",
    ]
    symbols = set()
    names = set()
    excluded = set(manifest["source"]["excludedBrands"])
    for icon in sorted(icons, key=lambda entry: entry["name"]):
        name = icon["name"]
        if not NAME.fullmatch(name) or name in excluded or name in names:
            raise ValueError(f"Invalid, excluded, or duplicate icon name: {name}")
        names.add(name)
        if set(icon["files"]) != set(STYLES) or set(icon["sha256"]) != set(STYLES):
            raise ValueError(f"{name}: missing or extra icon styles")
        for style in STYLES:
            filename = f"icons/{style}/{name}.svg"
            raw = (ROOT / filename).read_bytes()
            if icon["files"][style] != filename or hashlib.sha256(raw).hexdigest() != icon["sha256"][style]:
                raise ValueError(f"{filename}: does not match the canonical manifest")
            symbol = glyph_symbol(name, style)
            if symbol in symbols:
                raise ValueError(f"{filename}: Dart constant collision: {symbol}")
            symbols.add(symbol)
            source, colors = normalize(raw, filename)
            output.extend([
                f"  /// {name}: {style}.",
                f"  static const {symbol} = FosGlyph._(",
                f"    r'''{source}''',",
                *(f"    {value}," for value in colors),
                "  );",
                "",
            ])
            key, value = f"  '{style}/{name}':", f"FosIcons.{symbol},"
            entry = f"{key} {value}"
            inventory.append(entry if len(entry) <= 80 else f"{key}\n      {value}")
    for alias, target in manifest.get("iconAliases", {}).items():
        if not NAME.fullmatch(alias) or alias in names or alias in excluded or target not in names:
            raise ValueError(f"Invalid icon alias: {alias} → {target}")
        for style in STYLES:
            symbol = glyph_symbol(alias, style)
            if symbol in symbols:
                raise ValueError(f"Dart constant collision: {symbol}")
            symbols.add(symbol)
            output.extend([
                f"  /// Legacy alias for {target}: {style}.",
                f"  static const {symbol} = {glyph_symbol(target, style)};",
                "",
            ])
    output.pop()
    return {
        "lib/src/glyphs.g.dart": "\n".join([*output, "}", ""]),
        "test/catalog.g.dart": "\n".join([*inventory, "};", ""]),
    }


def glyph_symbol(name, style):
    first, *rest = name.split("-")
    stem = first + "".join(part.capitalize() for part in rest)
    if stem[0].isdigit():
        stem = "icon" + stem
    return stem + style.capitalize()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Flutter glyphs from the canonical SVG manifest.")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path, content in generate().items():
        target = PACKAGE / path
        if args.check:
            if not target.exists() or target.read_text(encoding="utf-8") != content:
                parser.exit(1, f"{path} is stale; run python3 tool/generate.py\n")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
