"""Compose a canonical icon and a modifier with real transparent clearance."""

import argparse
import copy
import hashlib
import json
import math
import re
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

from import_figma import SVG
from import_modifiers import GLYPH_PAINT, POSITIONS, allowed_positions, namespace_ids
from duo import DUO_STYLES, apply_colors
from sizes import BASE_SIZE, SIZES, icon_digest, icon_path

ROOT = Path(__file__).resolve().parents[1]


def cutout_stencil(badge, prefix):
    if not any(
        node.get(attr) == GLYPH_PAINT
        for node in badge.iter() for attr in ("fill", "stroke")
    ):
        return
    stencil = copy.deepcopy(badge)
    namespace_ids(stencil, prefix + "-stencil")
    for node in stencil.iter():
        for attr in ("fill", "stroke"):
            if node.get(attr) == GLYPH_PAINT:
                node.set(attr, "black")
            elif node.get(attr) == "currentColor":
                node.set(attr, "none")
    for node in badge.iter():
        for attr in ("fill", "stroke"):
            if node.get(attr) == GLYPH_PAINT:
                node.set(attr, "none")
    defs = ET.SubElement(badge, f"{{{SVG}}}defs")
    mask_id = prefix + "-stencil-cutout"
    mask = ET.SubElement(defs, f"{{{SVG}}}mask", {
        "id": mask_id, "maskUnits": "userSpaceOnUse",
        "maskContentUnits": "userSpaceOnUse", "mask-type": "luminance",
        "x": "0", "y": "0", "width": badge.get("width"),
        "height": badge.get("height"),
    })
    ET.SubElement(mask, f"{{{SVG}}}rect", {
        "width": badge.get("width"), "height": badge.get("height"), "fill": "white",
    })
    mask.append(stencil)
    visible = ET.Element(f"{{{SVG}}}g", {"mask": f"url(#{mask_id})"})
    for child in list(badge):
        if child.tag != f"{{{SVG}}}defs":
            badge.remove(child)
            visible.append(child)
    badge.append(visible)


def fit_base(base, fit, size=BASE_SIZE):
    if not isinstance(fit, dict) or set(fit) != {"scale", "x", "y"}:
        raise ValueError("Base fit needs scale, x, and y")
    if any(
        not isinstance(value, (int, float)) or not math.isfinite(value)
        for value in fit.values()
    ) or not 0 < fit["scale"] <= 1 or any(
        not 0 <= fit[key] <= 24 for key in ("x", "y")
    ):
        raise ValueError("Invalid base fit")
    k = size / BASE_SIZE
    base.set("width", str(size * fit["scale"]))
    base.set("height", str(size * fit["scale"]))
    base.set("x", str(fit["x"] * k))
    base.set("y", str(fit["y"] * k))
    for node in base.iter():
        if node.get("stroke-width") is not None:
            node.set("stroke-width", str(float(node.get("stroke-width")) / fit["scale"]))
    if base.get("stroke-width") is None and any(
        node.get("stroke") not in (None, "none") and node.get("stroke-width") is None
        for node in base.iter()
    ):
        # Strokes that rely on the 1-unit default (Figma omits stroke-width="1").
        base.set("stroke-width", str(1 / fit["scale"]))


def color_value(value):
    if not isinstance(value, str) or not re.fullmatch(
        r"#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|currentColor",
        value,
    ):
        raise ValueError("Colors must be #RGB, #RRGGBB, #RRGGBBAA, or currentColor")
    return value


def read_asset(root, relative, digest):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError("Asset path must remain inside the library")
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f"Digest mismatch: {relative}")
    return ET.fromstring(data)


