#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
PM2_USER="${PM2_USER:-ubuntu}"
PM2_SERVICE="${PM2_SERVICE:-paymydine-frontend-v2}"
TARGET="app/main/routes/menu-highlight-response.php"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="/var/tmp/pmd-food-primary-image-r31-$STAMP"
BACKUP="$ROOT/storage/pmd-food-primary-image-r31-backups/$STAMP"
ACTIVATED=0
HEAD_BEFORE=""

log() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

fail() {
  printf '\nPMD FOOD PRIMARY IMAGE R3.1 REFUSED: %s\n' "$*" >&2
  exit 2
}

http_status() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || printf '000'
}

rollback() {
  set +e
  trap - EXIT
  log "AUTOMATIC R3.1 ROLLBACK"

  if [[ -f "$BACKUP/$TARGET" ]]; then
    cp --preserve=mode,ownership,timestamps "$BACKUP/$TARGET" "$ROOT/$TARGET"
  fi

  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
  sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null 2>&1 || true

  echo "R3.1 ROLLBACK COMPLETE"
  echo "No database rows were modified."
  exit 1
}

on_exit() {
  local rc=$?
  if [[ "$rc" -ne 0 && "$ACTIVATED" == "1" ]]; then
    rollback
  fi
  exit "$rc"
}
trap on_exit EXIT

[[ "$EUID" -eq 0 ]] || fail "Run with sudo/root"
for cmd in git php python3 curl systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
[[ -f "$ROOT/artisan" ]] || fail "Not a PayMyDine root: $ROOT"
[[ -f "$ROOT/$TARGET" ]] || fail "Missing live target: $TARGET"

cd "$ROOT"

log "1. PRE-DEPLOY SAFETY + LIVE CONTRACT"
HEAD_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $(git branch --show-current 2>/dev/null || echo unknown)"

grep -q 'PMD_FOOD_PLACEHOLDER_BRAND_R3' "$TARGET" \
  || fail "R3 placeholder authority is not active on live source"
grep -q 'pmd_menu_gallery_images_for_id' "$TARGET" \
  || fail "Gallery image authority is missing from live menu API"
if grep -q 'PMD_FOOD_PRIMARY_IMAGE_AUTHORITY_R31' "$TARGET"; then
  fail "R3.1 is already active"
fi

PRE_MENU="$(http_status "https://$TEST_HOST/api/v1/menu?r31pre=$STAMP")"
PRE_ROOT="$(http_status "https://$TEST_HOST/?r31pre=$STAMP")"
echo "PRE menu=$PRE_MENU root=$PRE_ROOT"
[[ "$PRE_MENU" == "200" ]] || fail "Menu unhealthy before deploy: HTTP $PRE_MENU"
[[ "$PRE_ROOT" != 5* && "$PRE_ROOT" != "000" ]] || fail "Frontend unhealthy before deploy: HTTP $PRE_ROOT"

PRE_BODY="$(curl -k -fsSL "https://$TEST_HOST/api/v1/menu?r31prebody=$STAMP")"
PRE_AUDIT="$(printf '%s' "$PRE_BODY" | python3 -c '
import json, sys
j=json.load(sys.stdin)
items=(j.get("data") or {}).get("items") or []
gallery=[]
for x in items:
    images=x.get("images") or []
    if isinstance(images, list) and images and str(images[0] or "").strip():
        gallery.append(x)
print("gallery=%d placeholder_primary=%d" % (
    len(gallery),
    sum(1 for x in gallery if x.get("image") == "/brand/paymydine-logo.svg")
))
for x in gallery[:20]:
    print("GALLERY", x.get("id"), x.get("name"), "primary=", x.get("image"), "selected=", (x.get("images") or [None])[0])
')"
echo "$PRE_AUDIT"
PRE_GALLERY_COUNT="$(printf '%s\n' "$PRE_AUDIT" | sed -n 's/^gallery=\([0-9][0-9]*\).*/\1/p' | head -n1)"
[[ -n "$PRE_GALLERY_COUNT" && "$PRE_GALLERY_COUNT" -gt 0 ]] \
  || fail "No selected menu_images are visible in the live menu API. Refusing to guess."

log "2. BACKUP ONE FILE ONLY"
mkdir -p "$STAGE/$(dirname "$TARGET")" "$BACKUP/$(dirname "$TARGET")"
chmod 755 "$STAGE"
chmod 700 "$BACKUP"
cp --preserve=mode,ownership,timestamps "$ROOT/$TARGET" "$BACKUP/$TARGET"
cp --preserve=mode,ownership,timestamps "$ROOT/$TARGET" "$STAGE/$TARGET"

log "3. PATCH PRIMARY IMAGE AUTHORITY"
python3 - "$STAGE/$TARGET" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

old = '''                // PMD_FOOD_PLACEHOLDER_BRAND_R3
                $item->image = $item->image ? "/api/media/".$item->image : '/brand/paymydine-logo.svg';
                $item->isCombo = false;
                $item->comboId = null;
                $item->images = pmd_menu_gallery_images_for_id((int)$item->id);
'''

