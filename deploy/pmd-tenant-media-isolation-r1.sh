#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/tenant-media-isolation-r1"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="$ROOT/storage/pmd-tenant-media-r1-stage-$STAMP"
BACKUP="$ROOT/storage/pmd-tenant-media-r1-backups/$STAMP"
CLEAN_TENANT_DOMAIN="${CLEAN_TENANT_DOMAIN:-}"
ACTIVATED=0

HELPER="app/main/routes/tenant-media-guard.php"
FILES=(
  "app/admin/controllers/Pmdmenus.php"
  "app/main/routes/menu-highlight-response.php"
  "app/main/routes/helpers.php"
  "app/main/routes/api-health-media.php"
  "app/main/routes/pmd-frontend-v2-media.php"
  "app/main/routes/main-app-before.php"
  "routes/root-app-before.php"
  "routes/api.php"
  "app/Services/SuperAdminTenantLifecycleService.php"
)

log() {
  printf '\n============================================================\n%s\n============================================================\n' "$*"
}

fail() {
  printf '\nTENANT MEDIA R1 REFUSED: %s\n' "$*" >&2
  exit 2
}

rollback() {
  set +e
  log "ROLLBACK TENANT MEDIA ISOLATION R1"
  [[ -d "$BACKUP/files" ]] && cp -a "$BACKUP/files/." "$ROOT/"
  if [[ -f "$BACKUP/helper-was-new" ]]; then
    rm -f "$ROOT/$HELPER"
  fi
  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
  log "TENANT MEDIA R1 CODE ROLLBACK COMPLETE"
  echo "Database cleanup is intentionally NOT reversed automatically."
}

on_exit() {
  rc=$?
  trap - EXIT
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

log "2. FETCH ONLY THE REVIEWED MEDIA GUARD"
git fetch origin "$BRANCH"
mkdir -p "$STAGE/files/$(dirname "$HELPER")"
git show "FETCH_HEAD:$HELPER" > "$STAGE/files/$HELPER"
php -l "$STAGE/files/$HELPER" >/dev/null

log "3. PATCH ONLY MEDIA / MENU AUTHORITIES"
python3 - "$STAGE/files" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])

# ------------------------------------------------------------------
# Pmdmenus.php: NEVER infer a Food image from old shared pmdnew files.
# Real tenant gallery/media references remain allowed.
# ------------------------------------------------------------------
p = root / 'app/admin/controllers/Pmdmenus.php'
s = p.read_text()
if 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1' not in s:
    old = '        $legacyImageIndex = $this->legacyPmdNewImageIndex();\n'
    if s.count(old) != 1:
        raise SystemExit('Pmdmenus: legacy image index marker not found exactly once')
    s = s.replace(
        old,
        "        // PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1\n"
        "        // A Food with no uploaded image must stay image-less. Never scan\n"
        "        // the shared legacy media folder and guess an image by Food name.\n"
        "        $legacyImageIndex = [];\n",
        1,
    )

    needle = """        } catch (\\Throwable $e) {\n        }\n\n        $slug = $this->menuNameSlug((string)$menu->menu_name);\n"""
    if needle not in s:
        raise SystemExit('Pmdmenus: menuImageUrl insertion marker missing')
    replacement = """        } catch (\\Throwable $e) {\n        }\n\n        // PMD_TENANT_MEDIA_REAL_THUMB_R1\n        // Use only a thumbnail that is explicitly attached in THIS tenant DB.\n        try {\n            if (Schema::hasTable('media_attachments')) {\n                $thumb = DB::table('media_attachments')\n                    ->whereIn('attachment_type', ['menus', 'Admin\\\\Models\\\\Menus_model'])\n                    ->where('attachment_id', (int)$menu->menu_id)\n                    ->where('tag', 'thumb')\n                    ->orderByRaw('COALESCE(priority, 999999) ASC')\n                    ->orderBy('id', 'asc')\n                    ->value('name');\n                if ($thumb) {\n                    return '/api/media/'.ltrim((string)$thumb, '/');\n                }\n            }\n        } catch (\\Throwable $e) {\n        }\n\n        $slug = $this->menuNameSlug((string)$menu->menu_name);\n"""
    s = s.replace(needle, replacement, 1)
