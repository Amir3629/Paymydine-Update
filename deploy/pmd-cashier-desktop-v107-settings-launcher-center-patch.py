#!/usr/bin/env python3
from pathlib import Path
import sys

MARK = "PMD_CASHIER_SETTINGS_LAUNCHER_V107"
CENTER_MARK = "PMD_CASHIER_SETTINGS_LAUNCHER_CENTER_R2"


def fail(message: str) -> None:
    raise SystemExit(f"PMD CASHIER SETTINGS LAUNCHER CENTER R2 REFUSED: {message}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        fail(f"{label} anchor missing")
    return text.replace(old, new, 1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch.py <stage-root>")

    root = Path(sys.argv[1])
    view = root / "app/admin/views/pmdsettings/index.blade.php"
    if not view.is_file():
        fail("staged Settings view missing")

    text = view.read_text(encoding="utf-8")
    if MARK not in text:
        fail("existing Cashier launcher marker missing")

    if CENTER_MARK in text:
        print("PMD_CASHIER_SETTINGS_LAUNCHER_CENTER_R2_ALREADY_PATCHED")
        return

    old_root = '''        #pmd-cashier-settings-launcher-v107 {
            position:fixed;
            left:112px;
            bottom:18px;
            z-index:490;
            margin:0;
            padding:0;
            border:0;
            background:transparent;
        }'''

    new_root = '''        /* PMD_CASHIER_SETTINGS_LAUNCHER_CENTER_R2 */
        #pmd-cashier-settings-launcher-v107 {
            position:fixed!important;
            left:calc(50% + 44px)!important;
            bottom:58px!important;
            z-index:490!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
            width:auto!important;
            min-width:0!important;
            max-width:none!important;
            margin:0!important;
            padding:0!important;
            border:0!important;
            background:transparent!important;
            transform:translateX(-50%)!important;
            overflow:visible!important;
        }'''
    text = replace_once(text, old_root, new_root, "launcher root")

    old_button = '''        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__button {
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
        }'''

    new_button = '''        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__button {
            position:relative!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
            gap:8px!important;
            width:184px!important;
            min-width:184px!important;
            max-width:184px!important;
            height:44px!important;
            min-height:44px!important;
            max-height:44px!important;
            margin:0!important;
            padding:5px 10px 5px 6px!important;
            border:1px solid #d8e4e8!important;
            border-radius:14px!important;
            background:#fff!important;
            color:#053a32!important;
            box-shadow:0 7px 22px rgba(5,58,50,.10)!important;
            cursor:pointer!important;
            font:inherit!important;
            text-align:left!important;
            line-height:1!important;
            overflow:hidden!important;
        }'''
    text = replace_once(text, old_button, new_button, "launcher button")

    old_brand = '''        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__brand {
            display:grid;
            place-items:center;
            flex:0 0 34px;
            width:34px;
            height:34px;
            border-radius:10px;
            background:#f5faf7;
            overflow:hidden;
        }'''
    new_brand = '''        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__brand {
            display:grid!important;
            place-items:center!important;
            flex:0 0 32px!important;
            width:32px!important;
            min-width:32px!important;
            max-width:32px!important;
            height:32px!important;
            min-height:32px!important;
            max-height:32px!important;
            margin:0!important;
            border-radius:9px!important;
            background:#f5faf7!important;
            overflow:hidden!important;
        }'''
    text = replace_once(text, old_brand, new_brand, "launcher brand")

    old_label = '''        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__label {
            flex:1 1 auto;
            color:#102f42;
            font-size:14px;
            line-height:1;
            font-weight:900;
            white-space:nowrap;
        }'''
    new_label = '''        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__label {
            position:static!important;
            display:block!important;
            flex:0 1 auto!important;
            width:auto!important;
            min-width:0!important;
            height:auto!important;
            margin:0!important;
            padding:0!important;
            color:#102f42!important;
            font-size:13.5px!important;
            line-height:1!important;
            font-weight:900!important;
            white-space:nowrap!important;
            transform:none!important;
        }'''
    text = replace_once(text, old_label, new_label, "launcher label")

    old_menu = '''        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu {
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
        }'''
    new_menu = '''        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu {
            position:absolute!important;
            left:50%!important;
            bottom:54px!important;
            width:292px!important;
            margin:0!important;
            padding:7px!important;
            border:1px solid #d8e4e8!important;
            border-radius:16px!important;
            background:#fff!important;
            box-shadow:0 18px 46px rgba(5,35,43,.18)!important;
            transform:translateX(-50%)!important;
        }'''
    text = replace_once(text, old_menu, new_menu, "launcher menu")

    old_mobile = '''        @media(max-width:820px) {
            #pmd-cashier-settings-launcher-v107 {
                left:14px;
                bottom:14px;
            }

            #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu {
                width:min(292px,calc(100vw - 28px));
            }
        }'''
    new_mobile = '''        @media(max-width:820px) {
            #pmd-cashier-settings-launcher-v107 {
                left:50%!important;
                bottom:22px!important;
                transform:translateX(-50%)!important;
            }

            #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu {
                width:min(292px,calc(100vw - 28px))!important;
            }
        }'''
    text = replace_once(text, old_mobile, new_mobile, "launcher mobile")

    view.write_text(text, encoding="utf-8")

    required = [
        CENTER_MARK,
        "left:calc(50% + 44px)!important",
        "bottom:58px!important",
        "width:184px!important",
        "left:50%!important",
        "Cashier App",
    ]
    final = view.read_text(encoding="utf-8")
    missing = [item for item in required if item not in final]
    if missing:
        fail("centered launcher contract missing: " + ", ".join(missing))

    print("PMD_CASHIER_SETTINGS_LAUNCHER_CENTER_R2_PATCH_OK")


if __name__ == "__main__":
    main()
