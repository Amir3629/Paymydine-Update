#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/tenant-media-isolation-r1"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
TEST_MEDIA_NAME="${TEST_MEDIA_NAME:-6776d40a49938149654564.jpg}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="$ROOT/storage/pmd-tenant-media-r2-stage-$STAMP"
BACKUP="$ROOT/storage/pmd-tenant-media-r2-backups/$STAMP"
HELPER="app/main/routes/tenant-media-guard-r2.php"
ACTIVATED=0

FILES=(
  "app/admin/controllers/Pmdmenus.php"
  "app/main/routes/menu-highlight-response.php"
  "app/main/routes/api-health-media.php"
  "app/main/routes/pmd-frontend-v2-media.php"
  "routes/root-app-before.php"
  "routes/api.php"
  "app/Services/SuperAdminTenantLifecycleService.php"
)

log() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

fail() {
  printf '\nTENANT MEDIA R2 REFUSED: %s\n' "$*" >&2
  exit 2
}

http_status() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || printf '000'
}

rollback_code() {
  set +e
  log "AUTOMATIC CODE ROLLBACK"
  if [[ -d "$BACKUP/files" ]]; then
    cp -a "$BACKUP/files/." "$ROOT/"
  fi
  if [[ -f "$BACKUP/helper-was-new" ]]; then
    rm -f "$ROOT/$HELPER"
  fi
  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
  echo "TENANT MEDIA R2 CODE ROLLBACK COMPLETE"
}

on_exit() {
  rc=$?
  trap - EXIT
  if [[ "$rc" -ne 0 && "$ACTIVATED" == "1" ]]; then
    rollback_code
  fi
  exit "$rc"
}
trap on_exit EXIT

[[ "$EUID" -eq 0 ]] || fail "Run with sudo/root"
for cmd in git php python3 curl systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
[[ -f "$ROOT/artisan" ]] || fail "Not a PayMyDine root: $ROOT"

cd "$ROOT"

log "1. REQUIRE CLEAN R1 ROLLBACK BASELINE"
echo "HEAD:   $(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "BRANCH: $(git branch --show-current 2>/dev/null || echo unknown)"

if grep -q 'PMD_API_MEDIA_TENANT_GUARD_R1' routes/api.php 2>/dev/null \
  || grep -q 'PMD_ROOT_MEDIA_TENANT_GUARD_R1' routes/root-app-before.php 2>/dev/null; then
  fail "R1 route patch is still active. Run the R1 rollback first."
fi

PRE_SETTINGS="$(http_status "https://$TEST_HOST/api/v1/settings?pre=$STAMP")"
PRE_ADMIN="$(http_status "https://$TEST_HOST/admin/managerlab?pre=$STAMP")"
PRE_MENU="$(http_status "https://$TEST_HOST/api/v1/menu?pre=$STAMP")"

echo "PRE settings=$PRE_SETTINGS admin=$PRE_ADMIN menu=$PRE_MENU"
[[ "$PRE_SETTINGS" == "200" ]] || fail "Pre-deploy settings endpoint is not healthy: HTTP $PRE_SETTINGS"
[[ "$PRE_MENU" == "200" ]] || fail "Pre-deploy menu endpoint is not healthy: HTTP $PRE_MENU"
[[ "$PRE_ADMIN" != 5* && "$PRE_ADMIN" != "000" ]] || fail "Pre-deploy admin endpoint is unhealthy: HTTP $PRE_ADMIN"

mkdir -p "$STAGE/files" "$BACKUP/files"
for rel in "${FILES[@]}"; do
  [[ -f "$ROOT/$rel" ]] || fail "Missing live file: $rel"
  mkdir -p "$STAGE/files/$(dirname "$rel")" "$BACKUP/files/$(dirname "$rel")"
  cp -a "$ROOT/$rel" "$STAGE/files/$rel"
  cp -a "$ROOT/$rel" "$BACKUP/files/$rel"