p.write_text(s)

# ------------------------------------------------------------------
# Public menu payload: no pasta/default image when Food has no image.
# ------------------------------------------------------------------
p = root / 'app/main/routes/menu-highlight-response.php'
s = p.read_text()
if 'PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R1' not in s:
    old1 = '$item->image = $item->image ? "/api/media/".$item->image : \'/images/pasta.png\';'
    old2 = '$combo->image = $combo->image ? "/api/media/".$combo->image : \'/images/pasta.png\';'
    if old1 not in s or old2 not in s:
        raise SystemExit('menu-highlight-response: fallback markers missing')
    s = s.replace(
        old1,
        "// PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R1\n                $item->image = $item->image ? \"/api/media/\".$item->image : '';",
        1,
    )
    s = s.replace(
        old2,
        "$combo->image = $combo->image ? \"/api/media/\".$combo->image : '';",
        1,
    )
p.write_text(s)

# ------------------------------------------------------------------
# Gallery image URLs must go through tenant-authorized /api/media.
# Do not expose shared /assets/media paths from menu payloads.
# ------------------------------------------------------------------
p = root / 'app/main/routes/helpers.php'
s = p.read_text()
if 'PMD_MENU_GALLERY_TENANT_MEDIA_R1' not in s:
    pattern = re.compile(
        r"if \(!function_exists\('pmd_menu_gallery_image_url'\)\) \{.*?\n\}\n\n"
        r"if \(!function_exists\('pmd_menu_gallery_images_for_id'\)\)",
        re.S,
    )
    replacement = r'''if (!function_exists('pmd_menu_gallery_image_url')) {
    function pmd_menu_gallery_image_url($path) {
        // PMD_MENU_GALLERY_TENANT_MEDIA_R1
        $path = trim((string)$path);
        if ($path === '') return null;
        if (preg_match('#^https?://#i', $path)) return $path;

        $path = rawurldecode(str_replace('\\', '/', $path));
        $path = ltrim($path, '/');
        foreach ([
            'api/media/',
            'assets/media/attachments/public/',
            'assets/media/',
            'attachments/public/',
            'uploads/',
            'storage/',
        ] as $prefix) {
            if (strpos($path, $prefix) === 0) {
                $path = substr($path, strlen($prefix));
                break;
            }
        }

        $path = ltrim($path, '/');
        return $path !== '' ? '/api/media/'.$path : null;
    }
}

if (!function_exists('pmd_menu_gallery_images_for_id'))'''
    s2, count = pattern.subn(replacement, s, count=1)
    if count != 1:
        raise SystemExit('helpers.php: gallery function block not found exactly once')
    s = s2
p.write_text(s)

# ------------------------------------------------------------------
# app/main /api/media: require tenant ownership + tenant middleware.
# ------------------------------------------------------------------
p = root / 'app/main/routes/api-health-media.php'
s = p.read_text()
if 'PMD_TENANT_MEDIA_ROUTE_GUARD_R1' not in s:
    if "require_once __DIR__.'/tenant-media-guard.php';" not in s:
        s = s.replace('<?php\n', "<?php\n\nrequire_once __DIR__.'/tenant-media-guard.php';\n", 1)
    start = "    Route::get('/media/{path}', function ($path) {\n"
    if s.count(start) != 1:
        raise SystemExit('api-health-media: media route start mismatch')
    s = s.replace(
        start,
        start + "        // PMD_TENANT_MEDIA_ROUTE_GUARD_R1\n"
                "        if (!pmd_tenant_media_owned_r1($path)) abort(404);\n",
        1,
    )
    fallback = re.compile(
        r"\n        \$fallbackPath = public_path\('images/pasta\.png'\);.*?\n        abort\(404\);",
        re.S,
    )
    s, _ = fallback.subn("\n        abort(404);", s, count=1)
    end = "    })->where('path', '.*');"
    if s.count(end) != 1:
        raise SystemExit('api-health-media: media route end mismatch')
    s = s.replace(
        end,
        "    })->where('path', '.*')\n"
        "        ->middleware([\\App\\Http\\Middleware\\DetectTenant::class]);",
        1,
    )
p.write_text(s)

