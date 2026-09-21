#!/usr/bin/env python3
from pathlib import Path
import sys

MARK = "PMD_CASHIER_DESKTOP_DOWNLOADS_V104"


def fail(msg):
    raise SystemExit(f"PMD CASHIER V1.0.4 DOWNLOAD PATCH REFUSED: {msg}")


def main():
    if len(sys.argv) != 2:
        fail("usage: patch.py <stage-root>")

    root = Path(sys.argv[1])
    view = root / "app/admin/views/pmddevices/index.blade.php"
    if not view.is_file():
        fail("pmddevices view missing")

    text = view.read_text(encoding="utf-8")
    if MARK in text:
        print("PMD_CASHIER_DESKTOP_DOWNLOADS_V104_ALREADY_PATCHED")
        return

    required = [
        "PayMyDine-Cashier-Setup-1.0.3.exe",
        "PayMyDine-Cashier-1.0.3-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.3-mac-x64.dmg",
        "PayMyDine Cashier desktop app",
    ]
    for needle in required:
        if needle not in text:
            fail(f"live authority anchor missing: {needle}")

    text = text.replace(
        "{{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V103 --}}",
        "{{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V103 --}}\n    {{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V104 --}}",
        1,
    )
    # Some synchronized live views have the older marker with one opening brace.
    if MARK not in text:
        text = text.replace(
            "{-- PMD_CASHIER_DESKTOP_DOWNLOADS_R1 --}",
            "{-- PMD_CASHIER_DESKTOP_DOWNLOADS_R1 --}\n    {{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V104 --}}",
            1,
        )

    text = text.replace("PayMyDine-Cashier-Setup-1.0.3.exe", "PayMyDine-Cashier-Setup-1.0.4.exe")
    text = text.replace("PayMyDine-Cashier-1.0.3-mac-arm64.dmg", "PayMyDine-Cashier-1.0.4-mac-arm64.dmg")
    text = text.replace("PayMyDine-Cashier-1.0.3-mac-x64.dmg", "PayMyDine-Cashier-1.0.4-mac-x64.dmg")
    text = text.replace("V1.0.3 Preview", "V1.0.4 Preview")
    text = text.replace(
        "Local Windows printer discovery, receipt printing and cash-drawer control. No separate Connector.",
        "Physical printer/drawer support plus Virtual PDF print testing. No separate Connector.",
    )
    text = text.replace(
        "For M1, M2, M3 and M4 Macs. Uses macOS CUPS for the local receipt printer and drawer.",
        "For M1, M2, M3 and M4 Macs. Physical CUPS printing plus Virtual PDF print testing.",
    )

    if MARK not in text:
        fail("V1.0.4 marker could not be inserted")
    for old in [
        "PayMyDine-Cashier-Setup-1.0.3.exe",
        "PayMyDine-Cashier-1.0.3-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.3-mac-x64.dmg",
    ]:
        if old in text:
            fail(f"old installer reference remains: {old}")

    view.write_text(text, encoding="utf-8")
    print("PMD_CASHIER_DESKTOP_DOWNLOADS_V104_PATCH_OK")


if __name__ == "__main__":
    main()
