#!/usr/bin/env bash
# PayMyDine V147: Z80 checkout QR + waiter external reader; no payment capture or NFC charging.
# Preserves local edits; nine vetted server files. Existing Cashier and staff APK untouched.
set -Eeuo pipefail
umask 077
ROOT=/var/www/paymydine
BASE=34a3f7958f061153af0bef610b82381acd080ead
FIX=5b5b55f2a2e10744ba373e0ce64df8b82b111e95
BRANCH=feat/payment-channels-z100-z80-waiter-v147-20261023
MODE="${1:---check}"
FILES=(
  app/Services/PmdTableDisplayService.php
  app/Http/Controllers/PmdTableDisplayPaymentController.php
  routes/admin-quick-mode.php
  app/admin/assets/js/pmd-waiter-pos-payment-v3.js
  app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js
  app/admin/views/waiter_pos.blade.php
  app/admin/views/waiter_dashboard_new.blade.php
  app/admin/assets/js/pmd-table-display-v1.js
  app/Services/Payments/ProviderCapabilityRegistry.php
)
if [[ "$MODE" != --check && "$MODE" != --apply ]]; then
  echo 'Usage: bash pmd-payment-channels-v147-safe-deploy.sh [--check|--apply]' >&2; exit 2
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
  echo 'STOP: Production files differ from reviewed V147 commit.' >&2; exit 1
}

STAMP="$(date +%Y%m%d-%H%M%S)-$$"
DIR="$HOME/pmd-payment-channels-v147-$STAMP"
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
git show "$FIX:tests/pmd-payment-channels-v147-server.test.cjs" \
  > "$STAGED/tests/pmd-payment-channels-v147-server.test.cjs"
# Read-only dependencies for acceptance tests: these are NOT deployment files.
for f in app/admin/controllers/Pmddevices.php app/Services/PmdDevicePlatformService.php; do
  [[ -f "$f" && ! -L "$f" ]] || { echo "STOP: V146 device controls not found: $f" >&2; exit 1; }
  mkdir -p "$STAGED/$(dirname "$f")"
  cp -- "$f" "$STAGED/$f"
done

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

echo '=== V147 CHECKOUT AND TERMINAL STAGED QA ==='
php -l "$STAGED/app/Services/PmdTableDisplayService.php"
php -l "$STAGED/app/Http/Controllers/PmdTableDisplayPaymentController.php"
php -l "$STAGED/routes/admin-quick-mode.php"
php -l "$STAGED/app/Services/Payments/ProviderCapabilityRegistry.php"
node --check "$STAGED/app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
node --check "$STAGED/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
node --check "$STAGED/app/admin/assets/js/pmd-table-display-v1.js"
( cd "$STAGED" && node --test tests/pmd-payment-channels-v147-server.test.cjs )
if [[ "$MODE" == --check ]]; then
  echo 'V147 PAYMENT CHANNELS DRY RUN: PASS'
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
    echo 'STOP: restoring the 9 original source files.' >&2
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
  temp="$f.pmd-v147-$STAMP"
  sudo install -m "$mode" -o "$uid" -g "$gid" -- "$STAGED/$f" "$temp"
  sudo mv -f -- "$temp" "$f"
done
for f in "${FILES[@]}"; do
  cmp -s -- "$STAGED/$f" "$f" || { echo "STOP: post-install bytes mismatch $f" >&2; exit 1; }
done
php -l app/Services/PmdTableDisplayService.php
php -l app/Http/Controllers/PmdTableDisplayPaymentController.php
php -l routes/admin-quick-mode.php
php -l app/Services/Payments/ProviderCapabilityRegistry.php
node --check app/admin/assets/js/pmd-waiter-pos-payment-v3.js
node --check app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js
node --check app/admin/assets/js/pmd-table-display-v1.js
sudo -u www-data php artisan view:clear || php artisan view:clear
sudo -u www-data php artisan route:clear || php artisan route:clear

SUCCESS=1
trap - EXIT INT TERM
echo '========================================'
echo 'PAYMYDINE V147 Z80 QR / WAITER PAYMENT SERVER INSTALLED'
echo 'Z80 QR event: online guest checkout only; never records Paid'
echo 'Waiter: share QR checkout or use registered online real card reader'
echo 'Provider channel matrix: QR vs terminal vs Z100 SoftPOS separated'
echo 'Local custom edits: PRESERVED'
echo 'Cashier V139/V143, Device Control V144/V146: UNCHANGED'
echo 'Database schema, credentials, APK and Staff App: UNCHANGED'
echo "Rollback backup: $DIR/before.tgz"
echo '========================================'
