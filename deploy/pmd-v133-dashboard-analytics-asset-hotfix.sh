#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="948f1c53ec0a0721c19d287a5fb88fe63a0a7ac4"

LIVE_FILES=(
  "app/admin/controllers/Dashboardlab.php"
  "app/admin/controllers/Managerlab.php"
  "app/admin/controllers/Accountantlab.php"
)

VALIDATION_FILES=(
  "app/admin/controllers/Dashboardlab.php"
  "app/admin/controllers/Managerlab.php"
  "app/admin/controllers/Accountantlab.php"
  "app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js"
  "app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php"
  "app/admin/Services/PmdDashboardAnalyticsSnapshotV132.php"
  "app/system/traits/AssetMaker.php"
  "tests/pmd-v132-dashboard-analytics-swr.test.mjs"
  "tests/pmd-v133-dashboard-analytics-asset-url.test.mjs"
)

log(){ printf '\n[PayMyDine V133] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V133][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V133 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned V133 source commit is unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v133-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v133-dashboard-analytics-asset-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

log "Staging pinned V133 files"
for rel in "${VALIDATION_FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

OWNER="$STAGE/app/admin/controllers/Dashboardlab.php"
MANAGER="$STAGE/app/admin/controllers/Managerlab.php"
ACCOUNTANT="$STAGE/app/admin/controllers/Accountantlab.php"
JS="$STAGE/app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js"
ASSET_MAKER="$STAGE/app/system/traits/AssetMaker.php"

log "Validating V133 before touching live files"

grep -Fq 'Assets::addJs($this->getAssetPath($href), $attributes);' "$ASSET_MAKER" ||
  fail "AssetMaker resolution contract changed unexpectedly"

for controller in "$OWNER" "$MANAGER" "$ACCOUNTANT"; do
  grep -Fq 'PMD_DASHBOARD_ANALYTICS_ASSET_URL_V133' "$controller" ||
    fail "V133 asset URL marker missing: $controller"

  grep -Fq "asset('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js')" "$controller" ||
    fail "Canonical public analytics URL missing: $controller"

  grep -Fq '@filemtime(' "$controller" ||
    fail "Analytics filemtime cache bust missing: $controller"

  if grep -Fq "addJs('js/pmd-dashboard-lab-analytics-v1.js?v=" "$controller"; then
    fail "Broken local query-string AssetMaker path still present: $controller"
  fi

  php -l "$controller" >/dev/null ||
    fail "PHP syntax failed: $controller"
done

grep -Fq 'PMD_DASHBOARD_ANALYTICS_SWR_V132' "$JS" ||
  fail "V132 SWR runtime is not preserved"

grep -Fq "request('last30', true)" "$JS" ||
  fail "V132 last30 revalidation missing"

grep -Fq "request('month', true)" "$JS" ||
  fail "V132 month revalidation missing"

node --check "$JS" >/dev/null ||
  fail "Analytics JavaScript syntax failed"

(
  cd "$STAGE"
  node tests/pmd-v132-dashboard-analytics-swr.test.mjs
  node tests/pmd-v133-dashboard-analytics-asset-url.test.mjs
) || fail "V132/V133 regression tests failed"

# V133 is a surgical registration hotfix. Refuse to apply it on top of a
# live install that does not already contain the V132 analytics runtime.
grep -Fq 'PMD_DASHBOARD_ANALYTICS_SWR_V132'   "$PMD_ROOT/app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js" ||
  fail "Live V132 analytics runtime missing; do not apply V133 on this state"

log "Backing up current live V133 targets"
sudo tar -czf "$BACKUP" -- "${LIVE_FILES[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V133 controller registrations"
for rel in "${LIVE_FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"

  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

log "Post-deploy verification"
for controller in "${LIVE_FILES[@]}"; do
  grep -Fq 'PMD_DASHBOARD_ANALYTICS_ASSET_URL_V133' "$controller" ||
    fail "Live V133 marker missing: $controller"

  grep -Fq "asset('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js')" "$controller" ||
    fail "Live canonical analytics URL missing: $controller"

  if grep -Fq "addJs('js/pmd-dashboard-lab-analytics-v1.js?v=" "$controller"; then
    fail "Live broken local query-string path still present: $controller"
  fi

  php -l "$controller" >/dev/null ||
    fail "Live PHP syntax failed: $controller"
done

cat <<'EOF'

============================================================
 PAYMYDINE V133 DASHBOARD ANALYTICS ASSET HOTFIX COMPLETE
============================================================

ROOT CAUSE
  V132 registered the local analytics asset as:
    js/pmd-dashboard-lab-analytics-v1.js?v=132-swr

  AssetMaker resolves local files with File::isFile() before it creates the
  public URL. The query string made that filesystem lookup fail, so the
  analytics runtime was not resolved through app/admin/assets.

FIX
  Owner / Manager / Accountant now register:
    asset('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js')
    + ?v=<filemtime>

  This is the same safe cache-bust pattern already used elsewhere in PayMyDine.

PRESERVED
  V132 server/browser SWR snapshots
  V132 immediate background last30 + month refresh
  V131 canonical Reservations
  V129 mobile invoices / Cloud re-entry
  V127 and earlier Quick POS behavior

EXPECTED AFTER DEPLOY
  First dashboard visit:
    analytics runtime loads again and data populates normally.
    If V132 snapshots are still cold, one real fetch is expected.

  After that first successful population:
    refresh uses V132 snapshot first paint and revalidates silently.

NO APK UPDATE REQUIRED
NO artisan cache:clear REQUIRED

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
