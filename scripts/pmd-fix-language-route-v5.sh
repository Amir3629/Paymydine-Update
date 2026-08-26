#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
ROUTES="$ROOT/app/admin/routes.php"
EXPECTED_BEFORE_SHA="7d1a7c8d614f0abd6ce22996fece0e0fcaf87793f31e06f3bc0818cd22ecb9d6"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-language-route-backups/$STAMP"
TMP="$(mktemp -d)"
CANDIDATE="$TMP/routes.php.candidate"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

mkdir -p "$BACKUP"
cd "$ROOT"

if [[ ! -f "$ROUTES" ]]; then
  echo "ERROR=routes.php not found: $ROUTES" >&2
  exit 1
fi

current_sha="$(sha256sum "$ROUTES" | awk '{print $1}')"
echo "ROUTES_SHA_BEFORE=$current_sha"

# Idempotent success if V4 is already installed.
if grep -q "'source' => 'tenant-db-v4'" "$ROUTES"; then
  echo "ROUTE_V4_ALREADY_PRESENT=1"
  php -l "$ROUTES"
  echo "ROUTE_FIX_OK=1"
  exit 0
fi

if [[ "$current_sha" != "$EXPECTED_BEFORE_SHA" ]]; then
  echo "ERROR=routes.php changed since the audited version; nothing changed." >&2
  exit 10
fi

cp -a "$ROUTES" "$BACKUP/routes.php.before"
sha256sum "$BACKUP/routes.php.before" | tee "$BACKUP/routes-before.sha256"

# Build the complete candidate in /tmp. No production write happens here.
python3 - "$ROUTES" "$CANDIDATE" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1])
candidate = Path(sys.argv[2])
text = source.read_text()
start_marker = '// PMD_LANGUAGE_SWITCH_ROUTE_V3_BEGIN'
end_marker = '// PMD_LANGUAGE_SWITCH_ROUTE_V3_END'

if text.count(start_marker) != 1 or text.count(end_marker) != 1:
    raise SystemExit('ERROR=Expected exactly one V3 language route marker pair; nothing changed.')

start = text.index(start_marker)
end = text.index(end_marker, start) + len(end_marker)

replacement = r'''// PMD_LANGUAGE_SWITCH_ROUTE_V3_BEGIN
App::before(function () {
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        Route::post(
            '_pmd/language-switch-v3',
            function () {
                $auth = app('admin.auth');

                if (!$auth->isLogged()) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Authentication required.',
                        'source' => 'tenant-db-v4',
                    ], 401);
                }

                $code = strtolower(trim(
                    (string)request()->input('code', '')
                ));

                if (!in_array($code, ['en', 'de'], true)) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Unsupported language.',
                        'source' => 'tenant-db-v4',
                    ], 422);
                }

                $db = \Illuminate\Support\Facades\DB::connection('tenant');
                $tenantDatabase = (string)$db->getDatabaseName();
                $boundTenant = app()->bound('tenant') ? app('tenant') : null;
                $boundTenantDatabase = $boundTenant->database ?? null;

                $language = $db->table('languages')
                    ->whereRaw('BINARY code = ?', [$code])
                    ->where('status', 1)
                    ->first();

                if (!$language) {
                    $visibleLanguages = $db->table('languages')
                        ->orderBy('language_id')
                        ->get(['language_id', 'code', 'name', 'status'])
                        ->map(function ($row) {
                            return (array)$row;
                        })
                        ->all();

                    return response()->json([
                        'ok' => false,
                        'message' => 'Language row not visible on tenant connection.',
                        'source' => 'tenant-db-v4',
                        'diagnostic' => [
                            'requested_code' => $code,
                            'host' => request()->getHost(),
                            'default_connection' => \Illuminate\Support\Facades\DB::getDefaultConnection(),
                            'tenant_database' => $tenantDatabase,
                            'bound_tenant_database' => $boundTenantDatabase,
                            'visible_languages' => $visibleLanguages,
                        ],
                    ], 409);
                }

                $localization = app('translator.localization');
                $localeResult = $localization->setLocale($code, true);

                if ($localeResult === false) {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Locale rejected by localization config.',
                        'source' => 'tenant-db-v4',
                        'diagnostic' => [
                            'requested_code' => $code,
                            'tenant_database' => $tenantDatabase,
                            'localization_locale' => config('localization.locale'),
                            'supported_locales' => config('localization.supportedLocales'),
                        ],
                    ], 409);
                }

                $staff = $auth->staff();
                if ($staff) {
                    if (method_exists($staff, 'setConnection')) {
                        $staff->setConnection('tenant');
                    }

                    $staff->language_id = (int)$language->language_id;
                    $staff->save();
                }

                app()->setLocale($code);

                $cookie = cookie(
                    'pmd_admin_locale',
                    $code,
                    60 * 24 * 365,
                    '/',
                    null,
                    request()->isSecure(),
                    false,
                    false,
                    'Lax'
                );

                return response()->json([
                    'ok' => true,
                    'locale' => $code,
                    'name' => $language->name,
                    'source' => 'tenant-db-v4',
                ])->withCookie($cookie);
            }
        )->name('pmd.language.switch.v3');
    });
});
// PMD_LANGUAGE_SWITCH_ROUTE_V3_END'''

new_text = text[:start] + replacement + text[end:]
candidate.write_text(new_text)
print('CANDIDATE_BUILT=1')
PY

php -l "$CANDIDATE"

# Confirm candidate changes only the marked V3 block.
python3 - "$ROUTES" "$CANDIDATE" <<'PY'
from pathlib import Path
import sys
before = Path(sys.argv[1]).read_text()
after = Path(sys.argv[2]).read_text()
s='// PMD_LANGUAGE_SWITCH_ROUTE_V3_BEGIN'
e='// PMD_LANGUAGE_SWITCH_ROUTE_V3_END'
def outside(t):
    a=t.index(s); b=t.index(e,a)+len(e)
    return t[:a], t[b:]
if outside(before) != outside(after):
    raise SystemExit('ERROR=Changes escaped V3 marker block.')
print('OUTSIDE_V3_UNCHANGED=1')
PY

candidate_sha="$(sha256sum "$CANDIDATE" | awk '{print $1}')"
echo "CANDIDATE_SHA=$candidate_sha"

echo "INSTALLING_WITH_SUDO=1"
# tee truncates the existing inode, so its owner/group/mode stay unchanged.
sudo tee "$ROUTES" < "$CANDIDATE" >/dev/null

installed_sha="$(sha256sum "$ROUTES" | awk '{print $1}')"
echo "ROUTES_SHA_AFTER=$installed_sha"

if [[ "$installed_sha" != "$candidate_sha" ]]; then
  sudo tee "$ROUTES" < "$BACKUP/routes.php.before" >/dev/null
  echo "ERROR=Installed hash mismatch; original routes.php restored." >&2
  exit 11
fi

if ! php -l "$ROUTES"; then
  sudo tee "$ROUTES" < "$BACKUP/routes.php.before" >/dev/null
  php -l "$ROUTES"
  echo "ERROR=Installed routes.php failed syntax; original restored." >&2
  exit 12
fi

grep -q "'source' => 'tenant-db-v4'" "$ROUTES"

echo "ROUTE_V4_PATCHED=1"
echo "OUTSIDE_V3_UNCHANGED=1"
echo "BACKUP=$BACKUP/routes.php.before"
echo "ROUTE_FIX_OK=1"
echo "NEXT=Hard refresh Mimoza admin and click the language toggle once."
echo "ROLLBACK=sudo tee '$ROUTES' < '$BACKUP/routes.php.before' >/dev/null"
