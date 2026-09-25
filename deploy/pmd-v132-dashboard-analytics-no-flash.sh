#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="379ade624c9b0324f13eafb3e133ccba51715f7d"

FILES=(
  "app/admin/Services/PmdDashboardAnalyticsSnapshotV132.php"
  "app/admin/controllers/Dashboardlab.php"
  "app/admin/controllers/Managerlab.php"
  "app/admin/controllers/Accountantlab.php"
  "app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php"
  "app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js"
)

TEST_FILE="tests/pmd-v132-dashboard-analytics-swr.test.mjs"

log(){ printf '\n[PayMyDine V132] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V132][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V132 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned V132 source commit is unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v132-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v132-dashboard-analytics-swr-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

log "Staging pinned V132 files"
for rel in "${FILES[@]}" "$TEST_FILE"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

SERVICE="$STAGE/app/admin/Services/PmdDashboardAnalyticsSnapshotV132.php"
OWNER="$STAGE/app/admin/controllers/Dashboardlab.php"
MANAGER="$STAGE/app/admin/controllers/Managerlab.php"
ACCOUNTANT="$STAGE/app/admin/controllers/Accountantlab.php"
PARTIAL="$STAGE/app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php"
JS="$STAGE/app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js"

log "Validating V132 before touching live files"

grep -Fq 'PMD_DASHBOARD_ANALYTICS_SNAPSHOT_V132' "$SERVICE" ||
  fail "V132 server snapshot service marker missing"

grep -Fq "private const TTL_MINUTES = 30" "$SERVICE" ||
  fail "V132 snapshot TTL contract missing"

grep -Fq "DB::connection()->getDatabaseName()" "$SERVICE" ||
  fail "V132 tenant database cache scope missing"

grep -Fq "'last30'" "$SERVICE" ||
  fail "V132 last30 snapshot period missing"

grep -Fq "'month'" "$SERVICE" ||
  fail "V132 month snapshot period missing"

for controller in "$OWNER" "$MANAGER" "$ACCOUNTANT"; do
  grep -Fq 'PmdDashboardAnalyticsSnapshotV132' "$controller" ||
    fail "V132 snapshot authority missing from $controller"

  grep -Fq 'pmd-dashboard-lab-analytics-v1.js?v=132-swr' "$controller" ||
    fail "V132 analytics asset cache-bust missing from $controller"
done

grep -Fq 'data-pmd-dashboard-analytics-location-id' "$PARTIAL" ||
  fail "V132 analytics location scope missing"

grep -Fq 'data-pmd-dashboard-analytics-locale' "$PARTIAL" ||
  fail "V132 analytics locale scope missing"

grep -Fq 'data-pmd-dashboard-analytics-snapshot-source' "$PARTIAL" ||
  fail "V132 analytics snapshot source marker missing"

grep -Fq 'PMD_DASHBOARD_ANALYTICS_SWR_V132' "$JS" ||
  fail "V132 browser SWR marker missing"

grep -Fq "var VERSION = '1.0.2-v132-swr'" "$JS" ||
  fail "V132 browser runtime version missing"

grep -Fq 'readPersistentBootstrapV132' "$JS" ||
  fail "V132 persistent bootstrap reader missing"

grep -Fq 'persistAnalyticsBootstrapV132' "$JS" ||
  fail "V132 persistent snapshot writer missing"

grep -Fq "request('last30', true)" "$JS" ||
  fail "V132 fresh last30 revalidation missing"

grep -Fq "request('month', true)" "$JS" ||
  fail "V132 fresh month revalidation missing"

if grep -Fq 'requestIdleCallback(startDeferredAnalytics' "$JS"; then
  fail "Old delayed analytics cold-start path is still present"
fi

php -l "$SERVICE" >/dev/null ||
  fail "PHP syntax failed: snapshot service"

php -l "$OWNER" >/dev/null ||
  fail "PHP syntax failed: Dashboardlab"

php -l "$MANAGER" >/dev/null ||
  fail "PHP syntax failed: Managerlab"

php -l "$ACCOUNTANT" >/dev/null ||
  fail "PHP syntax failed: Accountantlab"

node --check "$JS" >/dev/null ||
  fail "JavaScript syntax failed: analytics runtime"

(
  cd "$STAGE"
  node "$TEST_FILE"
) || fail "V132 regression test failed"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -e "$rel" ]] && EXISTING+=("$rel")
done

