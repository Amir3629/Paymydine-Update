#!/usr/bin/env bash
# PMD_R17_CREATE_FLOOR_CARD_SURGICAL_INSTALLER
set -Eeuo pipefail
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || {
  echo 'Usage: bash pmd-install-floor-modal-r17.sh --check|--apply'
  exit 2
}
ROOT=/var/www/paymydine
cd "$ROOT"
BRANCH=codex/floor-modal-neutral-v2-qr-guard-r17-20261026
REL=app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
[[ -f "$REL" && ! -L "$REL" ]] || { echo 'STOP: Floor view missing or symlinked'; exit 3; }
grep -q 'data-pmd-floor-add-panel' "$REL" || { echo 'STOP: Add Floor modal missing'; exit 3; }
grep -q 'data-pmd-floor-manage' "$REL" || { echo 'STOP: R45B Edit Floor authority missing'; exit 3; }

git -c gc.auto=0 -c maintenance.auto=false fetch --no-tags origin "refs/heads/${BRANCH}"
REV="$(git rev-parse FETCH_HEAD)"
TMP="$(mktemp -d -t pmd-r17-floor-stage-XXXXXXXX)"
BACKUP="$HOME/pmd-floor-modal-r17-backup-$(date +%Y%m%d_%H%M%S)-$$"
DONE=0
ACTIVE=0
cleanup(){
  local status=$?
  trap - EXIT
  if [[ "$ACTIVE" == 1 && "$DONE" == 0 ]]; then
    cp "$BACKUP/original.blade.php" "$REL" || true
    php artisan view:clear || true
  fi
  rm -rf "$TMP"
  exit "$status"
}
trap cleanup EXIT

git show "${REV}:scripts/pmd-r17-create-floor-card-patch.py" > "$TMP/patch.py"
python3 -m py_compile "$TMP/patch.py"
python3 "$TMP/patch.py" "$REL" "$TMP/staged.blade.php"
python3 "$TMP/patch.py" "$TMP/staged.blade.php" "$TMP/idempotence.blade.php"
cmp -s "$TMP/staged.blade.php" "$TMP/idempotence.blade.php" || { echo 'STOP: R17 modal patch not idempotent'; exit 4; }
php -l "$TMP/staged.blade.php"
grep -q 'data-pmd-r17-close-neutral="1"' "$TMP/staged.blade.php" || { echo 'STOP: missing white X'; exit 4; }
grep -q 'data-pmd-r17-cancel-neutral="1"' "$TMP/staged.blade.php" || { echo 'STOP: missing white Cancel'; exit 4; }
grep -q 'data-pmd-floor-add-save' "$TMP/staged.blade.php" || { echo 'STOP: Create floor Save action lost'; exit 4; }
if grep -Fq "pmdFloorRegistryText['subtitle']" "$TMP/staged.blade.php"; then
  echo 'STOP: subtitle still visible'
  exit 4
fi
echo 'PASS R17 Floor: subtitle removed, white X/Cancel, jade Create unchanged.'
if [[ "$MODE" == "--check" ]]; then
  echo 'PREFLIGHT PASS R17 Floor: NO live files changed.'
  exit 0
fi
if cmp -s "$REL" "$TMP/staged.blade.php"; then
  echo 'ALREADY INSTALLED R17 Floor.'
  exit 0
fi
mkdir -p "$BACKUP"
cp -p "$REL" "$BACKUP/original.blade.php"
printf '%s\n' "$ROOT" > "$BACKUP/root"
printf '%s\n' "$REL" > "$BACKUP/relative-path"
cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
B="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(cat "$B/root")"
REL="$(cat "$B/relative-path")"
test -f "$B/original.blade.php" || exit 2
cp "$B/original.blade.php" "$ROOT/$REL"
cd "$ROOT"
php artisan view:clear
echo 'R17 Add Floor modal source restored.'
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"
ACTIVE=1
cp "$TMP/staged.blade.php" "$REL"
php artisan view:clear
DONE=1
echo 'SUCCESS R17 Floor: white close and cancel, description removed. R16/R45B retained.'
echo "BACKUP: $BACKUP"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
