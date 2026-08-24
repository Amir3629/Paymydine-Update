#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/tenant-media-isolation-r1"
CLEAN_TENANT_DOMAIN="${CLEAN_TENANT_DOMAIN:-}"
TEST_MEDIA_NAME="${TEST_MEDIA_NAME:-}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="$ROOT/storage/pmd-tenant-media-r1-rerun2-stage-$STAMP"
BACKUP="$ROOT/storage/pmd-tenant-media-r1-rerun2-backups/$STAMP"
HELPER="app/main/routes/tenant-media-guard.php"
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
  printf '\nTENANT MEDIA R1 RERUN2 REFUSED: %s\n' "$*" >&2
  exit 2
}

rollback_code() {
  set +e
  log "ROLLBACK TENANT MEDIA R1 CODE"
  [[ -d "$BACKUP/files" ]] && cp -a "$BACKUP/files/." "$ROOT/"
  if [[ -f "$BACKUP/helper-was-new" ]]; then
    rm -f "$ROOT/$HELPER"
  fi
  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
  echo "CODE ROLLBACK COMPLETE"
  echo "NOTE: any explicit tenant DB cleanup is not automatically reversed."
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

log "1. SNAPSHOT LIVE STATE - NO CHECKOUT / RESET / PULL"
echo "HEAD:   $(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "BRANCH: $(git branch --show-current 2>/dev/null || echo unknown)"

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

log "2. FETCH REVIEWED TENANT MEDIA GUARD ONLY"
git fetch origin "$BRANCH"
mkdir -p "$STAGE/files/$(dirname "$HELPER")"
git show "FETCH_HEAD:$HELPER" > "$STAGE/files/$HELPER"
php -l "$STAGE/files/$HELPER" >/dev/null

log "3. PATCH CURRENT LIVE SOURCES SURGICALLY"
python3 - "$STAGE/files" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])

# ---------------------------------------------------------------
# Menu Manager: disable filename/name-based legacy auto matching.
# ---------------------------------------------------------------
p = root / 'app/admin/controllers/Pmdmenus.php'
s = p.read_text()
if 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1' not in s:
    needle = '        $legacyImageIndex = $this->legacyPmdNewImageIndex();\n'
    if s.count(needle) != 1:
        raise SystemExit('Pmdmenus legacy image index marker mismatch')
    s = s.replace(
        needle,
        "        // PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1\n"
        "        // No Food image may be guessed from shared legacy files.\n"
        "        $legacyImageIndex = [];\n",
        1,
    )
p.write_text(s)

# ---------------------------------------------------------------
# Public menu API: an item with no image remains image-less.
# ---------------------------------------------------------------
p = root / 'app/main/routes/menu-highlight-response.php'
s = p.read_text()
if 'PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R1' not in s:
    food = '$item->image = $item->image ? "/api/media/".$item->image : \'/images/pasta.png\';'
    combo = '$combo->image = $combo->image ? "/api/media/".$combo->image : \'/images/pasta.png\';'
    if food not in s:
        raise SystemExit('menu-highlight-response Food fallback marker missing')
    s = s.replace(
        food,
        "// PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R1\n                $item->image = $item->image ? \"/api/media/\".$item->image : '';",
        1,
    )
    if combo in s:
        s = s.replace(
            combo,
            '$combo->image = $combo->image ? "/api/media/".$combo->image : \'\';',
            1,
        )
p.write_text(s)

# ---------------------------------------------------------------
# app/main /api/media: tenant middleware + ownership guard.
# ---------------------------------------------------------------
p = root / 'app/main/routes/api-health-media.php'
s = p.read_text()
if 'PMD_TENANT_MEDIA_ROUTE_GUARD_R1' not in s:
    if "require_once __DIR__.'/tenant-media-guard.php';" not in s:
        s = s.replace('<?php\n', "<?php\n\nrequire_once __DIR__.'/tenant-media-guard.php';\n", 1)
    start = "    Route::get('/media/{path}', function ($path) {\n"
    if s.count(start) != 1:
        raise SystemExit('api-health-media media route start mismatch')
    s = s.replace(
        start,
        start + "        // PMD_TENANT_MEDIA_ROUTE_GUARD_R1\n"
                "        if (!pmd_tenant_media_owned_r1($path)) abort(404);\n",
        1,
    )
    end = "    })->where('path', '.*');"
    pos = s.find(end, s.find('PMD_TENANT_MEDIA_ROUTE_GUARD_R1'))
    if pos < 0:
        raise SystemExit('api-health-media media route end missing')
    s = s[:pos] + "    })->where('path', '.*')\n        ->middleware([\\App\\Http\\Middleware\\DetectTenant::class]);" + s[pos+len(end):]
