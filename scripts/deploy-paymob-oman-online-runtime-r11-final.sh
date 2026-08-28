#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-origin/feature/paymob-oman-r1}"
TMP="/tmp/pmd-paymob-oman-r11-core-$$.sh"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

cd "$APP_DIR"

echo "=== PMD PAYMOB OMAN ONLINE R11 FINAL WRAPPER ==="
echo "Branch: $BRANCH"

git fetch origin feature/paymob-oman-r1

git show "$BRANCH:scripts/deploy-paymob-oman-online-runtime-r11.sh" > "$TMP"

# PMD_PAYMOB_OMAN_R11_FINAL_WRAPPER
# The backup directory is root-owned. Keep the transient new-file rollback list
# in the user-owned staging directory instead, while all real backups remain in
# /var/backups/paymydine.
python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
old = 'NEW_FILES="$BACKUP_DIR/new-files.txt"'
new = 'NEW_FILES="$STAGE_ROOT/new-files.txt"'

if new not in text:
    if old not in text:
        raise SystemExit('STOP: R11 core deploy new-files anchor was not found.')
    text = text.replace(old, new, 1)

if old in text or new not in text:
    raise SystemExit('STOP: R11 final wrapper could not apply rollback-state permission fix.')

path.write_text(text)
PY

chmod +x "$TMP"
grep -q 'NEW_FILES="$STAGE_ROOT/new-files.txt"' "$TMP"
grep -q 'PMD PAYMOB OMAN ONLINE RUNTIME R11' "$TMP"

echo "R11 final wrapper permission fix: OK"
echo

set +e
bash "$TMP" "$@"
RC=$?
set -e

exit "$RC"
