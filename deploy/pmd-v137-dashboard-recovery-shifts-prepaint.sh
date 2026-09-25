#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="63699bf5f0856baec162ccc7d5de297577fe4939"

FILES=(
  "app/admin/controllers/Dashboardlab.php"
  "app/admin/controllers/Managerlab.php"
  "app/admin/controllers/Accountantlab.php"
  "app/admin/assets/css/pmd-dashboard-kpi-recovery-v136.css"
  "app/admin/assets/js/pmd-admin-coverage-r3-v11b.js"
)

TEST_FILE="tests/pmd-v137-dashboard-shifts-recovery.test.mjs"

log(){ printf '\n[PayMyDine V137] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V137][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V137 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned V137 source commit is unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v137-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v137-dashboard-recovery-shifts-prepaint-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

log "Staging pinned V137 files"
for rel in "${FILES[@]}" "$TEST_FILE"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

OWNER="$STAGE/app/admin/controllers/Dashboardlab.php"
MANAGER="$STAGE/app/admin/controllers/Managerlab.php"
ACCOUNTANT="$STAGE/app/admin/controllers/Accountantlab.php"
RECOVERY_CSS="$STAGE/app/admin/assets/css/pmd-dashboard-kpi-recovery-v136.css"
COVERAGE_JS="$STAGE/app/admin/assets/js/pmd-admin-coverage-r3-v11b.js"

log "Validating V137 before touching live files"

grep -Fq 'PMD_DASHBOARD_KPI_RECOVERY_V136' "$RECOVERY_CSS" ||
  fail "V136 KPI recovery CSS marker missing"

for controller in "$OWNER" "$MANAGER" "$ACCOUNTANT"; do
  grep -Fq 'pmd-dashboard-kpi-recovery-v136.css' "$controller" ||
    fail "KPI recovery registration missing: $controller"
  php -l "$controller" >/dev/null ||
    fail "PHP syntax failed: $controller"
done

grep -Fq 'PMD_ROLE_DASHBOARD_LOCATION_FAILOPEN_V137' "$OWNER" ||
  fail "Owner workspace-location fail-open marker missing"

grep -Fq 'PmdCleanWorkspaceSharedV1::class' "$OWNER" ||
  fail "Owner canonical location fallback missing"

for controller in "$MANAGER" "$ACCOUNTANT"; do
  grep -Fq 'PMD_ROLE_DASHBOARD_SERVICE_FAILOPEN_V137' "$controller" ||
    fail "Role dashboard service fail-open marker missing: $controller"
  grep -Fq 'class_exists(PmdRoleDashboardDataV1::class)' "$controller" ||
    fail "Missing optional-service guard: $controller"
  grep -Fq "admin_url('dashboardlab').'?pmd_analytics=1'" "$controller" ||
    fail "Canonical Owner analytics fallback missing: $controller"
done

grep -Fq 'PMD_SHIFTS_PREPAINT_I18N_V137' "$COVERAGE_JS" ||
  fail "Shifts prepaint i18n marker missing"

grep -Fq "3.2.1-v137-shifts-prepaint" "$COVERAGE_JS" ||
  fail "Coverage runtime V137 version missing"

grep -Fq 'isShiftsPrepaintRouteV137' "$COVERAGE_JS" ||
  fail "Shifts prepaint route gate missing"

node --check "$COVERAGE_JS" >/dev/null ||
  fail "JavaScript syntax failed: admin coverage runtime"

(
  cd "$STAGE"
  node "$TEST_FILE"
) || fail "V137 regression test failed"

# V137 must sit on top of the deployed Shifts first-paint line, not replace it.
grep -Fq 'pmd-shifts-live-attendance-v3.js'   "$PMD_ROOT/app/admin/controllers/Shifts.php" ||
  fail "Live V135 Shifts attendance runtime registration missing"

grep -Fq 'PMD_SHIFT_FRAME_FIRST_PAINT_V135'   "$PMD_ROOT/app/admin/views/pmdshifts/_server_rota_v13.blade.php" ||
  fail "Live V135 server shift-frame authority missing"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -e "$rel" ]] && EXISTING+=("$rel")
