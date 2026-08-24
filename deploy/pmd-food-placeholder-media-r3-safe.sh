#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/food-placeholder-media-r3"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
TEST_OLD_MEDIA="${TEST_OLD_MEDIA:-6776d40a49938149654564.jpg}"
PM2_USER="${PM2_USER:-ubuntu}"
PM2_SERVICE="${PM2_SERVICE:-paymydine-frontend-v2}"
V2_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
V2_ROOT="$ROOT/$V2_REL"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="/var/tmp/pmd-food-placeholder-media-r3-$STAMP"
BACKUP="$ROOT/storage/pmd-food-placeholder-media-r3-backups/$STAMP"
HELPER="app/main/routes/pmd-tenant-media-owner-r3.php"
ACTIVATED=0

PHP_FILES=(
  "app/admin/controllers/Pmdmenus.php"
  "app/main/routes/menu-highlight-response.php"
  "app/main/routes/api-health-media.php"
  "app/main/routes/pmd-frontend-v2-media.php"
  "routes/root-app-before.php"
  "routes/api.php"
  "app/Services/SuperAdminTenantLifecycleService.php"
)

V2_FILES=(
  "$V2_REL/src/server/normalize.ts"
  "$V2_REL/src/runtime/components/RuntimeOverlays.tsx"
  "$V2_REL/app/globals.css"
)

ALL_FILES=("${PHP_FILES[@]}" "${V2_FILES[@]}")

log() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

fail() {
  printf '\nPMD FOOD PLACEHOLDER / MEDIA R3 REFUSED: %s\n' "$*" >&2
  exit 2
}

http_status() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1" || printf '000'
}

restore_one() {
  local rel="$1"
  if [[ -f "$BACKUP/files/$rel" ]]; then
    cp --preserve=mode,ownership,timestamps "$BACKUP/files/$rel" "$ROOT/$rel"
  fi
}