done

if [[ -f "$ROOT/$HELPER" ]]; then
  mkdir -p "$BACKUP/files/$(dirname "$HELPER")"
  cp -a "$ROOT/$HELPER" "$BACKUP/files/$HELPER"
else
  touch "$BACKUP/helper-was-new"
fi

log "2. FETCH ONLY R2 HOST-SCOPED GUARD"
git fetch origin "$BRANCH"
mkdir -p "$STAGE/files/$(dirname "$HELPER")"
git show "FETCH_HEAD:$HELPER" > "$STAGE/files/$HELPER"
php -l "$STAGE/files/$HELPER" >/dev/null || fail "R2 helper syntax failed"
grep -q 'database.default' "$STAGE/files/$HELPER" && fail "R2 helper must never change database.default"
grep -q 'pmd_media_tenant_guard_r2' "$STAGE/files/$HELPER" || fail "R2 dedicated connection marker missing"

log "3. PATCH LIVE SOURCES WITHOUT ADDING MIDDLEWARE"
python3 - "$STAGE/files" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])

# Menu Manager: no name-based shared legacy image guessing.
p = root / 'app/admin/controllers/Pmdmenus.php'
s = p.read_text()
if 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R2' not in s:
    needle = '        $legacyImageIndex = $this->legacyPmdNewImageIndex();\n'
    if s.count(needle) != 1:
        raise SystemExit('Pmdmenus legacy index marker mismatch')
    s = s.replace(
        needle,
        "        // PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R2\n"
        "        // A Food with no uploaded image stays image-less.\n"
        "        $legacyImageIndex = [];\n",
        1,
    )
p.write_text(s)

# Canonical menu response: no pasta/default image injection.
p = root / 'app/main/routes/menu-highlight-response.php'
s = p.read_text()
if 'PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R2' not in s:
    food = '$item->image = $item->image ? "/api/media/".$item->image : \'/images/pasta.png\';'
    combo = '$combo->image = $combo->image ? "/api/media/".$combo->image : \'/images/pasta.png\';'
    if food not in s:
        raise SystemExit('Food fallback marker missing')
    s = s.replace(
        food,
        "// PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R2\n                $item->image = $item->image ? \"/api/media/\".$item->image : '';",
        1,
    )
    if combo in s:
        s = s.replace(combo, '$combo->image = $combo->image ? "/api/media/".$combo->image : \'\';', 1)
p.write_text(s)

# app/main media route: guard only. NO middleware changes.
p = root / 'app/main/routes/api-health-media.php'
s = p.read_text()
if 'PMD_TENANT_MEDIA_ROUTE_GUARD_R2' not in s:
    if "require_once __DIR__.'/tenant-media-guard-r2.php';" not in s:
        s = s.replace('<?php\n', "<?php\n\nrequire_once __DIR__.'/tenant-media-guard-r2.php';\n", 1)
    route = "    Route::get('/media/{path}', function ($path) {\n"
    if s.count(route) != 1:
        raise SystemExit('api-health-media route marker mismatch')
    s = s.replace(
        route,
        route + "        // PMD_TENANT_MEDIA_ROUTE_GUARD_R2\n"
                "        if (!pmd_tenant_media_owned_r2($path)) abort(404);\n",
        1,
    )
p.write_text(s)

# V2 compatibility media route: guard only. NO middleware changes.
p = root / 'app/main/routes/pmd-frontend-v2-media.php'
s = p.read_text()
if 'PMD_FRONTEND_MEDIA_TENANT_GUARD_R2' not in s:
    if "require_once __DIR__.'/tenant-media-guard-r2.php';" not in s:
        s = s.replace('<?php\n', "<?php\n\nrequire_once __DIR__.'/tenant-media-guard-r2.php';\n", 1)
    route = "    \\Illuminate\\Support\\Facades\\Route::match(['GET', 'HEAD'], '/api/v1/frontend-media-v2/{path}', function ($path) {\n"
    if s.count(route) != 1:
        raise SystemExit('frontend-media-v2 route marker mismatch')
    s = s.replace(
        route,
        route + "        // PMD_FRONTEND_MEDIA_TENANT_GUARD_R2\n"
                "        if (!pmd_tenant_media_owned_r2($path)) abort(404);\n",
        1,
    )
