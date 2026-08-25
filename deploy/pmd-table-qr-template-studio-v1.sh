#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-moon.paymydine.com}"
BRANCH="feature/table-qr-template-studio-v1"
VIEW_REL="app/admin/views/tables/edit.blade.php"
CSS_REL="app/admin/assets/css/pmd-table-qr-template-studio-v1.css"
JS_REL="app/admin/assets/js/pmd-table-qr-template-studio-v1.js"
PATCH_REL="deploy/pmd-table-qr-template-studio-v1-patch.py"

cd "$ROOT"
[[ -d .git ]] || { echo "REFUSED: PayMyDine root missing" >&2; exit 1; }

HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-qr-studio-stage.XXXXXX)"
BACKUP="$(mktemp -d /tmp/pmd-qr-studio-backup.XXXXXX)"
ACTIVATED=0
VIEW_EXISTED=1
CSS_EXISTED=0
JS_EXISTED=0

cleanup() { rm -rf "$STAGE" "$BACKUP"; }
rollback() {
  set +e
  echo "AUTOMATIC PMD QR TEMPLATE STUDIO V1 ROLLBACK"
  [[ -f "$BACKUP/$VIEW_REL" ]] && { mkdir -p "$ROOT/$(dirname "$VIEW_REL")"; cp -a "$BACKUP/$VIEW_REL" "$ROOT/$VIEW_REL"; }
  if [[ "$CSS_EXISTED" == 1 && -f "$BACKUP/$CSS_REL" ]]; then cp -a "$BACKUP/$CSS_REL" "$ROOT/$CSS_REL"; else rm -f "$ROOT/$CSS_REL"; fi
  if [[ "$JS_EXISTED" == 1 && -f "$BACKUP/$JS_REL" ]]; then cp -a "$BACKUP/$JS_REL" "$ROOT/$JS_REL"; else rm -f "$ROOT/$JS_REL"; fi
  php artisan view:clear >/dev/null 2>&1 || true
  echo "PMD QR TEMPLATE STUDIO V1 ROLLBACK COMPLETE"
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
  mkdir -p "$(dirname "$dst")"
  if [[ -e "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"; gid="$(stat -c '%g' "$dst")"; mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$(dirname "$dst")")"; gid="$(stat -c '%g' "$(dirname "$dst")")"; mode="644"
  fi
  install -o "$uid" -g "$gid" -m "$mode" "$src" "$dst"
}

verify_static() {
  local rel="$1" local_path="$ROOT/$rel" tmp meta code redirects local_sha served_sha
  tmp="$(mktemp)"
  meta="$(curl -k -sS -o "$tmp" -w '%{http_code}|%{num_redirects}' "https://$TEST_HOST/$rel?pmdqrstudio=$(date +%s%N)")"
  code="${meta%%|*}"; redirects="${meta##*|}"
  echo "$rel HTTP=$code REDIRECTS=$redirects"
  [[ "$code" == 200 && "$redirects" == 0 ]] || { rm -f "$tmp"; return 1; }
  local_sha="$(sha256sum "$local_path" | awk '{print $1}')"
  served_sha="$(sha256sum "$tmp" | awk '{print $1}')"
  rm -f "$tmp"
  echo "LOCAL =$local_sha"
  echo "SERVED=$served_sha"
  [[ "$local_sha" == "$served_sha" ]]
}

echo "============================================================"
echo "PMD TABLE QR TEMPLATE STUDIO V1"
echo "UI/DOWNLOAD LAYER ONLY - QR PAYLOAD AUTHORITY UNCHANGED"
echo "============================================================"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $BRANCH_BEFORE"

echo
echo "== PRECHECK =="
[[ -f "$ROOT/$VIEW_REL" ]] || { echo "REFUSED: live table edit view missing" >&2; exit 1; }
pre_code="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
echo "admin=$pre_code"
[[ "$pre_code" =~ ^[23][0-9][0-9]$ ]] || { echo "REFUSED: test tenant admin is not healthy" >&2; exit 1; }

echo
echo "== FETCH REVIEWED BRANCH WITHOUT MOVING LIVE HEAD =="
git fetch origin "$BRANCH"
mkdir -p "$STAGE/$(dirname "$CSS_REL")" "$STAGE/$(dirname "$JS_REL")" "$STAGE/$(dirname "$VIEW_REL")" "$STAGE/$(dirname "$PATCH_REL")"
git show "FETCH_HEAD:$CSS_REL" > "$STAGE/$CSS_REL"
git show "FETCH_HEAD:$JS_REL" > "$STAGE/$JS_REL"
git show "FETCH_HEAD:$PATCH_REL" > "$STAGE/$PATCH_REL"
cp -a "$ROOT/$VIEW_REL" "$STAGE/$VIEW_REL"

echo
echo "== PATCH LIVE-AUTHORITY TABLE VIEW =="
python3 "$STAGE/$PATCH_REL" "$STAGE/$VIEW_REL"

echo
echo "== CONTRACT + SYNTAX =="
python3 -m py_compile "$STAGE/$PATCH_REL"
php -l "$STAGE/$VIEW_REL"
node --check "$STAGE/$JS_REL"
grep -q 'PMD_TABLE_QR_TEMPLATE_STUDIO_V1' "$STAGE/$VIEW_REL"
grep -q 'PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1' "$STAGE/$VIEW_REL"
grep -q "api.qrserver.com/v1/create-qr-code/?size=150x150&data=" "$STAGE/$VIEW_REL"
grep -q 'Powered by' "$STAGE/$JS_REL"
grep -q 'PayMyDine' "$STAGE/$JS_REL"
for id in classic midnight emerald bistro ocean mono gold coral tent botanical; do
  grep -q "id: '$id'" "$STAGE/$JS_REL" || { echo "REFUSED: template missing: $id" >&2; exit 1; }
done
TEMPLATE_COUNT="$(grep -Ec "^[[:space:]]*id: '(classic|midnight|emerald|bistro|ocean|mono|gold|coral|tent|botanical)'" "$STAGE/$JS_REL")"
echo "TEMPLATE_COUNT=$TEMPLATE_COUNT"
[[ "$TEMPLATE_COUNT" == 10 ]] || { echo "REFUSED: expected 10 templates" >&2; exit 1; }
[[ "$(grep -c 'centerBadge: false' "$STAGE/$JS_REL")" == 2 ]] || { echo "REFUSED: expected two maximum-scan templates" >&2; exit 1; }

echo
echo "== BACKUP =="
for rel in "$VIEW_REL" "$CSS_REL" "$JS_REL"; do
  if [[ -e "$ROOT/$rel" ]]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp -a "$ROOT/$rel" "$BACKUP/$rel"
  fi
done
[[ -e "$ROOT/$CSS_REL" ]] && CSS_EXISTED=1
[[ -e "$ROOT/$JS_REL" ]] && JS_EXISTED=1

echo
echo "== ACTIVATE ONLY 3 UI FILES =="
install_preserve "$STAGE/$VIEW_REL" "$ROOT/$VIEW_REL"
install_preserve "$STAGE/$CSS_REL" "$ROOT/$CSS_REL"
install_preserve "$STAGE/$JS_REL" "$ROOT/$JS_REL"
ACTIVATED=1
php artisan view:clear >/dev/null

echo
echo "== POST-DEPLOY VERIFICATION =="
grep -q 'PMD_TABLE_QR_TEMPLATE_STUDIO_V1' "$ROOT/$VIEW_REL"
grep -q 'PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1' "$ROOT/$VIEW_REL"
grep -q "api.qrserver.com/v1/create-qr-code/?size=150x150&data=" "$ROOT/$VIEW_REL"
verify_static "$CSS_REL"
verify_static "$JS_REL"

HEAD_AFTER="$(git rev-parse HEAD)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || { echo "REFUSED: live Git HEAD moved" >&2; exit 1; }

echo "QR_GENERATOR_LOGIC_CHANGED=NO"
echo "QR_PAYLOAD_CHANGED=NO"
echo "DB_CHANGES=NO"
echo "ROUTE_CONTROLLER_MODEL_CHANGES=NO"
echo "TEMPLATES=10"
echo "============================================================"
echo "PMD TABLE QR TEMPLATE STUDIO V1 DEPLOYED"
echo "============================================================"
ACTIVATED=0
