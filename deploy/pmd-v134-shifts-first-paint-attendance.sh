#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="0efd7fdcd668881fdc41ac0c297fe0896c9fcdc9"

FILES=(
  "app/admin/Services/PmdShiftAttendanceSnapshotV134.php"
  "app/Http/Controllers/PmdShiftAttendanceLiveController.php"
  "app/admin/controllers/Shifts.php"
  "app/admin/views/pmdshifts/index.blade.php"
  "app/admin/views/pmdshifts/_server_rota_v13.blade.php"
  "app/admin/assets/css/pmd-shifts-live-first-paint-v134.css"
  "app/admin/assets/js/pmd-shifts-live-attendance-v2.js"
)

TEST_FILE="tests/pmd-v134-shifts-attendance-first-paint.test.mjs"

log(){ printf '\n[PayMyDine V134] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V134][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V134 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned V134 source commit is unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v134-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v134-shifts-first-paint-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

log "Staging pinned V134 files"
for rel in "${FILES[@]}" "$TEST_FILE"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

SNAPSHOT="$STAGE/app/admin/Services/PmdShiftAttendanceSnapshotV134.php"
LIVE_CTRL="$STAGE/app/Http/Controllers/PmdShiftAttendanceLiveController.php"
SHIFTS="$STAGE/app/admin/controllers/Shifts.php"
VIEW="$STAGE/app/admin/views/pmdshifts/index.blade.php"
ROTA="$STAGE/app/admin/views/pmdshifts/_server_rota_v13.blade.php"
CSS="$STAGE/app/admin/assets/css/pmd-shifts-live-first-paint-v134.css"
JS="$STAGE/app/admin/assets/js/pmd-shifts-live-attendance-v2.js"

log "Validating V134 before touching live files"

grep -Fq 'PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134' "$SNAPSHOT" ||
  fail "V134 shared attendance snapshot marker missing"

grep -Fq "DB::table('staff_attendance')" "$SNAPSHOT" ||
  fail "V134 real attendance authority missing"

grep -Fq "'present_now' => \$presentNow" "$SNAPSHOT" ||
  fail "V134 Present now authority missing"

grep -Fq "'missing_now' => \$missingNow" "$SNAPSHOT" ||
  fail "V134 Missing now authority missing"

grep -Fq 'PmdShiftAttendanceSnapshotV134::class' "$LIVE_CTRL" ||
  fail "Live attendance endpoint is not using V134 shared authority"

if grep -Fq "DB::table('staff_attendance')" "$LIVE_CTRL"; then
  fail "Live endpoint still duplicates attendance computation"
fi

grep -Fq 'PmdShiftAttendanceSnapshotV134' "$SHIFTS" ||
  fail "Shifts first paint is not using V134 shared authority"

grep -Fq "'live_attendance' => \$liveAttendance" "$SHIFTS" ||
  fail "Shifts controller does not expose live attendance"

grep -Fq "array_key_exists('present_now', \$liveAttendance)" "$SHIFTS" ||
  fail "Shifts first-paint Present now does not use live attendance"

grep -Fq "array_key_exists('missing_now', \$liveAttendance)" "$SHIFTS" ||
  fail "Shifts first-paint Missing now does not use live attendance"

grep -Fq "pmd-shifts-live-first-paint-v134.css" "$SHIFTS" ||
  fail "V134 first-paint attendance CSS is not registered"

grep -Fq "pmd-shifts-live-attendance-v2.js" "$SHIFTS" ||
  fail "Live attendance runtime is not explicitly registered"

grep -Fq "'live_attendance' => \$liveAttendance" "$VIEW" ||
  fail "Embedded Shifts bootstrap does not contain live attendance"

grep -Fq "'description' => 'checked in right now'" "$VIEW" ||
  fail "Present now real-attendance label missing"

grep -Fq "'description' => 'scheduled now · not checked in'" "$VIEW" ||
  fail "Missing now real-attendance label missing"

grep -Fq 'data-pmd-shifts-live-state-code' "$ROTA" ||
  fail "Server-rendered attendance badge identity missing"

grep -Fq 'PMD_SHIFTS_LIVE_FIRST_PAINT_V134' "$CSS" ||
  fail "V134 static attendance CSS marker missing"

grep -Fq '.pmd-shifts-live-state.is-not_started' "$CSS" ||
  fail "V134 not-started badge CSS missing"

grep -Fq 'PMD_SHIFT_ATTENDANCE_IDEMPOTENT_V134' "$JS" ||
  fail "V134 idempotent runtime marker missing"

grep -Fq 'bootAttendanceV134' "$JS" ||
  fail "V134 embedded attendance hydration missing"

grep -Fq 'currentState === nextState && currentLabel === nextLabel' "$JS" ||
  fail "V134 identical-state DOM write guard missing"

if grep -Fq 'data-pmd-shifts-live-style' "$JS"; then
  fail "Late runtime attendance CSS injection is still present"
fi

php -l "$SNAPSHOT" >/dev/null ||
  fail "PHP syntax failed: V134 snapshot service"

php -l "$LIVE_CTRL" >/dev/null ||
  fail "PHP syntax failed: live attendance controller"

php -l "$SHIFTS" >/dev/null ||
  fail "PHP syntax failed: Shifts controller"

node --check "$JS" >/dev/null ||
  fail "JavaScript syntax failed: Shifts live attendance runtime"

(
  cd "$STAGE"
  node "$TEST_FILE"
) || fail "V134 regression test failed"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -e "$rel" ]] && EXISTING+=("$rel")
done

