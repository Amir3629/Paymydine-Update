#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARK = "PMD_CASHIER_DESKTOP_DOWNLOADS_V105_CLASSIC"
BRAND_MARK = "PMD_CASHIER_DESKTOP_V105_CARD_LOGO_R2"


def fail(msg):
    raise SystemExit(f"PMD CASHIER V1.0.5 CLASSIC DOWNLOAD PATCH REFUSED: {msg}")


def ensure_v105_downloads(text: str) -> str:
    if MARK in text:
        return text

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
        "For M1, M2, M3 and M4 Macs. Native macOS app icon, CUPS printing and Virtual PDF testing.",
    )
    return text


def ensure_download_card_logo(text: str) -> str:
    if BRAND_MARK in text:
        return text

    section_start = text.find('<section class="pmd-owner-section" id="cashier-desktop-app">')
    if section_start < 0:
        fail("cashier desktop app section missing")
    section_end = text.find('</section>', section_start)
    if section_end < 0:
        fail("cashier desktop app section end missing")
    section_end += len('</section>')

    section = text[section_start:section_end]
    icon_pattern = re.compile(
        r'<div class="pmd-owner-card__icon">\s*<svg\b.*?</svg>\s*</div>',
        re.S,
    )
    replacement = '''{{-- PMD_CASHIER_DESKTOP_V105_CARD_LOGO_R2 --}}
                <div class="pmd-owner-card__icon" style="background:#fff;overflow:hidden;padding:6px;">
                    <img src="/brand/paymydine-logo.svg" alt="PayMyDine" width="34" height="34" loading="lazy" style="display:block;width:100%;height:100%;object-fit:contain;">
                </div>'''
    new_section, count = icon_pattern.subn(replacement, section, count=1)
    if count != 1:
        fail("cashier desktop header icon anchor missing or ambiguous")

    return text[:section_start] + new_section + text[section_end:]


def main():
    if len(sys.argv) != 2:
        fail("usage: patch.py <stage-root>")

    root = Path(sys.argv[1])
    view = root / "app/admin/views/pmddevices/index.blade.php"
    if not view.is_file():
        fail("pmddevices view missing")

    text = view.read_text(encoding="utf-8")
    text = ensure_v105_downloads(text)
    text = ensure_download_card_logo(text)

    if MARK not in text:
        fail("V1.0.5 classic marker missing after patch")
    if BRAND_MARK not in text:
        fail("V1.0.5 download-card logo marker missing after patch")
    if '/brand/paymydine-logo.svg' not in text:
        fail("PayMyDine download-card logo path missing")

    for old in [
        "PayMyDine-Cashier-Setup-1.0.4.exe",
        "PayMyDine-Cashier-1.0.4-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.4-mac-x64.dmg",
    ]:
        if old in text:
            fail(f"old installer reference remains: {old}")

    view.write_text(text, encoding="utf-8")
    print("PMD_CASHIER_DESKTOP_DOWNLOADS_V105_CLASSIC_PATCH_OK")
    print("PMD_CASHIER_DESKTOP_V105_CARD_LOGO_R2_OK")


if __name__ == "__main__":
    main()