done

if [[ "${#EXISTING[@]}" -gt 0 ]]; then
  log "Backing up current live V137 targets"
  sudo tar -czf "$BACKUP" -- "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing validated V137 files"
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
sudo -u www-data php artisan view:clear >/dev/null 2>&1 ||
  php artisan view:clear >/dev/null 2>&1 ||
  true

log "Post-deploy verification"

for controller in   app/admin/controllers/Dashboardlab.php   app/admin/controllers/Managerlab.php   app/admin/controllers/Accountantlab.php
do
  grep -Fq 'pmd-dashboard-kpi-recovery-v136.css' "$controller" ||
    fail "Live KPI recovery registration failed: $controller"
  php -l "$controller" >/dev/null ||
    fail "Live PHP syntax failed: $controller"
done

grep -Fq 'PMD_DASHBOARD_KPI_RECOVERY_V136'   app/admin/assets/css/pmd-dashboard-kpi-recovery-v136.css ||
  fail "Live KPI recovery CSS verification failed"

grep -Fq 'PMD_ROLE_DASHBOARD_SERVICE_FAILOPEN_V137'   app/admin/controllers/Managerlab.php ||
  fail "Live Manager fail-open verification failed"

grep -Fq 'PMD_ROLE_DASHBOARD_SERVICE_FAILOPEN_V137'   app/admin/controllers/Accountantlab.php ||
  fail "Live Accountant fail-open verification failed"

grep -Fq 'PMD_SHIFTS_PREPAINT_I18N_V137'   app/admin/assets/js/pmd-admin-coverage-r3-v11b.js ||
  fail "Live Shifts prepaint i18n verification failed"

node --check app/admin/assets/js/pmd-admin-coverage-r3-v11b.js >/dev/null ||
  fail "Live JavaScript syntax failed"

cat <<'EOF'

============================================================
 PAYMYDINE V137 DASHBOARD RECOVERY + SHIFTS PREPAINT COMPLETE
============================================================

MANAGER / ACCOUNTANT 500 RECOVERY
  Historical problem:
    PmdRoleDashboardDataV1 is referenced by role controllers but is not present
    in the tracked repository tree.

  V137:
    = keeps the service when a live installation legitimately provides it
    = otherwise fails open instead of throwing a page-level 500
    = preserves canonical shared KPI / Floor / finance authorities
    = skips only the optional role bundle adapter
    = falls back to canonical Dashboard Lab analytics endpoint

OWNER DASHBOARD
  V136 KPI recovery CSS existed in git but had no live registration.
  V137 loads it last on:
    Owner Dashboard
    Manager Dashboard
    Accountant Dashboard

  This restores the proven four-card KPI geometry and prevents a single KPI
  from stretching into the dashboard stage on mixed asset generations.

SHIFTS BLINK
  V135 already fixed attendance and timetable geometry ownership.
  Remaining repaint came from the deferred global admin coverage/i18n pass.

  V137:
    = runs the Shifts translation pass immediately while the deferred asset is
      executing, before DOMContentLoaded / visible timetable paint
    = does not run a second full-body coverage pass on window.load for Shifts
    = keeps the incremental observer for real later DOM changes
    = does not change shift left / width / row geometry
    = preserves V135 attendance v3 and server first-paint frame authority

PRESERVED
  Public Booking latest main work
  V135 Shifts geometry + attendance authority
  V134 attendance first paint
  V133/V132 dashboard analytics SWR
  V131 canonical Reservations
  V129 mobile invoice / Cloud re-entry
  V127 and earlier Quick POS behavior

NO APK UPDATE REQUIRED
NO application cache clear required

============================================================
EOF

if [[ -f "$BACKUP" ]]; then
  printf 'Backup: %s\n' "$BACKUP"
fi
