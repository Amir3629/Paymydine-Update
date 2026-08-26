#!/usr/bin/env python3
from pathlib import Path
import sys

MARK = "PMD_CASHIER_DESKTOP_DOWNLOADS_V105_CLASSIC"


def fail(msg):
    raise SystemExit(f"PMD CASHIER V1.0.5 CLASSIC DOWNLOAD PATCH REFUSED: {msg}")


def main():
    if len(sys.argv) != 2:
        fail("usage: patch.py <stage-root>")

    root = Path(sys.argv[1])
    view = root / "app/admin/views/pmddevices/index.blade.php"
    if not view.is_file():
        fail("pmddevices view missing")

    text = view.read_text(encoding="utf-8")
    if MARK in text:
        print("PMD_CASHIER_DESKTOP_DOWNLOADS_V105_CLASSIC_ALREADY_PATCHED")
        return

    required = [
        "PayMyDine-Cashier-Setup-1.0.4.exe",
        "PayMyDine-Cashier-1.0.4-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.4-mac-x64.dmg",
        "PayMyDine Cashier desktop app",
    ]
    for needle in required:
        if needle not in text:
            fail(f"live authority anchor missing: {needle}")

    marker_anchor = "{{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V104 --}}"
    if marker_anchor in text:
        text = text.replace(
            marker_anchor,
            marker_anchor + "\n    {{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V105_CLASSIC --}}",
            1,
        )
    else:
        text = text.replace(
            "PayMyDine Cashier desktop app",
            "{{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V105_CLASSIC --}}\n    PayMyDine Cashier desktop app",
            1,
        )

    text = text.replace("PayMyDine-Cashier-Setup-1.0.4.exe", "PayMyDine-Cashier-Setup-1.0.5.exe")
    text = text.replace("PayMyDine-Cashier-1.0.4-mac-arm64.dmg", "PayMyDine-Cashier-1.0.5-mac-arm64.dmg")
    text = text.replace("PayMyDine-Cashier-1.0.4-mac-x64.dmg", "PayMyDine-Cashier-1.0.5-mac-x64.dmg")
    text = text.replace("V1.0.4 Preview", "V1.0.5 Preview")
    text = text.replace(
        "Physical printer/drawer support plus Virtual PDF print testing. No separate Connector.",
        "Physical printer/drawer support, Virtual PDF testing and official PayMyDine app branding. No separate Connector.",
    )
    text = text.replace(
        "For M1, M2, M3 and M4 Macs. Physical CUPS printing plus Virtual PDF print testing.",
        "For M1, M2, M3 and M4 Macs. Classic macOS package, official PayMyDine icon, CUPS printing and Virtual PDF testing.",
    )

    if MARK not in text:
        fail("V1.0.5 classic marker could not be inserted")

    for old in [
        "PayMyDine-Cashier-Setup-1.0.4.exe",
        "PayMyDine-Cashier-1.0.4-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.4-mac-x64.dmg",
    ]:
        if old in text:
            fail(f"old installer reference remains: {old}")

    view.write_text(text, encoding="utf-8")
    print("PMD_CASHIER_DESKTOP_DOWNLOADS_V105_CLASSIC_PATCH_OK")


if __name__ == "__main__":
    main()
