#!/usr/bin/env bash
# Z100 V146: fix actual tenant Admin route loader and report true heartbeat.
# Preserves all local edits; touches exactly THREE source files.
set -Eeuo pipefail
umask 077
ROOT=/var/www/paymydine
BASE=448640da83cf8fe77899dbfa698c9caec028a8d7
FIX=174fd63ea4b30eba254fd1f646b05e869cf36016
BRANCH=fix/z100-device-platform-route-v146-20261023
MODE="${1:---check}"
FILES=(
  app/admin/routes.php
  app/Services/PmdDevicePlatformService.php
  app/admin/views/pmddevices/index.blade.php
)
if [[ "$MODE" != --check && "$MODE" != --apply ]]; then
  echo 'Usage: bash pmd-z100-v146-safe-deploy.sh [--check|--apply]' >&2; exit 2
fi
cd "$ROOT" || exit 1
[[ "$(git rev-parse --show-toplevel)" == "$ROOT" ]] || {
  echo 'STOP: Not the expected PayMyDine root.' >&2; exit 1
}
for tool in git php node tar cmp stat sudo install mv; do
  command -v "$tool" >/dev/null || { echo "STOP: missing $tool" >&2; exit 1; }
done
for f in "${FILES[@]}"; do
  [[ -f "$f" && ! -L "$f" ]] || { echo "STOP: missing/symlink: $f" >&2; exit 1; }
done

GIT_OPTIONAL_LOCKS=0 git -c gc.auto=0 fetch --no-auto-gc origin "$BRANCH"
REMOTE="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}"
git cat-file -e "${FIX}^{commit}"
git merge-base --is-ancestor "$FIX" "$REMOTE" || {
  echo 'STOP: Reviewed commit no longer belongs to branch.' >&2; exit 1
}
git diff --quiet "$FIX" "$REMOTE" -- "${FILES[@]}" || {
  echo 'STOP: Production files differ from reviewed V146 commit.' >&2; exit 1
}

STAMP="$(date +%Y%m%d-%H%M%S)-$$"
DIR="$HOME/pmd-z100-v146-$STAMP"
ORIGINAL="$DIR/original"
STAGED="$DIR/staged"
REVERSED="$DIR/reversed"
mkdir -p "$ORIGINAL" "$STAGED" "$REVERSED"
PATCH="$DIR/approved.patch"
git diff --binary "$BASE" "$FIX" -- "${FILES[@]}" > "$PATCH"
[[ -s "$PATCH" ]] || { echo 'STOP: approved patch empty.' >&2; exit 1; }
git diff --check "$BASE" "$FIX" -- "${FILES[@]}"

echo '=== EXISTING VPS EDITS (PRESERVED) ==='
git status --short -- "${FILES[@]}" || true
for f in "${FILES[@]}"; do
  for location in "$ORIGINAL" "$STAGED" "$REVERSED"; do
    mkdir -p "$location/$(dirname "$f")"
  done
  cp -- "$f" "$ORIGINAL/$f"
  cp -- "$f" "$STAGED/$f"
done

mkdir -p "$STAGED/tests"
git show "$FIX:tests/pmd-z100-v146-safe-live.test.cjs" \
  > "$STAGED/tests/pmd-z100-v146-safe-live.test.cjs"

# Apply on copies only. If any context changed, HARD STOP without force.
(
  cd "$STAGED"
  git apply --check "$PATCH"
  git apply "$PATCH"
)
for f in "${FILES[@]}"; do cp -- "$STAGED/$f" "$REVERSED/$f"; done
(
  cd "$REVERSED"
  git apply -R --check "$PATCH"
  git apply -R "$PATCH"
)
for f in "${FILES[@]}"; do
  cmp -s -- "$ORIGINAL/$f" "$REVERSED/$f" || {
    echo "STOP: cannot byte-preserve the local edits in $f" >&2; exit 1
  }
done

echo '=== V146 STAGED QA ==='
php -l "$STAGED/app/admin/routes.php"
php -l "$STAGED/app/Services/PmdDevicePlatformService.php"
( cd "$STAGED" && node --test tests/pmd-z100-v146-safe-live.test.cjs )
if [[ "$MODE" == --check ]]; then
  echo 'V146 DEVICE PLATFORM DRY RUN: PASS'
  echo 'Production unchanged. Existing VPS edits protected.'
  echo "Staged: $DIR"
  exit 0
fi

for f in "${FILES[@]}"; do
  cmp -s -- "$ORIGINAL/$f" "$f" || { echo "STOP: concurrent edit in $f" >&2; exit 1; }
done
tar -czf "$DIR/before.tgz" -- "${FILES[@]}"
git diff --binary -- "${FILES[@]}" > "$DIR/previous-worktree.patch"
git diff --cached --binary -- "${FILES[@]}" > "$DIR/previous-index.patch"
for f in "${FILES[@]}"; do
  cmp -s -- "$ORIGINAL/$f" "$f" || { echo "STOP: concurrent edit while backing up $f" >&2; exit 1; }
done

STARTED=0
SUCCESS=0
rollback() {
  result=$?
  trap - EXIT
  if [[ "$STARTED" == 1 && "$SUCCESS" != 1 ]]; then
    echo 'STOP: restoring the 3 original source files.' >&2
    sudo tar -xzpf "$DIR/before.tgz" -C "$ROOT" || true
    (sudo -u www-data php artisan view:clear || php artisan view:clear) || true
    (sudo -u www-data php artisan route:clear || php artisan route:clear) || true
  fi
  if [[ "$SUCCESS" != 1 ]]; then echo "Backup: $DIR/before.tgz" >&2; fi
  exit "$result"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
STARTED=1
for f in "${FILES[@]}"; do
  cmp -s -- "$ORIGINAL/$f" "$f" || { echo "STOP: live edit before copy $f" >&2; exit 1; }
  uid="$(stat -c %u -- "$f")"
  gid="$(stat -c %g -- "$f")"
  mode="$(stat -c %a -- "$f")"
  temp="$f.pmd-v146-$STAMP"
  sudo install -m "$mode" -o "$uid" -g "$gid" -- "$STAGED/$f" "$temp"
  sudo mv -f -- "$temp" "$f"
done
for f in "${FILES[@]}"; do
  cmp -s -- "$STAGED/$f" "$f" || { echo "STOP: post-install bytes mismatch $f" >&2; exit 1; }
done
php -l app/admin/routes.php
php -l app/Services/PmdDevicePlatformService.php
sudo -u www-data php artisan view:clear || php artisan view:clear
sudo -u www-data php artisan route:clear || php artisan route:clear

SUCCESS=1
trap - EXIT INT TERM
echo '========================================'
echo 'PAYMYDINE Z100 V146 ROUTE INSTALLED'
echo 'Device Platform heartbeat API: directly registered in Admin loader'
echo 'Device Control status: actual heartbeat / last command'
echo 'Local custom edits: PRESERVED'
echo 'Cashier/payment transactions/provider credentials: UNCHANGED'
echo 'Database, APK and Staff App: UNCHANGED'
echo "Rollback backup: $DIR/before.tgz"
echo '========================================'
