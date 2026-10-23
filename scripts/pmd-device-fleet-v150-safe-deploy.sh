#!/usr/bin/env bash
# V150: surgical settings APK 0.6.6 link + compact fleet UI.
# Patches existing files over local edits; adds 2 new UI assets.
# Preserves Staff APK/link, payment, tenant databases, paired devices.
set -Eeuo pipefail
umask 077
ROOT=/var/www/paymydine
BASE=985d51bb41aa3a93e0da1385a697990678deb32d
FIX=aa2642eae0d68582214ef90322ccdd83ba4ede95
BRANCH=fix/device-fleet-settings-download-v150-20261023
MODE="${1:---check}"
FILES=(
  app/Services/PmdDevicePlatformService.php
  app/admin/controllers/Pmddevices.php
  app/admin/views/pmddevices/index.blade.php
  app/admin/views/pmdsettings/index.blade.php
)
ASSETS=(
  app/admin/assets/js/pmd-device-fleet-v150.js
  app/admin/assets/css/pmd-device-fleet-v150.css
)
if [[ "$MODE" != --check && "$MODE" != --apply ]]; then
  echo 'Usage: bash pmd-device-fleet-v150-safe-deploy.sh [--check|--apply]' >&2
  exit 2
fi
cd "$ROOT" || exit 1
[[ "$(git rev-parse --show-toplevel)" == "$ROOT" ]] || {
  echo 'STOP: Unexpected application root.' >&2; exit 1;
}
for tool in git php node tar cmp stat sudo install mv mkdir cp rm; do
  command -v "$tool" >/dev/null || { echo "STOP: Missing $tool" >&2; exit 1; }
done
for f in "${FILES[@]}"; do
  [[ -f "$f" && ! -L "$f" ]] || { echo "STOP: Missing/symlink $f" >&2; exit 1; }
done
for f in "${ASSETS[@]}"; do
  [[ ! -e "$f" && ! -L "$f" ]] || {
    echo "STOP: New V150 asset already exists. Refusing overwrite: $f" >&2; exit 1;
  }
  [[ -d "$(dirname "$f")" ]] || { echo "STOP: Missing asset directory $f" >&2; exit 1; }
done

GIT_OPTIONAL_LOCKS=0 git -c gc.auto=0 fetch --no-auto-gc origin "$BRANCH"
REMOTE="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}"
git cat-file -e "${FIX}^{commit}"
git merge-base --is-ancestor "$FIX" "$REMOTE" || {
  echo 'STOP: Reviewed release not in branch.' >&2; exit 1;
}
git diff --quiet "$FIX" "$REMOTE" -- "${FILES[@]}" "${ASSETS[@]}" || {
  echo 'STOP: Server sources changed since review.' >&2; exit 1;
}
git diff --check "$BASE" "$FIX" -- "${FILES[@]}" "${ASSETS[@]}"

STAMP="$(date +%Y%m%d-%H%M%S)-$$"
DIR="$HOME/pmd-device-fleet-v150-$STAMP"
ORIGINAL="$DIR/original"
STAGED="$DIR/staged"
REVERSED="$DIR/reversed"
mkdir -p "$ORIGINAL" "$STAGED" "$REVERSED"
PATCH="$DIR/approved.patch"
git diff --binary "$BASE" "$FIX" -- "${FILES[@]}" > "$PATCH"
[[ -s "$PATCH" ]] || { echo 'STOP: Empty reviewed patch.' >&2; exit 1; }
echo '=== VPS MODIFICATIONS (PRESERVED) ==='
git status --short -- "${FILES[@]}" "${ASSETS[@]}" || true
for f in "${FILES[@]}"; do
  for loc in "$ORIGINAL" "$STAGED" "$REVERSED"; do mkdir -p "$loc/$(dirname "$f")"; done
  cp -- "$f" "$ORIGINAL/$f"
  cp -- "$f" "$STAGED/$f"
done
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
  cmp -s "$ORIGINAL/$f" "$REVERSED/$f" || {
    echo "STOP: Byte preservation failed $f" >&2; exit 1;
  }
done
for f in "${ASSETS[@]}"; do
  mkdir -p "$STAGED/$(dirname "$f")"
  git show "$FIX:$f" > "$STAGED/$f"
  [[ -s "$STAGED/$f" ]] || { echo "STOP: Missing reviewed asset $f" >&2; exit 1; }
