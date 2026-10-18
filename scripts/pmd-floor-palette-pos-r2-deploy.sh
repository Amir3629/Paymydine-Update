#!/usr/bin/env bash
# PMD_FLOOR_PALETTE_POS_R2_SAFE_DEPLOY
# Run ONLY after the reviewed PR #505 is merged into main:
#   cd /var/www/paymydine
#   git show origin/main:scripts/pmd-floor-palette-pos-r2-deploy.sh | bash -s -- --apply
# All tests and permissions checks run BEFORE the live fast-forward.
set -euo pipefail
[[ "$*" == "--apply" ]] || { echo "Usage: --apply" >&2; exit 2; }
cd /var/www/paymydine
[[ "$(git branch --show-current)" == main ]] || { echo "STOP: Must be on main" >&2; exit 1; }
command -v node >/dev/null && command -v php >/dev/null || { echo "STOP: PHP + Node required" >&2; exit 1; }

git -c gc.auto=0 fetch origin main
git -c gc.auto=0 merge-base --is-ancestor HEAD origin/main || { echo "STOP: Local main diverged" >&2; exit 1; }
count="$(git rev-list --count HEAD..origin/main)"
tip="$(git log -1 --format=%s origin/main)"
if [[ "$count" != 1 || "$tip" != *"(#505)"* ]]; then
  echo "STOP: Expected exactly the reviewed PR #505; found $count commits, tip: $tip" >&2
  exit 1
fi

echo "=== CHECK LOCAL EDITS / PERMISSIONS ==="
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  if ! git diff --quiet -- "$file" || ! git diff --cached --quiet -- "$file"; then
    echo "STOP: Local changes in $file" >&2; exit 1
  fi
  if [[ -e "$file" || -L "$file" ]] && ! git ls-files --error-unmatch -- "$file" >/dev/null 2>&1; then
    echo "STOP: Untracked path conflicts with release: $file" >&2; exit 1
  fi
  dir="$(dirname "$file")"
  while [[ ! -d "$dir" && "$dir" != "." ]]; do dir="$(dirname "$dir")"; done
  [[ -w "$dir" ]] || { echo "STOP: No write access: $dir" >&2; exit 1; }
done < <(git diff --name-only HEAD origin/main)

tmp="$(mktemp -d /tmp/pmd-floor-pos-r2-XXXXXXXX)"
trap 'rm -rf -- "$tmp"' EXIT
echo "=== PRE-INSTALL JS TESTS ==="
git archive --format=tar origin/main \
  app/admin/assets/js/pmd-floor-reservation-state-r1.js \
  app/admin/assets/js/pmd-qpos-reservation-rail-r2.js \
  app/admin/assets/css/pmd-floor-status-palette-r1.css \
  app/admin/assets/css/pmd-qpos-reservation-rail-r2.css \
  scripts/test-pmd-floor-palette-pos-r2.js \
  | tar -xf - -C "$tmp"
node --check "$tmp/app/admin/assets/js/pmd-qpos-reservation-rail-r2.js"
node "$tmp/scripts/test-pmd-floor-palette-pos-r2.js"
git show origin/main:app/admin/controllers/Ownerboard.php | php -l
grep -Fq '#34afd1' "$tmp/app/admin/assets/css/pmd-floor-status-palette-r1.css"
grep -Fq '#ff9800' "$tmp/app/admin/assets/css/pmd-floor-status-palette-r1.css"
grep -Fq '#34afd1' "$tmp/app/admin/assets/css/pmd-qpos-reservation-rail-r2.css"
git show origin/main:app/admin/views/pmd_quick_pos_v1.blade.php > "$tmp/pos-view.blade.php"
grep -Fq 'pmd-qpos-reservation-rail-r2.js' "$tmp/pos-view.blade.php"

echo "=== BACKUP + INSTALL ==="
backup="backup/floor-pos-r2-$(date +%Y%m%d-%H%M%S)-$$"
git branch "$backup"
echo "Backup Git ref: $backup"
git -c gc.auto=0 merge --ff-only origin/main
php artisan view:clear
echo "=== RELEASE ==="
git log -1 --oneline
echo "FLOOR+POS PALETTE R2 INSTALLED; test a physically free table with an upcoming reservation in /admin/pos."