p.write_text(s)

# ---------------------------------------------------------------
# V2 legacy media compatibility route: same ownership guard.
# ---------------------------------------------------------------
p = root / 'app/main/routes/pmd-frontend-v2-media.php'
s = p.read_text()
if 'PMD_FRONTEND_MEDIA_TENANT_GUARD_R1' not in s:
    if "require_once __DIR__.'/tenant-media-guard.php';" not in s:
        s = s.replace('<?php\n', "<?php\n\nrequire_once __DIR__.'/tenant-media-guard.php';\n", 1)
    start = "    \\Illuminate\\Support\\Facades\\Route::match(['GET', 'HEAD'], '/api/v1/frontend-media-v2/{path}', function ($path) {\n"
    if s.count(start) != 1:
        raise SystemExit('pmd-frontend-v2-media route start mismatch')
    s = s.replace(
        start,
        start + "        // PMD_FRONTEND_MEDIA_TENANT_GUARD_R1\n"
                "        if (!pmd_tenant_media_owned_r1($path)) abort(404);\n",
        1,
    )
    end = "    })->where('path', '.*');"
    pos = s.find(end, s.find('PMD_FRONTEND_MEDIA_TENANT_GUARD_R1'))
    if pos < 0:
        raise SystemExit('pmd-frontend-v2-media route end missing')
    s = s[:pos] + "    })->where('path', '.*')\n        ->middleware([\\App\\Http\\Middleware\\DetectTenant::class]);" + s[pos+len(end):]
p.write_text(s)

# ---------------------------------------------------------------
# Root-app duplicate /api/media route: protect the route group.
# ---------------------------------------------------------------
p = root / 'routes/root-app-before.php'
s = p.read_text()
if 'PMD_ROOT_MEDIA_TENANT_GUARD_R1' not in s:
    marker = '/*\n * Menu/food images: ensure /api/media/{path} is always registered'
    if marker not in s:
        raise SystemExit('root-app-before media marker missing')
    s = s.replace(
        marker,
        "// PMD_ROOT_MEDIA_TENANT_GUARD_R1\n"
        "require_once base_path('app/main/routes/tenant-media-guard.php');\n\n" + marker,
        1,
    )
    group = "Route::group(['prefix' => 'api', 'middleware' => [\\App\\Http\\Middleware\\CorsMiddleware::class]], function () {"
    if group not in s:
        raise SystemExit('root-app-before media group marker missing')
    s = s.replace(
        group,
        "Route::group(['prefix' => 'api', 'middleware' => [\\App\\Http\\Middleware\\CorsMiddleware::class, \\App\\Http\\Middleware\\DetectTenant::class]], function () {",
        1,
    )
    route = "    Route::get('/media/{path}', function ($path) {\n"
    route_pos = s.find(route, s.find('PMD_ROOT_MEDIA_TENANT_GUARD_R1'))
    if route_pos < 0:
        raise SystemExit('root-app-before media route start missing')
    at = route_pos + len(route)
    s = s[:at] + "        if (!pmd_tenant_media_owned_r1($path)) abort(404);\n" + s[at:]
p.write_text(s)

# ---------------------------------------------------------------
# Laravel routes/api.php: protect both /images and /media.
# ---------------------------------------------------------------
p = root / 'routes/api.php'
s = p.read_text()
if 'PMD_API_MEDIA_TENANT_GUARD_R1' not in s:
    s = s.replace(
        '<?php\n',
        "<?php\n\n// PMD_API_MEDIA_TENANT_GUARD_R1\nrequire_once base_path('app/main/routes/tenant-media-guard.php');\n",
        1,
    )

    images = "    Route::get('/images', function (Request $request) {\n"
    if images not in s:
        raise SystemExit('routes/api.php /images route missing')
    s = s.replace(
        images,
        images + "        $pmdRequestedMediaR1 = (string)$request->get('file', '');\n"
                 "        if (!pmd_tenant_media_owned_r1($pmdRequestedMediaR1)) abort(404);\n",
        1,
    )
    # Attach tenant middleware to /images without touching unrelated routes.
    images_end_marker = "    });\n    // Media serving route for images"
    if images_end_marker not in s:
        raise SystemExit('routes/api.php /images route end marker missing')
    s = s.replace(
        images_end_marker,
        "    })->middleware(['web', \\App\\Http\\Middleware\\DetectTenant::class]);\n    // Media serving route for images",
        1,
    )

    media = "    Route::get('/media/{path}', function ($path) {\n"
    if media not in s:
        raise SystemExit('routes/api.php /media route missing')
    s = s.replace(
        media,
        media + "        if (!pmd_tenant_media_owned_r1($path)) abort(404);\n",
        1,
    )
    end = "    })->where('path', '.*');"
    pos = s.find(end, s.find("Route::get('/media/{path}'"))
    if pos < 0:
        raise SystemExit('routes/api.php /media route end missing')
    s = s[:pos] + "    })->where('path', '.*')\n        ->middleware(['web', \\App\\Http\\Middleware\\DetectTenant::class]);" + s[pos+len(end):]
