#!/usr/bin/env python3
"""V142: surgically update ONLY the ZCS Device App link/marker in VPS Settings.

The input is a byte-for-byte copy of the user's actual on-disk Settings file.
An unknown or ambiguous link, missing Staff app, or missing marker is a HARD STOP.
All unrelated bytes, including local Staff customizations, remain untouched.
"""
from __future__ import annotations

import pathlib
import sys


VERSIONS = (
    ("0.6.2", "PMD_DEVICE_APP_0_6_2_ZCS_Z100_V21"),
    ("0.6.3", "PMD_DEVICE_APP_0_6_3_ZCS_Z100_V22"),
    ("0.6.4", "PMD_DEVICE_APP_0_6_4_ZCS_Z100_V23"),
)
URL_ROOT = (
    b"https://github.com/Amir3629/Paymydine-Update/releases/"
    b"download/pmd-device-app-preview/PayMyDine-Device-App-"
)
TARGET_URL = URL_ROOT + b"0.6.4.apk"
TARGET_MARKER = b"PMD_DEVICE_APP_0_6_4_ZCS_Z100_V23"


class UnsafeSettingsError(ValueError):
    pass


def patch_settings(original: bytes) -> bytes:
    staff_guards = (
        b"PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022",
        b"PMD_STAFF_APP_SETTINGS_DOWNLOAD_V1_20261022",
        b"PayMyDine-Staff-App-",
    )
    for required in staff_guards:
        if required not in original:
            raise UnsafeSettingsError(
                "Staff App section missing; refusing to edit Settings."
            )
    # The Staff PHP download path and filename are unique; an extra CSS
    # comment may legitimately repeat the Staff section marker.
    if (original.count(staff_guards[0]) != 1 or
            original.count(staff_guards[2]) != 1):
        raise UnsafeSettingsError("Staff App path or filename is ambiguous.")

    urls = [URL_ROOT + version.encode("ascii") + b".apk"
            for version, _ in VERSIONS]
    markers = [marker.encode("ascii") for _, marker in VERSIONS]

    url_hits = [(value, original.count(value)) for value in urls]
    marker_hits = [(value, original.count(value)) for value in markers]
    if sum(count for _, count in url_hits) != 1:
        raise UnsafeSettingsError(
            "Exactly one known signed 0.6.2/0.6.3/0.6.4 Device App URL required."
        )
    if sum(count for _, count in marker_hits) != 1:
        raise UnsafeSettingsError(
            "Exactly one known Device App release marker required."
        )

    old_url = next(value for value, count in url_hits if count == 1)
    old_marker = next(value for value, count in marker_hits if count == 1)

    # Protect against matching an unrelated comment or a copied link outside
    # the signed Device App download anchor.
    anchor = b"data-pmd-device-app-download-v21"
    if original.count(anchor) != 1:
        raise UnsafeSettingsError("Device App download anchor is missing/ambiguous.")
    anchor_pos = original.index(anchor)
    url_pos = original.index(old_url)
    marker_pos = original.index(old_marker)
    if not (0 < url_pos - anchor_pos < 250 and
            -240 < marker_pos - anchor_pos < 0):
        raise UnsafeSettingsError("Device App URL/marker are outside the expected link.")

    patched = original.replace(old_url, TARGET_URL, 1)
    patched = patched.replace(old_marker, TARGET_MARKER, 1)
    if patched.count(TARGET_URL) != 1 or patched.count(TARGET_MARKER) != 1:
        raise UnsafeSettingsError("Device App URL validation failed.")
    return patched


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Usage: settings-surgical.py INPUT_ORIGINAL OUTPUT_STAGED", file=sys.stderr)
        return 2
    original_path, staged_path = map(pathlib.Path, argv[1:])
    try:
        before = original_path.read_bytes()
        after = patch_settings(before)
        staged_path.write_bytes(after)
    except (OSError, UnsafeSettingsError) as error:
        print(f"STOP: {error}", file=sys.stderr)
        return 1
    print(
        "Settings V142: Device App 0.6.4 ensured; "
        f"{len(after) - len(before):+d} bytes; Staff App and all other edits preserved."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
