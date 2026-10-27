#!/usr/bin/env bash
# R46: visual-only surgery on installed R45B shared confirmation.
# Preserve all dirty VPS files including R45B safety, R17F frontend,
# tenant data, menus, orders and payments. --check writes NO app files.
set -Eeuo pipefail
MODE="${1:---check}"
if [[ "$MODE" != "--check" && "$MODE" != "--apply" ]]; then
  echo 'Usage: bash pmd-install-floor-confirm-r46.sh --check|--apply'
  exit 2
fi
ROOT=/var/www/paymydine
BRANCH=codex/floor-confirm-neutral-safety-hidden-r46-20261027
JS=app/admin/assets/js/pmd-floor-confirm-r45.js
CSS=app/admin/assets/css/pmd-floor-operational-safety-r45.css
cd "$ROOT"
for bin in git node python3 php; do
  command -v "$bin" >/dev/null || { echo "STOP: $bin not found"; exit 3; }
done
for file in "$JS" "$CSS" \
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js \
  app/admin/classes/PmdCleanWorkspaceControllerV1.php \
  app/admin/Services/PmdFloorOperationalSafetyR45.php; do
  [[ -f "$file" && ! -L "$file" ]] || {
    echo "STOP: required live R45B source absent or symlinked: $file"
    exit 3
  }
done
# This is a visual-only update; action locks remain in the original controller
# and UI. Never replace or rewrite those files.
grep -q 'PMD_R45_TABLE_SAFETY' app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js || {
  echo 'STOP: installed Edit Table R45 safety integration not found'; exit 3;
}
grep -q 'inspectTable(' app/admin/classes/PmdCleanWorkspaceControllerV1.php || {
  echo 'STOP: R45 server inspection guard not found'; exit 3;
}
[[ -n "${HOME:-}" && -d "$HOME" && -w "$HOME" ]] || {
  echo 'STOP: no writable private HOME for staging and backups'; exit 3;
}
TMP="$(mktemp -d -p "$HOME" pmd-floor-r46-stage-XXXXXXXX)"
BACKUP="$HOME/pmd-floor-r46-backup-$(date +%Y%m%d_%H%M%S)-$BASHPID"
MUTATING=0
DONE=0
cleanup(){
  local code=$?
  trap - EXIT
  if [[ "$MUTATING" == 1 && "$DONE" == 0 && -f "$BACKUP/confirm.js" && -f "$BACKUP/safety.css" ]]; then
    echo 'R46 install error: restoring exact R45B JS and CSS backups.'
    cp -p "$BACKUP/confirm.js" "$JS" || true
    cp -p "$BACKUP/safety.css" "$CSS" || true
  fi
  rm -rf -- "$TMP"
  exit "$code"
}
trap cleanup EXIT

echo '== FETCH R46 SURGICAL PATCHER + REGRESSION TEST =='
git -c gc.auto=0 -c maintenance.auto=false fetch --no-tags origin "refs/heads/$BRANCH"
REV="$(git rev-parse FETCH_HEAD)"
git show "$REV:scripts/pmd-r46-floor-confirm-patcher.py" > "$TMP/patch.py"
git show "$REV:scripts/test-pmd-floor-confirm-r46.cjs" > "$TMP/test.cjs"
python3 -m py_compile "$TMP/patch.py"
node --check "$TMP/test.cjs"

echo '== DRY RUN REAL CURRENT R45B ASSETS; NO CHECKOUT/RESET =='
python3 "$TMP/patch.py" "$JS" "$CSS" "$TMP/staged.js" "$TMP/staged.css"
python3 "$TMP/patch.py" "$TMP/staged.js" "$TMP/staged.css" \
  "$TMP/staged-twice.js" "$TMP/staged-twice.css"
cmp -s "$TMP/staged.js" "$TMP/staged-twice.js" || {
  echo 'STOP: R46 JS patch not idempotent'; exit 4;
}
cmp -s "$TMP/staged.css" "$TMP/staged-twice.css" || {
  echo 'STOP: R46 CSS patch not idempotent'; exit 4;
}
node --check "$TMP/staged.js"
node "$TMP/test.cjs" "$TMP/staged.js" "$TMP/staged.css" "$ROOT"

if [[ "$MODE" == "--check" ]]; then
  echo 'PREFLIGHT PASS R46: staged X/Cancel neutral, safety prose hidden, no destructive behavior changed.'
  echo 'No live files, tenant tables or Next V2 frontend were modified.'
  exit 0
fi

if cmp -s "$JS" "$TMP/staged.js" && cmp -s "$CSS" "$TMP/staged.css"; then
  echo 'ALREADY INSTALLED R46: no live files changed.'
  exit 0
fi
[[ -w "$JS" && -w "$CSS" ]] || {
  echo 'STOP: live R45B assets are not writable by current user'; exit 4;
}
mkdir -p "$BACKUP"
cp -p "$JS" "$BACKUP/confirm.js"
cp -p "$CSS" "$BACKUP/safety.css"
printf '%s\n' "$ROOT" > "$BACKUP/root"
cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
B="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(cat "$B/root")"
JS=app/admin/assets/js/pmd-floor-confirm-r45.js
CSS=app/admin/assets/css/pmd-floor-operational-safety-r45.css
test -f "$B/confirm.js" && test -f "$B/safety.css" || exit 2
cp -p "$B/confirm.js" "$ROOT/$JS"
cp -p "$B/safety.css" "$ROOT/$CSS"
echo 'R46 visual-only changes rolled back; R45B action guards retained.'
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

MUTATING=1
cp "$TMP/staged.js" "$JS"
cp "$TMP/staged.css" "$CSS"
node --check "$JS"
node "$TMP/test.cjs" "$JS" "$CSS" "$ROOT"
DONE=1
echo 'SUCCESS R46: Remove Table/Floor confirmation X and Cancel neutral white.'
echo 'SUCCESS R46: Edit Table safety explanation hidden; all safety guards retained.'
echo 'No tenant DB, Frontend V2, Floor registry, order or payment files changed.'
echo "BACKUP: $BACKUP"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
echo 'BROWSER: hard-refresh Owner Dashboard (Cmd+Shift+R) and verify Remove Table and locked Edit Table.'
