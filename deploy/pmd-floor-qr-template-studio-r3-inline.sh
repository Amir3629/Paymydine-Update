#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-moon.paymydine.com}"
BRANCH="feature/table-qr-template-studio-v1"
PARTIAL_REL="app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"
FLOOR_JS_REL="app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js"
BACKEND_REL="app/admin/classes/PmdCleanWorkspaceControllerV1.php"
CSS_REL="app/admin/assets/css/pmd-table-qr-template-studio-v1.css"
STUDIO_JS_REL="app/admin/assets/js/pmd-table-qr-template-studio-v1.js"
PATCH_REL="deploy/pmd-floor-qr-template-studio-r3-inline.py"

cd "$ROOT"
[[ -d .git ]] || { echo "REFUSED: PayMyDine root missing" >&2; exit 1; }
[[ -f "$PARTIAL_REL" ]] || { echo "REFUSED: live Floor partial missing" >&2; exit 1; }
[[ -f "$FLOOR_JS_REL" ]] || { echo "REFUSED: live Floor JS missing" >&2; exit 1; }
[[ -f "$BACKEND_REL" ]] || { echo "REFUSED: live Floor backend missing" >&2; exit 1; }

HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
FLOOR_JS_SHA_BEFORE="$(sha256sum "$FLOOR_JS_REL" | awk '{print $1}')"
BACKEND_SHA_BEFORE="$(sha256sum "$BACKEND_REL" | awk '{print $1}')"
STAGE="$(mktemp -d /tmp/pmd-floor-qr-r3-stage.XXXXXX)"
BACKUP="$(mktemp -d /tmp/pmd-floor-qr-r3-backup.XXXXXX)"
ACTIVATED=0

cleanup() { rm -rf "$STAGE" "$BACKUP"; }
rollback() {
  set +e
  echo "AUTOMATIC PMD FLOOR QR TEMPLATE STUDIO R3 ROLLBACK"
  if [[ -f "$BACKUP/$PARTIAL_REL" ]]; then
    mkdir -p "$ROOT/$(dirname "$PARTIAL_REL")"
    cp -a "$BACKUP/$PARTIAL_REL" "$ROOT/$PARTIAL_REL"
  fi
  php artisan view:clear >/dev/null 2>&1 || true
  echo "PMD FLOOR QR TEMPLATE STUDIO R3 ROLLBACK COMPLETE"
}
on_exit() {
  rc=$?
  if [[ $rc -ne 0 && "$ACTIVATED" == 1 ]]; then rollback; fi
  cleanup
  exit $rc
}
trap on_exit EXIT

health_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || true
}

install_preserve() {
  local src="$1" dst="$2" uid gid mode
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  install -o "$uid" -g "$gid" -m "$mode" "$src" "$dst"
}

echo "============================================================"
echo "PMD FLOOR QR TEMPLATE STUDIO R3 INLINE"
echo "REAL FLOOR/TABLE MANAGER AUTHORITY - ONE VIEW ONLY"
echo "============================================================"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $BRANCH_BEFORE"

