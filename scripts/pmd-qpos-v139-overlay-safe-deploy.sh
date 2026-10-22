#!/usr/bin/env bash
# PayMyDine Cashier V139 local-change-preserving deploy.
# Overlay the six reviewed file hunks onto COPIES of live VPS files first.
# Never resets Git, drops non-conflicting VPS changes, touches DB, or replaces APK.
set -Eeuo pipefail
umask 077

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

if [[ "$MODE" != '--check' && "$MODE" != '--apply' ]]; then
  echo 'Usage: bash pmd-qpos-v139-overlay-safe-deploy.sh [--check|--apply]' >&2
  exit 2
fi

for binary in git tar php node cmp stat sudo install mv; do
  command -v "$binary" >/dev/null || {
    echo "STOP: required command not found: $binary" >&2
    exit 1
  }
done
cd "$ROOT" || exit 1
[[ "$(git rev-parse --show-toplevel)" == "$ROOT" ]] || {
  echo 'STOP: not the expected PayMyDine Git root.' >&2
  exit 1
}

for f in "${FILES[@]}"; do
  if [[ ! -f "$f" || -L "$f" ]]; then
    echo "STOP: missing file or symbolic link: $f" >&2
    exit 1
  fi
done

# Safe fetch: avoid VPS auto-gc and its preexisting Git worktree lock issue.
GIT_OPTIONAL_LOCKS=0 git -c gc.auto=0 fetch --no-auto-gc origin "$BRANCH"
REMOTE="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}"
git cat-file -e "${FIX}^{commit}"
git merge-base --is-ancestor "$FIX" "$REMOTE" || {
  echo 'STOP: pinned reviewed fix no longer belongs to branch.' >&2
  exit 1
}
git diff --quiet "$FIX" "$REMOTE" -- "${FILES[@]}" || {
  echo 'STOP: production file changes beyond pinned reviewed fix.' >&2
  exit 1
}

STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP="$HOME/pmd-qpos-v139-overlay-$STAMP"
BEFORE="$BACKUP/before"
STAGE="$BACKUP/staged"
REVERSED="$BACKUP/reversed"
mkdir -p "$BEFORE" "$STAGE" "$REVERSED"
PATCH="$BACKUP/v139.patch"
git diff --binary "$BASE" "$FIX" -- "${FILES[@]}" > "$PATCH"
[[ -s "$PATCH" ]] || { echo 'STOP: empty pinned patch.' >&2; exit 1; }
git diff --check "$BASE" "$FIX" -- "${FILES[@]}"

echo '=== EXISTING VPS CHANGES (PRESERVED) ==='
git status --short -- "${FILES[@]}" || true

for f in "${FILES[@]}"; do
  mkdir -p "$BEFORE/$(dirname "$f")" \
           "$STAGE/$(dirname "$f")" \
           "$REVERSED/$(dirname "$f")"
  cp -- "$f" "$BEFORE/$f"
  cp -- "$f" "$STAGE/$f"
done

# Stage controller and regression test as dependencies for node --test.
mkdir -p "$STAGE/app/admin/controllers" "$STAGE/tests"
cp -- 'app/admin/controllers/PmdWaiterPosV1.php' \
  "$STAGE/app/admin/controllers/PmdWaiterPosV1.php"
git show "$FIX:tests/pmd-qpos-v139-payment-and-staff.test.cjs" \
  > "$STAGE/tests/pmd-qpos-v139-payment-and-staff.test.cjs"

# The patch must merge into exact copies of the user's current VPS files.
# A conflict is a hard stop. Never use git reset, checkout -f, --force, -3.
(
  cd "$STAGE"
  git apply --check "$PATCH"
  git apply "$PATCH"
)

# Independently prove the patch is reversible and original local bytes survive.
for f in "${FILES[@]}"; do
  cp -- "$STAGE/$f" "$REVERSED/$f"
done
(
  cd "$REVERSED"
  git apply -R --check "$PATCH"
  git apply -R "$PATCH"
)
for f in "${FILES[@]}"; do
  cmp -s -- "$BEFORE/$f" "$REVERSED/$f" || {
    echo "STOP: local VPS changes not perfectly preserved: $f" >&2
    exit 1
  }
