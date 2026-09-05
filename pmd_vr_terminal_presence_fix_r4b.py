#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import sys

MARK = "PMD_VR_CLOUD_TILL_PRESENCE_R4B_20260905"
REL = "app/Services/TerminalPayments/VrPaymentTerminalProvider.php"


def fail(msg: str) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def lint_php(path: Path) -> None:
    p = subprocess.run(["php", "-l", str(path)], text=True, capture_output=True)
    out = (p.stdout or p.stderr).strip()
    if out:
        print(out)
    if p.returncode != 0:
        raise RuntimeError(f"PHP lint failed: {path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="/var/www/paymydine")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    path = root / REL
    if not path.is_file():
        fail(f"Missing provider file: {path}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup = root / "storage" / "pmd-vr-terminal-simulator-r1" / f"presence-r4b-{stamp}" / REL
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup)
    print("Backup:", backup)

    try:
        text = path.read_text(encoding="utf-8")

        if MARK in text:
            print("Provider already patched.")
        else:
            target = "'customersPresence' => 'PHYSICAL_PRESENT',"
            if target in text:
                lines = text.splitlines(True)
                out = []
                changed = False
                for line in lines:
                    if not changed and target in line:
                        indent = line[:len(line) - len(line.lstrip())]
                        out.append(indent + "// " + MARK + "\n")
                        out.append(indent + "// Cloud Till routing is selected by perform-transaction; do not force PHYSICAL_PRESENT here.\n")
                        changed = True
                        continue
                    out.append(line)

                if not changed:
                    fail("Could not remove PHYSICAL_PRESENT from provider.")

                text = "".join(out)
            else:
                anchor = "        $transactionPayload = [\n"
                if anchor not in text:
                    fail("Could not locate VR transaction payload.")
                text = text.replace(
                    anchor,
                    "        // " + MARK + "\n" + anchor,
                    1,
                )

            path.write_text(text, encoding="utf-8")

        lint_php(path)

        print("\nSUCCESS")
        print("Patch marker:", MARK)
        print("Provider:", path)
        print("\nNext:")
        print("  sudo systemctl reload php8.3-fpm")
        print("  Then run the separate R4 capability probe file.")

    except Exception as exc:
        print(f"\nPATCH FAILED: {exc}", file=sys.stderr)
        print("Restoring backup...", file=sys.stderr)
        shutil.copy2(backup, path)
        raise


if __name__ == "__main__":
    main()
