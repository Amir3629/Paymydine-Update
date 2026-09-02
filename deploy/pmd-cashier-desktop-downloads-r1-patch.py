#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER = 'PMD_CASHIER_DESKTOP_DOWNLOADS_R1'
SETTINGS_MARKER = 'PMD_CASHIER_DESKTOP_SETTINGS_SHORTCUT_R1'

WINDOWS_URL = 'https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-Setup-1.0.1.exe'
MAC_ARM_URL = 'https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-1.0.1-mac-arm64.dmg'
MAC_INTEL_URL = 'https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-1.0.1-mac-x64.dmg'


def patch_settings_controller(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    if SETTINGS_MARKER in text:
        return
    anchor = "                    $this->item('Devices', 'KDS, POS terminals, cash drawers, biometric devices and connected screens.', 'monitor', admin_url('pmddevices'), ''),\n"
    if anchor not in text:
        raise RuntimeError('Pmdsettings Devices item anchor missing')
    addition = anchor + (
        f"                    // {SETTINGS_MARKER}\n"
        "                    $this->item('Cashier desktop app', 'Install the main Cashier app for Windows or Mac with local printer and cash-drawer support.', 'monitor', admin_url('pmddevices').'#cashier-desktop-app', 'Windows & Mac'),\n"
    )
    path.write_text(text.replace(anchor, addition, 1), encoding='utf-8')


def patch_devices_view(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    if MARKER in text:
        return
    anchor = '    <section class="pmd-owner-section" id="pos-devices">\n'
    if anchor not in text:
        raise RuntimeError('pmddevices POS section anchor missing')
    block = f'''    {{-- {MARKER} --}}
    <section class="pmd-owner-section" id="cashier-desktop-app">
        <div class="pmd-owner-card" data-accent="cyan">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>PayMyDine Cashier desktop app</h2>
                    <p>Install one Cashier app on the main POS. Staff on other devices can keep using the normal browser.</p>
                </div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    <div class="pmd-owner-list-row">
                        <div><strong>Windows 10 / 11</strong><small>Local Windows printer discovery, receipt printing and cash-drawer control. No separate Connector.</small></div>
                        <div class="pmd-owner-meta">V1.0.1 Preview</div>
                        <a class="pmd-owner-action" href="{WINDOWS_URL}" target="_blank" rel="noopener noreferrer">Download Windows</a>
                    </div>
                    <div class="pmd-owner-list-row">
                        <div><strong>Mac — Apple Silicon</strong><small>For M1, M2, M3 and M4 Macs. Uses macOS CUPS for the local receipt printer and drawer.</small></div>
                        <div class="pmd-owner-meta">Recommended for modern Macs</div>
                        <a class="pmd-owner-action" href="{MAC_ARM_URL}" target="_blank" rel="noopener noreferrer">Download Mac</a>
                    </div>
                    <div class="pmd-owner-list-row">
                        <div><strong>Mac — Intel</strong><small>For older Intel-based Macs.</small></div>
                        <div class="pmd-owner-meta">Intel x64</div>
                        <a class="pmd-owner-action" href="{MAC_INTEL_URL}" target="_blank" rel="noopener noreferrer">Download Intel Mac</a>
                    </div>
                </div>
                <div class="pmd-owner-empty" style="margin-top:12px;">
                    One installer works for every restaurant. On first launch, enter the restaurant code, then use the normal PayMyDine login.
                </div>
            </div>
        </div>
    </section>

'''
    path.write_text(text.replace(anchor, block + anchor, 1), encoding='utf-8')


def main() -> int:
    if len(sys.argv) != 3:
        print('usage: patch.py <Pmdsettings.php> <pmddevices/index.blade.php>', file=sys.stderr)
        return 2
    settings = Path(sys.argv[1])
    devices = Path(sys.argv[2])
    patch_settings_controller(settings)
    patch_devices_view(devices)
    print('PMD_CASHIER_DESKTOP_DOWNLOADS_R1_PATCH_OK')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
