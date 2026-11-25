import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "openai_plugin.py"
spec = importlib.util.spec_from_file_location("openai_plugin", SCRIPT)
openai_plugin = importlib.util.module_from_spec(spec)
spec.loader.exec_module(openai_plugin)


class OpenAIPluginTest(unittest.TestCase):
    def test_package_passes_submission_checks(self):
        problems, warnings = openai_plugin.check(require_demo=False)
        self.assertEqual(problems, [])
        self.assertTrue(all("demo_recording_url" in w for w in warnings))


if __name__ == "__main__":
    unittest.main()