rollback() {
  set +e
  trap - EXIT
  log "AUTOMATIC R3 ROLLBACK"

  for rel in "${ALL_FILES[@]}"; do
    restore_one "$rel"
  done

  if [[ -f "$BACKUP/helper-was-new" ]]; then
    rm -f "$ROOT/$HELPER"
  elif [[ -f "$BACKUP/files/$HELPER" ]]; then
    restore_one "$HELPER"
  fi

  if [[ -d "$BACKUP/next.previous" ]]; then
    rm -rf "$V2_ROOT/.next"
    mv "$BACKUP/next.previous" "$V2_ROOT/.next"
  fi

  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
  sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null 2>&1 || true

  echo "R3 CODE/BUILD ROLLBACK COMPLETE"
  echo "No database rows were modified by this deployer."
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
for cmd in git php python3 curl node npm tar systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
[[ -f "$ROOT/artisan" ]] || fail "Not a PayMyDine root: $ROOT"
[[ -f "$V2_ROOT/package.json" ]] || fail "V2 package.json missing"
[[ -d "$V2_ROOT/node_modules" ]] || fail "V2 node_modules missing"

cd "$ROOT"

log "1. PRE-DEPLOY HEALTH + SAFETY"
echo "HEAD:   $(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "BRANCH: $(git branch --show-current 2>/dev/null || echo unknown)"

# Never stack on top of the previously failed R1 route patch.
if grep -q 'PMD_API_MEDIA_TENANT_GUARD_R1' routes/api.php 2>/dev/null \
  || grep -q 'PMD_ROOT_MEDIA_TENANT_GUARD_R1' routes/root-app-before.php 2>/dev/null \
  || grep -q 'PMD_TENANT_MEDIA_ROUTE_GUARD_R1' app/main/routes/api-health-media.php 2>/dev/null; then
  fail "Old R1 route patch is still active. Refusing to stack R3."
fi

PRE_SETTINGS="$(http_status "https://$TEST_HOST/api/v1/settings?r3pre=$STAMP")"
PRE_MENU="$(http_status "https://$TEST_HOST/api/v1/menu?r3pre=$STAMP")"
PRE_ADMIN="$(http_status "https://$TEST_HOST/admin/managerlab?r3pre=$STAMP")"
PRE_ROOT="$(http_status "https://$TEST_HOST/?r3pre=$STAMP")"

echo "PRE settings=$PRE_SETTINGS menu=$PRE_MENU admin=$PRE_ADMIN root=$PRE_ROOT"
[[ "$PRE_SETTINGS" == "200" ]] || fail "Settings unhealthy before deploy: HTTP $PRE_SETTINGS"
[[ "$PRE_MENU" == "200" ]] || fail "Menu unhealthy before deploy: HTTP $PRE_MENU"
[[ "$PRE_ADMIN" != 5* && "$PRE_ADMIN" != "000" ]] || fail "Admin unhealthy before deploy: HTTP $PRE_ADMIN"
[[ "$PRE_ROOT" != 5* && "$PRE_ROOT" != "000" ]] || fail "Frontend unhealthy before deploy: HTTP $PRE_ROOT"

node -e 'const p=require(process.argv[1]); if (!p.scripts || p.scripts.build !== "next build") process.exit(2)' "$V2_ROOT/package.json" \
  || fail "Unexpected V2 build script"

mkdir -p "$STAGE/files" "$STAGE/v2" "$BACKUP/files"
chmod 755 "$STAGE" "$STAGE/files" "$STAGE/v2"
chmod 700 "$BACKUP"

log "2. BACKUP INDIVIDUAL FILES ONLY"
for rel in "${ALL_FILES[@]}"; do
  [[ -f "$ROOT/$rel" ]] || fail "Missing live file: $rel"
  mkdir -p "$BACKUP/files/$(dirname "$rel")" "$STAGE/files/$(dirname "$rel")"
  cp --preserve=mode,ownership,timestamps "$ROOT/$rel" "$BACKUP/files/$rel"
  cp --preserve=mode,ownership,timestamps "$ROOT/$rel" "$STAGE/files/$rel"
done

if [[ -f "$ROOT/$HELPER" ]]; then
  mkdir -p "$BACKUP/files/$(dirname "$HELPER")"
  cp --preserve=mode,ownership,timestamps "$ROOT/$HELPER" "$BACKUP/files/$HELPER"
else
  touch "$BACKUP/helper-was-new"
fi

log "3. FETCH REVIEWED HOST-SCOPED OWNERSHIP HELPER"
git fetch origin "$BRANCH"
mkdir -p "$STAGE/files/$(dirname "$HELPER")"
git show "FETCH_HEAD:$HELPER" > "$STAGE/files/$HELPER"
php -l "$STAGE/files/$HELPER" >/dev/null || fail "R3 helper PHP syntax failed"

grep -q 'pmd_media_owned_by_request_tenant_r3' "$STAGE/files/$HELPER" || fail "R3 helper marker missing"
if grep -q 'DB::setDefaultConnection\|database.default' "$STAGE/files/$HELPER"; then
  fail "R3 helper must never modify database.default"
fi

log "4. PATCH CURRENT LIVE SOURCES IN STAGE"
python3 - "$STAGE/files" "$V2_REL" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
v2_rel = sys.argv[2]

# ------------------------------------------------------------
# Admin Menu Manager: never guess a Food image from old shared
# pmdnew_* files by matching the Food name.
# ------------------------------------------------------------
p = root / 'app/admin/controllers/Pmdmenus.php'
s = p.read_text()
if 'PMD_FOOD_IMAGE_NO_LEGACY_AUTOMATCH_R3' not in s:
    needle = '        $legacyImageIndex = $this->legacyPmdNewImageIndex();\n'
    if s.count(needle) != 1:
        raise SystemExit('Pmdmenus legacy image index marker mismatch')
    s = s.replace(
        needle,
        "        // PMD_FOOD_IMAGE_NO_LEGACY_AUTOMATCH_R3\n"
        "        // New Foods never inherit/guess images from shared legacy bytes.\n"
        "        $legacyImageIndex = [];\n",
        1,
    )
p.write_text(s)

# ------------------------------------------------------------
# Canonical menu API: PayMyDine brand placeholder instead of
# old pasta.png when no Food/Combo photo is selected.
# ------------------------------------------------------------
p = root / 'app/main/routes/menu-highlight-response.php'
s = p.read_text()
if 'PMD_FOOD_PLACEHOLDER_BRAND_R3' not in s:
    food = '$item->image = $item->image ? "/api/media/".$item->image : \'/images/pasta.png\';'
    combo = '$combo->image = $combo->image ? "/api/media/".$combo->image : \'/images/pasta.png\';'
    if food not in s:
        raise SystemExit('Food pasta fallback marker missing')
    s = s.replace(
        food,
        "// PMD_FOOD_PLACEHOLDER_BRAND_R3\n                $item->image = $item->image ? \"/api/media/\".$item->image : '/brand/paymydine-logo.svg';",
        1,
    )
    if combo in s:
        s = s.replace(
            combo,
            "$combo->image = $combo->image ? \"/api/media/\".$combo->image : '/brand/paymydine-logo.svg';",
            1,
        )
p.write_text(s)

# ------------------------------------------------------------
# app/main /api/media: host-scoped ownership gate only.
# NO middleware changes.
# ------------------------------------------------------------
p = root / 'app/main/routes/api-health-media.php'
s = p.read_text()
if 'PMD_MEDIA_OWNERSHIP_GATE_R3' not in s:
    if "require_once __DIR__.'/pmd-tenant-media-owner-r3.php';" not in s:
        s = s.replace('<?php\n', "<?php\n\nrequire_once __DIR__.'/pmd-tenant-media-owner-r3.php';\n", 1)
    route = "    Route::get('/media/{path}', function ($path) {\n"
    if s.count(route) != 1:
        raise SystemExit('api-health-media route marker mismatch')
    s = s.replace(
        route,
        route + "        // PMD_MEDIA_OWNERSHIP_GATE_R3\n"
                "        if (!pmd_media_owned_by_request_tenant_r3($path)) abort(404);\n",
        1,
    )
    # An owned-but-missing file is still missing; never substitute pasta.png.
    pattern = re.compile(
        r"\n        \$fallbackPath = public_path\('images/pasta\.png'\);\n\n"
        r"        if \(file_exists\(\$fallbackPath\)\) \{.*?\n        \}\n\n        abort\(404\);",
        re.S,
    )
    s, count = pattern.subn("\n        abort(404);", s, count=1)
    if count != 1:
        raise SystemExit('api-health-media pasta fallback block mismatch')
p.write_text(s)

# ------------------------------------------------------------
# V2 compatibility media endpoint: same gate, no middleware.
# ------------------------------------------------------------
p = root / 'app/main/routes/pmd-frontend-v2-media.php'
s = p.read_text()
if 'PMD_FRONTEND_MEDIA_OWNERSHIP_GATE_R3' not in s:
    if "require_once __DIR__.'/pmd-tenant-media-owner-r3.php';" not in s:
        s = s.replace('<?php\n', "<?php\n\nrequire_once __DIR__.'/pmd-tenant-media-owner-r3.php';\n", 1)
    route = "    \\Illuminate\\Support\\Facades\\Route::match(['GET', 'HEAD'], '/api/v1/frontend-media-v2/{path}', function ($path) {\n"
    if s.count(route) != 1:
        raise SystemExit('frontend-media-v2 route marker mismatch')
    s = s.replace(
        route,
        route + "        // PMD_FRONTEND_MEDIA_OWNERSHIP_GATE_R3\n"
                "        if (!pmd_media_owned_by_request_tenant_r3($path)) abort(404);\n",
        1,
    )
p.write_text(s)

# ------------------------------------------------------------
# Root-app duplicate /api/media route: gate only, no middleware.
# ------------------------------------------------------------
p = root / 'routes/root-app-before.php'
s = p.read_text()
if 'PMD_ROOT_MEDIA_OWNERSHIP_GATE_R3' not in s:
    marker = '/*\n * Menu/food images: ensure /api/media/{path} is always registered'
    if marker not in s:
        raise SystemExit('root-app-before media section missing')
    s = s.replace(
        marker,
        "// PMD_ROOT_MEDIA_OWNERSHIP_GATE_R3\n"
        "require_once base_path('app/main/routes/pmd-tenant-media-owner-r3.php');\n\n" + marker,
        1,
    )
    route = "    Route::get('/media/{path}', function ($path) {\n"
    pos = s.find(route, s.find('PMD_ROOT_MEDIA_OWNERSHIP_GATE_R3'))
    if pos < 0:
        raise SystemExit('root-app-before /api/media route missing')
    at = pos + len(route)
    s = s[:at] + "        if (!pmd_media_owned_by_request_tenant_r3($path)) abort(404);\n" + s[at:]
p.write_text(s)

# ------------------------------------------------------------
# Laravel routes/api.php duplicate /images and /media routes.
# Gate only; do not add/change middleware.
# ------------------------------------------------------------
p = root / 'routes/api.php'
s = p.read_text()
if 'PMD_API_MEDIA_OWNERSHIP_GATE_R3' not in s:
    s = s.replace(
        '<?php\n',
        "<?php\n\n// PMD_API_MEDIA_OWNERSHIP_GATE_R3\nrequire_once base_path('app/main/routes/pmd-tenant-media-owner-r3.php');\n",
        1,
    )
    images = "    Route::get('/images', function (Request $request) {\n"
    if images not in s:
        raise SystemExit('routes/api.php /images route missing')
    s = s.replace(
        images,
        images + "        $pmdRequestedMediaR3 = (string)$request->get('file', '');\n"
                 "        if (!pmd_media_owned_by_request_tenant_r3($pmdRequestedMediaR3)) abort(404);\n",
        1,
    )
    media = "    Route::get('/media/{path}', function ($path) {\n"
    if media not in s:
        raise SystemExit('routes/api.php /media route missing')
    s = s.replace(
        media,
        media + "        if (!pmd_media_owned_by_request_tenant_r3($path)) abort(404);\n",
        1,
    )
p.write_text(s)

# ------------------------------------------------------------
# Future new tenants: media attachment rows are business data,
# never template data.
# ------------------------------------------------------------
p = root / 'app/Services/SuperAdminTenantLifecycleService.php'
s = p.read_text()
if 'PMD_NEW_TENANT_MEDIA_EMPTY_R3' not in s:
    needle = "        'menu_images',\n"
    if needle not in s:
        raise SystemExit('tenant lifecycle menu_images marker missing')
    s = s.replace(
        needle,
        needle + "        // PMD_NEW_TENANT_MEDIA_EMPTY_R3\n        'media_attachments',\n",
        1,
    )
p.write_text(s)

# ------------------------------------------------------------
# V2 media normalization: preserve /brand/* and translate any
# stale pasta sentinel into the PMD logo placeholder.
# ------------------------------------------------------------
p = root / v2_rel / 'src/server/normalize.ts'
s = p.read_text()
if 'PMD_FOOD_BRAND_PLACEHOLDER_R3' not in s:
    old = "  // PMD_MISSING_MENU_IMAGE_R11\n  // The backend's generic /images/pasta.png placeholder is not guaranteed to\n  // exist in every tenant. Missing photos render the theme's native no-image\n  // state instead of a broken browser image.\n  if (clean === 'images/pasta.png') return null\n"
    if old not in s:
        raise SystemExit('normalize.ts pasta compatibility block missing')
    new = "  // PMD_FOOD_BRAND_PLACEHOLDER_R3\n  // Missing Food photos use the local PayMyDine brand asset. The backend now\n  // emits /brand/paymydine-logo.svg; keep the old pasta sentinel compatible.\n  if (clean === 'images/pasta.png') return '/brand/paymydine-logo.svg'\n  if (clean.startsWith('brand/')) return `/${encodePath(clean)}`\n"
    s = s.replace(old, new, 1)
p.write_text(s)

# ------------------------------------------------------------
# Food modal/cart: mark only PMD food placeholders. Restaurant
# header logos use the same SVG but must remain full-color.
# ------------------------------------------------------------
p = root / v2_rel / 'src/runtime/components/RuntimeOverlays.tsx'
s = p.read_text()
if 'PMD_FOOD_PLACEHOLDER_DATA_R3' not in s:
    hero = '{item.imageUrl && <img className={styles.heroImage} src={item.imageUrl} alt={item.name} width={960} height={600} />}'
    hero_new = "{/* PMD_FOOD_PLACEHOLDER_DATA_R3 */}\n        {item.imageUrl && <img className={styles.heroImage} data-pmd-food-placeholder={item.imageUrl.includes('/brand/paymydine-logo.svg') ? 'true' : undefined} src={item.imageUrl} alt={item.name} width={960} height={600} />}"
    if hero not in s:
        raise SystemExit('RuntimeOverlays hero image marker missing')
    s = s.replace(hero, hero_new, 1)

    cart = '{line.item.imageUrl ? <img src={line.item.imageUrl} alt="" width={96} height={96} /> : <span />}'
    cart_new = "{line.item.imageUrl ? <img data-pmd-food-placeholder={line.item.imageUrl.includes('/brand/paymydine-logo.svg') ? 'true' : undefined} src={line.item.imageUrl} alt=\"\" width={96} height={96} /> : <span />}"
    if cart not in s:
        raise SystemExit('RuntimeOverlays cart image marker missing')
    s = s.replace(cart, cart_new, 1)
p.write_text(s)

# ------------------------------------------------------------
# One cross-theme glass/monochrome presentation. This selector
# deliberately targets Food cards/modal/cart only, not the header logo.
# ------------------------------------------------------------
p = root / v2_rel / 'app/globals.css'
s = p.read_text()
if 'PMD_FOOD_PLACEHOLDER_GLASS_R3' not in s:
    s += r'''

/* PMD_FOOD_PLACEHOLDER_GLASS_R3
 * Brand-safe no-photo treatment across all V2 menu themes.
 * The actual restaurant/header logo is intentionally unaffected.
 */
[data-pmd-menu-card="true"] img[src*="/brand/paymydine-logo.svg"],
img[data-pmd-food-placeholder="true"] {
  object-fit: contain !important;
  object-position: center !important;
  padding: clamp(28px, 10%, 72px) !important;
  background:
    radial-gradient(circle at 32% 22%, rgba(255, 255, 255, 0.24), transparent 48%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.13), rgba(127, 127, 127, 0.06)) !important;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 12px 30px rgba(0, 0, 0, 0.14) !important;
  filter:
    grayscale(1)
    saturate(0)
    contrast(0.82)
    opacity(0.48)
    drop-shadow(0 8px 14px rgba(0, 0, 0, 0.18)) !important;
  -webkit-backdrop-filter: blur(14px) saturate(0.72);
  backdrop-filter: blur(14px) saturate(0.72);
}

[data-pmd-menu-card="true"]:has(> * > img[src*="/brand/paymydine-logo.svg"]),
[data-pmd-menu-card="true"]:has(img[src*="/brand/paymydine-logo.svg"]) {
  isolation: isolate;
}
'''
p.write_text(s)
PY

log "5. PHP SYNTAX + SOURCE CONTRACT CHECKS"
for rel in "${PHP_FILES[@]}"; do
  php -l "$STAGE/files/$rel" >/dev/null || fail "PHP syntax failed: $rel"
done
php -l "$STAGE/files/$HELPER" >/dev/null || fail "PHP syntax failed: $HELPER"

grep -q 'PMD_FOOD_IMAGE_NO_LEGACY_AUTOMATCH_R3' "$STAGE/files/app/admin/controllers/Pmdmenus.php" || fail "Menu Manager R3 marker missing"
grep -q 'PMD_FOOD_PLACEHOLDER_BRAND_R3' "$STAGE/files/app/main/routes/menu-highlight-response.php" || fail "Food placeholder API marker missing"
grep -q 'PMD_MEDIA_OWNERSHIP_GATE_R3' "$STAGE/files/app/main/routes/api-health-media.php" || fail "Main media ownership marker missing"
grep -q 'PMD_API_MEDIA_OWNERSHIP_GATE_R3' "$STAGE/files/routes/api.php" || fail "API media ownership marker missing"
grep -q 'PMD_NEW_TENANT_MEDIA_EMPTY_R3' "$STAGE/files/app/Services/SuperAdminTenantLifecycleService.php" || fail "Tenant lifecycle marker missing"
grep -q 'PMD_FOOD_BRAND_PLACEHOLDER_R3' "$STAGE/files/$V2_REL/src/server/normalize.ts" || fail "V2 normalize placeholder marker missing"
grep -q 'PMD_FOOD_PLACEHOLDER_GLASS_R3' "$STAGE/files/$V2_REL/app/globals.css" || fail "V2 glass CSS marker missing"

log "6. BUILD V2 FROM CURRENT LIVE SOURCE + PATCHED FILES"
V2_BUILD="$STAGE/v2"
rm -rf "$V2_BUILD"
mkdir -p "$V2_BUILD"
chmod 755 "$STAGE" "$V2_BUILD"

tar --exclude='./node_modules' --exclude='./.next' -C "$V2_ROOT" -cf - . | tar -C "$V2_BUILD" -xf -

for rel in "${V2_FILES[@]}"; do
  sub="${rel#$V2_REL/}"
  mkdir -p "$V2_BUILD/$(dirname "$sub")"
  cp "$STAGE/files/$rel" "$V2_BUILD/$sub"
done

ln -s "$V2_ROOT/node_modules" "$V2_BUILD/node_modules"
for envfile in .env .env.local .env.production; do
  [[ -f "$V2_ROOT/$envfile" ]] && cp "$V2_ROOT/$envfile" "$V2_BUILD/$envfile"
done

chown -R "$PM2_USER:$PM2_USER" "$V2_BUILD"

sudo -u "$PM2_USER" -H npm --prefix "$V2_BUILD" run build
[[ -d "$V2_BUILD/.next" ]] || fail "V2 build completed without .next"

log "7. WRITE STANDALONE FILE-SAFE ROLLBACK"
cat > "$BACKUP/rollback.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$ROOT"
BACKUP="$BACKUP"
V2_ROOT="$V2_ROOT"
HELPER="$HELPER"
PM2_USER="$PM2_USER"
PM2_SERVICE="$PM2_SERVICE"
FILES=(
$(printf '  %q\n' "${ALL_FILES[@]}")
)
[[ "\$EUID" -eq 0 ]] || { echo "Run with sudo/root"; exit 2; }
for rel in "\${FILES[@]}"; do
  if [[ -f "\$BACKUP/files/\$rel" ]]; then
    cp --preserve=mode,ownership,timestamps "\$BACKUP/files/\$rel" "\$ROOT/\$rel"
  fi
done
if [[ -f "\$BACKUP/helper-was-new" ]]; then
  rm -f "\$ROOT/\$HELPER"
elif [[ -f "\$BACKUP/files/\$HELPER" ]]; then
  cp --preserve=mode,ownership,timestamps "\$BACKUP/files/\$HELPER" "\$ROOT/\$HELPER"
fi
if [[ -d "\$BACKUP/next.previous" ]]; then
  rm -rf "\$V2_ROOT/.next"
  mv "\$BACKUP/next.previous" "\$V2_ROOT/.next"
fi
cd "\$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "\$PM2_USER" -H pm2 restart "\$PM2_SERVICE" --update-env >/dev/null 2>&1 || true
echo "PMD FOOD PLACEHOLDER / MEDIA R3 ROLLED BACK"
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

log "8. ACTIVATE EXACT FILES + PREBUILT NEXT OUTPUT"
ACTIVATED=1

for rel in "${PHP_FILES[@]}"; do
  cp --preserve=mode,ownership,timestamps "$STAGE/files/$rel" "$ROOT/$rel"
done

for rel in "${V2_FILES[@]}"; do
  cp --preserve=mode,ownership,timestamps "$STAGE/files/$rel" "$ROOT/$rel"
done

mkdir -p "$ROOT/$(dirname "$HELPER")"
cp "$STAGE/files/$HELPER" "$ROOT/$HELPER"
chown --reference="$ROOT/app/main/routes/api-health-media.php" "$ROOT/$HELPER" || true
chmod --reference="$ROOT/app/main/routes/api-health-media.php" "$ROOT/$HELPER" || true

if [[ -d "$V2_ROOT/.next" ]]; then
  mv "$V2_ROOT/.next" "$BACKUP/next.previous"
fi
mv "$V2_BUILD/.next" "$V2_ROOT/.next"
chown -R "$PM2_USER:$PM2_USER" "$V2_ROOT/.next"

cd "$ROOT"
php artisan optimize:clear >/dev/null
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null
sleep 3

log "9. FAIL-CLOSED POST-DEPLOY VERIFICATION"
POST_SETTINGS="$(http_status "https://$TEST_HOST/api/v1/settings?r3post=$STAMP")"
POST_MENU="$(http_status "https://$TEST_HOST/api/v1/menu?r3post=$STAMP")"
POST_ADMIN="$(http_status "https://$TEST_HOST/admin/managerlab?r3post=$STAMP")"
POST_ROOT="$(http_status "https://$TEST_HOST/?r3post=$STAMP")"
POST_OLD_MEDIA="$(http_status "https://$TEST_HOST/api/media/$TEST_OLD_MEDIA?r3post=$STAMP")"
POST_BRAND="$(http_status "https://$TEST_HOST/brand/paymydine-logo.svg?r3post=$STAMP")"

echo "POST settings=$POST_SETTINGS menu=$POST_MENU admin=$POST_ADMIN root=$POST_ROOT old_media=$POST_OLD_MEDIA brand=$POST_BRAND"

[[ "$POST_SETTINGS" == "200" ]] || fail "Settings broke after R3: HTTP $POST_SETTINGS"
[[ "$POST_MENU" == "200" ]] || fail "Menu broke after R3: HTTP $POST_MENU"
[[ "$POST_ADMIN" != 5* && "$POST_ADMIN" != "000" ]] || fail "Admin broke after R3: HTTP $POST_ADMIN"
[[ "$POST_ROOT" != 5* && "$POST_ROOT" != "000" ]] || fail "Frontend broke after R3: HTTP $POST_ROOT"
[[ "$POST_OLD_MEDIA" == "404" ]] || fail "Old unowned media still public: HTTP $POST_OLD_MEDIA"
[[ "$POST_BRAND" == "200" ]] || fail "PMD brand logo unavailable: HTTP $POST_BRAND"

MENU_BODY="$(curl -k -fsSL "https://$TEST_HOST/api/v1/menu?r3body=$STAMP")"
printf '%s' "$MENU_BODY" | grep -Fq '/brand/paymydine-logo.svg' || fail "Menu API does not expose PMD placeholder"
if printf '%s' "$MENU_BODY" | grep -Fq '/images/pasta.png'; then
  fail "Old pasta placeholder still present in menu API"
fi
if printf '%s' "$MENU_BODY" | grep -Fq "$TEST_OLD_MEDIA"; then
  fail "Old foreign image still referenced by menu API"
fi

# Verify Git working ref was never moved by the deployer.
echo "Git HEAD after deploy: $(git rev-parse HEAD 2>/dev/null || echo unknown)"

ACTIVATED=0
trap - EXIT
rm -rf "$STAGE"

log "PMD FOOD PLACEHOLDER + TENANT MEDIA R3 DEPLOYED"
echo "Contract:"
echo "- Food without selected photo => /brand/paymydine-logo.svg"
echo "- Food placeholder is monochrome/glass in V2 cards, modal and cart"
echo "- Header/restaurant logo remains normal/full-color"
echo "- Legacy pmdnew_* name matching is disabled"
echo "- /api/media requires ownership in the requesting tenant DB"
echo "- Future tenants start with empty media_attachments"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
