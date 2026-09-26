#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="6e4f553fc1c2ababae332c30cc4fafec4820d468"

LIVE_FILES=(
  "app/admin/controllers/Shifts.php"
  "app/admin/views/pmdshifts/_server_rota_v13.blade.php"
  "app/admin/assets/js/pmd-shifts-live-attendance-v3.js"
)

VALIDATION_FILES=(
  "app/admin/controllers/Shifts.php"
  "app/admin/views/pmdshifts/_server_rota_v13.blade.php"
  "app/admin/assets/js/pmd-shifts-live-attendance-v3.js"
  "app/admin/assets/js/pmd-shifts-inpage-day-nav-v18e.js"
  "app/admin/assets/css/pmd-shifts-refresh-stability-v17i.css"
  "tests/pmd-v135-shifts-frame-first-paint.test.mjs"
)

log(){ printf '\n[PayMyDine V135] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V135][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V135 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned V135 source commit is unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v135-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v135-shifts-frame-first-paint-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

log "Staging pinned V135 files"
for rel in "${VALIDATION_FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

SHIFTS="$STAGE/app/admin/controllers/Shifts.php"
ROTA="$STAGE/app/admin/views/pmdshifts/_server_rota_v13.blade.php"
ATTENDANCE="$STAGE/app/admin/assets/js/pmd-shifts-live-attendance-v3.js"
DAY_NAV="$STAGE/app/admin/assets/js/pmd-shifts-inpage-day-nav-v18e.js"
STABILITY="$STAGE/app/admin/assets/css/pmd-shifts-refresh-stability-v17i.css"
TEST_FILE="$STAGE/tests/pmd-v135-shifts-frame-first-paint.test.mjs"

log "Validating V135 before touching live files"

# V135 is intentionally layered on the successfully deployed V134 attendance
# first-paint authority. Refuse to apply out of order.
grep -Fq 'PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134'   "$PMD_ROOT/app/admin/Services/PmdShiftAttendanceSnapshotV134.php" ||
  fail "Live V134 attendance authority is missing"

grep -Fq 'PMD_SHIFT_FRAME_GEOMETRY_READONLY_V135' "$SHIFTS" ||
  fail "V135 Shifts runtime registration marker missing"

grep -Fq "pmd-shifts-live-attendance-v3.js" "$SHIFTS" ||
  fail "Shifts does not load attendance v3"

if grep -Fq "pmd-shifts-live-attendance-v2.js" "$SHIFTS"; then
  fail "Shifts still loads attendance v2"
fi

grep -Fq 'PMD_SHIFT_FRAME_FIRST_PAINT_V135' "$ROTA" ||
  fail "V135 server frame marker missing"

grep -Fq 'id="pmd-shifts-frame-first-paint-v135"' "$ROTA" ||
  fail "V135 critical frame style block missing"

grep -Fq 'grid-template-columns:220px minmax(900px,1fr)!important' "$ROTA" ||
  fail "V135 row geometry lock missing"

grep -Fq 'min-height:72px!important' "$ROTA" ||
  fail "V135 row/track height lock missing"

grep -Fq 'inset:9px 0!important' "$ROTA" ||
  fail "V135 shift layer inset lock missing"

grep -Fq 'border-left:4px solid var(--pmd-role-accent)!important' "$ROTA" ||
  fail "V135 shift frame border lock missing"

grep -Fq 'font-family:"PMDShiftsRobotoStable"' "$ROTA" ||
  fail "V135 stable timetable font lock missing"

grep -Fq 'style="left:{{ number_format($left,4' "$ROTA" ||
  fail "Server inline shift left geometry authority missing"

grep -Fq 'width:{{ number_format($width,4' "$ROTA" ||
  fail "Server inline shift width geometry authority missing"

grep -Fq 'PMD_SHIFT_FRAME_GEOMETRY_READONLY_V135' "$ATTENDANCE" ||
  fail "Attendance v3 geometry-readonly marker missing"

for forbidden in   "style.setProperty('left'"   "style.setProperty('right'"   "style.setProperty('width'"   "function repairGeometry"   "function shiftTimes"
do
  if grep -Fq "$forbidden" "$ATTENDANCE"; then
    fail "Attendance v3 still contains forbidden geometry writer: $forbidden"
  fi
done

grep -Fq 'currentState === nextState && currentLabel === nextLabel' "$ATTENDANCE" ||
  fail "V134 idempotent attendance state guard was lost"

grep -Fq 'PMD_SHIFTS_SERVER_FIRST_BOOT_SKIP_V13' "$DAY_NAV" ||
  fail "Server-first normal refresh guard missing"

grep -Fq 'PMD_SHIFTS_REFRESH_STABILITY_V17I' "$STABILITY" ||
  fail "Existing refresh stability authority missing"

grep -Fq 'transition:none!important' "$STABILITY" ||
  fail "Existing no-transition refresh authority missing"

php -l "$SHIFTS" >/dev/null ||
  fail "PHP syntax failed: Shifts controller"

node --check "$ATTENDANCE" >/dev/null ||
  fail "JavaScript syntax failed: attendance v3"

node --check "$DAY_NAV" >/dev/null ||
  fail "JavaScript syntax failed: day-nav authority"

(
  cd "$STAGE"
  node "tests/pmd-v135-shifts-frame-first-paint.test.mjs"
) || fail "V135 regression test failed"

EXISTING=()
for rel in "${LIVE_FILES[@]}"; do
  [[ -e "$rel" ]] && EXISTING+=("$rel")
done

if [[ "${#EXISTING[@]}" -gt 0 ]]; then
  log "Backing up current live V135 targets"
  sudo tar -czf "$BACKUP" -- "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing validated V135 files"
for rel in "${LIVE_FILES[@]}"; do
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

grep -Fq 'PMD_SHIFT_FRAME_GEOMETRY_READONLY_V135'   app/admin/controllers/Shifts.php ||
  fail "Live V135 Shifts registration marker missing"

grep -Fq "pmd-shifts-live-attendance-v3.js"   app/admin/controllers/Shifts.php ||
  fail "Live Shifts does not load attendance v3"

grep -Fq 'PMD_SHIFT_FRAME_FIRST_PAINT_V135'   app/admin/views/pmdshifts/_server_rota_v13.blade.php ||
  fail "Live V135 critical frame marker missing"

grep -Fq 'border-left:4px solid var(--pmd-role-accent)!important'   app/admin/views/pmdshifts/_server_rota_v13.blade.php ||
  fail "Live V135 frame border lock missing"

grep -Fq 'PMD_SHIFT_FRAME_GEOMETRY_READONLY_V135'   app/admin/assets/js/pmd-shifts-live-attendance-v3.js ||
  fail "Live attendance v3 marker missing"

if grep -Fq "style.setProperty('left'"   app/admin/assets/js/pmd-shifts-live-attendance-v3.js; then
  fail "Live attendance v3 still writes left geometry"
fi

php -l app/admin/controllers/Shifts.php >/dev/null ||
  fail "Live Shifts PHP syntax failed"

node --check app/admin/assets/js/pmd-shifts-live-attendance-v3.js >/dev/null ||
  fail "Live attendance v3 JavaScript syntax failed"

cat <<'EOF'

============================================================
 PAYMYDINE V135 SHIFTS FRAME FIRST-PAINT COMPLETE
============================================================

ROOT CAUSE BOUNDARY
  KPI / attendance state
    = already fixed by V134

  Remaining shift-frame instability
    = first-paint timetable frame depended on several external CSS generations
    = attendance v2 still carried obsolete shift geometry repair code
      even though it was no longer supposed to own geometry

V135 FIRST-PAINT FRAME AUTHORITY
  Server timetable now embeds the critical final frame CSS immediately before
  the board:
    row grid
      = 220px person column + stable timeline
    row / track
      = stable 72px minimum geometry
    shift layer
      = fixed 9px vertical inset
    shift buttons
      = server inline left + width remain horizontal authority
      = final role border/background from first paint
      = final padding / border radius / box sizing from first paint
      = stable PMDShiftsRobotoStable font from first paint
      = no animation / transition / transform / translate

RUNTIME AUTHORITY
  Shifts now loads pmd-shifts-live-attendance-v3.js
  Attendance v3:
    = may update attendance badges and Present/Missing KPI only
    = cannot write shift left/right/width
    = contains no repairGeometry() authority

DAY NAVIGATION
  Existing V18E day navigation remains unchanged.
  Normal refresh keeps server-rendered timetable DOM.
  In-page previous/next/calendar navigation may render the newly selected day.

PRESERVED
  V134 single staff_attendance authority
  V133 dashboard analytics asset fix
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