new = '''                // PMD_FOOD_PLACEHOLDER_BRAND_R3
                // PMD_FOOD_PRIMARY_IMAGE_AUTHORITY_R31
                // Menu Manager stores the newly selected photo as menu_images sort_order=1.
                // That selected gallery image is the primary authority. Legacy thumb is fallback;
                // the PayMyDine glass mark is used only when neither source has a photo.
                $item->images = pmd_menu_gallery_images_for_id((int)$item->id);
                $pmdSelectedImageR31 = trim((string)($item->images[0] ?? ''));
                if ($pmdSelectedImageR31 !== '') {
                    $item->image = $pmdSelectedImageR31;
                } elseif (!empty($item->image)) {
                    $item->image = "/api/media/".ltrim((string)$item->image, '/');
                } else {
                    $item->image = '/brand/paymydine-logo.svg';
                }
                $item->isCombo = false;
                $item->comboId = null;
'''

if s.count(old) != 1:
    raise SystemExit('REFUSED: live R3 food image block changed unexpectedly')

s = s.replace(old, new, 1)
p.write_text(s)
PY

php -l "$STAGE/$TARGET" >/dev/null || fail "PHP syntax failed after R3.1 patch"
grep -q 'PMD_FOOD_PRIMARY_IMAGE_AUTHORITY_R31' "$STAGE/$TARGET" \
  || fail "R3.1 source marker missing"

log "4. WRITE STANDALONE ROLLBACK"
cat > "$BACKUP/rollback.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$ROOT"
BACKUP="$BACKUP"
TARGET="$TARGET"
PM2_USER="$PM2_USER"
PM2_SERVICE="$PM2_SERVICE"
[[ "\$EUID" -eq 0 ]] || { echo "Run with sudo/root"; exit 2; }
cp --preserve=mode,ownership,timestamps "\$BACKUP/\$TARGET" "\$ROOT/\$TARGET"
cd "\$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "\$PM2_USER" -H pm2 restart "\$PM2_SERVICE" --update-env >/dev/null 2>&1 || true
echo "PMD FOOD PRIMARY IMAGE R3.1 ROLLED BACK"
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

log "5. ACTIVATE ONE PHP FILE"
ACTIVATED=1
cp --preserve=mode,ownership,timestamps "$STAGE/$TARGET" "$ROOT/$TARGET"

cd "$ROOT"
php artisan optimize:clear >/dev/null
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null
sleep 3

log "6. FAIL-CLOSED POST-DEPLOY VERIFICATION"
POST_MENU="$(http_status "https://$TEST_HOST/api/v1/menu?r31post=$STAMP")"
POST_ROOT="$(http_status "https://$TEST_HOST/?r31post=$STAMP")"
echo "POST menu=$POST_MENU root=$POST_ROOT"
[[ "$POST_MENU" == "200" ]] || fail "Menu broke after R3.1: HTTP $POST_MENU"
[[ "$POST_ROOT" != 5* && "$POST_ROOT" != "000" ]] || fail "Frontend broke after R3.1: HTTP $POST_ROOT"

POST_BODY="$(curl -k -fsSL "https://$TEST_HOST/api/v1/menu?r31postbody=$STAMP")"
POST_AUDIT="$(printf '%s' "$POST_BODY" | python3 -c '
import json, sys
j=json.load(sys.stdin)
items=(j.get("data") or {}).get("items") or []
gallery=[]
mismatch=[]
for x in items:
    images=x.get("images") or []
    if isinstance(images, list) and images and str(images[0] or "").strip():
        gallery.append(x)
        if str(x.get("image") or "") != str(images[0]):
            mismatch.append(x)
print("gallery=%d mismatch=%d placeholder_primary=%d" % (
    len(gallery),
    len(mismatch),
    sum(1 for x in gallery if x.get("image") == "/brand/paymydine-logo.svg")
))
for x in gallery[:20]:
    print("OK" if str(x.get("image") or "") == str((x.get("images") or [None])[0]) else "BAD", x.get("id"), x.get("name"), "primary=", x.get("image"), "selected=", (x.get("images") or [None])[0])
if not gallery or mismatch:
    raise SystemExit(3)
')" || fail "Selected gallery image did not become the primary menu image"
echo "$POST_AUDIT"

FIRST_SELECTED="$(printf '%s' "$POST_BODY" | python3 -c '
import json, sys
j=json.load(sys.stdin)
for x in (j.get("data") or {}).get("items") or []:
    images=x.get("images") or []
    if isinstance(images, list) and images and str(images[0] or "").strip():
        print(str(images[0])); break
')"
if [[ -n "$FIRST_SELECTED" && "$FIRST_SELECTED" == /* ]]; then
  SELECTED_STATUS="$(http_status "https://$TEST_HOST$FIRST_SELECTED?r31img=$STAMP")"
  echo "Selected image HTTP: $SELECTED_STATUS ($FIRST_SELECTED)"
  [[ "$SELECTED_STATUS" == "200" ]] || fail "Selected food image URL is not reachable: HTTP $SELECTED_STATUS"
fi

if printf '%s' "$POST_BODY" | grep -Fq '/images/pasta.png'; then
  fail "Old pasta placeholder returned after R3.1"
fi

HEAD_AFTER="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "Git HEAD after deploy: $HEAD_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || fail "Git HEAD moved unexpectedly"

ACTIVATED=0
trap - EXIT
rm -rf "$STAGE"

log "PMD FOOD PRIMARY IMAGE R3.1 DEPLOYED"
echo "Contract:"
echo "- Newly selected Food image (menu_images sort_order=1) is the primary digital-menu image"
echo "- Legacy media_attachments thumb remains a fallback"
echo "- /brand/paymydine-logo.svg is used only when no selected/legacy Food image exists"
echo "- No database rows changed"
echo "- No Git checkout/reset/pull performed"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
