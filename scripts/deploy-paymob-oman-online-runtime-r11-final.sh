#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
AUDITED_COMMIT="c341668bc0f23f5b231abf76468316e27aafe07f"
TMP="/tmp/pmd-paymob-oman-r11-core-$$.sh"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

cd "$APP_DIR"

echo "=== PMD PAYMOB OMAN ONLINE R11 FINAL WRAPPER ==="
echo "Audited source commit: $AUDITED_COMMIT"

git fetch origin feature/paymob-oman-r1

# Ensure the pinned source object is locally available after fetch.
git cat-file -e "$AUDITED_COMMIT^{commit}"

git show "$AUDITED_COMMIT:scripts/deploy-paymob-oman-online-runtime-r11.sh" > "$TMP"

# PMD_PAYMOB_OMAN_R11_FINAL_WRAPPER
# 1) Pin R11 source files to the audited commit even if the shared branch moves.
# 2) The backup directory is root-owned. Keep the transient new-file rollback
#    list in the user-owned staging directory; real backups stay in /var/backups.
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

echo "R11 final wrapper source pin + permission fix: OK"
echo

set +e
PMD_BRANCH="$AUDITED_COMMIT" bash "$TMP" "$@"
RC=$?
set -e

exit "$RC"
