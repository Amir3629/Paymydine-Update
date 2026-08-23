#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="${PMD_ROOT:-/var/www/paymydine}"
V2_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
V2_ROOT="$ROOT/$V2_REL"
PM2_USER="ubuntu"
PM2_SERVICE="paymydine-frontend-v2"
PMD_PORT="3002"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
STAGE="$ROOT/storage/pmd-identity-r25-stage-$STAMP"
BACKUP="$ROOT/storage/pmd-identity-r25-backups/$STAMP"
V2_STAGE="$STAGE/v2"
ACTIVATED=0

PMDSETTINGS="app/admin/controllers/Pmdsettings.php"
API_ROUTES="routes/api.php"
BOOTSTRAP="$V2_REL/src/server/bootstrap.ts"
NORMALIZE="$V2_REL/src/server/normalize.ts"

log() { printf '\n============================================================\n%s\n============================================================\n' "$*"; }
fail() { printf '\nIDENTITY R25 REFUSED: %s\n' "$*" >&2; exit 2; }

rollback() {
  set +e
  log "ROLLBACK RESTAURANT IDENTITY R25"
  [[ -d "$BACKUP/files" ]] && cp -a "$BACKUP/files/." "$ROOT/"
  rm -rf "$V2_ROOT/.next"
  [[ -d "$BACKUP/next.previous" ]] && mv "$BACKUP/next.previous" "$V2_ROOT/.next"
  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
  sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null 2>&1 || true
  log "IDENTITY R25 CODE ROLLBACK COMPLETE"
}

on_exit() {
  rc=$?
  trap - EXIT
  if [[ "$rc" -ne 0 && "$ACTIVATED" == "1" ]]; then rollback; fi
  exit "$rc"
}
trap on_exit EXIT

[[ "$EUID" -eq 0 ]] || fail "Run with sudo/root"
for cmd in php python3 node npm curl sudo; do command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"; done
[[ -f "$ROOT/artisan" ]] || fail "Not a PayMyDine root: $ROOT"
[[ -f "$ROOT/$PMDSETTINGS" && -f "$ROOT/$API_ROUTES" ]] || fail "Required Laravel source is missing"
[[ -f "$ROOT/$BOOTSTRAP" && -f "$ROOT/$NORMALIZE" ]] || fail "Required Frontend V2 source is missing"

log "1. SNAPSHOT LIVE STATE - NO GIT CHECKOUT/RESET/PULL"
echo "HEAD:   $(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
echo "BRANCH: $(git -C "$ROOT" branch --show-current 2>/dev/null || echo unknown)"
mkdir -p "$STAGE/files" "$BACKUP/files"

for rel in "$PMDSETTINGS" "$API_ROUTES" "$BOOTSTRAP" "$NORMALIZE"; do
  mkdir -p "$STAGE/files/$(dirname "$rel")" "$BACKUP/files/$(dirname "$rel")"
  cp -a "$ROOT/$rel" "$STAGE/files/$rel"
  cp -a "$ROOT/$rel" "$BACKUP/files/$rel"
done

log "2. PATCH ONLY THE FOUR IDENTITY AUTHORITIES"
python3 - "$STAGE/files/$PMDSETTINGS" "$STAGE/files/$API_ROUTES" "$STAGE/files/$BOOTSTRAP" "$STAGE/files/$NORMALIZE" <<'PY'
from pathlib import Path
import sys

pmd = Path(sys.argv[1])
api = Path(sys.argv[2])
bootstrap = Path(sys.argv[3])
normalize = Path(sys.argv[4])

