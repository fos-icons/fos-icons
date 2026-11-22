import json
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from compose_svg import compose_svg
from import_sizes import mask_type_attribute, shift_path, split_sheet
from sizes import OPTICAL_SIZES, SIZES, STROKES, icon_path
from validate import validate_svg

SVG = "http://www.w3.org/2000/svg"


def icon(size, stroke, extra=""):
    return (
        f'<svg xmlns="{SVG}" width="{size}" height="{size}" viewBox="0 0 {size} {size}" fill="none">'
        f'<path d="M2 2H10" stroke="currentColor"{stroke}/>{extra}</svg>'
    )


class SizeSpecTests(unittest.TestCase):
    def test_each_size_has_its_own_grid_and_stroke(self):
        for size in SIZES:
            with self.subTest(size=size):
                good = icon(size, f' stroke-width="{STROKES[size]:g}"')
                self.assertEqual(validate_svg(good, "regular", size), [])
                wrong = icon(size, ' stroke-width="1.75"')
                self.assertTrue(any("stroke is not" in e for e in validate_svg(wrong, "regular", size)))
                if size != 24:
                    # A 24px file is not a valid icon at another size.
                    self.assertTrue(validate_svg(icon(24, ' stroke-width="1.25"'), "regular", size))

    def test_default_stroke_width_is_one_unit(self):
        self.assertEqual(validate_svg(icon(16, ""), "regular", 16), [])
        self.assertTrue(validate_svg(icon(48, ""), "regular", 48))
        # Filled artwork keeps whatever stroke its design needs.
        self.assertEqual(validate_svg(icon(48, "").replace('stroke="currentColor"', 'fill="currentColor"'), "filled", 48), [])

    def test_unpainted_strokes_are_ignored(self):
        svg = icon(48, ' stroke-width="2"', '<path d="M1 1H3" stroke="none" stroke-width="5"/>')
        self.assertEqual(validate_svg(svg, "regular", 48), [])

    def test_unsupported_size_is_rejected(self):
        self.assertTrue(validate_svg(icon(20, ' stroke-width="1"'), "regular", 20))
        with self.assertRaises(ValueError):
            icon_path("user", "regular", 20)

    def test_paths(self):
        self.assertEqual(icon_path("user", "regular"), "icons/regular/user.svg")
        self.assertEqual(icon_path("user", "duotone", 48), "icons/48/duotone/user.svg")


