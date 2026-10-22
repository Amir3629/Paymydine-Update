#!/usr/bin/env bash
# PayMyDine Cashier V139, six-file targeted installation.
# Never updates DB, main branch or the Android APK.
set -Eeuo pipefail

ROOT='/var/www/paymydine'
BASE='31e7841a9ff8025b9fb37cf57c81c143802869f3'
FIX='1b894b2b9d1ddb47341b959f4b51b32106f070e1'
BRANCH='fix/qpos-v139-staff-safe-20261022'
MODE="${1:---check}"

FILES=(
  'app/Services/PmdTableDisplayService.php'
  'app/Services/TerminalPayments/TerminalPaymentService.php'
  'app/admin/assets/js/pmd-table-display-waiter-payment-v1.js'
  'app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php'
  'app/admin/views/pmd_quick_pos_v1.blade.php'
  'app/admin/views/pmdsettings/index.blade.php'
)

if [[ "$MODE" != '--apply' && "$MODE" != '--check' ]]; then
  printf 'Usage: bash pmd-qpos-v139-safe-deploy.sh [--check|--apply]\n' >&2
  exit 2
fi

cd "$ROOT" || exit 1
if [[ "$(git rev-parse --show-toplevel)" != "$ROOT" ]]; then
  echo 'STOP: current directory is not the expected PayMyDine Git root.' >&2
  exit 1
fi
for executable in git node php tar sha256sum sudo; do
  command -v "$executable" >/dev/null || {
    echo "STOP: missing executable: $executable" >&2
    exit 1
  }
done
for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || { echo "STOP: missing live file: $f" >&2; exit 1; }
done

# Avoid Git auto-gc touching stale worktree refs with the known ownership bug.
GIT_OPTIONAL_LOCKS=0 git -c gc.auto=0 fetch --no-auto-gc origin "$BRANCH"
REMOTE="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}"
git cat-file -e "${FIX}^{commit}"
if ! git merge-base --is-ancestor "$FIX" "$REMOTE"; then
  echo 'STOP: reviewed V139 commit is absent from remote branch.' >&2
  exit 1
fi
if ! git diff --quiet "$FIX" "$REMOTE" -- "${FILES[@]}"; then
  echo 'STOP: remote branch changed one of the reviewed production files.' >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$HOME/pmd-qpos-v139-$STAMP"
mkdir -p "$BACKUP"
PATCH="$BACKUP/install.patch"
git diff --binary "$BASE" "$FIX" -- "${FILES[@]}" > "$PATCH"
[[ -s "$PATCH" ]] || { echo 'STOP: empty Cashier patch.' >&2; exit 1; }
git diff --check "$BASE" "$FIX" -- "${FILES[@]}"

verify_exact_files() {
  local f expected actual
  for f in "${FILES[@]}"; do
    expected="$(git rev-parse "$FIX:$f")"
    actual="$(git hash-object "$f")"
    if [[ "$expected" != "$actual" ]]; then
      echo "STOP: deployed file differs from reviewed version: $f" >&2
      return 1
    fi
  done
}

if git apply -R --check "$PATCH" 2>/dev/null; then
  verify_exact_files
  echo 'CASHIER V139 ALREADY INSTALLED: exact file hashes verified.'
  exit 0
fi

if ! git apply --check "$PATCH"; then
  echo 'STOP: VPS files are incompatible with the reviewed V139 patch.' >&2
  echo 'Nothing was installed; do not use --force.' >&2
  exit 1
fi

if [[ -n "$(git status --porcelain -- "${FILES[@]}")" ]]; then
  echo 'STOP: target files have local Git changes.' >&2
  echo 'Nothing was installed; inspect those changes first.' >&2
  exit 1
fi

echo 'PRECHECK: PASS'
echo "Reviewed fix: $FIX"
echo "Remote branch: $REMOTE"
echo "Backup folder: $BACKUP"
if [[ "$MODE" == '--check' ]]; then
  echo 'DRY RUN COMPLETE: operational files unchanged.'
  exit 0
fi

tar -czf "$BACKUP/before.tgz" "${FILES[@]}"
git diff -- "${FILES[@]}" > "$BACKUP/before-local.patch"
git show "$FIX:tests/pmd-qpos-v139-payment-and-staff.test.cjs" > "$BACKUP/v139-qa.test.cjs"

applied=0
rollback_on_error() {
  local code=$?
  trap - ERR
  if [[ "$applied" == '1' ]]; then
    echo 'VALIDATION FAILED: restoring six original files from backup.' >&2
    sudo tar -xzf "$BACKUP/before.tgz" -C "$ROOT" || true
    (sudo -u www-data php artisan view:clear || php artisan view:clear) || true
  fi
  echo "STOP (exit $code). Backup: $BACKUP/before.tgz" >&2
  exit "$code"
}
trap rollback_on_error ERR

sudo chown "$(id -un):www-data" "${FILES[@]}"
sudo chmod u+rw "${FILES[@]}"

applied=1
git apply "$PATCH"

php -l app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php
php -l app/Services/TerminalPayments/TerminalPaymentService.php
php -l app/Services/PmdTableDisplayService.php
node --check app/admin/assets/js/pmd-table-display-waiter-payment-v1.js
node --test "$BACKUP/v139-qa.test.cjs"
verify_exact_files

sudo -u www-data php artisan view:clear || php artisan view:clear
trap - ERR

echo '========================================'
echo 'PAYMYDINE CASHIER V139 INSTALLED'
echo 'Effective terminal inventory: V139'
echo 'Canonical payment recorded guard: V139 / V137'
echo 'ZCS Device App Settings link: 0.6.2'
echo 'Staff App Settings entry: preserved'
echo "Backup: $BACKUP/before.tgz"
echo 'Database: unchanged'
echo 'Android APK: unchanged'
echo '========================================'
