#!/usr/bin/env python3
"""PMD_TENANT_UNAVAILABLE_INSTALLER_R1

Install the already-versioned static unavailable page behind the exact
Nginx tenant auth_request gate. Defaults to READ-ONLY DRY RUN.

Safe properties:
- Only rewrites the older landing-page error_page INSIDE marked tenant
  access gate blocks. Active tenant responses are not changed.
- Fails closed if the old fallback is outside a marked gate or if Nginx
  is already invalid.
- Backs up every file, tests configuration, then reloads Nginx.
- Automatically rolls back and retests if installation/reload fails.
- Does not touch DNS, TLS, database records, tenant status or API routes.
- Arbitrary previously unknown HTTPS subdomains additionally need wildcard
  DNS/TLS and the reviewed optional ops/nginx example vhost.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

PROJECT = Path("/var/www/paymydine")
SOURCE_PAGE = PROJECT / "public/restaurant-unavailable.html"
SOURCE_SNIPPET = PROJECT / "ops/nginx/pmd-tenant-unavailable-r1.conf"
NGINX_SNIPPET = Path("/etc/nginx/snippets/pmd-tenant-unavailable-r1.conf")
BACKUP_ROOT = Path("/var/backups/pmd-tenant-unavailable")
INCLUDE = "include /etc/nginx/snippets/pmd-tenant-unavailable-r1.conf;"
OLD = "error_page 401 403 =302 https://paymydine.com/;"
START = "# PMD_TENANT_ACCESS_GATE_R2_START"
END = "# PMD_TENANT_ACCESS_GATE_R2_END"
GATE = "auth_request /__pmd_tenant_access_check;"
SEGMENTS = re.compile(re.escape(START) + r".*?" + re.escape(END), re.DOTALL)


def run(command: list[str]) -> None:
    p = subprocess.run(command, capture_output=True, text=True, check=False)
    if p.returncode:
        raise RuntimeError(
            "{} failed (exit {}): {}".format(
                " ".join(command), p.returncode,
                (p.stderr.strip() or p.stdout.strip())[:3000]
            )
        )
    if p.stdout.strip():
        print(p.stdout.strip())
    if p.stderr.strip():
        print(p.stderr.strip())


def atomic_write(path: Path, content: bytes, original: Path | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    target = path.with_name(path.name + ".pmd-r1-" + str(os.getpid()))
    try:
        with target.open("xb") as handle:
            handle.write(content)
        if original is not None and original.exists():
            st = original.stat()
            os.chmod(target, st.st_mode & 0o7777)
            os.chown(target, st.st_uid, st.st_gid)
        else:
            os.chmod(target, 0o644)
        os.replace(target, path)
    finally:
        if target.exists():
            target.unlink()


def installed_configurations() -> list[Path]:
    paths: set[Path] = set()
    for directory in (Path("/etc/nginx/sites-enabled"), Path("/etc/nginx/conf.d")):
        if not directory.is_dir():
            continue
        for entry in directory.iterdir():
            if not entry.is_file():
                continue
            # Follow symlinks to the actual sites-available config file.
            paths.add(entry.resolve(strict=True))
    return sorted(paths)


def transform(content: str, name: str) -> tuple[str, int, int]:
    rewritten = 0
    found = 0

    def replace_segment(match: re.Match[str]) -> str:
        nonlocal rewritten, found
        segment = match.group(0)
        if GATE not in segment:
            raise RuntimeError("Gate block has no auth_request in " + name)
        if INCLUDE in segment:
            found += 1
            return segment
        occurrences = segment.count(OLD)
        if occurrences == 0:
            raise RuntimeError("Unrecognized tenant gate fallback in " + name)
        if occurrences != 1:
            raise RuntimeError("Multiple fallback directives in " + name)
        rewritten += 1
        found += 1
        return segment.replace(OLD, INCLUDE, 1)

    total_old = content.count(OLD)
    changed = SEGMENTS.sub(replace_segment, content)
    if changed.count(OLD):
        raise RuntimeError("Unmanaged PayMyDine landing redirect in " + name)
    if total_old and not found:
        raise RuntimeError("Legacy tenant redirect outside the managed gate in " + name)
    return changed, rewritten, found


def prepare() -> tuple[dict[Path, bytes], int]:
    staged: dict[Path, bytes] = {}
    total_gates = 0
    for path in installed_configurations():
        content = path.read_text(encoding="utf-8")
        if START not in content and OLD not in content:
            continue
        changed, count, found = transform(content, str(path))
        total_gates += found
        if count:
            staged[path] = changed.encode("utf-8")
            print("PATCH {}: {} gated redirect(s)".format(path, count))
        elif found:
            print("READY {}: {} gated redirect(s)".format(path, found))

    if not total_gates:
        raise RuntimeError(
            "No PMD_TENANT_ACCESS_GATE_R2 block found in loaded Nginx sites. "
            "Refusing blind config edits; inspect sudo nginx -T."
        )

    if not NGINX_SNIPPET.is_file() or (
        NGINX_SNIPPET.read_bytes() != SOURCE_SNIPPET.read_bytes()
    ):
        staged[NGINX_SNIPPET] = SOURCE_SNIPPET.read_bytes()
        print("SNIPPET: {}".format(NGINX_SNIPPET))

    return staged, total_gates


def backup(files: dict[Path, bytes]) -> Path:
    label = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    folder = BACKUP_ROOT / (label + "-" + str(os.getpid()))
    folder.mkdir(parents=True, mode=0o700)
    os.chmod(folder, 0o700)
    manifest = []
    for i, target in enumerate(files):
        original = target.exists()
        name = "{:03d}.original".format(i)
        if original:
            saved = folder / name
            shutil.copy2(target, saved)
            # Keep owner/group as well as mode/timestamps for reliable rollback.
            original_stat = target.stat()
            os.chown(saved, original_stat.st_uid, original_stat.st_gid)
        manifest.append({"path": str(target), "existed": original, "backup": name})
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    os.chmod(folder / "manifest.json", 0o600)
    return folder


def restore(folder: Path) -> None:
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    for record in manifest:
        target = Path(record["path"])
        if record["existed"]:
            source = folder / record["backup"]
            atomic_write(target, source.read_bytes(), source)
        elif target.exists():
            target.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--apply", action="store_true", help="Apply with backups, nginx -t and reload")
    group.add_argument("--rollback", metavar="BACKUP_DIR", help="Restore a prior deployment backup")
    args = parser.parse_args()

    if not SOURCE_PAGE.is_file() or not SOURCE_SNIPPET.is_file():
        raise RuntimeError("Missing versioned unavailable page or Nginx snippet in " + str(PROJECT))
    if "PayMyDine" not in SOURCE_PAGE.read_text(encoding="utf-8"):
        raise RuntimeError("Unexpected unavailable page contents")

    if args.rollback:
        if os.geteuid() != 0:
            raise RuntimeError("Run rollback with sudo")
        folder = Path(args.rollback).resolve(strict=True)
        if BACKUP_ROOT.resolve() not in folder.parents:
            raise RuntimeError("Refusing backup outside " + str(BACKUP_ROOT))
        # Save the active configuration in case the requested rollback fails.
        manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        snapshot = {Path(e["path"]): b"" for e in manifest}
        active = backup(snapshot)
        try:
            restore(folder)
            run(["nginx", "-t"])
            run(["systemctl", "reload", "nginx"])
        except Exception:
            restore(active)
            run(["nginx", "-t"])
            raise
        print("RESTORED {} (previous active backup: {})".format(folder, active))
        return 0

    staged, total_gates = prepare()
    print("Tenant access gate blocks found: {}".format(total_gates))
    print("Config files needing update: {}".format(len(staged)))
    print("Unknown subdomain HTTPS needs wildcard DNS + a matching wildcard TLS certificate.")
    print("See ops/nginx/pmd-unknown-tenant-wildcard-r1.conf.example")

    if not args.apply:
        print("DRY RUN ONLY. To install: sudo python3 scripts/pmd-install-tenant-unavailable-r1.py --apply")
        return 0
    if os.geteuid() != 0:
        raise RuntimeError("Run --apply with sudo")
    run(["nginx", "-t"])

    if not staged:
        print("ALREADY INSTALLED. No Nginx changes necessary.")
        return 0
    folder = backup(staged)
    print("BACKUP: {}".format(folder))
    try:
        for target, content in staged.items():
            atomic_write(target, content, target if target.exists() else None)
        run(["nginx", "-t"])
        run(["systemctl", "reload", "nginx"])
    except Exception:
        print("INSTALL FAILED: restoring original Nginx files", file=sys.stderr)
        restore(folder)
        run(["nginx", "-t"])
        run(["systemctl", "reload", "nginx"])
        raise
    print("INSTALLED. Active tenant requests are unchanged.")
    print("ROLLBACK: sudo python3 {} --rollback {}".format(__file__, folder))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print("ERROR: {}".format(error), file=sys.stderr)
        raise SystemExit(1)