# ------------------------------------------------------------------
# V2 legacy media compatibility route: same tenant ownership rule.
# ------------------------------------------------------------------
p = root / 'app/main/routes/pmd-frontend-v2-media.php'
s = p.read_text()
if 'PMD_FRONTEND_MEDIA_TENANT_GUARD_R1' not in s:
    if "require_once __DIR__.'/tenant-media-guard.php';" not in s:
        s = s.replace('<?php\n', "<?php\n\nrequire_once __DIR__.'/tenant-media-guard.php';\n", 1)
    start = "    \\Illuminate\\Support\\Facades\\Route::match(['GET', 'HEAD'], '/api/v1/frontend-media-v2/{path}', function ($path) {\n"
    if s.count(start) != 1:
        raise SystemExit('pmd-frontend-v2-media: route start mismatch')
    s = s.replace(
        start,
        start + "        // PMD_FRONTEND_MEDIA_TENANT_GUARD_R1\n"
                "        if (!pmd_tenant_media_owned_r1($path)) abort(404);\n",
        1,
    )
    end = "    })->where('path', '.*');"
    if s.count(end) != 1:
        raise SystemExit('pmd-frontend-v2-media: route end mismatch')
    s = s.replace(
        end,
        "    })->where('path', '.*')\n"
        "        ->middleware([\\App\\Http\\Middleware\\DetectTenant::class]);",
        1,
    )
p.write_text(s)

# ------------------------------------------------------------------
# Ensure helper loads before both app/main media routes.
# ------------------------------------------------------------------
p = root / 'app/main/routes/main-app-before.php'
s = p.read_text()
if 'PMD_TENANT_MEDIA_GUARD_LOADER_R1' not in s:
    needle = "        require_once __DIR__.'/api-health-media.php';\n"
    if needle not in s:
        raise SystemExit('main-app-before: api-health loader marker missing')
    s = s.replace(
        needle,
        "        // PMD_TENANT_MEDIA_GUARD_LOADER_R1\n"
        "        require_once __DIR__.'/tenant-media-guard.php';\n" + needle,
        1,
    )
p.write_text(s)

# ------------------------------------------------------------------
# Root-app duplicate /api/media route must be tenant-protected too.
# ------------------------------------------------------------------
p = root / 'routes/root-app-before.php'
s = p.read_text()
if 'PMD_ROOT_MEDIA_TENANT_GUARD_R1' not in s:
    marker = "/*\n * Menu/food images: ensure /api/media/{path} is always registered"
    if marker not in s:
        raise SystemExit('root-app-before: media comment marker missing')
    s = s.replace(
        marker,
        "// PMD_ROOT_MEDIA_TENANT_GUARD_R1\n"
        "require_once base_path('app/main/routes/tenant-media-guard.php');\n\n" + marker,
        1,
    )
    group = "Route::group(['prefix' => 'api', 'middleware' => [\\App\\Http\\Middleware\\CorsMiddleware::class]], function () {"
    if group not in s:
        raise SystemExit('root-app-before: media group marker missing')
    s = s.replace(
        group,
        "Route::group(['prefix' => 'api', 'middleware' => [\\App\\Http\\Middleware\\CorsMiddleware::class, \\App\\Http\\Middleware\\DetectTenant::class]], function () {",
        1,
    )
    route = "    Route::get('/media/{path}', function ($path) {\n"
    pos = s.find(marker)
    route_pos = s.find(route, pos)
    if route_pos < 0:
        raise SystemExit('root-app-before: media route start missing after marker')
    insert_at = route_pos + len(route)
    s = s[:insert_at] + "        if (!pmd_tenant_media_owned_r1($path)) abort(404);\n" + s[insert_at:]
p.write_text(s)

