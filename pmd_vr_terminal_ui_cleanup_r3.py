#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import sys

MARK = "PMD_TERMINAL_UI_ONLINE_ONLY_R3_20260905"
REL = "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"


def fail(msg: str) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly one anchor, found {count}.")
    return text.replace(old, new, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="/var/www/paymydine")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    path = root / REL
    if not path.is_file():
        fail(f"Missing {path}")

    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("Already patched:", path)
        return

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup = root / "storage" / "pmd-vr-terminal-simulator-r1" / f"cashier-clean-r3-{stamp}" / REL
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup)
    print("Backup:", backup)

    old1 = """        if (terminalProviders().length) {
          methods.push({key: 'direct_terminal', name: pmdT('payment.terminal', 'Terminal'), note: pmdT('payment.pay_connected_terminal', 'Pay on a connected terminal')});
        }
"""
    new1 = """        // PMD_TERMINAL_UI_ONLINE_ONLY_R3_20260905
        // Do not advertise Terminal because a stale/decommissioned row exists.
        if (terminalProviders().some(terminalIsOnline)) {
          methods.push({key: 'direct_terminal', name: pmdT('payment.terminal', 'Terminal'), note: pmdT('payment.pay_connected_terminal', 'Pay on a connected terminal')});
        }
"""
    text = replace_once(text, old1, new1, "Terminal method visibility")

    old2 = """            var providers = terminalProviders();
            var selected = selectedTerminal();
"""
    new2 = """            // PMD_TERMINAL_UI_ONLINE_ONLY_R3_20260905
            // Historical/offline provider records belong in Devices, not Cashier.
            var providers = terminalProviders().filter(terminalIsOnline);
            var selected = selectedTerminal();
"""
    text = replace_once(text, old2, new2, "Terminal list filtering")

    old3 = """              var status = String(provider.terminal_status || 'unknown').toLowerCase();
              var isOnline = status === 'online';
"""
    new3 = """              var status = String(provider.terminal_status || 'unknown').toLowerCase();
              var isOnline = terminalIsOnline(provider);
"""
    text = replace_once(text, old3, new3, "Terminal online rendering")

    path.write_text(text, encoding="utf-8")

    node = shutil.which("node")
    if node:
        proc = subprocess.run([node, "--check", str(path)], text=True, capture_output=True)
        if proc.stdout.strip():
            print(proc.stdout.strip())
        if proc.stderr.strip():
            print(proc.stderr.strip())
        if proc.returncode != 0:
            shutil.copy2(backup, path)
            raise RuntimeError("JavaScript syntax check failed; backup restored.")
    else:
        print("Node not installed; skipped node --check.")

    print("\nSUCCESS")
    print("Patch marker:", MARK)
    print("Cashier/Waiter will now hide decommissioned/offline terminal records.")
    print("Devices inventory is intentionally unchanged.")


if __name__ == "__main__":
    main()
