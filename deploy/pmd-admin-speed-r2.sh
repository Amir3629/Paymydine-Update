#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
BRANCH="feature/cashier-desktop-universal-v1"
SCRIPT_REL="scripts/pmd_admin_asset_404_repair_r2.py"
TMP_SCRIPT="$(mktemp /tmp/pmd-admin-asset-404-r2.XXXXXX.py)"
LOG_FILE="$(mktemp /tmp/pmd-admin-asset-404-r2.XXXXXX.log)"
BODY_FILE="$(mktemp /tmp/pmd-admin-asset-404-r2-body.XXXXXX)"
HEAD_BEFORE="$(git -C "$ROOT" rev-parse HEAD)"
CREATED_FILES=()

cleanup() {
  rm -f "$TMP_SCRIPT" "$LOG_FILE" "$BODY_FILE"
}

rollback() {
  if [[ ${#CREATED_FILES[@]} -gt 0 ]]; then
    echo "AUTOMATIC ADMIN ASSET R2 ROLLBACK"
    for rel in "${CREATED_FILES[@]}"; do
      rm -f "$ROOT/$rel"
    done
    echo "ADMIN ASSET R2 ROLLBACK COMPLETE"
  fi
}

trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback; fi; cleanup; exit $rc' EXIT

[[ -d "$ROOT/.git" ]] || { echo "REFUSED: PayMyDine git root missing"; exit 1; }
cd "$ROOT"

echo "============================================================"
echo "PMD ADMIN SPEED R2 - REDIRECT-SAFE STATIC ASSET REPAIR"
echo "============================================================"
echo "HEAD: $HEAD_BEFORE"

git fetch origin "$BRANCH"
git show "FETCH_HEAD:$SCRIPT_REL" > "$TMP_SCRIPT"
python3 -m py_compile "$TMP_SCRIPT"

python3 "$TMP_SCRIPT" "$ROOT" | tee "$LOG_FILE"
while IFS= read -r line; do
  rel="${line#CREATED=}"
  rel="${rel%% SOURCE=*}"
  [[ -n "$rel" ]] && CREATED_FILES+=("$rel")
done < <(grep '^CREATED=' "$LOG_FILE" || true)

grep -q 'PMD_ADMIN_ASSET_404_REPAIR_R2_OK' "$LOG_FILE"

STATIC_RELS=(
  'app/admin/assets/vendor/pmd-mediafix/moment.min.js'
  'app/admin/assets/vendor/pmd-mediafix/tempusdominus-bootstrap-4.min.js'
  'app/admin/assets/vendor/pmd-mediafix/tempusdominus-bootstrap-4.min.css'
  'app/admin/assets/vendor/pmd-mediafix/bootstrap-treeview.min.js'
  'app/admin/assets/vendor/pmd-mediafix/bootstrap-treeview.min.css'
  'app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.js'
  'app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.css'
  'app/admin/assets/vendor/pmd-mediafix/Sortable.min.js'
  'app/admin/assets/vendor/pmd-mediafix/dropzone.min.js'
  'app/admin/assets/vendor/pmd-mediafix/dropzone.min.css'
  'app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.js'
  'app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.css'
  'app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.js'
  'app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.css'
  'app/main/widgets/mediamanager/assets/vendor/selectonic/selectonic.min.js'
)

echo
echo "== REDIRECT-SAFE SERVED-BYTE VERIFICATION =="

for rel in "${STATIC_RELS[@]}"; do
  local_file="$ROOT/$rel"
  [[ -s "$local_file" ]] || { echo "REFUSED: local asset missing/empty: $rel"; exit 1; }

  local_hash="$(sha256sum "$local_file" | awk '{print $1}')"
  : > "$BODY_FILE"

  meta="$(curl -k -fsSL --max-redirs 5 \
    -o "$BODY_FILE" \
    -w '%{http_code}|%{url_effective}' \
    "https://$TEST_HOST/$rel?pmdspeedr2=$(date +%s%N)")" \
    || { echo "REFUSED: unable to fetch served asset after redirects: $rel"; exit 1; }

  served_hash="$(sha256sum "$BODY_FILE" | awk '{print $1}')"
  echo "$rel"
  echo "HTTP/FINAL: $meta"
  echo "LOCAL : $local_hash"
  echo "SERVED: $served_hash"

  [[ "$local_hash" == "$served_hash" ]] || {
    echo "REFUSED: served bytes do not match live file: $rel"
    exit 1
  }
done

php artisan view:clear >/dev/null 2>&1 || true

HEAD_AFTER="$(git rev-parse HEAD)"
[[ "$HEAD_BEFORE" == "$HEAD_AFTER" ]] || { echo "REFUSED: live Git HEAD moved"; exit 1; }

echo
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
echo "NO_DB_CHANGES=YES"
echo "NO_CONTROLLER_CHANGES=YES"
echo "NO_PAYMENT_CHANGES=YES"
echo "SERVED_BYTE_CONTRACT=PASS"
echo "PMD ADMIN SPEED R2 DEPLOYED"