# ---------------- Pmdsettings.php ----------------
s = pmd.read_text()
if 'PMD_RESTAURANT_IDENTITY_AUTHORITY_R25' not in s:
    # Self-heal identity before rendering Restaurant Profile.
    old = """        $locationId = $this->currentLocationId();\n\n        $this->vars['pmdProfile'] = $this->restaurantProfilePayload($locationId);\n"""
    new = """        $locationId = $this->currentLocationId();\n\n        // PMD_RESTAURANT_IDENTITY_AUTHORITY_R25\n        // Repair generic/template branding before rendering the owner profile.\n        $this->resolvedRestaurantIdentityR25(true);\n\n        $this->vars['pmdProfile'] = $this->restaurantProfilePayload($locationId);\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: restaurant() marker not found')
    s = s.replace(old, new, 1)

    # Never use a potentially stale setting() cache to resolve default language.
    old = """            $defaultLanguage = strtolower(trim((string)setting('default_language', 'en')));\n"""
    new = """            $defaultLanguage = strtolower(trim((string)$this->restaurantSettingValueR24('default_language', 'en')));\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: default language marker not found')
    s = s.replace(old, new, 1)

    # Theme/guest settings are direct-key writes only. They cannot flush stale identity values.
    old = """        DB::transaction(function () use ($payload) {\n            setting()->set($payload);\n            setting()->save();\n            $this->persistFrontendThemePayload($payload);\n        });\n"""
    new = """        DB::transaction(function () use ($payload) {\n            // PMD_THEME_IDENTITY_ISOLATION_R25\n            // Never call the broad Settings manager here: an in-process stale\n            // cache could re-persist site_name/site_logo while saving a theme.\n            $this->persistSettingsDirectR25($payload);\n            $this->persistFrontendThemePayload($payload);\n            $this->resolvedRestaurantIdentityR25(true);\n        });\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: theme save marker not found')
    s = s.replace(old, new, 1)

    # Frontend settings page also reads current tenant DB directly.
    old = """        $value = function (string $key, $fallback = '') use ($data) {\n            // PMD Settings is authoritative. Theme-table data is compatibility fallback only.\n            try {\n                $settingValue = setting($key, null);\n                if ($settingValue !== null && $settingValue !== '') return $settingValue;\n            } catch (\\Throwable $error) {\n            }\n            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {\n                return $data[$key];\n            }\n            return $fallback;\n        };\n"""
    new = """        $value = function (string $key, $fallback = '') use ($data) {\n            // PMD_THEME_SETTINGS_DIRECT_DB_R25\n            $settingValue = $this->restaurantSettingValueR24($key, null);\n            if ($settingValue !== null && $settingValue !== '') return $settingValue;\n            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {\n                return $data[$key];\n            }\n            return $fallback;\n        };\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: frontend value reader marker not found')
    s = s.replace(old, new, 1)

    old = """        $languageRaw = (string)$value('pmd_v2_enabled_languages', (string)setting('default_language', 'en').',en');\n"""
    new = """        $languageRaw = (string)$value('pmd_v2_enabled_languages', (string)$this->restaurantSettingValueR24('default_language', 'en').',en');\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: frontend language fallback marker not found')
    s = s.replace(old, new, 1)

    # Insert direct persistence + identity resolver after the existing direct read helper.
    marker = """    /* PMD_RESTAURANT_LOGO_AUTHORITY_R20 */\n"""
    helper = r'''    /* PMD_RESTAURANT_IDENTITY_AUTHORITY_R25 */
    protected function persistSettingsDirectR25(array $values): void
    {
        if (!Schema::hasTable('settings')) {
            throw new \RuntimeException('Tenant settings table is unavailable.');
        }

        $columns = Schema::getColumnListing('settings');
        foreach ($values as $item => $value) {
            $item = trim((string)$item);
            if ($item === '') continue;

            $query = DB::table('settings')->where('item', $item);
            $write = ['value' => (string)$value];
            if (in_array('updated_at', $columns, true)) $write['updated_at'] = now();

            if ($query->exists()) {
                $query->update($write);
                continue;
            }

            $insert = ['item' => $item, 'value' => (string)$value];
            if (in_array('sort', $columns, true)) $insert['sort'] = 'config';
            if (in_array('serialized', $columns, true)) $insert['serialized'] = 0;
            if (in_array('created_at', $columns, true)) $insert['created_at'] = now();
            if (in_array('updated_at', $columns, true)) $insert['updated_at'] = now();
            DB::table('settings')->insert($insert);
        }
    }

    protected function tenantIdentityHostR25(): string
    {
        $host = strtolower(trim((string)request()->getHost()));
        return preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $host) ? $host : '';
    }

    protected function defaultRestaurantNameR25(): string
    {
        $host = $this->tenantIdentityHostR25();
        if ($host !== '') {
            $label = explode('.', $host)[0] ?? '';
            if ($label !== '') return $label;
        }
        return 'PayMyDine';
    }

    protected function defaultRestaurantLogoR25(): string
    {
        $host = $this->tenantIdentityHostR25();
        return $host !== ''
            ? 'https://'.$host.'/brand/paymydine-logo.svg'
            : '/brand/paymydine-logo.svg';
    }

    protected function isGenericRestaurantNameR25(string $name): bool
    {
        $name = strtolower(trim((string)preg_replace('/\s+/u', ' ', $name)));
        return $name === '' || in_array($name, [
            'tastyigniter',
            'tasty igniter',
            'default',
            'paymydine restaurant',
        ], true);
    }

    protected function isStaleRestaurantLogoR25(string $logo): bool
    {
        $logo = trim($logo);
        if ($logo === '') return true;
        $path = parse_url($logo, PHP_URL_PATH) ?: $logo;
        $base = strtolower(basename(str_replace('\\', '/', $path)));
        return in_array($base, [
            'gemini_generated_image_kzcmghkzcmghkzcm-removebg-preview.png',
            'images.png', 'image.png', 'images.jpg', 'image.jpg',
            'images.jpeg', 'image.jpeg', 'placeholder.svg', 'no-image.png',
        ], true);
    }

    protected function resolvedRestaurantIdentityR25(bool $persist = false): array
    {
        $dedicatedName = trim((string)$this->restaurantSettingValueR24('pmd_restaurant_identity_name', ''));
        $legacyName = trim((string)$this->restaurantSettingValueR24('site_name', ''));
        $locationName = '';
        try {
            $locationName = trim((string)(DB::table('locations')->orderBy('location_id')->value('location_name') ?? ''));
        } catch (\Throwable $error) {
        }

        $name = '';
        foreach ([$dedicatedName, $legacyName, $locationName] as $candidate) {
            if (!$this->isGenericRestaurantNameR25((string)$candidate)) {
                $name = trim((string)$candidate);
                break;
            }
        }
        if ($name === '') $name = $this->defaultRestaurantNameR25();

        $dedicatedLogo = trim((string)$this->restaurantSettingValueR24('pmd_restaurant_identity_logo', ''));
        $legacyLogo = trim((string)$this->restaurantSettingValueR24('site_logo', ''));
        $logo = !$this->isStaleRestaurantLogoR25($dedicatedLogo)
            ? $dedicatedLogo
            : (!$this->isStaleRestaurantLogoR25($legacyLogo)
                ? $legacyLogo
                : $this->defaultRestaurantLogoR25());

        if ($persist) {
            $this->persistSettingsDirectR25([
                'pmd_restaurant_identity_name' => $name,
                'pmd_restaurant_identity_logo' => $logo,
                'site_name' => $name,
                'site_logo' => $logo,
            ]);
        }

        return ['name' => $name, 'logo' => $logo];
    }

'''
    if marker not in s:
        raise SystemExit('Pmdsettings: identity helper insertion marker not found')
    s = s.replace(marker, helper + marker, 1)

    # Removing a custom logo means return to PayMyDine default, not an empty brand.
    s = s.replace(
        """        if ($removeLogo) {\n            return '';\n        }\n\n        $current = trim((string)$this->restaurantSettingValueR24('site_logo', ''));\n        if ($current === '') {\n            return '';\n        }\n""",
        """        if ($removeLogo) {\n            return $this->defaultRestaurantLogoR25();\n        }\n\n        $current = trim((string)$this->restaurantSettingValueR24('pmd_restaurant_identity_logo', ''));\n        if ($current === '') {\n            $current = trim((string)$this->restaurantSettingValueR24('site_logo', ''));\n        }\n        if ($current === '') {\n            return $this->defaultRestaurantLogoR25();\n        }\n""",
        1,
    )
    s = s.replace(
        """        if ($base === 'Gemini_Generated_Image_kzcmghkzcmghkzcm-removebg-preview.png') {\n            return '';\n        }\n""",
        """        if ($base === 'Gemini_Generated_Image_kzcmghkzcmghkzcm-removebg-preview.png') {\n            return $this->defaultRestaurantLogoR25();\n        }\n""",
        1,
    )
    s = s.replace(
        """        if ($resolvedPath === null || !$this->restaurantLogoIsValidFileR22($resolvedPath)) {\n            return '';\n        }\n""",
        """        if ($resolvedPath === null || !$this->restaurantLogoIsValidFileR22($resolvedPath)) {\n            return $this->defaultRestaurantLogoR25();\n        }\n""",
        1,
    )

    # Legacy identity handler: protect owner identity with dedicated keys.
    old = """        setting()->set($settings);\n        setting()->save();\n\n        flash()->success('Restaurant identity saved.');\n"""
    new = """        $settings['pmd_restaurant_identity_name'] = $siteName;\n        if (isset($settings['site_logo'])) {\n            $settings['pmd_restaurant_identity_logo'] = $settings['site_logo'];\n        }\n        $this->persistSettingsDirectR25($settings);\n\n        flash()->success('Restaurant identity saved.');\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: legacy identity save marker not found')
    s = s.replace(old, new, 1)

    # Restaurant Profile: dedicated identity and direct writes.
    old = """            // R21: always write an explicit, sanitized site_logo so a stale cached value cannot come back.\n            $settings['site_logo'] = $resolvedLogo;\n\n            setting()->set($settings);\n            setting()->save();\n"""
    new = """            // PMD_RESTAURANT_IDENTITY_PERSIST_R25\n            // Owner identity is written to dedicated keys and mirrored to legacy\n            // site_* keys. No broad Settings-manager flush is allowed here.\n            $settings['site_logo'] = $resolvedLogo;\n            $settings['pmd_restaurant_identity_name'] = trim((string)$clean['name']);\n            $settings['pmd_restaurant_identity_logo'] = $resolvedLogo;\n            $this->persistSettingsDirectR25($settings);\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: profile save marker not found')
    s = s.replace(old, new, 1)

    # Profile payload always shows resolved protected identity.
    old = """        $value = function (string $key, $fallback = '') {\n            return $this->restaurantSettingValueR24($key, $fallback);\n        };\n\n        return [\n            'name' => (string)($value('site_name') ?: ($location->location_name ?? '')),\n"""
    new = """        $value = function (string $key, $fallback = '') {\n            return $this->restaurantSettingValueR24($key, $fallback);\n        };\n        $identity = $this->resolvedRestaurantIdentityR25(true);\n\n        return [\n            'name' => (string)$identity['name'],\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: profile payload name marker not found')
    s = s.replace(old, new, 1)

    old = """            'site_logo' => (string)($siteLogoR24 = $value('site_logo', '')),\n            'site_logo_preview' => $this->restaurantLogoPreviewR20((string)$siteLogoR24),\n"""
    new = """            'site_logo' => (string)($siteLogoR24 = $identity['logo']),\n            'site_logo_preview' => $this->restaurantLogoPreviewR20((string)$siteLogoR24),\n"""
    if old not in s:
        raise SystemExit('Pmdsettings: profile payload logo marker not found')
    s = s.replace(old, new, 1)

pmd.write_text(s)

# ---------------- routes/api.php ----------------
s = api.read_text()
if 'PMD_PUBLIC_RESTAURANT_IDENTITY_R25' not in s:
    marker = """use App\\Http\\Controllers\\Api\\ReviewController;\n\n"""
    helper = r'''/* PMD_PUBLIC_RESTAURANT_IDENTITY_R25 */
if (!function_exists('pmd_public_restaurant_identity_r25')) {
    function pmd_public_restaurant_identity_r25($settings): array
    {
        $read = function (string $key) use ($settings): string {
            if (isset($settings[$key]) && isset($settings[$key]->value)) {
                return trim((string)$settings[$key]->value);
            }
            return '';
        };

        $generic = function (string $name): bool {
            $name = strtolower(trim((string)preg_replace('/\s+/u', ' ', $name)));
            return $name === '' || in_array($name, [
                'tastyigniter', 'tasty igniter', 'default', 'paymydine restaurant',
            ], true);
        };

        $host = strtolower(trim((string)request()->getHost()));
        $domainName = 'PayMyDine';
        if (preg_match('/^([a-z0-9-]+)\.paymydine\.com$/', $host, $match)) {
            $domainName = $match[1];
        }

        $locationName = '';
        try {
            $locationName = trim((string)(\Illuminate\Support\Facades\DB::table('locations')
                ->orderBy('location_id')->value('location_name') ?? ''));
        } catch (\Throwable $error) {
        }

        $name = '';
        foreach ([$read('pmd_restaurant_identity_name'), $read('site_name'), $locationName] as $candidate) {
            if (!$generic($candidate)) {
                $name = $candidate;
                break;
            }
        }
        if ($name === '') $name = $domainName;

        $logo = $read('pmd_restaurant_identity_logo') ?: $read('site_logo');
        $path = parse_url($logo, PHP_URL_PATH) ?: $logo;
        $base = strtolower(basename(str_replace('\\', '/', (string)$path)));
        if ($logo === '' || in_array($base, [
            'gemini_generated_image_kzcmghkzcmghkzcm-removebg-preview.png',
            'images.png', 'image.png', 'placeholder.svg', 'no-image.png',
        ], true)) {
            $logo = preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $host)
                ? 'https://'.$host.'/brand/paymydine-logo.svg'
                : '/brand/paymydine-logo.svg';
        }

        return ['name' => $name, 'logo' => $logo];
    }
}

'''
    if marker not in s:
        raise SystemExit('routes/api.php: import marker not found')
    s = s.replace(marker, marker + helper, 1)

    # settings-wrapped
    old = """        Route::get('/settings-wrapped', function () {\n            $settings = \\Illuminate\\Support\\Facades\\DB::table('settings')->get()->keyBy('item');\n\n            $payload = [\n                'site_name'         => $settings['site_name']->value ?? 'PayMyDine',\n                'site_logo'         => $settings['site_logo']->value ?? '',\n"""
    new = """        Route::get('/settings-wrapped', function () {\n            $settings = \\Illuminate\\Support\\Facades\\DB::table('settings')->get()->keyBy('item');\n            $identity = pmd_public_restaurant_identity_r25($settings);\n\n            $payload = [\n                'site_name'         => $identity['name'],\n                'site_logo'         => $identity['logo'],\n"""
    if old not in s:
        raise SystemExit('routes/api.php: settings-wrapped marker not found')
    s = s.replace(old, new, 1)

    # restaurant endpoint: name aligned with protected identity.
    old = """        Route::get('/restaurant', function (Request $request) {\n            $restaurant = \\Illuminate\\Support\\Facades\\DB::table('locations')->first();\n\n            return response()->json([\n                'id' => 1,\n                'name' => $restaurant->location_name ?? 'PayMyDine',\n"""
    new = """        Route::get('/restaurant', function (Request $request) {\n            $restaurant = \\Illuminate\\Support\\Facades\\DB::table('locations')->first();\n            $settings = \\Illuminate\\Support\\Facades\\DB::table('settings')->get()->keyBy('item');\n            $identity = pmd_public_restaurant_identity_r25($settings);\n\n            return response()->json([\n                'id' => 1,\n                'name' => $identity['name'],\n                'logo' => $identity['logo'],\n"""
    if old not in s:
        raise SystemExit('routes/api.php: restaurant endpoint marker not found')
    s = s.replace(old, new, 1)

    # settings endpoint
    old = """        Route::get('/settings', function () {\n            $settings = \\Illuminate\\Support\\Facades\\DB::table('settings')->get()->keyBy('item');\n\n            return response()->json([\n                'site_name' => $settings['site_name']->value ?? 'PayMyDine',\n                'site_logo' => $settings['site_logo']->value ?? '',\n"""
    new = """        Route::get('/settings', function () {\n            $settings = \\Illuminate\\Support\\Facades\\DB::table('settings')->get()->keyBy('item');\n            $identity = pmd_public_restaurant_identity_r25($settings);\n\n            return response()->json([\n                'site_name' => $identity['name'],\n                'site_logo' => $identity['logo'],\n                'pmd_restaurant_identity_name' => $identity['name'],\n                'pmd_restaurant_identity_logo' => $identity['logo'],\n"""
    if old not in s:
        raise SystemExit('routes/api.php: settings endpoint marker not found')
    s = s.replace(old, new, 1)

api.write_text(s)

# ---------------- Frontend V2 bootstrap.ts ----------------
s = bootstrap.read_text()
if 'PMD_RESTAURANT_IDENTITY_GUARD_R25' not in s:
    old = """  const adminRestaurantName = String(\n    settings?.site_name\n    || settings?.data?.site_name\n    || restaurant?.name\n    || restaurant?.data?.name\n    || '',\n  ).trim()\n  if (adminRestaurantName) restaurantInfo.name = adminRestaurantName\n"""
    new = """  // PMD_RESTAURANT_IDENTITY_GUARD_R25\n  // Legacy/template branding is never allowed to beat a tenant identity.\n  const isGenericRestaurantName = (value: unknown) => {\n    const clean = String(value || '').trim().replace(/\\s+/g, ' ').toLowerCase()\n    return !clean || ['tastyigniter', 'tasty igniter', 'default', 'paymydine restaurant'].includes(clean)\n  }\n  const nameCandidates = [\n    settings?.pmd_restaurant_identity_name,\n    settings?.data?.pmd_restaurant_identity_name,\n    settings?.site_name,\n    settings?.data?.site_name,\n    restaurant?.name,\n    restaurant?.data?.name,\n  ].map((value) => String(value || '').trim())\n  const hostLabel = host.split('.')[0] || 'PayMyDine'\n  const adminRestaurantName = nameCandidates.find((value) => !isGenericRestaurantName(value)) || hostLabel\n  restaurantInfo.name = adminRestaurantName\n"""
    if old not in s:
        raise SystemExit('bootstrap.ts: restaurant name authority marker not found')
    s = s.replace(old, new, 1)
bootstrap.write_text(s)

# ---------------- Frontend V2 normalize.ts ----------------
s = normalize.read_text()
if 'PMD_RESTAURANT_DEFAULT_LOGO_R25' not in s:
    old = """    logoUrl: asset(first(settings, ['site_logo_url','logo_url','site_logo','logo'])),\n"""
    new = """    // PMD_RESTAURANT_DEFAULT_LOGO_R25\n    logoUrl: asset(first(settings, ['pmd_restaurant_identity_logo','site_logo_url','logo_url','site_logo','logo'])) || '/brand/paymydine-logo.svg',\n"""
    if old not in s:
        raise SystemExit('normalize.ts: logo marker not found')
    s = s.replace(old, new, 1)
normalize.write_text(s)
PY

log "3. VERIFY PATCH MARKERS + SYNTAX"
grep -n 'PMD_RESTAURANT_IDENTITY_AUTHORITY_R25' "$STAGE/files/$PMDSETTINGS"
grep -n 'PMD_THEME_IDENTITY_ISOLATION_R25' "$STAGE/files/$PMDSETTINGS"
grep -n 'PMD_PUBLIC_RESTAURANT_IDENTITY_R25' "$STAGE/files/$API_ROUTES"
grep -n 'PMD_RESTAURANT_IDENTITY_GUARD_R25' "$STAGE/files/$BOOTSTRAP"
grep -n 'PMD_RESTAURANT_DEFAULT_LOGO_R25' "$STAGE/files/$NORMALIZE"
php -l "$STAGE/files/$PMDSETTINGS" >/dev/null
php -l "$STAGE/files/$API_ROUTES" >/dev/null

log "4. BUILD FRONTEND V2 FROM CURRENT LIVE SOURCE"
mkdir -p "$V2_STAGE"
tar --exclude='./node_modules' --exclude='./.next' -C "$V2_ROOT" -cf - . | tar -C "$V2_STAGE" -xf -
cp "$STAGE/files/$BOOTSTRAP" "$V2_STAGE/src/server/bootstrap.ts"
cp "$STAGE/files/$NORMALIZE" "$V2_STAGE/src/server/normalize.ts"
[[ -d "$V2_ROOT/node_modules" ]] || fail "Live V2 node_modules missing"
cp -al "$V2_ROOT/node_modules" "$V2_STAGE/node_modules"
for envfile in .env .env.local .env.production; do [[ -f "$V2_ROOT/$envfile" ]] && cp -a "$V2_ROOT/$envfile" "$V2_STAGE/$envfile"; done
chown -R "$PM2_USER:$PM2_USER" "$V2_STAGE"
(
  cd "$V2_STAGE"
  sudo -u "$PM2_USER" -H npm run build
)
[[ -d "$V2_STAGE/.next" ]] || fail "V2 build did not produce .next"

log "5. BACKUP LIVE NEXT BUILD"
if [[ -d "$V2_ROOT/.next" ]]; then mv "$V2_ROOT/.next" "$BACKUP/next.previous"; fi
cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="/var/www/paymydine"
V2_ROOT="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
BACKUP="$(cd "$(dirname "$0")" && pwd)"
cp -a "$BACKUP/files/." "$ROOT/"
rm -rf "$V2_ROOT/.next"
[[ -d "$BACKUP/next.previous" ]] && mv "$BACKUP/next.previous" "$V2_ROOT/.next"
cd "$ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u ubuntu -H pm2 restart paymydine-frontend-v2 --update-env
printf '\nRESTAURANT IDENTITY R25 ROLLBACK COMPLETE\n'
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

ACTIVATED=1
log "6. INSTALL ONLY FOUR REVIEWED SOURCE FILES"
for rel in "$PMDSETTINGS" "$API_ROUTES" "$BOOTSTRAP" "$NORMALIZE"; do
  owner="$(stat -c '%U' "$ROOT/$rel")"
  group="$(stat -c '%G' "$ROOT/$rel")"
  mode="$(stat -c '%a' "$ROOT/$rel")"
  install -o "$owner" -g "$group" -m "$mode" "$STAGE/files/$rel" "$ROOT/$rel"
done
rm -rf "$V2_ROOT/.next"
mv "$V2_STAGE/.next" "$V2_ROOT/.next"
chown -R "$(stat -c '%U' "$V2_ROOT"):$(stat -c '%G' "$V2_ROOT")" "$V2_ROOT/.next"

cd "$ROOT"
php artisan optimize:clear >/dev/null
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env

log "7. POST-DEPLOY HEALTH"
HEALTH=0
for attempt in 1 2 3 4 5 6 7 8; do
  if curl -fsS "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null; then HEALTH=1; break; fi
  sleep 2
done
[[ "$HEALTH" == "1" ]] || fail "Frontend V2 health failed"
php -l "$ROOT/$PMDSETTINGS" >/dev/null
php -l "$ROOT/$API_ROUTES" >/dev/null
grep -q 'PMD_THEME_IDENTITY_ISOLATION_R25' "$ROOT/$PMDSETTINGS" || fail "Pmdsettings patch missing"
grep -q 'PMD_PUBLIC_RESTAURANT_IDENTITY_R25' "$ROOT/$API_ROUTES" || fail "Public API patch missing"

ACTIVATED=0
trap - EXIT
rm -rf "$STAGE"

log "RESTAURANT IDENTITY R25 DEPLOYED"
echo "Git HEAD was not changed: $(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
echo
echo "Contract now enforced:"
echo "- Default tenant name = subdomain label"
echo "- Default logo = /brand/paymydine-logo.svg"
echo "- Owner custom name/logo stored in dedicated identity keys"
echo "- Theme save cannot flush stale site_name/site_logo"
echo "- Public API and V2 reject TastyIgniter/Default template names"