if [[ "${#EXISTING[@]}" -gt 0 ]]; then
  log "Backing up current live V132 targets"
  sudo tar -czf "$BACKUP" -- "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing validated V132 files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"
  parent_dir="$(dirname "$dst")"

  sudo mkdir -p "$parent_dir"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$parent_dir")"
    gid="$(stat -c '%g' "$parent_dir")"
    mode="644"
  fi

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

log "Clearing compiled Blade views only"
# Intentionally DO NOT run artisan cache:clear here.
# V132 analytics snapshots live in the application cache and are part of the
# stale-while-revalidate first-paint authority.
sudo -u www-data php artisan view:clear >/dev/null 2>&1 ||
  php artisan view:clear >/dev/null 2>&1 ||
  true

log "Post-deploy verification"

grep -Fq 'PMD_DASHBOARD_ANALYTICS_SNAPSHOT_V132'   app/admin/Services/PmdDashboardAnalyticsSnapshotV132.php ||
  fail "Live V132 snapshot service verification failed"

for controller in   app/admin/controllers/Dashboardlab.php   app/admin/controllers/Managerlab.php   app/admin/controllers/Accountantlab.php
do
  grep -Fq 'pmd-dashboard-lab-analytics-v1.js?v=132-swr' "$controller" ||
    fail "Live V132 asset cache-bust verification failed: $controller"
  php -l "$controller" >/dev/null ||
    fail "Live PHP syntax failed: $controller"
done

grep -Fq 'data-pmd-dashboard-analytics-location-id'   app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php ||
  fail "Live V132 analytics location scope verification failed"

grep -Fq 'PMD_DASHBOARD_ANALYTICS_SWR_V132'   app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js ||
  fail "Live V132 browser runtime verification failed"

node --check app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js >/dev/null ||
  fail "Live JavaScript syntax failed"

php -l app/admin/Services/PmdDashboardAnalyticsSnapshotV132.php >/dev/null ||
  fail "Live snapshot service PHP syntax failed"

cat <<'EOF'

============================================================
 PAYMYDINE V132 DASHBOARD ANALYTICS NO-FLASH COMPLETE
============================================================

OWNER / MANAGER / ACCOUNTANT
  Normal dashboard navigation
    = does NOT execute heavy analytics aggregates
    = reads the latest successful last30 + month snapshot only
    = renders chart/card HTML in the initial server response when warm

  Browser fallback
    = stores the latest successful snapshot by route + location + locale
    = adopts it immediately if server snapshot is cold/unavailable
    = never replaces a visible stale snapshot with fake zero/error content

  Freshness
    = last30 + month revalidate immediately in the background
    = successful fresh responses replace the visible snapshot
    = successful responses also warm the next server first paint

COLD START
  The first analytics load after V132 has no historical V132 snapshot yet.
  It starts network work immediately (the old 350-900ms idle delay is gone).
  That successful load warms both server and browser snapshots.
  Subsequent refreshes use filled first-paint analytics with background refresh.

PERFORMANCE PRESERVED
  PMD_PERF_R2 remains intact:
    no hundreds-of-query analytics work is restored to page navigation.

CACHE SAFETY
  Server snapshot key
    = tenant database + location + locale + period
  Browser snapshot key
    = route + location + locale
  Snapshot TTL
    = 30 minutes
  artisan cache:clear
    = intentionally NOT executed by this installer

PRESERVED
  V131 canonical Reservations
  V130 legacy redirect safety
  V129 mobile invoices / Cloud re-entry
  V127 and earlier Quick POS behavior

NO APK UPDATE REQUIRED

============================================================
EOF

if [[ -f "$BACKUP" ]]; then
  printf 'Backup: %s\n' "$BACKUP"
fi