echo
echo "== PRE-DEPLOY HEALTH =="
ADMIN_BEFORE="$(health_code "https://$TEST_HOST/admin")"
ROOT_BEFORE="$(health_code "https://$TEST_HOST/")"
echo "admin=$ADMIN_BEFORE root=$ROOT_BEFORE"
[[ "$ADMIN_BEFORE" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: admin pre-health failed" >&2; exit 1; }
[[ "$ROOT_BEFORE" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: root pre-health failed" >&2; exit 1; }

echo
echo "== LIVE AUTHORITY PROOF =="
grep -n "This table QR code" "$PARTIAL_REL" | head -n 2 || { echo "REFUSED: visible Floor QR card authority missing" >&2; exit 1; }
grep -n "data-pmd-floor-table-qr-download" "$PARTIAL_REL" | head -n 2 || { echo "REFUSED: visible Floor QR button missing" >&2; exit 1; }
grep -n "onPmdFloorTableManagerQrDownload" "$FLOOR_JS_REL" | head -n 2 || { echo "REFUSED: existing Floor QR handler bridge missing" >&2; exit 1; }
grep -n "'qr_regenerated' => false" "$BACKEND_REL" | head -n 2 || { echo "REFUSED: existing QR no-regeneration backend contract missing" >&2; exit 1; }

echo
echo "== FETCH REVIEWED R3 WITHOUT MOVING LIVE HEAD =="
git fetch origin "$BRANCH"
for rel in "$CSS_REL" "$STUDIO_JS_REL" "$PATCH_REL"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  git show "FETCH_HEAD:$rel" > "$STAGE/$rel"
done
mkdir -p "$STAGE/$(dirname "$PARTIAL_REL")" "$BACKUP/$(dirname "$PARTIAL_REL")"
cp -a "$PARTIAL_REL" "$STAGE/$PARTIAL_REL"

echo
echo "== PATCH REAL FLOOR/TABLE MANAGER VIEW =="
python3 "$STAGE/$PATCH_REL" \
  "$STAGE/$PARTIAL_REL" \
  "$STAGE/$CSS_REL" \
  "$STAGE/$STUDIO_JS_REL"

echo
echo "== CONTRACT + SYNTAX =="
python3 -m py_compile "$STAGE/$PATCH_REL"
php -l "$STAGE/$PARTIAL_REL"
node --check "$STAGE/$STUDIO_JS_REL"

grep -q 'PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_INLINE' "$STAGE/$PARTIAL_REL"
grep -q 'data-pmd-floor-qr-template-trigger-r3' "$STAGE/$PARTIAL_REL"
grep -q 'Choose design & download' "$STAGE/$PARTIAL_REL"
grep -q 'onPmdFloorTableManagerQrDownload' "$STAGE/$PARTIAL_REL"
grep -q 'PMDFloorQrTemplateStudioR3' "$STAGE/$PARTIAL_REL"
grep -q 'pmd_restaurant_identity_logo' "$STAGE/$PARTIAL_REL"
grep -q 'Powered by' "$STAGE/$PARTIAL_REL"
grep -q 'PayMyDine' "$STAGE/$PARTIAL_REL"

TEMPLATE_COUNT="$(grep -Ec "^[[:space:]]*id: '(classic|midnight|emerald|bistro|ocean|mono|gold|coral|tent|botanical)'" "$STAGE/$PARTIAL_REL")"
MAX_SCAN_COUNT="$(grep -c 'centerBadge: false' "$STAGE/$PARTIAL_REL")"
echo "TEMPLATE_COUNT=$TEMPLATE_COUNT"
echo "MAX_SCAN_TEMPLATES=$MAX_SCAN_COUNT"
[[ "$TEMPLATE_COUNT" == 10 ]] || { echo "REFUSED: expected 10 templates" >&2; exit 1; }
[[ "$MAX_SCAN_COUNT" == 2 ]] || { echo "REFUSED: expected 2 no-center-overlay templates" >&2; exit 1; }

STAGE_SHA="$(sha256sum "$STAGE/$PARTIAL_REL" | awk '{print $1}')"
echo "STAGE_VIEW_SHA=$STAGE_SHA"

echo
echo "== BACKUP LIVE FLOOR PARTIAL =="
cp -a "$PARTIAL_REL" "$BACKUP/$PARTIAL_REL"

echo
echo "== ACTIVATE ONE VIEW FILE ONLY =="
install_preserve "$STAGE/$PARTIAL_REL" "$PARTIAL_REL"
ACTIVATED=1
php artisan view:clear >/dev/null

echo
echo "== POST-DEPLOY FILE PROOF =="
LIVE_SHA="$(sha256sum "$PARTIAL_REL" | awk '{print $1}')"
echo "LIVE_VIEW_SHA=$LIVE_SHA"
[[ "$LIVE_SHA" == "$STAGE_SHA" ]] || { echo "REFUSED: live Floor partial differs from staged bytes" >&2; exit 1; }
grep -q 'PMD_FLOOR_QR_TEMPLATE_STUDIO_R3_INLINE' "$PARTIAL_REL"
grep -q 'data-pmd-floor-qr-template-trigger-r3' "$PARTIAL_REL"
grep -q 'Choose design & download' "$PARTIAL_REL"
[[ "$(grep -Ec "^[[:space:]]*id: '(classic|midnight|emerald|bistro|ocean|mono|gold|coral|tent|botanical)'" "$PARTIAL_REL")" == 10 ]] || { echo "REFUSED: live template count is not 10" >&2; exit 1; }

FLOOR_JS_SHA_AFTER="$(sha256sum "$FLOOR_JS_REL" | awk '{print $1}')"
BACKEND_SHA_AFTER="$(sha256sum "$BACKEND_REL" | awk '{print $1}')"
echo "FLOOR_JS_BEFORE=$FLOOR_JS_SHA_BEFORE"
echo "FLOOR_JS_AFTER =$FLOOR_JS_SHA_AFTER"
echo "BACKEND_BEFORE=$BACKEND_SHA_BEFORE"
echo "BACKEND_AFTER =$BACKEND_SHA_AFTER"
[[ "$FLOOR_JS_SHA_AFTER" == "$FLOOR_JS_SHA_BEFORE" ]] || { echo "REFUSED: Floor JS changed unexpectedly" >&2; exit 1; }
[[ "$BACKEND_SHA_AFTER" == "$BACKEND_SHA_BEFORE" ]] || { echo "REFUSED: Floor backend changed unexpectedly" >&2; exit 1; }

echo
echo "== POST-DEPLOY HEALTH =="
ADMIN_AFTER="$(health_code "https://$TEST_HOST/admin")"
ROOT_AFTER="$(health_code "https://$TEST_HOST/")"
echo "admin=$ADMIN_AFTER root=$ROOT_AFTER"
[[ "$ADMIN_AFTER" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: admin post-health failed" >&2; exit 1; }
[[ "$ROOT_AFTER" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: root post-health failed" >&2; exit 1; }

HEAD_AFTER="$(git rev-parse HEAD)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || { echo "REFUSED: live Git HEAD moved" >&2; exit 1; }

echo "FILES_CHANGED=1_FLOOR_VIEW_ONLY"
echo "EXISTING_QR_BACKEND_REUSED=YES"
echo "QR_GENERATOR_CHANGED=NO"
echo "QR_PAYLOAD_CHANGED=NO"
echo "DB_CHANGES=NO"
echo "FLOOR_ENGINE_JS_CHANGED=NO"
echo "ROUTE_CONTROLLER_MODEL_CHANGES=NO"
echo "TEMPLATES=10"
echo "============================================================"
echo "PMD FLOOR QR TEMPLATE STUDIO R3 INLINE DEPLOYED"
echo "============================================================"
ACTIVATED=0