def compose_svg(
    name, modifier, *, style="regular", position="auto", theme="light",
    color="currentColor", modifier_color=None, glyph_color=None,
    root=ROOT, id_prefix=None, base_fit=None, cutout=False, secondary_color=None,
    size=BASE_SIZE,
):
    root = Path(root)
    core = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    modifiers = json.loads((root / "metadata/modifiers.json").read_text(encoding="utf-8"))
    icon = next((row for row in core["icons"] if row["name"] == name), None)
    glyph = next((row for row in modifiers["modifiers"] if row["name"] == modifier), None)
    if icon is None or glyph is None:
        raise ValueError("Unknown canonical icon or modifier")
    if style not in core["styles"] or theme not in ("light", "dark"):
        raise ValueError("Unsupported icon style or theme")
    if size not in SIZES:
        raise ValueError(f"Unsupported optical size: {size}")
    k = size / BASE_SIZE
    if position == "auto":
        position = glyph["defaultPosition"]
    if position not in POSITIONS:
        raise ValueError(f"Choose an explicit corner for the {modifier} modifier")
    if position not in allowed_positions(glyph):
        raise ValueError(
            f"The {modifier} modifier only supports "
            + ", ".join(allowed_positions(glyph))
        )
    presets_path = root / "metadata/presets.json"
    if base_fit is None and presets_path.exists():
        presets = json.loads(presets_path.read_text(encoding="utf-8"))["presets"]
        base_fit = next((
            row.get("fit") for row in presets
            if (row["base"], row["modifier"], row["position"]) == (name, modifier, position)
        ), None)
    color = color_value(color)
    if secondary_color is not None:
        secondary_color = color_value(secondary_color)
    modifier_color = color_value(
        glyph["colors"][theme]["primary"] if modifier_color is None else modifier_color,
    )
    glyph_color = color_value(
        glyph["colors"][theme]["glyph"] if glyph_color is None else glyph_color,
    )
    prefix = id_prefix or f"fos-{uuid.uuid4().hex}"
    if not re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_-]*", prefix):
        raise ValueError("Invalid SVG ID prefix")
    relative = icon["files"][style] if size == BASE_SIZE else icon_path(name, style, size)
    base = read_asset(root, relative, icon_digest(icon, style, size))
    if style in DUO_STYLES:
        apply_colors(base, theme, color, secondary_color)
        color = base.get("color")
        base.set("color", "currentColor")
    badge = read_asset(root, glyph["file"], glyph["sha256"])
    namespace_ids(base, prefix + "-base")
    namespace_ids(badge, prefix + "-glyph")
    if base_fit is not None:
        fit_base(base, base_fit, size)
    if cutout:
        cutout_stencil(badge, prefix)
    else:
        for node in badge.iter():
            for attr in ("fill", "stroke"):
                if node.get(attr) == GLYPH_PAINT:
                    node.set(attr, glyph_color)
    result = ET.Element(
        f"{{{SVG}}}svg", width=str(size), height=str(size), viewBox=f"0 0 {size} {size}",
        fill="none", color=color,
    )
    defs = ET.SubElement(result, f"{{{SVG}}}defs")
    clip_id = prefix + "-clearance"
    clip = ET.SubElement(
        defs, f"{{{SVG}}}clipPath", id=clip_id, clipPathUnits="userSpaceOnUse",
    )
    placement = glyph["positions"][position]
    for path in placement["clearance"]:
        rule = "evenodd" if path["windingRule"] == "EVENODD" else "nonzero"
        attributes = {"d": path["data"], "fill-rule": rule, "clip-rule": rule}
        if size != BASE_SIZE:
            attributes["transform"] = f"scale({k:g})"
        ET.SubElement(clip, f"{{{SVG}}}path", attributes)
    masked = ET.SubElement(
        result, f"{{{SVG}}}g", {"clip-path": f"url(#{clip_id})"},
    )
    masked.append(copy.deepcopy(base))
    badge.set("x", str(placement["x"] * k if size != BASE_SIZE else placement["x"]))
    badge.set("y", str(placement["y"] * k if size != BASE_SIZE else placement["y"]))
    if size != BASE_SIZE:
        # Badges scale with the icon (matching the Figma modifier sets).
        badge.set("width", f"{float(badge.get('width')) * k:g}")
        badge.set("height", f"{float(badge.get('height')) * k:g}")
    badge.set("color", modifier_color)
    result.append(badge)
    return ET.tostring(result, encoding="unicode") + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("name")
    parser.add_argument("--modifier", required=True)
    parser.add_argument("--style", default="regular")
    parser.add_argument("--position", default="auto", choices=("auto", *POSITIONS))
    parser.add_argument("--theme", default="light", choices=("light", "dark"))
    parser.add_argument("--color", default="currentColor")
    parser.add_argument("--modifier-color")
    parser.add_argument("--secondary-color")
    parser.add_argument("--glyph-color")
    parser.add_argument("--cutout", action="store_true",
                        help="Use a transparent stencil instead of a glyph color")
    parser.add_argument("--size", type=int, default=BASE_SIZE, choices=SIZES)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        svg = compose_svg(
            args.name, args.modifier, style=args.style, position=args.position,
            theme=args.theme, color=args.color, modifier_color=args.modifier_color,
            glyph_color=args.glyph_color,
            cutout=args.cutout,
            secondary_color=args.secondary_color, size=args.size,
        )
    except (ValueError, OSError) as error:
        parser.exit(2, f"{error}\n")
    if args.output:
        args.output.write_text(svg, encoding="utf-8")
    else:
        print(svg, end="")