p.write_text(s)

# Root-app duplicate /api/media: guard only. NO group middleware changes.
p = root / 'routes/root-app-before.php'
s = p.read_text()
if 'PMD_ROOT_MEDIA_TENANT_GUARD_R2' not in s:
    marker = '/*\n * Menu/food images: ensure /api/media/{path} is always registered'
    if marker not in s:
        raise SystemExit('root-app-before media section missing')
    s = s.replace(
        marker,
        "// PMD_ROOT_MEDIA_TENANT_GUARD_R2\n"
        "require_once base_path('app/main/routes/tenant-media-guard-r2.php');\n\n" + marker,
        1,
    )
    route = "    Route::get('/media/{path}', function ($path) {\n"
    pos = s.find(route, s.find('PMD_ROOT_MEDIA_TENANT_GUARD_R2'))
    if pos < 0:
        raise SystemExit('root-app-before media route missing')
    at = pos + len(route)
    s = s[:at] + "        if (!pmd_tenant_media_owned_r2($path)) abort(404);\n" + s[at:]
p.write_text(s)

# Laravel routes/api.php: guard /images and /media without middleware changes.
p = root / 'routes/api.php'
s = p.read_text()
if 'PMD_API_MEDIA_TENANT_GUARD_R2' not in s:
    s = s.replace(
        '<?php\n',
        "<?php\n\n// PMD_API_MEDIA_TENANT_GUARD_R2\nrequire_once base_path('app/main/routes/tenant-media-guard-r2.php');\n",
        1,
    )
    images = "    Route::get('/images', function (Request $request) {\n"
    if images not in s:
        raise SystemExit('routes/api.php /images missing')
    s = s.replace(
        images,
        images + "        $pmdRequestedMediaR2 = (string)$request->get('file', '');\n"
                 "        if (!pmd_tenant_media_owned_r2($pmdRequestedMediaR2)) abort(404);\n",
        1,
    )
    media = "    Route::get('/media/{path}', function ($path) {\n"
    if media not in s:
        raise SystemExit('routes/api.php /media missing')
    s = s.replace(
        media,
        media + "        if (!pmd_tenant_media_owned_r2($path)) abort(404);\n",
        1,
    )
p.write_text(s)

# Future tenants must never clone template media attachment rows.
p = root / 'app/Services/SuperAdminTenantLifecycleService.php'
s = p.read_text()
if 'PMD_NEW_TENANT_MEDIA_EMPTY_R2' not in s:
    needle = "        'menu_images',\n"
    if needle not in s:
        raise SystemExit('tenant lifecycle menu_images marker missing')
    s = s.replace(
        needle,
        needle + "        // PMD_NEW_TENANT_MEDIA_EMPTY_R2\n        'media_attachments',\n",
        1,
    )
p.write_text(s)
PY

log "4. FULL PHP SYNTAX CHECK BEFORE ACTIVATION"
for rel in "${FILES[@]}"; do
  php -l "$STAGE/files/$rel" >/dev/null || fail "PHP syntax failed: $rel"
done
php -l "$STAGE/files/$HELPER" >/dev/null || fail "PHP syntax failed: $HELPER"

