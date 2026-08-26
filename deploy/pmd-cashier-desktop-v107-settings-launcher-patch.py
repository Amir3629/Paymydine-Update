#!/usr/bin/env python3
from pathlib import Path
import re
import sys

MARK = "PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107"
LAUNCHER_MARK = "PMD_CASHIER_SETTINGS_LAUNCHER_V107"


def fail(message: str) -> None:
    raise SystemExit(f"PMD CASHIER SETTINGS LAUNCHER V1.0.7 REFUSED: {message}")


def launcher() -> str:
    return r'''
    {{-- PMD_CASHIER_SETTINGS_LAUNCHER_V107 --}}
    <style id="pmd-cashier-settings-launcher-v107-style">
        #pmd-cashier-settings-launcher-v107 {
            position:fixed;
            left:112px;
            bottom:18px;
            z-index:490;
            margin:0;
            padding:0;
            border:0;
            background:transparent;
        }

        #pmd-cashier-settings-launcher-v107,
        #pmd-cashier-settings-launcher-v107 * {
            box-sizing:border-box;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__button {
            display:flex;
            align-items:center;
            gap:9px;
            min-width:176px;
            height:46px;
            margin:0;
            padding:6px 11px 6px 7px;
            border:1px solid #d8e4e8;
            border-radius:14px;
            background:#fff;
            color:#053a32;
            box-shadow:0 7px 22px rgba(5,58,50,.10);
            cursor:pointer;
            font:inherit;
            text-align:left;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__button:hover,
        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__button:focus-visible {
            border-color:#b8d3cb;
            box-shadow:0 0 0 3px rgba(5,58,50,.08),0 8px 24px rgba(5,58,50,.12);
            outline:none;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__brand {
            display:grid;
            place-items:center;
            flex:0 0 34px;
            width:34px;
            height:34px;
            border-radius:10px;
            background:#f5faf7;
            overflow:hidden;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__brand img {
            display:block;
            width:27px;
            height:27px;
            object-fit:contain;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__label {
            flex:1 1 auto;
            color:#102f42;
            font-size:14px;
            line-height:1;
            font-weight:900;
            white-space:nowrap;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__chevron {
            flex:0 0 16px;
            width:16px;
            height:16px;
            color:#6b7f88;
            transition:transform .16s ease;
        }

        #pmd-cashier-settings-launcher-v107[data-open="1"] .pmd-cashier-launcher-v107__chevron {
            transform:rotate(180deg);
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu {
            position:absolute;
            left:0;
            bottom:56px;
            width:292px;
            margin:0;
            padding:7px;
            border:1px solid #d8e4e8;
            border-radius:16px;
            background:#fff;
            box-shadow:0 18px 46px rgba(5,35,43,.18);
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu[hidden] {
            display:none!important;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__download {
            display:flex;
            align-items:center;
            gap:10px;
            min-height:52px;
            padding:7px 9px;
            border:0;
            border-radius:11px;
            color:#102f42;
            text-decoration:none!important;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__download:hover,
        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__download:focus-visible {
            background:#f4f8f7;
            outline:none;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform {
            display:grid;
            place-items:center;
            flex:0 0 36px;
            width:36px;
            height:36px;
            border-radius:10px;
            background:#f7fafb;
            overflow:hidden;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform svg {
            display:block;
            width:24px;
            height:24px;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform--windows {
            color:#0078d4;
            background:#eef7ff;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform--apple {
            color:#000;
            background:#f5f5f5;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform--intel {
            color:#0071c5;
            background:#eef7ff;
            font-family:Arial,Helvetica,sans-serif;
            font-size:13px;
            font-weight:900;
            letter-spacing:-.7px;
            text-transform:lowercase;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy {
            min-width:0;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy strong,
        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy small {
            display:block;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy strong {
            margin:0 0 3px;
            color:#102f42;
            font-size:13.5px;
            line-height:1.15;
            font-weight:900;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy small {
            color:#6b7f88;
            font-size:11px;
            line-height:1.2;
        }

        @media(max-width:820px) {
            #pmd-cashier-settings-launcher-v107 {
                left:14px;
                bottom:14px;
            }

            #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu {
                width:min(292px,calc(100vw - 28px));
            }
        }
    </style>

    <section
        id="pmd-cashier-settings-launcher-v107"
        aria-label="Cashier App downloads"
        data-open="0"
    >
        <div
            class="pmd-cashier-launcher-v107__menu"
            id="pmd-cashier-launcher-menu-v107"
            hidden
        >
            <a
                class="pmd-cashier-launcher-v107__download"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-Setup-1.0.7.exe"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-launcher-v107__platform pmd-cashier-launcher-v107__platform--windows" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.4 4.6 10.6 3.5v7.8H2.4V4.6Zm9.2-1.25L21.6 2v9.3h-10V3.35ZM2.4 12.3h8.2v7.9l-8.2-1.15V12.3Zm9.2 0h10v9.45l-10-1.4V12.3Z"/>
                    </svg>
                </span>
                <span class="pmd-cashier-launcher-v107__copy">
                    <strong>Windows 10 / 11</strong>
                    <small>Download .exe</small>
                </span>
            </a>

            <a
                class="pmd-cashier-launcher-v107__download"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-1.0.7-mac-arm64.dmg"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-launcher-v107__platform pmd-cashier-launcher-v107__platform--apple" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.55 2.1c.08 1.45-.49 2.55-1.2 3.35-.77.86-1.93 1.52-3.06 1.43-.1-1.39.4-2.46 1.13-3.27.74-.83 1.98-1.48 3.13-1.51ZM19.36 17.1c-.57 1.29-.84 1.86-1.58 3-.99 1.51-2.39 3.4-4.12 3.42-1.53.02-1.93-1-4.01-.99-2.08.01-2.52 1.02-4.05.99-1.72-.03-3.04-1.72-4.03-3.23C-1.2 16.05-1.49 11.08.22 8.46c1.22-1.86 3.13-2.95 4.92-2.95 1.83 0 2.98 1 4.49 1 1.47 0 2.36-1 4.47-1 1.59 0 3.28.87 4.5 2.37-3.95 2.17-3.31 7.82.76 9.22Z" transform="translate(2 0) scale(.82)"/>
                    </svg>
                </span>
                <span class="pmd-cashier-launcher-v107__copy">
                    <strong>Mac · Apple Silicon</strong>
                    <small>M1 / M2 / M3 / M4</small>
                </span>
            </a>

            <a
                class="pmd-cashier-launcher-v107__download"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-1.0.7-mac-x64.dmg"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-launcher-v107__platform pmd-cashier-launcher-v107__platform--intel" aria-hidden="true">intel</span>
                <span class="pmd-cashier-launcher-v107__copy">
                    <strong>Mac · Intel</strong>
                    <small>Intel x64</small>
                </span>
            </a>
        </div>

        <button
            type="button"
            class="pmd-cashier-launcher-v107__button"
            id="pmd-cashier-launcher-button-v107"
            aria-haspopup="menu"
            aria-controls="pmd-cashier-launcher-menu-v107"
            aria-expanded="false"
        >
            <span class="pmd-cashier-launcher-v107__brand" aria-hidden="true">
                <img src="/brand/paymydine-logo.svg" alt="">
            </span>
            <span class="pmd-cashier-launcher-v107__label">Cashier App</span>
            <svg class="pmd-cashier-launcher-v107__chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="m5 7.5 5 5 5-5"/>
            </svg>
        </button>
    </section>

    <script id="pmd-cashier-settings-launcher-v107-script">
    (function () {
        'use strict';

        var root = document.getElementById('pmd-cashier-settings-launcher-v107');
        var button = document.getElementById('pmd-cashier-launcher-button-v107');
        var menu = document.getElementById('pmd-cashier-launcher-menu-v107');

        if (!root || !button || !menu) return;

        function setOpen(open) {
            root.setAttribute('data-open', open ? '1' : '0');
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
            menu.hidden = !open;
        }

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(root.getAttribute('data-open') !== '1');
        });

        menu.addEventListener('click', function (event) {
            event.stopPropagation();
        });

        document.addEventListener('click', function () {
            setOpen(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') setOpen(false);
        });
    }());
    </script>
'''


