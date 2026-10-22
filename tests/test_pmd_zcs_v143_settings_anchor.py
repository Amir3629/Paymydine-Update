"""Fail-closed regression coverage for the bounded Device App Settings link."""
from __future__ import annotations

from pathlib import Path
import importlib.util
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
EDITOR = ROOT / "scripts" / "pmd-zcs-v143-settings-anchor.py"
CANONICAL = ROOT / "app/admin/views/pmdsettings/index.blade.php"
SPEC = importlib.util.spec_from_file_location("zcs_v143_settings", EDITOR)
assert SPEC and SPEC.loader
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class SettingsAnchorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.canonical = CANONICAL.read_bytes()
        assert cls.canonical.count(module.TARGET_URL) == 1
        assert cls.canonical.count(module.TARGET_MARKER) == 1

    def variant(
        self, url: bytes, marker: bytes,
        *,
        custom: bool = False,
    ) -> bytes:
        old = self.canonical.replace(module.TARGET_URL, url, 1)
        old = old.replace(module.TARGET_MARKER, marker, 1)
        if custom:
            # Simulate unrelated VPS edits in the exact original conflicting
            # <a> hunk AND the Staff App section, including non-ASCII.
            old = old.replace(
                module.ANCHOR,
                module.ANCHOR + b"\n                {{-- CUSTOM LOCAL ANCHOR NOTE --}}",
                1,
            )
            old = old.replace(
                b"// PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022:",
                b"// PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022:"
                + b"\n                // caf\xc3\xa9 local staff configuration",
                1,
            )
        return old

    def expected(self, original: bytes, old_url: bytes, old_marker: bytes) -> bytes:
        return original.replace(old_url, module.TARGET_URL, 1).replace(
            old_marker, module.TARGET_MARKER, 1
        )

    def test_known_062_with_dirty_staff_and_html(self) -> None:
        url = module.TARGET_URL.replace(b"0.6.4.apk", b"0.6.2.apk")
        marker = b"PMD_DEVICE_APP_0_6_2_ZCS_Z100_V21"
        original = self.variant(url, marker, custom=True)
        result = module.patch_settings(original)
        self.assertEqual(result, self.expected(original, url, marker))
        self.assertIn(b"caf\xc3\xa9 local staff configuration", result)

    def test_old_059_relative_public_download(self) -> None:
        url = b"/public/downloads/paymydine/PayMyDine-Device-App-0.5.9.apk"
        marker = b"PMD_DEVICE_APP_0_5_9_ZCS_Z100_V18"
        before = self.variant(url, marker, custom=True)
        self.assertEqual(
            module.patch_settings(before), self.expected(before, url, marker)
        )

    def test_old_061_github_release(self) -> None:
        url = module.TARGET_URL.replace(b"0.6.4.apk", b"0.6.1.apk")
        marker = b"PMD_DEVICE_APP_0_6_1_ZCS_Z100_V20"
        before = self.variant(url, marker)
        self.assertEqual(
            module.patch_settings(before), self.expected(before, url, marker)
        )

    def test_local_download_with_other_supported_prefix(self) -> None:
        url = b"/downloads/paymydine/PayMyDine-Device-App-0.6.2.apk"
        marker = b"PMD_DEVICE_APP_0_6_2_ZCS_Z100_V21"
        before = self.variant(url, marker)
        self.assertEqual(
            module.patch_settings(before), self.expected(before, url, marker)
        )

    def test_mixed_old_link_and_stale_marker(self) -> None:
        url = b"/public/downloads/paymydine/PayMyDine-Device-App-0.6.1.apk"
        marker = b"PMD_DEVICE_APP_0_6_2_ZCS_Z100_V21"
        before = self.variant(url, marker)
        self.assertEqual(
            module.patch_settings(before), self.expected(before, url, marker)
        )

    def test_064_is_idempotent(self) -> None:
        self.assertEqual(module.patch_settings(self.canonical), self.canonical)

    def test_unknown_external_url_refused(self) -> None:
        bad = self.canonical.replace(
            module.TARGET_URL,
            b"https://example.invalid/new/PayMyDine-Device-App-0.6.2.apk",
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(bad)

    def test_cross_repository_url_refused(self) -> None:
        bad = self.canonical.replace(
            module.TARGET_URL,
            module.TARGET_URL.replace(b"/Amir3629/", b"/SomeOtherOrg/"),
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(bad)

    def test_suspicious_url_query_refused(self) -> None:
        bad = self.canonical.replace(
            module.TARGET_URL, module.TARGET_URL + b"?token=secret"
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(bad)

    def test_unversioned_apk_refused(self) -> None:
        bad = self.canonical.replace(
            module.TARGET_URL, b"/downloads/paymydine/PayMyDine-Device-App.apk"
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(bad)

    def test_missing_staff_configuration_refused(self) -> None:
        bad = self.canonical.replace(
            b"PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022",
            b"STAFF_SETTINGS_PATH_WAS_REMOVED", 1
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(bad)

    def test_duplicate_anchor_refused(self) -> None:
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(self.canonical + module.ANCHOR)

    def test_duplicate_href_refused(self) -> None:
        bad = self.canonical.replace(
            module.ANCHOR,
            module.ANCHOR + b' href="/downloads/paymydine/PayMyDine-Device-App-0.6.2.apk"',
            1,
        )
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(bad)

    def test_missing_release_marker_refused(self) -> None:
        bad = self.canonical.replace(module.TARGET_MARKER, b"MISSING_ZCS_MARKER")
        with self.assertRaises(module.UnsafeSettingsError):
            module.patch_settings(bad)

    def test_cli_stages_copy_only(self) -> None:
        url = module.TARGET_URL.replace(b"0.6.4.apk", b"0.6.1.apk")
        marker = b"PMD_DEVICE_APP_0_6_1_ZCS_Z100_V20"
        src = self.variant(url, marker, custom=True)
        with tempfile.TemporaryDirectory() as directory:
            before = Path(directory) / "before.blade.php"
            staged = Path(directory) / "staged.blade.php"
            before.write_bytes(src)
            run = subprocess.run(
                [sys.executable, str(EDITOR), str(before), str(staged)],
                capture_output=True, text=True, check=False
            )
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertEqual(before.read_bytes(), src)
            self.assertEqual(staged.read_bytes(), self.expected(src, url, marker))


if __name__ == "__main__":
    unittest.main()
