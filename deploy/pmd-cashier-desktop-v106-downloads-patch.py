#!/usr/bin/env python3
from pathlib import Path
import sys

MARK = "PMD_CASHIER_DESKTOP_DOWNLOADS_V106"
SECTION_ID = '<section class="pmd-owner-section" id="cashier-desktop-app">'


def fail(msg):
    raise SystemExit(f"PMD CASHIER V1.0.6 DOWNLOAD PATCH REFUSED: {msg}")


def main():
    if len(sys.argv) != 2:
        fail("usage: patch.py <stage-root>")

    root = Path(sys.argv[1])
    view = root / "app/admin/views/pmddevices/index.blade.php"
    if not view.is_file():
        fail("pmddevices view missing")

    text = view.read_text(encoding="utf-8")
    if MARK in text:
        print("PMD_CASHIER_DESKTOP_DOWNLOADS_V106_ALREADY_PATCHED")
        return

    start = text.find(SECTION_ID)
    if start < 0:
        fail("cashier desktop app section missing")
    end = text.find("</section>", start)
    if end < 0:
        fail("cashier desktop app section end missing")
    end += len("</section>")

    section = text[start:end]
    required = [
        "PayMyDine-Cashier-Setup-1.0.5.exe",
        "PayMyDine-Cashier-1.0.5-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.5-mac-x64.dmg",
        "/brand/paymydine-logo.svg",
        "PayMyDine Cashier desktop app",
    ]
    for needle in required:
        if needle not in section:
            fail(f"live download-card anchor missing: {needle}")

    section = section.replace(
        "PayMyDine Cashier desktop app",
        "{{-- PMD_CASHIER_DESKTOP_DOWNLOADS_V106 --}}\n                    PayMyDine Cashier desktop app",
        1,
    )
    section = section.replace("PayMyDine-Cashier-Setup-1.0.5.exe", "PayMyDine-Cashier-Setup-1.0.6.exe")
    section = section.replace("PayMyDine-Cashier-1.0.5-mac-arm64.dmg", "PayMyDine-Cashier-1.0.6-mac-arm64.dmg")
    section = section.replace("PayMyDine-Cashier-1.0.5-mac-x64.dmg", "PayMyDine-Cashier-1.0.6-mac-x64.dmg")
    section = section.replace("V1.0.5 Preview", "V1.0.6 Preview")
    section = section.replace(
        "Physical printer/drawer support, Virtual PDF testing and official PayMyDine app branding. No separate Connector.",
        "Fullscreen Cashier, truthful printer/drawer diagnostics, Virtual PDF testing and official PayMyDine branding. No separate Connector.",
    )
    section = section.replace(
        "For M1, M2, M3 and M4 Macs. Native macOS app icon, CUPS printing and Virtual PDF testing.",
        "For M1, M2, M3 and M4 Macs. Fullscreen Cashier, truthful CUPS hardware status, native icon and Virtual PDF testing.",
    )

    patched = text[:start] + section + text[end:]

    if MARK not in patched:
        fail("V1.0.6 marker missing after patch")
    for new in [
        "PayMyDine-Cashier-Setup-1.0.6.exe",
        "PayMyDine-Cashier-1.0.6-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.6-mac-x64.dmg",
    ]:
        if new not in patched:
            fail(f"new installer reference missing: {new}")

    view.write_text(patched, encoding="utf-8")
    print("PMD_CASHIER_DESKTOP_DOWNLOADS_V106_PATCH_OK")


if __name__ == "__main__":
    main()