p.write_text(s)

# ---------------------------------------------------------------
# New tenants: media_attachments is tenant business data, not template data.
# ---------------------------------------------------------------
p = root / 'app/Services/SuperAdminTenantLifecycleService.php'
s = p.read_text()
if 'PMD_NEW_TENANT_MEDIA_EMPTY_R1' not in s:
    needle = "        'menu_images',\n"
    if needle not in s:
        raise SystemExit('tenant lifecycle menu_images marker missing')
    s = s.replace(
        needle,
        needle + "        // PMD_NEW_TENANT_MEDIA_EMPTY_R1\n        'media_attachments',\n",
        1,
    )
p.write_text(s)
PY

log "4. VERIFY PATCH MARKERS + PHP SYNTAX"
for rel in "${FILES[@]}"; do
  php -l "$STAGE/files/$rel" >/dev/null || fail "PHP syntax failed: $rel"
done
php -l "$STAGE/files/$HELPER" >/dev/null || fail "PHP syntax failed: $HELPER"

grep -n 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1' "$STAGE/files/app/admin/controllers/Pmdmenus.php"
grep -n 'PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R1' "$STAGE/files/app/main/routes/menu-highlight-response.php"
grep -n 'PMD_TENANT_MEDIA_ROUTE_GUARD_R1' "$STAGE/files/app/main/routes/api-health-media.php"
grep -n 'PMD_FRONTEND_MEDIA_TENANT_GUARD_R1' "$STAGE/files/app/main/routes/pmd-frontend-v2-media.php"
grep -n 'PMD_ROOT_MEDIA_TENANT_GUARD_R1' "$STAGE/files/routes/root-app-before.php"
grep -n 'PMD_API_MEDIA_TENANT_GUARD_R1' "$STAGE/files/routes/api.php"
grep -n 'PMD_NEW_TENANT_MEDIA_EMPTY_R1' "$STAGE/files/app/Services/SuperAdminTenantLifecycleService.php"

cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
BACKUP="$(cd "$(dirname "$0")" && pwd)"
HELPER="app/main/routes/tenant-media-guard.php"
[[ "$EUID" -eq 0 ]] || { echo "Run with sudo/root"; exit 2; }
cp -a "$BACKUP/files/." "$ROOT/"
if [[ -f "$BACKUP/helper-was-new" ]]; then
  rm -f "$ROOT/$HELPER"
fi
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
echo "TENANT MEDIA R1 CODE ROLLBACK COMPLETE"
echo "NOTE: tenant DB cleanup is intentionally not restored automatically."
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

log "5. ACTIVATE ONLY REVIEWED PHP FILES"
ACTIVATED=1
for rel in "${FILES[@]}"; do
  cp -a "$STAGE/files/$rel" "$ROOT/$rel"
done
mkdir -p "$ROOT/$(dirname "$HELPER")"
cp "$STAGE/files/$HELPER" "$ROOT/$HELPER"
chown --reference="$ROOT/app/main/routes/api-health-media.php" "$ROOT/$HELPER" || true
chmod --reference="$ROOT/app/main/routes/api-health-media.php" "$ROOT/$HELPER" || true

cd "$ROOT"
php artisan optimize:clear >/dev/null
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true

log "6. CLEAN INHERITED DATA FOR REQUESTED NEW TENANT"
if [[ -n "$CLEAN_TENANT_DOMAIN" ]]; then
  CLEAN_TENANT_DOMAIN="$CLEAN_TENANT_DOMAIN" php <<'PHP'
<?php
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$domain = strtolower(trim((string)getenv('CLEAN_TENANT_DOMAIN')));
if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)) {
    throw new RuntimeException('Unsafe CLEAN_TENANT_DOMAIN');
}

$centralDb = (string)Config::get('database.connections.mysql.database');
$tenant = DB::connection('mysql')->table('tenants')->where('domain', $domain)->first();
if (!$tenant || empty($tenant->database)) {
    throw new RuntimeException('Tenant not found: '.$domain);
}
if (empty($tenant->created_at)) {
    throw new RuntimeException('Tenant created_at missing; refusing cleanup');
}

$tenantCreatedAt = (string)$tenant->created_at;

