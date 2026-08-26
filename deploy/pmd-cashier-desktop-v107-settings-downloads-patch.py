#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARK = "PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107"


def fail(message: str) -> None:
    raise SystemExit(f"PMD CASHIER V1.0.7 SETTINGS PATCH REFUSED: {message}")


def remove_devices_download_section(text: str) -> str:
    section_anchor = '<section class="pmd-owner-section" id="cashier-desktop-app">'
    section_start = text.find(section_anchor)

    if section_start >= 0:
        start = text.rfind("\n", 0, section_start) + 1

        # Include only immediately preceding blank/PMD download marker lines.
        while start > 0:
            prev_end = start - 1
            prev_start = text.rfind("\n", 0, prev_end) + 1
            previous = text[prev_start:prev_end].strip()
            if previous == "" or "PMD_CASHIER_DESKTOP_DOWNLOADS_" in previous:
                start = prev_start
                continue
            break

        section_end = text.find("</section>", section_start)
        if section_end < 0:
            fail("Devices Cashier download section has no closing </section>")
        section_end += len("</section>")
        while section_end < len(text) and text[section_end] in "\r\n":
            section_end += 1
        text = text[:start] + text[section_end:]

    # Remove the malformed old marker that was rendering visibly to owners.
    text = text.replace("{-- PMD_CASHIER_DESKTOP_DOWNLOADS_R1 --}", "")

    if 'id="cashier-desktop-app"' in text:
        fail("Devices Cashier download section still present")
    if "PMD_CASHIER_DESKTOP_DOWNLOADS_R1" in text:
        fail("visible legacy Devices download marker still present")
    return text


def remove_settings_shortcut(text: str) -> str:
    pattern = re.compile(
        r"\n\s*// PMD_CASHIER_DESKTOP_SETTINGS_SHORTCUT_R1\s*\n"
        r"\s*\$this->item\('Cashier desktop app',[^\n]*\),?",
        re.M,
    )
    text, _ = pattern.subn("", text, count=1)

    if "PMD_CASHIER_DESKTOP_SETTINGS_SHORTCUT_R1" in text:
        fail("Settings Cashier shortcut marker still present")
    if "Install the main Cashier app for Windows or Mac with local printer and cash-drawer support." in text:
        fail("Settings Cashier shortcut text still present")
    return text