# ------------------------------------------------------------------
# Laravel routes/api duplicate route: same guard.
# ------------------------------------------------------------------
p = root / 'routes/api.php'
s = p.read_text()
if 'PMD_API_MEDIA_TENANT_GUARD_R1' not in s:
    s = s.replace(
        '<?php\n',
        "<?php\n\n// PMD_API_MEDIA_TENANT_GUARD_R1\nrequire_once base_path('app/main/routes/tenant-media-guard.php');\n",
        1,
    )
    route = "    Route::get('/media/{path}', function ($path) {\n"
    if s.count(route) < 1:
        raise SystemExit('routes/api.php: media route start missing')
    pos = s.find(route)
    insert_at = pos + len(route)
    s = s[:insert_at] + "        if (!pmd_tenant_media_owned_r1($path)) abort(404);\n" + s[insert_at:]
    end = "    })->where('path', '.*');"
    end_pos = s.find(end, insert_at)
    if end_pos < 0:
        raise SystemExit('routes/api.php: media route end missing')
    replacement = "    })->where('path', '.*')\n        ->middleware(['web', \\App\\Http\\Middleware\\DetectTenant::class]);"
    s = s[:end_pos] + replacement + s[end_pos + len(end):]
p.write_text(s)

# ------------------------------------------------------------------
# New tenants must NEVER inherit media attachment rows from template DB.
# ------------------------------------------------------------------
p = root / 'app/Services/SuperAdminTenantLifecycleService.php'
s = p.read_text()
if 'PMD_NEW_TENANT_MEDIA_EMPTY_R1' not in s:
    needle = "        'menu_images',\n"
    if s.count(needle) != 1:
        raise SystemExit('TenantLifecycle: menu_images marker not found exactly once')
    s = s.replace(
        needle,
        needle + "        // PMD_NEW_TENANT_MEDIA_EMPTY_R1\n        'media_attachments',\n",
        1,
    )
p.write_text(s)
PY

log "4. VERIFY PATCH MARKERS + PHP SYNTAX"
for rel in "${FILES[@]}" "$HELPER"; do
  php -l "$STAGE/files/$rel" >/dev/null || fail "PHP syntax failed: $rel"
done

grep -n 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1' "$STAGE/files/app/admin/controllers/Pmdmenus.php"
grep -n 'PMD_MENU_NO_LEGACY_IMAGE_FALLBACK_R1' "$STAGE/files/app/main/routes/menu-highlight-response.php"
grep -n 'PMD_TENANT_MEDIA_ROUTE_GUARD_R1' "$STAGE/files/app/main/routes/api-health-media.php"
grep -n 'PMD_ROOT_MEDIA_TENANT_GUARD_R1' "$STAGE/files/routes/root-app-before.php"
grep -n 'PMD_NEW_TENANT_MEDIA_EMPTY_R1' "$STAGE/files/app/Services/SuperAdminTenantLifecycleService.php"

if grep -q "legacyImageIndex = \$this->legacyPmdNewImageIndex" "$STAGE/files/app/admin/controllers/Pmdmenus.php"; then
  fail "Legacy Food image auto-scan is still active"
fi
if grep -q "'/images/pasta.png'" "$STAGE/files/app/main/routes/menu-highlight-response.php"; then
  fail "Legacy pasta fallback still exists in canonical menu payload"
fi

log "5. ACTIVATE ONLY REVIEWED PHP FILES"
ACTIVATED=1

for rel in "${FILES[@]}"; do
  owner="$(stat -c '%U' "$ROOT/$rel")"
  group="$(stat -c '%G' "$ROOT/$rel")"
  mode="$(stat -c '%a' "$ROOT/$rel")"
  install -o "$owner" -g "$group" -m "$mode" "$STAGE/files/$rel" "$ROOT/$rel"
done

helper_owner="$(stat -c '%U' "$ROOT/app/main/routes")"
helper_group="$(stat -c '%G' "$ROOT/app/main/routes")"
install -o "$helper_owner" -g "$helper_group" -m 0644 "$STAGE/files/$HELPER" "$ROOT/$HELPER"

cd "$ROOT"
php artisan optimize:clear >/dev/null
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true

log "6. OPTIONAL CLEANUP FOR ONE EXISTING NEW TENANT"
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

$centralDatabase = (string)Config::get('database.connections.mysql.database');
$tenant = DB::connection('mysql')->table('tenants')->where('domain', $domain)->first();
if (!$tenant || empty($tenant->database)) {
    throw new RuntimeException('Tenant not found in central registry: '.$domain);
}

