#!/usr/bin/env bash
# Devices V144 targeted, fail-closed installer. Database, credentials, APK unaffected.
set -Eeuo pipefail
umask 077
cd /var/www/paymydine || exit 1
ROOT=/var/www/paymydine
BASE=e2cba7d0713a7e3f11d7da0c2706f3c8cdd2a926
FIX=a8aa32951fb18421be56ca503caa07cb01acb6db
BRANCH=fix/devices-commands-and-payment-readiness-v144-20261022
MODE="${1:---check}"
FILES=(
  app/admin/controllers/Pmddevices.php
  app/admin/views/pmddevices/index.blade.php
  app/admin/assets/js/pmd-device-platform-v1.js
  app/admin/assets/js/debug-redirects.js
)
[[ "$MODE" == --check || "$MODE" == --apply ]] || { echo 'Usage: --check|--apply' >&2; exit 2; }
[[ "$(git rev-parse --show-toplevel)" == "$ROOT" ]] || { echo 'STOP: unexpected Git root.' >&2; exit 1; }
for exe in git tar php node cmp stat sudo install mv; do
  command -v "$exe" >/dev/null || { echo "STOP: missing $exe" >&2; exit 1; }
done
for f in "${FILES[@]}"; do
  [[ -f "$f" && ! -L "$f" ]] || { echo "STOP: missing/symlink file: $f" >&2; exit 1; }
done
GIT_OPTIONAL_LOCKS=0 git -c gc.auto=0 fetch --no-auto-gc origin "$BRANCH"
REMOTE="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}"
git cat-file -e "${FIX}^{commit}"
git merge-base --is-ancestor "$FIX" "$REMOTE" || { echo 'STOP: unexpected branch ancestry' >&2; exit 1; }
git diff --quiet "$FIX" "$REMOTE" -- "${FILES[@]}" || { echo 'STOP: reviewed files changed on remote' >&2; exit 1; }

BACKUP="$HOME/pmd-devices-v144-$(date +%Y%m%d-%H%M%S)-$$"
BEFORE="$BACKUP/before"
STAGE="$BACKUP/staged"
REVERSED="$BACKUP/reversed"
mkdir -p "$BEFORE" "$STAGE" "$REVERSED"
PATCH="$BACKUP/devices.patch"
git diff --binary "$BASE" "$FIX" -- "${FILES[@]}" > "$PATCH"
[[ -s "$PATCH" ]] || { echo 'STOP: empty patch' >&2; exit 1; }
git diff --check "$BASE" "$FIX" -- "${FILES[@]}"

echo '=== EXISTING VPS EDITS (PRESERVED) ==='
git status --short -- "${FILES[@]}" || true
for f in "${FILES[@]}"; do
  for folder in "$BEFORE" "$STAGE" "$REVERSED"; do mkdir -p "$folder/$(dirname "$f")"; done
  cp -- "$f" "$BEFORE/$f"
  cp -- "$f" "$STAGE/$f"
done
mkdir -p "$STAGE/tests" "$STAGE/app/admin/assets/src/js"
git show "$FIX:tests/pmd-devices-v144-command-auth.test.cjs" > "$STAGE/tests/pmd-devices-v144-command-auth.test.cjs"
git show "$FIX:app/admin/assets/src/js/request.js" > "$STAGE/app/admin/assets/src/js/request.js"

(
  cd "$STAGE"
  git apply --check "$PATCH"
  git apply "$PATCH"
)
for f in "${FILES[@]}"; do cp -- "$STAGE/$f" "$REVERSED/$f"; done
(
  cd "$REVERSED"
  git apply -R --check "$PATCH"
  git apply -R "$PATCH"
)
for f in "${FILES[@]}"; do
  cmp -s -- "$BEFORE/$f" "$REVERSED/$f" || { echo "STOP: existing VPS edits at risk: $f" >&2; exit 1; }
done

echo '=== VALIDATE TESTED VPS STAGE ==='
php -l "$STAGE/app/admin/controllers/Pmddevices.php"
node --check "$STAGE/app/admin/assets/js/pmd-device-platform-v1.js"
node --check "$STAGE/app/admin/assets/js/debug-redirects.js"
( cd "$STAGE" && node --test tests/pmd-devices-v144-command-auth.test.cjs )
if [[ "$MODE" == --check ]]; then
  echo 'V144 DEVICES DRY RUN: PASS'
  echo 'Four live files unchanged. No database or credentials modified.'
  echo "Staged: $BACKUP"
  exit 0
fi

for f in "${FILES[@]}"; do
  cmp -s -- "$BEFORE/$f" "$f" || { echo "STOP: changed while checking: $f" >&2; exit 1; }
done
tar -czf "$BACKUP/before.tgz" -- "${FILES[@]}"
git diff --binary -- "${FILES[@]}" > "$BACKUP/preexisting-worktree.patch"
git diff --cached --binary -- "${FILES[@]}" > "$BACKUP/preexisting-index.patch"
for f in "${FILES[@]}"; do
  cmp -s -- "$BEFORE/$f" "$f" || { echo "STOP: changed while backing up: $f" >&2; exit 1; }
done

STARTED=0
SUCCESS=0
rollback() {
  local code=$?
  trap - EXIT
  if [[ "$STARTED" == 1 && "$SUCCESS" != 1 ]]; then
    echo 'STOP: reverting live files from exact backup.' >&2
    sudo tar -xzpf "$BACKUP/before.tgz" -C "$ROOT" || true
    (sudo -u www-data php artisan view:clear || php artisan view:clear) || true
  fi
  [[ "$SUCCESS" == 1 ]] || echo "Backup: $BACKUP/before.tgz" >&2
  exit "$code"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
STARTED=1
for f in "${FILES[@]}"; do
  cmp -s -- "$BEFORE/$f" "$f" || { echo "STOP: concurrent change: $f" >&2; exit 1; }
  uid="$(stat -c %u -- "$f")"
  gid="$(stat -c %g -- "$f")"
  mode="$(stat -c %a -- "$f")"
  tmp="$f.pmd-v144-$$"
  sudo install -m "$mode" -o "$uid" -g "$gid" -- "$STAGE/$f" "$tmp"
  sudo mv -f -- "$tmp" "$f"
done
for f in "${FILES[@]}"; do
  cmp -s -- "$STAGE/$f" "$f" || { echo "STOP: deployed file verification failed: $f" >&2; exit 1; }
done
php -l app/admin/controllers/Pmddevices.php
node --check app/admin/assets/js/pmd-device-platform-v1.js
node --check app/admin/assets/js/debug-redirects.js
sudo -u www-data php artisan view:clear || php artisan view:clear
SUCCESS=1
trap - EXIT INT TERM
echo 'PAYMYDINE DEVICES V144 INSTALLED'
echo 'Device commands serialized correctly (WAKE/SLEEP/BRIGHTNESS)'
echo 'Debug HEAD polling disabled by default; 403 != CSRF.'
echo 'Cashier V139/V143, database, payment credentials and APK UNCHANGED'
echo "Rollback backup: $BACKUP/before.tgz"
