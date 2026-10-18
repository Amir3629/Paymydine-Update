#!/usr/bin/env bash
# PMD_FLOOR_RESERVATION_SAFE_RELEASE_R1
# Usage:
# cd /var/www/paymydine
# git show origin/main:scripts/pmd-floor-deploy-r1.sh | bash -s -- --apply
# Read-only preflight before any live checkout update.
set -euo pipefail
if [[ "$*" != "--apply" ]]; then
  echo "Usage: bash scripts/pmd-floor-deploy-r1.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine
[[ "$(git branch --show-current)" == main ]] || { echo "STOP: Not on main" >&2; exit 1; }
command -v php >/dev/null && command -v node >/dev/null || { echo "STOP: Need php and node" >&2; exit 1; }
git -c gc.auto=0 fetch origin main
git -c gc.auto=0 merge-base --is-ancestor HEAD origin/main || {
  echo "STOP: Main history has diverged" >&2; exit 1;
}
count="$(git rev-list --count HEAD..origin/main)"
title="$(git log -1 --format=%s origin/main)"
if [[ "$count" != 1 || "$title" != *"(#503)"* ]]; then
  echo "STOP: Expected only reviewed PR #503, got $count commits; tip $title" >&2
  exit 1
fi
echo "=== CHECK LOCAL EDITS AND PERMISSIONS ==="
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if ! git diff --quiet -- "$file" || ! git diff --cached --quiet -- "$file"; then
    echo "STOP: Local modifications: $file" >&2; exit 1
  fi
  if [[ -e "$file" || -L "$file" ]] && ! git ls-files --error-unmatch -- "$file" >/dev/null 2>&1; then
    echo "STOP: Untracked release conflict: $file" >&2; exit 1
  fi
  dir="$(dirname "$file")"
  while [[ ! -d "$dir" && "$dir" != "." ]]; do dir="$(dirname "$dir")"; done
  [[ -w "$dir" ]] || { echo "STOP: Directory not writable: $dir" >&2; exit 1; }
done < <(git diff --name-only HEAD origin/main)

tmp="$(mktemp -d /tmp/pmd-floor-preflight-XXXXXXXX)"
trap 'rm -rf -- "$tmp"' EXIT
echo "=== READ-ONLY TESTS AGAINST INCOMING RELEASE ==="
git archive --format=tar origin/main \
  app/admin/services/PmdFloorReservationWindowsV1.php \
  app/admin/assets/js/pmd-floor-reservation-state-r1.js \
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js \
  app/admin/assets/js/pmd-floor-v1.js \
  app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js \
  scripts/test-pmd-floor-reservation-r1.php \
  scripts/test-pmd-floor-reservation-r1.js \
  scripts/test-pmd-floor-live-identity-r1.js \
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php \
  app/admin/views/pmdsettings/restaurant.blade.php \
  | tar -xf - -C "$tmp"
for file in \
  app/admin/services/PmdFloorReservationWindowsV1.php \
  app/admin/controllers/Dashboardlab.php \
  app/admin/controllers/PmdQuickPosV1.php \
  app/admin/controllers/PmdFloorV1.php \
  app/admin/controllers/Pmdsettings.php \
  app/admin/controllers/Ownerboard.php \
  app/admin/classes/PmdCleanWorkspaceControllerV1.php
do
  echo "PHP: $file"
  git show "origin/main:$file" | php -l
done
for file in \
  app/admin/assets/js/pmd-floor-reservation-state-r1.js \
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js \
  app/admin/assets/js/pmd-floor-v1.js \
  app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js
do
  node --check "$tmp/$file"
done
node "$tmp/scripts/test-pmd-floor-reservation-r1.js"
node "$tmp/scripts/test-pmd-floor-live-identity-r1.js"
php "$tmp/scripts/test-pmd-floor-reservation-r1.php"
grep -Fq 'reservation[notice_minutes]' "$tmp/app/admin/views/pmdsettings/restaurant.blade.php"
grep -Fq 'data-pmd-floor-reservation-state' "$tmp/app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"

echo "=== BACKUP AND LIVE FAST-FORWARD ==="
backup="backup/floor-colors-$(date +%Y%m%d-%H%M%S)-$$"
git branch "$backup"
echo "Backup branch: $backup"
git -c gc.auto=0 merge --ff-only origin/main
php artisan view:clear
echo "=== INSTALLED RELEASE ==="
git log -1 --oneline
echo "FLOOR RELEASE INSTALLED; verify test reservation and the restaurant settings UI."