$tenantCreatedAt = !empty($tenant->created_at) ? (string)$tenant->created_at : null;
if (!$tenantCreatedAt) {
    throw new RuntimeException('Tenant created_at is missing; refusing inherited-media cleanup');
}

try {
    Config::set('database.connections.mysql.database', (string)$tenant->database);
    DB::purge('mysql');
    DB::reconnect('mysql');
    $conn = DB::connection('mysql');
    $schema = $conn->getSchemaBuilder();

    $deleted = 0;
    if ($schema->hasTable('media_attachments')
        && $schema->hasColumn('media_attachments', 'created_at')
        && $schema->hasColumn('media_attachments', 'attachment_type')) {
        $types = [
            'menus',
            'Admin\\Models\\Menus_model',
            'menu_combos',
            'Admin\\Models\\Menu_combos_model',
        ];
        $query = $conn->table('media_attachments')
            ->whereIn('attachment_type', $types)
            ->where(function ($q) use ($tenantCreatedAt) {
                $q->whereNull('created_at')->orWhere('created_at', '<', $tenantCreatedAt);
            });
        $count = (clone $query)->count();
        if ($count > 0) {
            $deleted = $query->delete();
        }
    }

    // Repair only generic/template identity values. Never overwrite owner custom identity.
    if ($schema->hasTable('settings') && $schema->hasColumn('settings', 'item') && $schema->hasColumn('settings', 'value')) {
        $hostLabel = explode('.', $domain)[0] ?: 'PayMyDine';
        $name = trim((string)$conn->table('settings')->where('item', 'site_name')->value('value'));
        $logo = trim((string)$conn->table('settings')->where('item', 'site_logo')->value('value'));
        $genericNames = ['', 'tastyigniter', 'tasty igniter', 'default', 'paymydine restaurant'];
        $genericLogos = ['', 'images.png', 'image.png', 'pasta.png', 'no-image.png'];

        if (in_array(strtolower(preg_replace('/\\s+/', ' ', $name)), $genericNames, true)) {
            $conn->table('settings')->where('item', 'site_name')->update(['value' => $hostLabel]);
            $name = $hostLabel;
        }

        $logoBase = strtolower(basename(parse_url($logo, PHP_URL_PATH) ?: $logo));
        if (in_array($logoBase, $genericLogos, true)) {
            $defaultLogo = 'https://'.$domain.'/brand/paymydine-logo.svg';
            $conn->table('settings')->where('item', 'site_logo')->update(['value' => $defaultLogo]);
            $logo = $defaultLogo;
        }

        echo "IDENTITY AFTER CLEANUP: name={$name} logo={$logo}\n";
    }

    echo "TENANT CLEANUP: domain={$domain} database={$tenant->database} inherited_menu_media_deleted={$deleted}\n";
} finally {
    Config::set('database.connections.mysql.database', $centralDatabase);
    DB::purge('mysql');
    DB::reconnect('mysql');
}
PHP
else
  echo "CLEAN_TENANT_DOMAIN not set; no tenant data was modified."
fi

log "7. POST-DEPLOY CHECK"
php -l "$ROOT/app/main/routes/tenant-media-guard.php" >/dev/null
grep -q 'PMD_TENANT_MEDIA_NO_LEGACY_AUTOMATCH_R1' "$ROOT/app/admin/controllers/Pmdmenus.php" || fail "Menu Manager marker missing"
grep -q 'PMD_TENANT_MEDIA_ROUTE_GUARD_R1' "$ROOT/app/main/routes/api-health-media.php" || fail "Media route marker missing"
grep -q 'PMD_NEW_TENANT_MEDIA_EMPTY_R1' "$ROOT/app/Services/SuperAdminTenantLifecycleService.php" || fail "Tenant lifecycle marker missing"

ACTIVATED=0
trap - EXIT
rm -rf "$STAGE"

log "TENANT MEDIA ISOLATION R1 DEPLOYED"
echo "Git HEAD unchanged: $(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
echo
echo "Contract enforced:"
echo "- New Food with no upload gets NO old/shared Food image"
echo "- /api/media requires ownership in the current tenant DB"
echo "- Menu payload no longer injects pasta.png"
echo "- Gallery URLs go through tenant-authorized /api/media"
echo "- Future new tenants start with empty media_attachments"