try {
    Config::set('database.connections.mysql.database', (string)$tenant->database);
    DB::purge('mysql');
    DB::reconnect('mysql');
    $conn = DB::connection('mysql');
    $schema = $conn->getSchemaBuilder();

    $deleted = 0;
    if ($schema->hasTable('media_attachments') && $schema->hasColumn('media_attachments', 'created_at')) {
        $q = $conn->table('media_attachments')->where(function ($query) use ($tenantCreatedAt) {
            $query->whereNull('created_at')->orWhere('created_at', '<', $tenantCreatedAt);
        });
        $before = (clone $q)->count();
        if ($before > 0) {
            $deleted = $q->delete();
        }
    }

    // Repair only generic/template identity. Never overwrite a real owner value.
    if ($schema->hasTable('settings')) {
        $settings = $conn->table('settings')->get()->keyBy('item');
        $get = static function ($key) use ($settings): string {
            return trim((string)optional($settings->get($key))->value);
        };
        $genericNames = ['', 'tastyigniter', 'tasty igniter', 'default', 'paymydine restaurant'];
        $rawName = $get('site_name');
        $protectedName = $get('pmd_restaurant_identity_name');
        $label = explode('.', $domain)[0] ?: 'PayMyDine';
        $name = !in_array(strtolower($protectedName), $genericNames, true)
            ? $protectedName
            : (!in_array(strtolower($rawName), $genericNames, true) ? $rawName : $label);

        $rawLogo = $get('site_logo');
        $protectedLogo = $get('pmd_restaurant_identity_logo');
        $genericLogos = ['', '/images.png', 'images.png', '/images/logo.png', 'images/logo.png'];
        $logo = ($protectedLogo !== '' && !in_array(strtolower($protectedLogo), $genericLogos, true))
            ? $protectedLogo
            : (($rawLogo !== '' && !in_array(strtolower($rawLogo), $genericLogos, true))
                ? $rawLogo
                : 'https://'.$domain.'/brand/paymydine-logo.svg');

        $conn->table('settings')->where('item', 'site_name')->update(['value' => $name]);
        $conn->table('settings')->where('item', 'site_logo')->update(['value' => $logo]);

        if ($schema->hasColumn('settings', 'serialized')) {
            $conn->table('settings')->whereIn('item', ['site_name', 'site_logo'])->update(['serialized' => 0]);
        }

        $favicon = $get('favicon_logo');
        if (in_array(strtolower($favicon), $genericLogos, true)) {
            $conn->table('settings')->where('item', 'favicon_logo')->update(['value' => $logo]);
            if ($schema->hasColumn('settings', 'serialized')) {
                $conn->table('settings')->where('item', 'favicon_logo')->update(['serialized' => 0]);
            }
        }

        echo "IDENTITY AFTER CLEANUP: name={$name} logo={$logo}\n";
    }

    echo "TENANT CLEANUP: domain={$domain} database={$tenant->database} inherited_media_deleted={$deleted}\n";
} finally {
    Config::set('database.connections.mysql.database', $centralDb);
    DB::purge('mysql');
    DB::reconnect('mysql');
}
PHP
else
  echo "CLEAN_TENANT_DOMAIN not set; no tenant DB data changed."
fi

log "7. POST-DEPLOY SOURCE CHECK"
php -l "$ROOT/$HELPER" >/dev/null
grep -q 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1' "$ROOT/app/admin/controllers/Pmdmenus.php" || fail "Menu Manager marker missing"
grep -q 'PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R1' "$ROOT/app/main/routes/menu-highlight-response.php" || fail "Menu API marker missing"
grep -q 'PMD_NEW_TENANT_MEDIA_EMPTY_R1' "$ROOT/app/Services/SuperAdminTenantLifecycleService.php" || fail "Tenant lifecycle marker missing"

if [[ -n "$CLEAN_TENANT_DOMAIN" ]]; then
  echo
  echo "SETTINGS NOW:"
  curl -fsSL "https://$CLEAN_TENANT_DOMAIN/api/v1/settings?x=$(date +%s)" \
    | php -r '$j=json_decode(stream_get_contents(STDIN), true); echo "site_name=".($j["site_name"]??"")."\nsite_logo=".($j["site_logo"]??"")."\n";' \
    || true

  if [[ -n "$TEST_MEDIA_NAME" ]]; then
    code="$(curl -sS -o /dev/null -w '%{http_code}' "https://$CLEAN_TENANT_DOMAIN/api/media/$TEST_MEDIA_NAME?x=$(date +%s)" || true)"
    echo "TEST OLD MEDIA HTTP STATUS: $code"
  fi
fi

ACTIVATED=0
trap - EXIT
rm -rf "$STAGE"

log "TENANT MEDIA ISOLATION R1 RERUN2 DEPLOYED"
echo "Git HEAD was not changed: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
echo "Expected for an unowned old image: HTTP 404"
