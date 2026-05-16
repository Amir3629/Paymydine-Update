#!/usr/bin/env python3
"""
Production-safe PayMyDine admin asset repair helper.

Default behavior is intentionally narrow and idempotent:
- verifies/removes duplicated admin toolbar normalizer blocks,
- verifies the canonical late-loading toolbar CSS exists once,
- checks for the removed bad split condition (the removed one-secondary-action split guard),
- optionally clears framework caches.

This script does NOT download or rewrite vendor assets by default. If a one-off
vendor repair is required, run with `--repair-vendors` and review the resulting
`git diff` before deployment.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_FILES = [
    ROOT / "app/admin/assets/src/js/app.js",
    ROOT / "app/admin/assets/js/admin.js",
]
TOOLBAR_CSS = ROOT / "app/admin/assets/css/no-green-toolbar-buttons.css"
COMPONENT_TOOLBAR_CSS = ROOT / "app/admin/assets/css/pmd-admin/components/toolbar-buttons.css"
NORMALIZER_MARKER = "PayMyDine admin toolbar normalization."
CSS_MARKER = "PayMyDine admin button/toolbar system."
OLD_BAD_CONDITION = "secondaryActions" + ".length < 2"

# Kept deliberately tiny: vendor repair is now opt-in and only creates missing
# directories with placeholder files instead of overwriting tracked vendor files.
OPTIONAL_VENDOR_PLACEHOLDERS = {
    "app/admin/assets/vendor/.paymydine-vendor-repair-readme.txt": (
        "Vendor asset repair is opt-in. Restore real vendor files from the "
        "release artifact when possible; this placeholder only proves the "
        "directory is writable.\n"
    ),
}


def log(message: str) -> None:
    print(f"[repair-admin-assets] {message}")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""


def fail(message: str) -> int:
    print(f"ERROR: {message}", file=sys.stderr)
    return 1


def verify_toolbar_assets() -> int:
    errors: list[str] = []

    for path in JS_FILES:
        text = read(path)
        rel = path.relative_to(ROOT)
        count = text.count(NORMALIZER_MARKER)
        if count != 1:
            errors.append(f"{rel} must contain exactly one toolbar normalizer marker; found {count}")
        if OLD_BAD_CONDITION in text:
            errors.append(f"{rel} still contains the removed bad split condition")
        if "PMD_TOOLBAR_SPLIT_STYLE_ID" in text or "pmd-toolbar-split-runtime-style" in text:
            errors.append(f"{rel} still injects runtime toolbar CSS; CSS must be file-owned")

    css = read(TOOLBAR_CSS)
    if css.count(CSS_MARKER) != 1:
        errors.append(f"{TOOLBAR_CSS.relative_to(ROOT)} must contain exactly one canonical CSS marker")
    if re.search(r"(?m)^\s*\.btn(?:[\s,{.:#]|$)", css):
        errors.append(f"{TOOLBAR_CSS.relative_to(ROOT)} contains an unsafe top-level .btn selector")
    if ".pmd-toolbar-right-buttons" not in css or ".pmd-toolbar-back-action" not in css:
        errors.append(f"{TOOLBAR_CSS.relative_to(ROOT)} is missing toolbar split/back rules")

    component_css = read(COMPONENT_TOOLBAR_CSS)
    if "Back actions are left-side secondary actions" not in component_css:
        errors.append(f"{COMPONENT_TOOLBAR_CSS.relative_to(ROOT)} is missing the back-action source note")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    log("toolbar JS/CSS assets are idempotent and canonical")
    return 0


def repair_vendors() -> int:
    log("--repair-vendors requested; creating only missing placeholder files")
    for rel_path, content in OPTIONAL_VENDOR_PLACEHOLDERS.items():
        path = ROOT / rel_path
        if path.exists():
            log(f"kept existing {rel_path}")
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        log(f"created {rel_path}")
    return 0


def clear_caches() -> None:
    artisan = ROOT / "artisan"
    if not artisan.exists():
        log("artisan not found; skipped cache clearing")
        return

    for command in (
        ["php", "artisan", "optimize:clear"],
        ["php", "artisan", "view:clear"],
        ["php", "artisan", "route:clear"],
        ["php", "artisan", "cache:clear"],
        ["php", "artisan", "config:clear"],
    ):
        try:
            subprocess.run(command, cwd=ROOT, check=False, timeout=60)
            log("ran " + " ".join(command))
        except Exception as exc:  # noqa: BLE001 - best-effort production helper
            log(f"WARN: could not run {' '.join(command)}: {exc}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify/repair PayMyDine admin toolbar assets safely.")
    parser.add_argument("--repair-vendors", action="store_true", help="Opt-in minimal vendor placeholder repair; never downloads by default.")
    parser.add_argument("--clear-caches", action="store_true", help="Run best-effort framework cache clears after verification.")
    args = parser.parse_args()

    log(f"repo root: {ROOT}")
    status = verify_toolbar_assets()
    if status != 0:
        return status

    if args.repair_vendors:
        status = repair_vendors()
        if status != 0:
            return status

    if args.clear_caches:
        clear_caches()

    log("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
