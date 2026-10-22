"""Regression tests for the V142 byte-preserving Settings migration."""
from __future__ import annotations

import importlib.util
import pathlib
import subprocess
import sys
import tempfile
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
EDITOR = ROOT / "scripts" / "pmd-zcs-v142-settings-surgical.py"
SETTINGS = ROOT / "app/admin/views/pmdsettings/index.blade.php"

spec = importlib.util.spec_from_file_location("pmd_settings_surgical", EDITOR)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SurgicalSettingsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.canonical = SETTINGS.read_bytes()
        assert cls.canonical.count(module.TARGET_URL) == 1
        assert cls.canonical.count(module.TARGET_MARKER) == 1

    def source_version(self, version: str, marker: str) -> bytes:
        raw = self.canonical.replace(
            module.TARGET_URL, module.URL_ROOT + version.encode() + b".apk"
        ).replace(module.TARGET_MARKER, marker.encode())
        self.assertNotEqual(raw, self.canonical)
        return raw

    def test_v139_062_with_user_changes_inside_git_hunk(self):
        raw = self.source_version(
            "0.6.2", "PMD_DEVICE_APP_0_6_2_ZCS_Z100_V21"
        )
        # This extra live edit changes Git's patch context at the reported
        # collision at Settings line ~1206. It must survive byte-for-byte.
        anchor = b"data-pmd-device-app-download-v21"
        raw = raw.replace(
            anchor,
            anchor + b"\n                {{-- CUSTOM_VPS_NOTE_KEEP_THIS --}}",
        )
        # Also preserve a non-ASCII user note and the existing Staff section.
        staff_tag = b"// PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022:"
        raw = raw.replace(
            staff_tag, staff_tag + b"\n                // Custom cafe: caf\xc3\xa9",
        )
        expected = raw.replace(
            module.URL_ROOT + b"0.6.2.apk", module.TARGET_URL
        ).replace(
            b"PMD_DEVICE_APP_0_6_2_ZCS_Z100_V21", module.TARGET_MARKER
        )
        self.assertEqual(module.patch_settings(raw), expected)
        staff_start = raw.rfind(b"PMD_STAFF_APP_SETTINGS_DOWNLOAD_V1_20261022")
        self.assertGreater(staff_start, 0)
        self.assertEqual(
            module.patch_settings(raw)[staff_start:], raw[staff_start:]
        )

    def test_v140_063_upgrade(self):
        raw = self.source_version(
            "0.6.3", "PMD_DEVICE_APP_0_6_3_ZCS_Z100_V22"
        )
        self.assertEqual(module.patch_settings(raw), self.canonical)

    def test_v141_064_is_idempotent(self):
        self.assertEqual(module.patch_settings(self.canonical), self.canonical)

    def test_unknown_link_is_not_overwritten(self):
        raw = self.canonical.replace(
            module.TARGET_URL, module.URL_ROOT + b"0.7.0.apk"
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(raw)

    def test_multiple_device_links_are_rejected(self):
        raw = self.canonical + b"\n" + module.TARGET_URL
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(raw)

    def test_missing_staff_path_is_rejected(self):
        raw = self.canonical.replace(
            b"PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022",
            b"STAFF_APP_PATH_WAS_REPLACED",
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(raw)

    def test_missing_marker_is_rejected(self):
        raw = self.canonical.replace(
            module.TARGET_MARKER, b"DEVICE_MARKER_WAS_REPLACED"
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(raw)

    def test_cli_writes_staged_copy_not_original(self):
        raw = self.source_version(
            "0.6.2", "PMD_DEVICE_APP_0_6_2_ZCS_Z100_V21"
        )
        with tempfile.TemporaryDirectory() as d:
            src = pathlib.Path(d) / "before.blade.php"
            dst = pathlib.Path(d) / "staged.blade.php"
            src.write_bytes(raw)
            result = subprocess.run(
                [sys.executable, str(EDITOR), str(src), str(dst)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(src.read_bytes(), raw)
            self.assertEqual(dst.read_bytes(), self.canonical)


if __name__ == "__main__":
    unittest.main()