done

echo '=== VALIDATE PROPOSED OVERLAY BEFORE INSTALLATION ==='
php -l "$STAGE/app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php"
php -l "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
php -l "$STAGE/app/Services/PmdTableDisplayService.php"
node --check "$STAGE/app/admin/assets/js/pmd-table-display-waiter-payment-v1.js"
(
  cd "$STAGE"
  node --test tests/pmd-qpos-v139-payment-and-staff.test.cjs
)

# Never silently replace a partially modified or previously installed version.
if [[ "$MODE" == '--check' ]]; then
  echo '============================================'
  echo 'V139 OVERLAY DRY RUN: PASS'
  echo 'All 6 original VPS files were preserved byte-for-byte.'
  echo 'Changes are staged only; website and database unchanged.'
  echo "Staged backup: $BACKUP"
  echo '============================================'
  exit 0
fi

# Back up exact existing VPS contents + ownership/modes before touching anything.
for f in "${FILES[@]}"; do
  cmp -s -- "$BEFORE/$f" "$f" || {
    echo "STOP: VPS file changed during preview: $f" >&2
    exit 1
  }
done
tar -czf "$BACKUP/before.tgz" -- "${FILES[@]}"
git diff --binary -- "${FILES[@]}" > "$BACKUP/preexisting-worktree.patch"
git diff --cached --binary -- "${FILES[@]}" > "$BACKUP/preexisting-index.patch"
# Recheck after preparing backup (guard against concurrent edits).
for f in "${FILES[@]}"; do
  cmp -s -- "$BEFORE/$f" "$f" || {
    echo "STOP: VPS file changed during backup: $f" >&2
    exit 1
  }
done

APPLY_STARTED=0
SUCCESS=0
rollback_on_exit() {
  local result=$?
  trap - EXIT
  if [[ "$APPLY_STARTED" == 1 && "$SUCCESS" != 1 ]]; then
    echo 'DEPLOY FAILED: restoring backed-up VPS files.' >&2
    sudo tar -xzf "$BACKUP/before.tgz" -C "$ROOT" || true
    (sudo -u www-data php artisan view:clear || php artisan view:clear) || true
  fi
  if [[ "$SUCCESS" != 1 ]]; then
    echo "STOP: original archive at $BACKUP/before.tgz" >&2
  fi
  exit "$result"
}
trap rollback_on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

APPLY_STARTED=1
for f in "${FILES[@]}"; do
  # Install to the same directory and rename atomically; preserve uid/gid/mode.
  uid="$(stat -c %u -- "$f")"
  gid="$(stat -c %g -- "$f")"
  mode="$(stat -c %a -- "$f")"
  temp_target="$f.pmd-v139-$STAMP"
  sudo install -m "$mode" -o "$uid" -g "$gid" -- "$STAGE/$f" "$temp_target"
  sudo mv -f -- "$temp_target" "$f"
done

# Verify live bytes against the exact successful proposed overlay.
for f in "${FILES[@]}"; do
  cmp -s -- "$STAGE/$f" "$f" || {
    echo "STOP: installed file differs from tested staged file: $f" >&2
    exit 1
  }
done
php -l app/admin/controllers/concerns/PmdWaiterPosTerminalProvidersConcern.php
php -l app/Services/TerminalPayments/TerminalPaymentService.php
php -l app/Services/PmdTableDisplayService.php
node --check app/admin/assets/js/pmd-table-display-waiter-payment-v1.js

sudo -u www-data php artisan view:clear || php artisan view:clear
SUCCESS=1
trap - EXIT INT TERM

echo '============================================'
echo 'PAYMYDINE CASHIER V139 OVERLAY INSTALLED'
echo 'Existing non-conflicting VPS edits: PRESERVED'
echo 'Cashier active terminal inventory: V139'
echo 'Canonical payment recorded guard: V139 / V137'
echo 'Device App download link: 0.6.2'
echo 'Separate Staff App download: PRESERVED'
echo "Rollback archive: $BACKUP/before.tgz"
echo 'Database: UNCHANGED'
echo 'Android APK: UNCHANGED'
echo '============================================'
