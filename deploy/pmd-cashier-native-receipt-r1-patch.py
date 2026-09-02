#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARKER = 'PMD_CASHIER_NATIVE_RECEIPT_R1'

if len(sys.argv) != 3:
    raise SystemExit('usage: pmd-cashier-native-receipt-r1-patch.py <customer_invoice.blade.php> <pmddevices/index.blade.php>')

invoice_path = Path(sys.argv[1])
devices_path = Path(sys.argv[2])
invoice = invoice_path.read_text(encoding='utf-8')
devices = devices_path.read_text(encoding='utf-8')

if MARKER not in invoice:
    old_button = '<button class="print-btn" onclick="window.print()">Print receipt</button>'
    if old_button not in invoice:
        raise SystemExit('REFUSED: canonical Print receipt button anchor missing')

    bridge = r'''<!-- PMD_CASHIER_NATIVE_RECEIPT_R1 -->
<script>
(function () {
    'use strict';

    window.PMDPrintReceiptNative = async function (button) {
        var desktop = window.PayMyDineDesktop;
        if (!desktop || desktop.isDesktopApp !== true || typeof desktop.printReceiptUrl !== 'function') {
            window.print();
            return { ok: true, mode: 'browser-dialog' };
        }

        var originalText = button && button.textContent ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Printing…';
        }

        try {
            var result = await desktop.printReceiptUrl(window.location.href);
            if (!result || result.ok === false) {
                throw new Error(result && result.message ? result.message : 'Receipt printing failed.');
            }
            if (button) button.textContent = 'Printed';
            return result;
        } catch (error) {
            if (button) button.textContent = originalText || 'Print receipt';
            window.alert('Receipt printing failed: ' + (error && error.message ? error.message : String(error)));
            throw error;
        } finally {
            if (button) {
                window.setTimeout(function () {
                    button.disabled = false;
                    button.textContent = originalText || 'Print receipt';
                }, 900);
            }
        }
    };
})();
</script>
<button class="print-btn" onclick="window.PMDPrintReceiptNative(this)">Print receipt</button>'''
    invoice = invoice.replace(old_button, bridge, 1)

    old_auto = "@if($auto)<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},250);});</script>@endif"
    new_auto = "@if($auto)<script>window.addEventListener('load',function(){setTimeout(function(){window.PMDPrintReceiptNative(null);},250);});</script>@endif"
    if old_auto not in invoice:
        raise SystemExit('REFUSED: canonical auto-print anchor missing')
    invoice = invoice.replace(old_auto, new_auto, 1)

# Limit version rewriting to the desktop-app card only.
section_match = re.search(
    r'(<section\s+class="pmd-owner-section"\s+id="cashier-desktop-app">.*?</section>)',
    devices,
    flags=re.S,
)
if not section_match:
    raise SystemExit('REFUSED: Cashier desktop download card missing')
section = section_match.group(1)

expected_old = [
    'PayMyDine-Cashier-Setup-1.0.1.exe',
    'PayMyDine-Cashier-1.0.1-mac-arm64.dmg',
    'PayMyDine-Cashier-1.0.1-mac-x64.dmg',
]
new_names = [name.replace('1.0.1', '1.0.2') for name in expected_old]

if all(name in section for name in new_names):
    pass
else:
    for old, new in zip(expected_old, new_names):
        if old not in section:
            raise SystemExit(f'REFUSED: expected V1.0.1 download filename missing: {old}')
        section = section.replace(old, new)
    section = section.replace('V1.0.1 Preview', 'V1.0.2 Preview')
    if 'PMD_CASHIER_DESKTOP_DOWNLOADS_R1' in section:
        section = section.replace('PMD_CASHIER_DESKTOP_DOWNLOADS_R1', 'PMD_CASHIER_DESKTOP_DOWNLOADS_R1 PMD_CASHIER_NATIVE_RECEIPT_R1')
    else:
        section = '<!-- PMD_CASHIER_NATIVE_RECEIPT_R1_DOWNLOADS -->\n' + section
    devices = devices[:section_match.start(1)] + section + devices[section_match.end(1):]

invoice_path.write_text(invoice, encoding='utf-8')
devices_path.write_text(devices, encoding='utf-8')
print('PMD_CASHIER_NATIVE_RECEIPT_R1_PATCH_OK')
