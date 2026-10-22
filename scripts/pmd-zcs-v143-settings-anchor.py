#!/usr/bin/env python3
"""V143: update ONLY the download link + release marker of the Device App.

Operate on a copy of the exact live VPS Blade file. Preserve all unrelated
bytes, including Staff App settings. Reject unknown/external download URLs.
"""
from __future__ import annotations

from pathlib import Path
from urllib.parse import urlsplit
import re
import sys

TARGET_URL = (
    b"https://github.com/Amir3629/Paymydine-Update/releases/download/"
    b"pmd-device-app-preview/PayMyDine-Device-App-0.6.4.apk"
)
TARGET_MARKER = b"PMD_DEVICE_APP_0_6_4_ZCS_Z100_V23"
ANCHOR = b"data-pmd-device-app-download-v21"
MARKER_RX = re.compile(rb"\bPMD_DEVICE_APP_\d+_\d+_\d+_ZCS_Z100_V\d+\b")
HREF_RX = re.compile(rb"\bhref\s*=\s*([\x22\x27])([^\x22\x27<>\r\n]{1,512})\1")
FILE_RX = re.compile(r"^PayMyDine-Device-App-\d+\.\d+\.\d+\.apk$")
SAFE_LOCAL_PREFIXES = (
    "/public/downloads/paymydine/",
    "/downloads/paymydine/",
)
SAFE_RELEASE_PREFIX = (
    "/Amir3629/Paymydine-Update/releases/download/"
    "pmd-device-app-preview/"
)


class UnsafeSettingsError(ValueError):
    pass


def validated_href(old_href: bytes) -> str:
    try:
        href = old_href.decode("ascii")
    except UnicodeError as error:
        raise UnsafeSettingsError("Device App link is not a plain ASCII URL.") from error
    parsed = urlsplit(href)
    if parsed.query or parsed.fragment or parsed.username or parsed.password:
        raise UnsafeSettingsError(
            "Device App URL contains query/fragment/credentials; refusing replacement."
        )
    if parsed.scheme or parsed.netloc:
        if (parsed.scheme != "https" or parsed.netloc != "github.com"
                or not parsed.path.startswith(SAFE_RELEASE_PREFIX)):
            raise UnsafeSettingsError(
                "Device App link uses an unexpected external download source."
            )
        basename = parsed.path[len(SAFE_RELEASE_PREFIX):]
        source = "github-release"
    else:
        if not parsed.path.startswith(SAFE_LOCAL_PREFIXES):
            raise UnsafeSettingsError(
                "Device App link is not an approved local download path."
            )
        basename = parsed.path.rsplit("/", 1)[-1]
        source = "local-file"
        if parsed.path.rsplit("/", 1)[0] + "/" not in SAFE_LOCAL_PREFIXES:
            raise UnsafeSettingsError("Unexpected Device App local subdirectory.")

    if not FILE_RX.fullmatch(basename):
        raise UnsafeSettingsError(
            "Device App link is not a recognized versioned Device APK filename."
        )
    return source


def patch_settings(original: bytes) -> bytes:
    staff_guards = (
        b"PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022",
        b"PMD_STAFF_APP_SETTINGS_DOWNLOAD_V1_20261022",
        b"PayMyDine-Staff-App-",
    )
    for required in staff_guards:
        if required not in original:
            raise UnsafeSettingsError("Separate Staff App configuration is missing.")
    if (original.count(staff_guards[0]) != 1
            or original.count(staff_guards[2]) != 1):
        raise UnsafeSettingsError("Staff App path/filename is ambiguous.")

    if original.count(ANCHOR) != 1:
        raise UnsafeSettingsError("Device App anchor missing or duplicated.")
    anchor_pos = original.index(ANCHOR)

    # Anchor must occur in the opening tag of the specific Device App link.
    tag_open = original.rfind(b"<a", max(0, anchor_pos - 1024), anchor_pos)
    tag_end = original.find(b">", anchor_pos)
    if tag_open < 0 or tag_end < 0 or tag_end - anchor_pos > 600:
        raise UnsafeSettingsError("Device App link has an unexpected HTML layout.")
    if b">" in original[tag_open:anchor_pos]:
        raise UnsafeSettingsError("Device App anchor is not in the link opening tag.")
    tag = original[tag_open:tag_end]
    all_hrefs = list(HREF_RX.finditer(tag))
    if len(all_hrefs) != 1:
        raise UnsafeSettingsError("Device App link must have exactly one href.")
    href_match = all_hrefs[0]
    if href_match.start() < anchor_pos - tag_open:
        raise UnsafeSettingsError("Device App href is outside expected anchor order.")

    label_end = original.find(b"</a>", tag_end)
    if label_end < 0 or label_end - tag_end > 3000:
        raise UnsafeSettingsError("Device App closing tag is missing.")
    if b"PayMyDine Device App" not in original[tag_end:label_end]:
        raise UnsafeSettingsError("Device App download label does not match.")
    if b"PayMyDine-Staff-App-" in original[tag_end:label_end]:
        raise UnsafeSettingsError("Staff App appeared inside Device App link.")

    old_href = href_match.group(2)
    validated_href(old_href)

    # The release marker is a comment directly preceding this exact anchor.
    markers = list(MARKER_RX.finditer(original))
    if len(markers) != 1:
        raise UnsafeSettingsError(
            "Exactly one known ZCS Device App release marker is required."
        )
    marker = markers[0]
    if not (0 < anchor_pos - marker.end() < 200):
        raise UnsafeSettingsError("Device App release marker is not beside the link.")
    if b"{{--" not in original[max(0, marker.start()-8):marker.start()]:
        raise UnsafeSettingsError("Device App marker is not a Blade comment.")

    absolute_href_start = tag_open + href_match.start(2)
    absolute_href_end = tag_open + href_match.end(2)
    # Replace bytes from right to left to retain exact offsets. No text outside
    # the two approved spans can be modified, including user's local edits.
    patched = (
        original[:absolute_href_start]
        + TARGET_URL
        + original[absolute_href_end:]
    )
    patched = (
        patched[:marker.start()]
        + TARGET_MARKER
        + patched[marker.end():]
    )
    return patched


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Usage: settings-anchor.py ORIGINAL STAGED", file=sys.stderr)
        return 2
    before_path, staged_path = map(Path, argv[1:])
    try:
        original = before_path.read_bytes()
        updated = patch_settings(original)
        staged_path.write_bytes(updated)
    except (OSError, UnsafeSettingsError) as error:
        print("STOP: " + str(error), file=sys.stderr)
        return 1
    print(
        "Settings V143: verified Device App link updated to 0.6.4; "
        "Staff App and unrelated bytes preserved."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