class SplitSheetTests(unittest.TestCase):
    def test_sheet_cells_become_per_size_files(self):
        size, pitch = 32, 64
        paths = []
        for row in range(2):
            for column, color in enumerate(("#212121", "#212121", "#123456", "#654321")):
                x, y = column * pitch + 4, row * pitch + 4
                paths.append(
                    f'<path d="M{x} {y}H{x + 20}" stroke="{color}" stroke-width="1.5"/>'
                )
        paths.append(
            f'<mask id="m" style="mask-type:luminance" x="0" y="0" width="32" height="32">'
            f'<rect width="32" height="32" fill="white"/></mask>'
        )
        sheet = f'<svg xmlns="{SVG}" width="256" height="128">{"".join(paths[:-1])}</svg>'
        with tempfile.TemporaryDirectory() as directory:
            written = split_sheet(sheet, size, ["alpha", "beta"], Path(directory))
            self.assertEqual(len(written), 8)
            beta = (Path(directory) / icon_path("beta", "duocolor", size)).read_text()
            self.assertIn('viewBox="0 0 32 32"', beta)
            # Each cell is moved to the origin: no sheet offset is left behind.
            self.assertNotIn("translate", beta)
            self.assertIn('d="M4 4H24"', beta)
            self.assertEqual(validate_svg(beta, "duocolor", size), [])
            secondary = (Path(directory) / icon_path("alpha", "duotone", size)).read_text()
            self.assertIn("var(--fos-secondary", secondary)
        self.assertIn('mask-type="luminance"', mask_type_attribute(paths[-1]))

    def test_long_lists_wrap_into_blocks(self):
        size, pitch, rows = 16, 32, 2
        paths = []
        for index in range(5):
            block, row = divmod(index, rows)
            for column in range(4):
                x = (block * 4 + column) * pitch + 2.12345
                y = row * pitch + 3.5
                paths.append(f'<path d="M{x} {y}L{x + 10} {y + 1}C{x} {y} {x} {y} {x} {y}V{y + 2}Z" stroke="#123456" stroke-width="1"/>')
        sheet = f'<svg xmlns="{SVG}" width="384" height="64">{"".join(paths)}</svg>'
        names = ["a", "b", "c", "d", "e"]
        with tempfile.TemporaryDirectory() as directory:
            split_sheet(sheet, size, names, Path(directory), pitch=pitch, rows=rows)
            for name in names:
                svg = (Path(directory) / icon_path(name, "regular", size)).read_text()
                self.assertIn('d="M2.12345 3.5L12.12345 4.5C2.12345 3.5 2.12345 3.5 2.12345 3.5V5.5Z"', svg)

    def test_definitions_move_with_their_cell(self):
        sheet = (
            f'<svg xmlns="{SVG}" width="128" height="64">'
            '<path d="M2 2H10" stroke="#212121"/><path d="M34 2H40" stroke="#212121"/>'
            '<path d="M2 34H10" stroke="#212121"/>'
            '<g clip-path="url(#clip0)"><path d="M34 34H40" stroke="#212121"/></g>'
            '<defs><clipPath id="clip0"><rect width="16" height="16" fill="white" transform="translate(32 32)"/></clipPath></defs>'
            '</svg>'
        )
        with tempfile.TemporaryDirectory() as directory:
            split_sheet(sheet, 16, ["a", "b"], Path(directory), styles=("regular", "filled"), pitch=32, rows=2)
            svg = (Path(directory) / icon_path("b", "filled", 16)).read_text()
            self.assertIn('d="M2 2H8"', svg)
            self.assertIn("<clipPath", svg)
            self.assertNotIn("translate", svg)

    def test_shift_path(self):
        self.assertEqual(shift_path("M100 200H110V-5C1 2 3 4 5 6Z", -100, -200), "M0 0H10V-205C-99-198-97-196-95-194Z")
        with self.assertRaises(ValueError):
            shift_path("M0 0a1 1 0 0 1 2 2", 0, 0)

    def test_strays_and_empty_cells_fail(self):
        stray = f'<svg xmlns="{SVG}"><path d="M300 4H310" stroke="#212121"/></svg>'
        with tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
            split_sheet(stray, 32, ["alpha"], Path(directory))
        with self.assertRaises(ValueError):
            split_sheet(stray, 20, ["alpha"])


class LibrarySizeTests(unittest.TestCase):
    def test_manifest_records_every_size(self):
        manifest = json.loads((ROOT / "manifest.json").read_text())
        self.assertEqual(manifest["sizes"], list(SIZES))
        self.assertEqual(manifest["strokeWidths"], {str(s): STROKES[s] for s in SIZES})
        for row in manifest["icons"][:25]:
            self.assertEqual(set(row["sizes"]), {str(s) for s in OPTICAL_SIZES})

    def test_presets_scale_badge_and_clearance_with_the_icon(self):
        svg = compose_svg("user", "add", cutout=True, modifier_color="currentColor", size=48)
        root = ET.fromstring(svg)
        self.assertEqual(root.get("viewBox"), "0 0 48 48")
        badge = list(root)[-1]
        self.assertEqual((badge.get("width"), badge.get("height")), ("20", "20"))
        clip = root.find(f".//{{{SVG}}}clipPath/{{{SVG}}}path")
        self.assertEqual(clip.get("transform"), "scale(2)")
        self.assertEqual(validate_svg(svg, "regular", 48), [])


if __name__ == "__main__":
    unittest.main()