grep -q 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R2' "$STAGE/files/app/admin/controllers/Pmdmenus.php" || fail "Menu Manager R2 marker missing"
grep -q 'PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R2' "$STAGE/files/app/main/routes/menu-highlight-response.php" || fail "Menu API R2 marker missing"
grep -q 'PMD_API_MEDIA_TENANT_GUARD_R2' "$STAGE/files/routes/api.php" || fail "API R2 marker missing"
grep -q 'PMD_ROOT_MEDIA_TENANT_GUARD_R2' "$STAGE/files/routes/root-app-before.php" || fail "Root route R2 marker missing"
grep -q 'PMD_NEW_TENANT_MEDIA_EMPTY_R2' "$STAGE/files/app/Services/SuperAdminTenantLifecycleService.php" || fail "Tenant lifecycle R2 marker missing"

cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
BACKUP="$(cd "$(dirname "$0")" && pwd)"
HELPER="app/main/routes/tenant-media-guard-r2.php"
[[ "$EUID" -eq 0 ]] || { echo "Run with sudo/root"; exit 2; }
cp -a "$BACKUP/files/." "$ROOT/"
if [[ -f "$BACKUP/helper-was-new" ]]; then
  rm -f "$ROOT/$HELPER"
fi
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
echo "TENANT MEDIA R2 CODE ROLLBACK COMPLETE"
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

log "5. ACTIVATE REVIEWED R2 FILES"
ACTIVATED=1
for rel in "${FILES[@]}"; do
  cp -a "$STAGE/files/$rel" "$ROOT/$rel"
done
mkdir -p "$ROOT/$(dirname "$HELPER")"
cp -a "$STAGE/files/$HELPER" "$ROOT/$HELPER"
chown --reference="$ROOT/app/main/routes/api-health-media.php" "$ROOT/$HELPER" || true
chmod --reference="$ROOT/app/main/routes/api-health-media.php" "$ROOT/$HELPER" || true

cd "$ROOT"
php artisan optimize:clear >/dev/null
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sleep 1

log "6. FAIL-CLOSED POST-DEPLOY HTTP CHECKS"
POST_SETTINGS="$(http_status "https://$TEST_HOST/api/v1/settings?post=$STAMP")"
POST_ADMIN="$(http_status "https://$TEST_HOST/admin/managerlab?post=$STAMP")"
POST_MENU="$(http_status "https://$TEST_HOST/api/v1/menu?post=$STAMP")"
POST_MEDIA="$(http_status "https://$TEST_HOST/api/media/$TEST_MEDIA_NAME?post=$STAMP")"

echo "POST settings=$POST_SETTINGS admin=$POST_ADMIN menu=$POST_MENU old_media=$POST_MEDIA"

[[ "$POST_SETTINGS" == "200" ]] || fail "Settings broke after R2: HTTP $POST_SETTINGS"
[[ "$POST_MENU" == "200" ]] || fail "Menu broke after R2: HTTP $POST_MENU"
[[ "$POST_ADMIN" != 5* && "$POST_ADMIN" != "000" ]] || fail "Admin broke after R2: HTTP $POST_ADMIN"
[[ "$POST_MEDIA" == "404" ]] || fail "Old unowned media is not blocked: HTTP $POST_MEDIA"

MENU_BODY="$(curl -k -fsSL "https://$TEST_HOST/api/v1/menu?body=$STAMP")"
if printf '%s' "$MENU_BODY" | grep -Fq "$TEST_MEDIA_NAME"; then
  fail "Canonical menu still references the old inherited media filename"
fi
if printf '%s' "$MENU_BODY" | grep -Eq 'pasta\.png|pmdnew_'; then
  fail "Canonical menu still contains a legacy image fallback"
fi

echo
echo "IDENTITY NOW:"
curl -k -fsSL "https://$TEST_HOST/api/v1/settings?id=$STAMP" \
  | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo "site_name=".($j["site_name"]??"").PHP_EOL; echo "site_logo=".($j["site_logo"]??"").PHP_EOL;'

ACTIVATED=0
trap - EXIT
rm -rf "$STAGE"

log "TENANT MEDIA ISOLATION R2 DEPLOYED"
echo "Git HEAD unchanged: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
echo "Contract: no new middleware; host-scoped temporary tenant DB connection; unowned media=404."