def settings_footer() -> str:
    return r'''
    {{-- PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107 --}}
    <style id="pmd-cashier-downloads-settings-footer-v107-style">
        #pmd-cashier-downloads-settings-footer-v107 {
            width:min(1480px,100%);
            margin:34px auto 0;
            padding:26px 2px 0;
            border-top:1px solid #d3e1e8;
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-downloads-v107__head {
            display:flex;
            align-items:flex-end;
            justify-content:space-between;
            gap:18px;
            margin-bottom:14px;
        }
        #pmd-cashier-downloads-settings-footer-v107 h2 {
            margin:0;
            color:#053a32;
            font-size:18px;
            line-height:1.2;
            font-weight:900;
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-downloads-v107__version {
            color:#647d8f;
            font-size:12px;
            font-weight:800;
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-downloads-v107__actions {
            display:grid;
            grid-template-columns:repeat(3,minmax(0,1fr));
            gap:12px;
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-download-v107 {
            display:flex;
            align-items:center;
            gap:12px;
            min-height:64px;
            padding:11px 14px;
            border:1px solid #d3e1e8;
            border-radius:14px;
            background:#fff;
            color:#053a32;
            text-decoration:none!important;
            box-shadow:0 8px 22px rgba(16,47,66,.045);
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-download-v107:hover,
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-download-v107:focus {
            border-color:#d9b76a;
            box-shadow:0 0 0 3px rgba(217,183,106,.14),0 8px 22px rgba(16,47,66,.055);
            outline:none;
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-download-v107__icon {
            display:grid;
            place-items:center;
            flex:0 0 42px;
            width:42px;
            height:42px;
            border-radius:12px;
            background:#f3f8f6;
            color:#053a32;
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-download-v107__icon svg {
            width:23px;
            height:23px;
            display:block;
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-download-v107 strong {
            display:block;
            margin:0 0 2px;
            color:#102f42;
            font-size:14px;
            line-height:1.2;
            font-weight:900;
        }
        #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-download-v107 small {
            display:block;
            color:#647d8f;
            font-size:11.5px;
            line-height:1.25;
        }
        @media(max-width:900px) {
            #pmd-cashier-downloads-settings-footer-v107 .pmd-cashier-downloads-v107__actions {
                grid-template-columns:1fr;
            }
        }
    </style>

    <section
        id="pmd-cashier-downloads-settings-footer-v107"
        aria-label="Download PayMyDine Cashier"
    >
        <div class="pmd-cashier-downloads-v107__head">
            <h2>PayMyDine Cashier</h2>
            <span class="pmd-cashier-downloads-v107__version">V1.0.7</span>
        </div>

        <div class="pmd-cashier-downloads-v107__actions">
            <a
                class="pmd-cashier-download-v107"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-Setup-1.0.7.exe"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-download-v107__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.5 4.8 10.7 3.7v7.7H2.5V4.8Zm9.2-1.25L21.5 2v9.4h-9.8V3.55ZM2.5 12.35h8.2v7.75L2.5 19v-6.65Zm9.2 0h9.8v9.4l-9.8-1.4v-8Z"/>
                    </svg>
                </span>
                <span><strong>Windows 10 / 11</strong><small>Download Cashier</small></span>
            </a>

            <a
                class="pmd-cashier-download-v107"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-1.0.7-mac-arm64.dmg"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-download-v107__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.55 2.1c.08 1.45-.49 2.55-1.2 3.35-.77.86-1.93 1.52-3.06 1.43-.1-1.39.4-2.46 1.13-3.27.74-.83 1.98-1.48 3.13-1.51ZM19.36 17.1c-.57 1.29-.84 1.86-1.58 3-.99 1.51-2.39 3.4-4.12 3.42-1.53.02-1.93-1-4.01-.99-2.08.01-2.52 1.02-4.05.99-1.72-.03-3.04-1.72-4.03-3.23C-1.2 16.05-1.49 11.08.22 8.46c1.22-1.86 3.13-2.95 4.92-2.95 1.83 0 2.98 1 4.49 1 1.47 0 2.36-1 4.47-1 1.59 0 3.28.87 4.5 2.37-3.95 2.17-3.31 7.82.76 9.22Z" transform="translate(2 0) scale(.82)"/>
                    </svg>
                </span>
                <span><strong>Mac · Apple Silicon</strong><small>M1 / M2 / M3 / M4</small></span>
            </a>

            <a
                class="pmd-cashier-download-v107"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-1.0.7-mac-x64.dmg"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-download-v107__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="6" width="12" height="12" rx="2"/>
                        <path d="M9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>
                    </svg>
                </span>
                <span><strong>Mac · Intel</strong><small>Intel x64</small></span>
            </a>
        </div>
    </section>
'''


def add_settings_footer(text: str) -> str:
    if MARK in text:
        return text

    anchor = '<script defer src="/app/admin/assets/js/pmd-settings-center-v1.js?v={{ $pmdSettingsCenterJsVersion }}"></script>'
    if anchor not in text:
        fail("Settings footer script anchor missing")

    return text.replace(anchor, settings_footer() + "\n\n" + anchor, 1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch.py <stage-root>")

    root = Path(sys.argv[1])
    devices = root / "app/admin/views/pmddevices/index.blade.php"
    settings = root / "app/admin/views/pmdsettings/index.blade.php"
    controller = root / "app/admin/controllers/Pmdsettings.php"

    for path in (devices, settings, controller):
        if not path.is_file():
            fail(f"staged authority missing: {path.relative_to(root)}")

    devices_text = remove_devices_download_section(devices.read_text(encoding="utf-8"))
    controller_text = remove_settings_shortcut(controller.read_text(encoding="utf-8"))
    settings_text = add_settings_footer(settings.read_text(encoding="utf-8"))

    required_assets = [
        "PayMyDine-Cashier-Setup-1.0.7.exe",
        "PayMyDine-Cashier-1.0.7-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.7-mac-x64.dmg",
    ]
    for name in required_assets:
        if name not in settings_text:
            fail(f"Settings footer missing asset: {name}")

    if MARK not in settings_text:
        fail("Settings footer marker missing")
    if 'id="cashier-desktop-app"' in devices_text:
        fail("Devices Cashier section remains after patch")
    if "Cashier desktop app" in controller_text:
        fail("Settings shortcut remains after patch")

    devices.write_text(devices_text, encoding="utf-8")
    controller.write_text(controller_text, encoding="utf-8")
    settings.write_text(settings_text, encoding="utf-8")

    print("PMD_CASHIER_V107_DEVICES_DOWNLOAD_CARD_REMOVED=YES")
    print("PMD_CASHIER_V107_SETTINGS_SHORTCUT_REMOVED=YES")
    print("PMD_CASHIER_V107_SETTINGS_DOWNLOAD_FOOTER_ADDED=YES")


if __name__ == "__main__":
    main()