if [[ "${#EXISTING[@]}" -gt 0 ]]; then
  log "Backing up current live V134 targets"
  sudo tar -czf "$BACKUP" -- "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing validated V134 files"
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

log "Clearing compiled Blade views"
sudo -u www-data php artisan view:clear >/dev/null 2>&1 ||
  php artisan view:clear >/dev/null 2>&1 ||
  true

log "Post-deploy verification"

grep -Fq 'PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134'   app/admin/Services/PmdShiftAttendanceSnapshotV134.php ||
  fail "Live V134 snapshot marker verification failed"

grep -Fq 'PmdShiftAttendanceSnapshotV134::class'   app/Http/Controllers/PmdShiftAttendanceLiveController.php ||
  fail "Live endpoint shared-authority verification failed"

grep -Fq "'live_attendance' => \$liveAttendance"   app/admin/controllers/Shifts.php ||
  fail "Live Shifts first-paint payload verification failed"

grep -Fq 'data-pmd-shifts-live-state-code'   app/admin/views/pmdshifts/_server_rota_v13.blade.php ||
  fail "Live server attendance badge verification failed"

grep -Fq 'PMD_SHIFTS_LIVE_FIRST_PAINT_V134'   app/admin/assets/css/pmd-shifts-live-first-paint-v134.css ||
  fail "Live first-paint attendance CSS verification failed"

grep -Fq 'PMD_SHIFT_ATTENDANCE_IDEMPOTENT_V134'   app/admin/assets/js/pmd-shifts-live-attendance-v2.js ||
  fail "Live idempotent attendance runtime verification failed"

php -l app/admin/Services/PmdShiftAttendanceSnapshotV134.php >/dev/null ||
  fail "Live V134 snapshot service PHP syntax failed"

php -l app/Http/Controllers/PmdShiftAttendanceLiveController.php >/dev/null ||
  fail "Live attendance controller PHP syntax failed"

php -l app/admin/controllers/Shifts.php >/dev/null ||
  fail "Live Shifts controller PHP syntax failed"

node --check app/admin/assets/js/pmd-shifts-live-attendance-v2.js >/dev/null ||
  fail "Live Shifts attendance JavaScript syntax failed"

cat <<'EOF'

============================================================
 PAYMYDINE V134 SHIFTS FIRST-PAINT ATTENDANCE COMPLETE
============================================================

ROOT CAUSE REMOVED
  Before V134:
    first HTML paint
      = pmd_operational_shift_people.attendance_status
    delayed live repaint
      = staff_attendance

    Result:
      Present now could visibly jump (for example 1 -> 0)
      Not checked in badges appeared later
      row heights changed after refresh

  V134:
    first HTML paint
      = staff_attendance
    live endpoint
      = the SAME PmdShiftAttendanceSnapshotV134 authority

FIRST PAINT
  Present now
    = real currently checked-in staff

  Missing now
    = people scheduled in the active shift who are not checked in

  Staff row badges
    = rendered in server HTML
    = Working since / Worked / Not checked in / Open session
    = complete CSS loaded before paint

LIVE REFRESH
  Embedded attendance snapshot is reused during in-page day navigation.
  The 15-second live refresh remains active.
  Identical live data performs no KPI/badge DOM rewrite.
  DOM changes only when attendance actually changes.

PERFORMANCE
  Shifts reuses its already-loaded people + selected-day shifts.
  First paint adds only the real attendance read instead of duplicating the
  full roster / shift / assignment workload.

PRESERVED
  Shift planner and shift-bar geometry
  day navigation and calendar
  Team / Member editing
  V133 dashboard analytics fix
  V131 Reservations
  V129 mobile invoice / Cloud re-entry
  V127 and earlier Quick POS behavior

NO APK UPDATE REQUIRED
NO route migration required
NO application cache clear required

============================================================
EOF

if [[ -f "$BACKUP" ]]; then
  printf 'Backup: %s\n' "$BACKUP"
fi
