"""Search tags must add words people type that the name and category don't already cover."""

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BROAD = {
    "lifestyle", "shape", "shapes", "geometry", "icon", "symbol", "ui",
    "interface", "misc", "object", "file type", "body part", "anatomy",
    "generative", "sparkles",
}


class SearchTagTests(unittest.TestCase):
    def setUp(self):
        self.icons = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["icons"]

    def test_every_icon_has_three_to_eight_lowercase_tags(self):
        for icon in self.icons:
            tags = icon["tags"]
            with self.subTest(icon=icon["name"]):
                self.assertTrue(3 <= len(tags) <= 8, tags)
                self.assertEqual(len(tags), len(set(tags)), tags)
                for tag in tags:
                    self.assertRegex(tag, r"^[a-z0-9][a-z0-9 '.\-+#/]*$")
                    self.assertEqual(tag, tag.strip())
                    self.assertNotIn("  ", tag)

    def test_tags_do_not_repeat_the_name_category_or_broad_groups(self):
        for icon in self.icons:
            name_words = set(icon["name"].split("-"))
            category = icon["category"].lower()
            category_words = set(re.split(r"[^a-z0-9]+", category)) - {""}
            aliases = {alias.lower().replace("-", " ") for alias in icon["aliases"]}
            for tag in icon["tags"]:
                words = set(tag.replace("-", " ").split())
                with self.subTest(icon=icon["name"], tag=tag):
                    self.assertFalse(words <= name_words | category_words)
                    self.assertNotIn(tag, BROAD)
                    self.assertNotEqual(tag, category)
                    self.assertNotIn(tag, aliases)
                    self.assertNotIn("fedora", tag)


if __name__ == "__main__":
    unittest.main()
