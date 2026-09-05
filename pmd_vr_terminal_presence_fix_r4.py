#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import sys

MARK = "PMD_VR_CLOUD_TILL_PRESENCE_R4_20260905"

PROVIDER_REL = "app/Services/TerminalPayments/VrPaymentTerminalProvider.php"
PROBE_REL = "pmd_vr_deep_probe.php"


def fail(msg: str) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly one anchor, found {count}.")
    return text.replace(old, new, 1)


def php_lint(path: Path) -> None:
    proc = subprocess.run(["php", "-l", str(path)], text=True, capture_output=True)
    output = (proc.stdout or proc.stderr).strip()
    if output:
        print(output)
    if proc.returncode != 0:
        raise RuntimeError(f"PHP lint failed: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fix VR Cloud Till transaction creation: do not force PHYSICAL_PRESENT."
    )
    parser.add_argument("--root", default="/var/www/paymydine")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    provider = root / PROVIDER_REL
    probe = root / PROBE_REL

    if not provider.is_file():
        fail(f"Missing provider file: {provider}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_root = root / "storage" / "pmd-vr-terminal-simulator-r1" / f"presence-r4-{stamp}"
    backup_root.mkdir(parents=True, exist_ok=True)

    targets = [provider]
    if probe.is_file():
        targets.append(probe)

    for src in targets:
        rel = src.relative_to(root)
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    print("Backup:", backup_root)

    try:
        provider_text = provider.read_text(encoding="utf-8")
        if MARK not in provider_text:
            old = """            'currency' => $currency,
            'customersPresence' => 'PHYSICAL_PRESENT',
            'language' => str_replace('_', '-', $language),
"""
            new = f"""            'currency' => $currency,
            // {MARK}
            // Cloud Till uses the terminal sales channel when perform-transaction
            // is invoked. Do not pre-classify the transaction itself as
            // PHYSICAL_PRESENT; VR Payment Acquiring card connectors expose
            // physical-terminal sales-channel support separately from customer
            // presence capability.
            'language' => str_replace('_', '-', $language),
"""
            provider_text = replace_once(
                provider_text,
                old,
                new,
                "VrPaymentTerminalProvider transaction payload"
            )
            provider.write_text(provider_text, encoding="utf-8")
        else:
            print("Provider already patched.")

        if probe.is_file():
            probe_text = probe.read_text(encoding="utf-8")
            if MARK not in probe_text:
                old = """    if ($physical) {
        $payload['customersPresence'] = 'PHYSICAL_PRESENT';
    }

    return $client->createTransaction($payload);
"""
                new = f"""    // {MARK}
    // For a Cloud Till capability probe, create the transaction the same way as
    // a normal transaction and let integrationMode=terminal / perform-transaction
    // determine terminal processing. Do not force PHYSICAL_PRESENT here.

    return $client->createTransaction($payload);
"""
                probe_text = replace_once(
                    probe_text,
                    old,
                    new,
                    "Deep probe physical-presence override"
                )
                probe.write_text(probe_text, encoding="utf-8")
            else:
                print("Deep probe already patched.")

        php_lint(provider)
        if probe.is_file():
            php_lint(probe)

        print("\nSUCCESS")
        print("Patch marker:", MARK)
        print("Provider:", provider)
        if probe.is_file():
            print("Probe:", probe)
        print("\nNext test:")
        if probe.is_file():
            print("  cd", root)
            print("  php pmd_vr_deep_probe.php --tenant=tomo --transaction-probe")
            print("\nExpected diagnostic change:")
            print("  terminal.terminal_mode.methods should no longer be empty if VR")
            print("  exposes the card method for Cloud Till in this Space.")
        else:
            print("  Re-run your VR terminal capability probe after updating it not to")
            print("  force customersPresence=PHYSICAL_PRESENT.")

        print("\nImportant:")
        print("  This fixes transaction classification only.")
        print("  A real VR approval still requires a linked/provider-issued terminal")
        print("  or simulator. Your current usable_real_terminal_count is still 0.")

    except Exception as exc:
        print(f"\nPATCH FAILED: {exc}", file=sys.stderr)
        print("Restoring backups...", file=sys.stderr)
        for src in targets:
            rel = src.relative_to(root)
            backup = backup_root / rel
            if backup.is_file():
                shutil.copy2(backup, src)
        raise


if __name__ == "__main__":
    main()