def replace_footer(text: str) -> str:
    new = launcher()

    old_pattern = re.compile(
        r"\n\s*\{\{--\s*PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107\s*--\}\}.*?"
        r"</section>\s*",
        re.S,
    )

    if MARK in text:
        text, count = old_pattern.subn("\n" + new + "\n", text, count=1)
        if count != 1:
            fail("existing V1.0.7 footer marker found but footer block could not be replaced")
        return text

    if LAUNCHER_MARK in text:
        return text

    anchor = '<script defer src="/app/admin/assets/js/pmd-settings-center-v1.js?v={{ $pmdSettingsCenterJsVersion }}"></script>'
    if anchor not in text:
        fail("Settings script anchor missing")

    return text.replace(anchor, new + "\n\n" + anchor, 1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch.py <stage-root>")

    root = Path(sys.argv[1])
    settings = root / "app/admin/views/pmdsettings/index.blade.php"

    if not settings.is_file():
        fail("staged Settings view missing")

    text = settings.read_text(encoding="utf-8")
    text = replace_footer(text)

    required = [
        LAUNCHER_MARK,
        "Cashier App",
        "PayMyDine-Cashier-Setup-1.0.7.exe",
        "PayMyDine-Cashier-1.0.7-mac-arm64.dmg",
        "PayMyDine-Cashier-1.0.7-mac-x64.dmg",
        "/brand/paymydine-logo.svg",
        "Windows 10 / 11",
        "Mac · Apple Silicon",
        "Mac · Intel",
    ]

    for needle in required:
        if needle not in text:
            fail(f"Settings launcher contract missing: {needle}")

    if MARK in text:
        fail("old three-card footer marker still present")

    settings.write_text(text, encoding="utf-8")
    print("PMD_CASHIER_SETTINGS_LAUNCHER_V107_PATCH_OK")


if __name__ == "__main__":
    main()
