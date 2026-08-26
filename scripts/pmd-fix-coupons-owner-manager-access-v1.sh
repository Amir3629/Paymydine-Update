#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
FILE="app/admin/controllers/Coupons.php"
ROLE_FILE="app/admin/Services/PmdDefaultStaffRoleService.php"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-coupons-access-backups/${STAMP}"
TMP="$(mktemp -d)"
CANDIDATE="$TMP/Coupons.php.candidate"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

cd "$ROOT"
mkdir -p "$BACKUP"

echo "============================================================"
echo " PMD COUPONS OWNER/MANAGER ACCESS FIX V1"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

if [ ! -f "$FILE" ] || [ ! -f "$ROLE_FILE" ]; then
  echo "ERROR=Required live source file missing." >&2
  exit 2
fi

# Guard the PMD product contract before changing the controller.
grep -q "PMD.Workspace.Owner" "$ROLE_FILE" || { echo "ERROR=Owner workspace authority missing." >&2; exit 3; }
grep -q "PMD.Workspace.Manager" "$ROLE_FILE" || { echo "ERROR=Manager workspace authority missing." >&2; exit 4; }
grep -q "if (\$code === self::MANAGER)" "$ROLE_FILE" || { echo "ERROR=Managed Manager route boundary missing." >&2; exit 5; }

BEFORE_SHA="$(sha256sum "$FILE" | awk '{print $1}')"
echo "COUPONS_SHA_BEFORE=$BEFORE_SHA"

MATCHES="$(grep -Fxc "    protected \$requiredPermissions = 'Admin';" "$FILE" || true)"
if [ "$MATCHES" -ne 1 ]; then
  echo "ERROR=Expected exactly one legacy Coupons permission marker; found $MATCHES. Nothing changed." >&2
  exit 6
fi

cp "$FILE" "$BACKUP/Coupons.php.before"
sha256sum "$BACKUP/Coupons.php.before" | tee "$BACKUP/Coupons.php.before.sha256"

python3 - "$FILE" "$CANDIDATE" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1])
dst = Path(sys.argv[2])
text = src.read_text(encoding='utf-8')
old = "    protected $requiredPermissions = 'Admin';"
new = "    protected $requiredPermissions = ['Admin', 'PMD.Workspace.Owner', 'PMD.Workspace.Manager'];"
if text.count(old) != 1:
    raise SystemExit('permission marker count changed before candidate build')
dst.write_text(text.replace(old, new, 1), encoding='utf-8')
PY

php -l "$CANDIDATE"

git diff --no-index -- "$FILE" "$CANDIDATE" > "$BACKUP/proposed.diff" || true

ADDED="$(grep -Fxc "    protected \$requiredPermissions = ['Admin', 'PMD.Workspace.Owner', 'PMD.Workspace.Manager'];" "$CANDIDATE" || true)"
OLD_LEFT="$(grep -Fxc "    protected \$requiredPermissions = 'Admin';" "$CANDIDATE" || true)"
if [ "$ADDED" -ne 1 ] || [ "$OLD_LEFT" -ne 0 ]; then
  echo "ERROR=Candidate permission verification failed. Nothing changed." >&2
  exit 7
fi

# The candidate must differ only at the permission line.
CHANGE_LINES="$(grep -E '^[+-][^+-]' "$BACKUP/proposed.diff" | wc -l | tr -d ' ')"
if [ "$CHANGE_LINES" -ne 2 ]; then
  echo "ERROR=Candidate changed more than the single permission line. Nothing changed." >&2
  sed -n '1,120p' "$BACKUP/proposed.diff" >&2
  exit 8
fi

echo "--- PROPOSED DIFF ---"
sed -n '1,80p' "$BACKUP/proposed.diff"

echo "INSTALLING_WITH_SUDO=1"
sudo tee "$FILE" < "$CANDIDATE" >/dev/null

php -l "$FILE"
AFTER_SHA="$(sha256sum "$FILE" | awk '{print $1}')"
CANDIDATE_SHA="$(sha256sum "$CANDIDATE" | awk '{print $1}')"

if [ "$AFTER_SHA" != "$CANDIDATE_SHA" ]; then
  echo "ERROR=Installed hash mismatch; restoring controller." >&2
  sudo tee "$FILE" < "$BACKUP/Coupons.php.before" >/dev/null
  exit 9
fi

echo "COUPONS_SHA_AFTER=$AFTER_SHA"

FPM_SERVICE="$(systemctl list-unit-files 'php*-fpm.service' --no-legend 2>/dev/null | awk '$2 ~ /enabled|disabled|static/ {print $1; exit}')"
if [ -n "$FPM_SERVICE" ] && systemctl is-active --quiet "$FPM_SERVICE"; then
  echo "RELOADING_FPM=$FPM_SERVICE"
  sudo systemctl reload "$FPM_SERVICE"
fi

echo "============================================================"
echo " COUPONS ACCESS FIX COMPLETE"
echo "============================================================"
echo "COUPONS_ACCESS_FIX_OK=1"
echo "ALLOWED=legacy Admin OR PMD Owner OR PMD Manager"
echo "BACKUP=$BACKUP/Coupons.php.before"
echo "NEXT=Reload the current admin page, then open Coupons & Gifts again."
echo "ROLLBACK=sudo tee '$ROOT/$FILE' < '$BACKUP/Coupons.php.before' >/dev/null"
