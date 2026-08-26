#!/usr/bin/env python3
from pathlib import Path
import sys

MARK = "PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108"
SCRIPT = '<script defer src="/app/admin/assets/js/pmd-desktop-print-bridge-v108.js?v=108"></script>'

OLD_DOWNLOADS = (
    "PayMyDine-Cashier-Setup-1.0.7.exe",
    "PayMyDine-Cashier-1.0.7-mac-arm64.dmg",
    "PayMyDine-Cashier-1.0.7-mac-x64.dmg",
)
NEW_DOWNLOADS = (
    "PayMyDine-Cashier-Setup-1.0.8.exe",
    "PayMyDine-Cashier-1.0.8-mac-arm64.dmg",
    "PayMyDine-Cashier-1.0.8-mac-x64.dmg",
)


def fail(message: str) -> None:
    raise SystemExit(f"PMD CASHIER V1.0.8 PRINT PATCH REFUSED: {message}")


def patch_invoice(text: str) -> str:
    if MARK in text or "pmd-desktop-print-bridge-v108.js" in text:
        return text
    anchor = "</body>"
    if anchor not in text:
        fail("customer invoice </body> anchor missing")
    return text.replace(anchor, f"\n<!-- {MARK} -->\n{SCRIPT}\n{anchor}", 1)


def patch_settings(text: str) -> str:
    # Current production authority is the compact V1.0.7 Cashier App launcher.
    # Do not depend on an older footer marker that no longer exists.
    if all(name in text for name in NEW_DOWNLOADS):
        return text

    missing = [name for name in OLD_DOWNLOADS if name not in text]
    if missing:
        fail("current V1.0.7 Settings download contract missing: " + ", ".join(missing))

    replacements = dict(zip(OLD_DOWNLOADS, NEW_DOWNLOADS))
    for old, new in replacements.items():
        text = text.replace(old, new)

    for value in NEW_DOWNLOADS:
        if value not in text:
            fail(f"Settings V1.0.8 contract missing: {value}")
    for value in OLD_DOWNLOADS:
        if value in text:
            fail(f"stale V1.0.7 Settings download remains: {value}")

    return text


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch.py <stage-root>")

    root = Path(sys.argv[1])
    invoice = root / "app/admin/views/orders/customer_invoice.blade.php"
    settings = root / "app/admin/views/pmdsettings/index.blade.php"
    asset = root / "app/admin/assets/js/pmd-desktop-print-bridge-v108.js"

    for path in (invoice, settings, asset):
        if not path.is_file():
            fail(f"staged authority missing: {path.relative_to(root)}")

    invoice_text = patch_invoice(invoice.read_text(encoding="utf-8"))
    settings_text = patch_settings(settings.read_text(encoding="utf-8"))
    asset_text = asset.read_text(encoding="utf-8")

    if MARK not in asset_text:
        fail("desktop print bridge JS marker missing")
    if "printReceiptUrl" not in asset_text:
        fail("desktop print bridge does not call printReceiptUrl")
    if "pmd-desktop-print-bridge-v108.js" not in invoice_text:
        fail("customer invoice bridge script injection missing")

    for value in NEW_DOWNLOADS:
        if value not in settings_text:
            fail(f"final Settings download missing: {value}")

    invoice.write_text(invoice_text, encoding="utf-8")
    settings.write_text(settings_text, encoding="utf-8")

    print("PMD_CASHIER_V108_STANDALONE_INVOICE_DIRECT_PRINT=YES")
    print("PMD_CASHIER_V108_SETTINGS_DOWNLOADS=YES")
    print("PMD_CASHIER_V108_NATIVE_DIALOG_FALLBACK_DESKTOP=BLOCKED_BY_BRIDGE")


if __name__ == "__main__":
    main()
