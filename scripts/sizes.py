"""Optical sizes: each size is drawn on its own grid with its own stroke.

24 px is the canonical size and keeps its original paths
(icons/<style>/<name>.svg, manifest `files`/`sha256`). The other sizes live in
icons/<size>/<style>/<name>.svg, with digests under the icon's `sizes` map.
"""

BASE_SIZE = 24
SIZES = (16, 24, 32, 48, 64)
OPTICAL_SIZES = tuple(size for size in SIZES if size != BASE_SIZE)
STROKES = {16: 1.0, 24: 1.25, 32: 1.5, 48: 2.0, 64: 2.5}
SIZE_PATH = "icons/{size}/{style}/{name}.svg"


def icon_path(name, style, size=BASE_SIZE):
    if size == BASE_SIZE:
        return f"icons/{style}/{name}.svg"
    if size not in OPTICAL_SIZES:
        raise ValueError(f"Unsupported optical size: {size}")
    return SIZE_PATH.format(size=size, style=style, name=name)


def icon_digest(row, style, size=BASE_SIZE):
    if size == BASE_SIZE:
        return row["sha256"][style]
    return row.get("sizes", {}).get(str(size), {}).get(style)