done
mkdir -p "$STAGED/tests"
git show "$FIX:tests/pmd-device-fleet-v150.test.cjs" > "$STAGED/tests/pmd-device-fleet-v150.test.cjs"
git show "$FIX:tests/pmd-device-fleet-v150-runtime.test.cjs" > "$STAGED/tests/pmd-device-fleet-v150-runtime.test.cjs"

echo '=== V150 VERIFIED OVERLAY QA ==='
php -l "$STAGED/app/Services/PmdDevicePlatformService.php"
php -l "$STAGED/app/admin/controllers/Pmddevices.php"
node --check "$STAGED/app/admin/assets/js/pmd-device-fleet-v150.js"
( cd "$STAGED" && node --test tests/pmd-device-fleet-v150.test.cjs tests/pmd-device-fleet-v150-runtime.test.cjs )
if [[ "$MODE" == --check ]]; then
  echo 'V150 FLEET SETTINGS DRY RUN: PASS'
  echo 'No live server files changed. Staff App and all local edits preserved.'
  echo "Staging: $DIR"
  exit 0
fi

for f in "${FILES[@]}"; do
  cmp -s "$ORIGINAL/$f" "$f" || { echo "STOP: Concurrent file edit $f" >&2; exit 1; }
done
for f in "${ASSETS[@]}"; do
  [[ ! -e "$f" && ! -L "$f" ]] || { echo "STOP: Asset appeared while staging $f" >&2; exit 1; }
done
tar -czf "$DIR/before.tgz" -- "${FILES[@]}"
git diff --binary -- "${FILES[@]}" > "$DIR/previous-worktree.patch"
git diff --cached --binary -- "${FILES[@]}" > "$DIR/previous-index.patch"

STARTED=0
SUCCESS=0
NEW_ASSETS_CREATED=()
rollback() {
  local code=$?
  trap - EXIT
  if [[ "$STARTED" == 1 && "$SUCCESS" != 1 ]]; then
    echo 'STOP: Restoring exact 4 original files.' >&2
    sudo tar -xzpf "$DIR/before.tgz" -C "$ROOT" || true
    for f in "${NEW_ASSETS_CREATED[@]}"; do sudo rm -f -- "$f" || true; done
    (sudo -u www-data php artisan view:clear || php artisan view:clear) || true
  fi
  if [[ "$SUCCESS" != 1 ]]; then echo "Backup: $DIR/before.tgz" >&2; fi
  exit "$code"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
STARTED=1
for f in "${FILES[@]}"; do
  cmp -s "$ORIGINAL/$f" "$f" || { echo "STOP: Concurrent edit before install $f" >&2; exit 1; }
  uid="$(stat -c %u -- "$f")"
  gid="$(stat -c %g -- "$f")"
  perm="$(stat -c %a -- "$f")"
  temp="$f.pmd-v150-$STAMP"
  sudo install -m "$perm" -o "$uid" -g "$gid" -- "$STAGED/$f" "$temp"
  sudo mv -f -- "$temp" "$f"
done
for f in "${ASSETS[@]}"; do
  [[ ! -e "$f" && ! -L "$f" ]] || { echo "STOP: Asset appeared before installation $f" >&2; exit 1; }
  uid="$(stat -c %u -- "$(dirname "$f")")"
  gid="$(stat -c %g -- "$(dirname "$f")")"
  sudo install -m 0644 -o "$uid" -g "$gid" -- "$STAGED/$f" "$f"
  NEW_ASSETS_CREATED+=("$f")
done
for f in "${FILES[@]}" "${ASSETS[@]}"; do
  cmp -s -- "$STAGED/$f" "$f" || { echo "STOP: Installed file differs $f" >&2; exit 1; }
done
php -l app/Services/PmdDevicePlatformService.php
php -l app/admin/controllers/Pmddevices.php
node --check app/admin/assets/js/pmd-device-fleet-v150.js
sudo -u www-data php artisan view:clear || php artisan view:clear

SUCCESS=1
trap - EXIT INT TERM
echo '========================================'
echo 'PAYMYDINE V150 FLEET SETTINGS INSTALLED'
echo 'Settings: signed Device App 0.6.6 direct-download link'
echo 'Devices: Connected/Staff/Table/Offline/All + search + rename'
echo 'Actual Staff phones without supported app heartbeat remain unmanageable.'
echo 'Existing Cashier, QR, Staff APK/link, bank settings, tenant data: UNCHANGED'
echo "Rollback archive: $DIR/before.tgz"
echo '========================================'
