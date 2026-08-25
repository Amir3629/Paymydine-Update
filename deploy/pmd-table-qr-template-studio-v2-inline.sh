#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-moon.paymydine.com}"
BRANCH="feature/table-qr-template-studio-v1"
VIEW_REL="app/admin/views/tables/edit.blade.php"
CSS_REL="app/admin/assets/css/pmd-table-qr-template-studio-v1.css"
JS_REL="app/admin/assets/js/pmd-table-qr-template-studio-v1.js"
PATCH_V1_REL="deploy/pmd-table-qr-template-studio-v1-patch.py"
INLINE_REL="deploy/pmd-table-qr-template-studio-v2-inline.py"

cd "$ROOT"
[[ -d .git ]] || { echo "REFUSED: PayMyDine root missing" >&2; exit 1; }
[[ -f "$VIEW_REL" ]] || { echo "REFUSED: live table edit view missing" >&2; exit 1; }

HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-qr-studio-v2-stage.XXXXXX)"
BACKUP="$(mktemp -d /tmp/pmd-qr-studio-v2-backup.XXXXXX)"
ACTIVATED=0

cleanup() { rm -rf "$STAGE" "$BACKUP"; }
rollback() {
  set +e
  echo "AUTOMATIC PMD QR TEMPLATE STUDIO R2 CODE ROLLBACK"
  if [[ -f "$BACKUP/$VIEW_REL" ]]; then
    cp -a "$BACKUP/$VIEW_REL" "$ROOT/$VIEW_REL"
  fi
  php artisan view:clear >/dev/null 2>&1 || true
  echo "PMD QR TEMPLATE STUDIO R2 CODE ROLLBACK COMPLETE"
}
on_exit() {
  rc=$?
  if [[ $rc -ne 0 && "$ACTIVATED" == 1 ]]; then rollback; fi
  cleanup
  exit $rc
}
trap on_exit EXIT

install_preserve() {
  local src="$1" dst="$2" uid gid mode
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  install -o "$uid" -g "$gid" -m "$mode" "$src" "$dst"
}

health_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || true
}

echo "============================================================"
echo "PMD TABLE QR TEMPLATE STUDIO R2 INLINE"
echo "ONE LIVE VIEW ONLY - NO STATIC ASSET DEPENDENCY"
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
echo "== FETCH REVIEWED BRANCH WITHOUT MOVING LIVE HEAD =="
git fetch origin "$BRANCH"
for rel in "$CSS_REL" "$JS_REL" "$PATCH_V1_REL" "$INLINE_REL"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  git show "FETCH_HEAD:$rel" > "$STAGE/$rel"
done
mkdir -p "$STAGE/$(dirname "$VIEW_REL")" "$BACKUP/$(dirname "$VIEW_REL")"
cp -a "$ROOT/$VIEW_REL" "$STAGE/$VIEW_REL"

echo
echo "== PATCH LIVE-AUTHORITY VIEW =="
python3 "$STAGE/$PATCH_V1_REL" "$STAGE/$VIEW_REL"
python3 "$STAGE/$INLINE_REL" "$STAGE/$VIEW_REL" "$STAGE/$CSS_REL" "$STAGE/$JS_REL"

echo
echo "== CONTRACT + SYNTAX =="
python3 -m py_compile "$STAGE/$PATCH_V1_REL" "$STAGE/$INLINE_REL"
php -l "$STAGE/$VIEW_REL"
node --check "$STAGE/$JS_REL"

grep -q 'PMD_TABLE_QR_TEMPLATE_STUDIO_V2_INLINE' "$STAGE/$VIEW_REL"
grep -q 'PMD_TABLE_QR_TEMPLATE_STUDIO_V1' "$STAGE/$VIEW_REL"
grep -q 'PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1' "$STAGE/$VIEW_REL"
grep -q "api.qrserver.com/v1/create-qr-code/?size=150x150&data=" "$STAGE/$VIEW_REL"
grep -q 'pmd_restaurant_identity_logo' "$STAGE/$VIEW_REL"
grep -q 'Powered by' "$STAGE/$VIEW_REL"
grep -q 'PayMyDine' "$STAGE/$VIEW_REL"

if grep -q '/app/admin/assets/css/pmd-table-qr-template-studio-v1.css' "$STAGE/$VIEW_REL"; then
  echo "REFUSED: external QR studio CSS reference remains" >&2
  exit 1
fi
if grep -q '/app/admin/assets/js/pmd-table-qr-template-studio-v1.js' "$STAGE/$VIEW_REL"; then
  echo "REFUSED: external QR studio JS reference remains" >&2
  exit 1
fi

TEMPLATE_COUNT="$(grep -Ec "^[[:space:]]*id: '(classic|midnight|emerald|bistro|ocean|mono|gold|coral|tent|botanical)'" "$STAGE/$VIEW_REL")"
NO_BADGE_COUNT="$(grep -c 'centerBadge: false' "$STAGE/$VIEW_REL")"
echo "TEMPLATE_COUNT=$TEMPLATE_COUNT"
echo "MAX_SCAN_TEMPLATES=$NO_BADGE_COUNT"
[[ "$TEMPLATE_COUNT" == 10 ]] || { echo "REFUSED: expected 10 QR templates" >&2; exit 1; }
[[ "$NO_BADGE_COUNT" == 2 ]] || { echo "REFUSED: expected 2 no-center-overlay templates" >&2; exit 1; }

STAGE_SHA="$(sha256sum "$STAGE/$VIEW_REL" | awk '{print $1}')"
echo "STAGE_VIEW_SHA=$STAGE_SHA"

echo
echo "== BACKUP LIVE VIEW =="
cp -a "$ROOT/$VIEW_REL" "$BACKUP/$VIEW_REL"

echo
echo "== ACTIVATE ONE VIEW FILE =="
install_preserve "$STAGE/$VIEW_REL" "$ROOT/$VIEW_REL"
ACTIVATED=1
php artisan view:clear >/dev/null

echo
echo "== POST-DEPLOY FILE PROOF =="
LIVE_SHA="$(sha256sum "$ROOT/$VIEW_REL" | awk '{print $1}')"
echo "LIVE_VIEW_SHA=$LIVE_SHA"
[[ "$LIVE_SHA" == "$STAGE_SHA" ]] || { echo "REFUSED: installed view bytes differ from staged view" >&2; exit 1; }
grep -q 'PMD_TABLE_QR_TEMPLATE_STUDIO_V2_INLINE' "$ROOT/$VIEW_REL"
grep -q 'PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1' "$ROOT/$VIEW_REL"
grep -q "api.qrserver.com/v1/create-qr-code/?size=150x150&data=" "$ROOT/$VIEW_REL"

POST_TEMPLATE_COUNT="$(grep -Ec "^[[:space:]]*id: '(classic|midnight|emerald|bistro|ocean|mono|gold|coral|tent|botanical)'" "$ROOT/$VIEW_REL")"
[[ "$POST_TEMPLATE_COUNT" == 10 ]] || { echo "REFUSED: live view does not contain 10 templates" >&2; exit 1; }

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

echo "FILES_CHANGED=1_VIEW_ONLY"
echo "QR_GENERATOR_LOGIC_CHANGED=NO"
echo "QR_PAYLOAD_CHANGED=NO"
echo "DB_CHANGES=NO"
echo "ROUTE_CONTROLLER_MODEL_CHANGES=NO"
echo "STATIC_ASSET_DEPENDENCY=NO"
echo "TEMPLATES=10"
echo "============================================================"
echo "PMD TABLE QR TEMPLATE STUDIO R2 INLINE DEPLOYED"
echo "============================================================"
ACTIVATED=0
