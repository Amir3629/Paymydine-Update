#!/usr/bin/env python3
from pathlib import Path
import sys

MARK = "PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108"
SCRIPT = '<script defer src="/app/admin/assets/js/pmd-desktop-print-bridge-v108.js?v=108"></script>'


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
    marker = "PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107"
    if marker not in text and "PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V108" not in text:
        fail("V1.0.7/V1.0.8 Settings download footer marker missing")

    replacements = {
        "PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107": "PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V108",
        "PayMyDine-Cashier-Setup-1.0.7.exe": "PayMyDine-Cashier-Setup-1.0.8.exe",
        "PayMyDine-Cashier-1.0.7-mac-arm64.dmg": "PayMyDine-Cashier-1.0.8-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.7-mac-x64.dmg": "PayMyDine-Cashier-1.0.8-mac-x64.dmg",
        '>V1.0.7</span>': '>V1.0.8</span>',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    required = [
        "PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V108",
        "PayMyDine-Cashier-Setup-1.0.8.exe",
        "PayMyDine-Cashier-1.0.8-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.8-mac-x64.dmg",
        ">V1.0.8</span>",
    ]
    for value in required:
        if value not in text:
            fail(f"Settings V1.0.8 contract missing: {value}")
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

    invoice.write_text(invoice_text, encoding="utf-8")
    settings.write_text(settings_text, encoding="utf-8")

    print("PMD_CASHIER_V108_STANDALONE_INVOICE_DIRECT_PRINT=YES")
    print("PMD_CASHIER_V108_SETTINGS_DOWNLOADS=YES")
    print("PMD_CASHIER_V108_NATIVE_DIALOG_FALLBACK_DESKTOP=BLOCKED_BY_BRIDGE")


if __name__ == "__main__":
    main()
