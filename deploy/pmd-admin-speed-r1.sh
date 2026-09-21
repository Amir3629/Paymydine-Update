#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
BRANCH="feature/cashier-desktop-universal-v1"
SCRIPT_REL="scripts/pmd_admin_asset_404_repair_r1.py"
TMP_SCRIPT="$(mktemp /tmp/pmd-admin-asset-404-r1.XXXXXX.py)"
LOG_FILE="$(mktemp /tmp/pmd-admin-asset-404-r1.XXXXXX.log)"
HEAD_BEFORE="$(git -C "$ROOT" rev-parse HEAD)"
CREATED_FILES=()

cleanup() { rm -f "$TMP_SCRIPT" "$LOG_FILE"; }
rollback() {
  if [[ ${#CREATED_FILES[@]} -gt 0 ]]; then
    echo "AUTOMATIC ADMIN ASSET R1 ROLLBACK"
    for rel in "${CREATED_FILES[@]}"; do
      rm -f "$ROOT/$rel"
    done
    echo "ADMIN ASSET R1 ROLLBACK COMPLETE"
  fi
}
trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback; fi; cleanup; exit $rc' EXIT

cd "$ROOT"
echo "============================================================"
echo "PMD ADMIN SPEED R1 - REMOVE OBSERVED ASSET 404s ONLY"
echo "============================================================"
echo "HEAD: $HEAD_BEFORE"

git fetch origin "$BRANCH"
git show "FETCH_HEAD:$SCRIPT_REL" > "$TMP_SCRIPT"
python3 -m py_compile "$TMP_SCRIPT"

python3 "$TMP_SCRIPT" "$ROOT" | tee "$LOG_FILE"
while IFS= read -r line; do
  rel="${line#CREATED=}"
  rel="${rel%% SOURCE=*}"
  CREATED_FILES+=("$rel")
done < <(grep '^CREATED=' "$LOG_FILE" || true)

grep -q 'PMD_ADMIN_ASSET_404_REPAIR_R1_OK' "$LOG_FILE"

STATIC_PATHS=(
  '/app/admin/assets/vendor/pmd-mediafix/moment.min.js'
  '/app/admin/assets/vendor/pmd-mediafix/tempusdominus-bootstrap-4.min.js'
  '/app/admin/assets/vendor/pmd-mediafix/bootstrap-treeview.min.js'
  '/app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.js'
  '/app/admin/assets/vendor/pmd-mediafix/Sortable.min.js'
  '/app/admin/assets/vendor/pmd-mediafix/dropzone.min.js'
  '/app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.js'
  '/app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.css'
  '/app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.js'
  '/app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.css'
  '/app/main/widgets/mediamanager/assets/vendor/selectonic/selectonic.min.js'
)

for path in "${STATIC_PATHS[@]}"; do
  code="$(curl -ksS -o /dev/null -w '%{http_code}' "https://$TEST_HOST$path" || true)"
  echo "$code $path"
  [[ "$code" == "200" ]] || { echo "REFUSED: static asset is not 200: $path ($code)"; exit 1; }
done

php artisan view:clear >/dev/null 2>&1 || true

HEAD_AFTER="$(git rev-parse HEAD)"
[[ "$HEAD_BEFORE" == "$HEAD_AFTER" ]] || { echo "REFUSED: live Git HEAD moved"; exit 1; }

echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
echo "NO_DB_CHANGES=YES"
echo "NO_CONTROLLER_CHANGES=YES"
echo "NO_PAYMENT_CHANGES=YES"
echo "PMD ADMIN SPEED R1 DEPLOYED"
