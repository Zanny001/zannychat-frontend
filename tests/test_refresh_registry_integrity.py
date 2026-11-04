import importlib.util
import io
from contextlib import redirect_stdout
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "refresh_registry_integrity.py"
spec = importlib.util.spec_from_file_location("refresh_registry_integrity", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class Response:
    def __init__(self, payload): self.payload = payload
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): return json.dumps(self.payload).encode()

class IntegrityRefreshTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.lock_path = Path(self.tmp.name) / "package-lock.json"
        self.pkg = {"version": "57.0.8", "resolved": "https://registry.npmjs.org/expo-contacts/-/expo-contacts-57.0.8.tgz"}
        self.lock_path.write_text(json.dumps({"packages": {"node_modules/expo-contacts": self.pkg}}))
        self.hash = "sha512-" + ("A" * 86) + "=="
        self.metadata = {"version": "57.0.8", "dist": {"tarball": self.pkg["resolved"], "integrity": self.hash}}
        self.patcher = patch.object(mod, "LOCK_PATH", self.lock_path)
        self.patcher.start()
    def tearDown(self):
        self.patcher.stop(); self.tmp.cleanup()
    def test_adds_only_registry_supplied_matching_integrity(self):
        # Do not let the synthetic fixture's success message look like a real
        # registry refresh in CI logs; this test never touches the real lockfile.
        with patch.object(mod.urllib.request, "urlopen", return_value=Response(self.metadata)), redirect_stdout(io.StringIO()):
            mod.main()
        actual = json.loads(self.lock_path.read_text())["packages"]["node_modules/expo-contacts"]["integrity"]
        self.assertEqual(actual, self.hash)
    def test_rejects_malformed_sri_even_when_it_looks_like_a_hash(self):
        bad = {**self.metadata, "dist": {**self.metadata["dist"], "integrity": "sha512-not-a-real-digest"}}
        with patch.object(mod.urllib.request, "urlopen", return_value=Response(bad)), self.assertRaises(SystemExit):
            mod.main()
        self.assertNotIn("integrity", json.loads(self.lock_path.read_text())["packages"]["node_modules/expo-contacts"])
    def test_rejects_tarball_url_mismatch(self):
        bad = {**self.metadata, "dist": {**self.metadata["dist"], "tarball": "https://evil.invalid/pkg.tgz"}}
        with patch.object(mod.urllib.request, "urlopen", return_value=Response(bad)), self.assertRaises(SystemExit):
            mod.main()
        self.assertNotIn("integrity", json.loads(self.lock_path.read_text())["packages"]["node_modules/expo-contacts"])
    def test_fails_closed_when_registry_is_unavailable(self):
        with patch.object(mod.urllib.request, "urlopen", side_effect=URLError("offline")), self.assertRaises(SystemExit):
            mod.main()
        self.assertNotIn("integrity", json.loads(self.lock_path.read_text())["packages"]["node_modules/expo-contacts"])

if __name__ == "__main__": unittest.main()
