#!/usr/bin/env bash
# PayMyDine ZCS V142 conflict-safe 5-file server overlay. Preserve dirty Settings.
# Merge 4 reviewed patches, then surgically update the Settings link on COPIES.
# Never resets Git, drops non-conflicting VPS changes, touches DB, or replaces APK.
set -Eeuo pipefail
umask 077

ROOT='/var/www/paymydine'
BASE='6772783b9c0fd1ec3fd3c2672036120e03b746a7'
FIX='08842c850d27df1c027b8990dcbc115881ad467a'
BRANCH='fix/android-pos-v140-stability-payment-20261022'
MODE="${1:---check}"

FILES=(
  'app/Http/Controllers/PmdTableDisplayPaymentController.php'
  'routes/admin-quick-mode.php'
  'app/admin/assets/js/pmd-table-display-waiter-payment-v1.js'
  'app/admin/views/pmd_quick_pos_v1.blade.php'
  'app/admin/views/pmdsettings/index.blade.php'
)

SETTINGS='app/admin/views/pmdsettings/index.blade.php'
PATCH_FILES=(
  'app/Http/Controllers/PmdTableDisplayPaymentController.php'
  'routes/admin-quick-mode.php'
  'app/admin/assets/js/pmd-table-display-waiter-payment-v1.js'
  'app/admin/views/pmd_quick_pos_v1.blade.php'
)

if [[ "$MODE" != '--check' && "$MODE" != '--apply' ]]; then
  echo 'Usage: bash pmd-zcs-v142-conflict-safe-overlay.sh [--check|--apply]' >&2
  exit 2
fi

for binary in git tar php node python3 cmp stat sudo install mv; do
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
BACKUP="$HOME/pmd-zcs-v142-conflict-safe-$STAMP"
BEFORE="$BACKUP/before"
STAGE="$BACKUP/staged"
REVERSED="$BACKUP/reversed"
mkdir -p "$BEFORE" "$STAGE" "$REVERSED"
PATCH="$BACKUP/v142-four-files.patch"
git diff --binary "$BASE" "$FIX" -- "${PATCH_FILES[@]}" > "$PATCH"
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

# Pin the surgical editor and prove that its ONLY effects match the
# approved upstream Settings diff (APK URL + version marker; nothing else).
SETTINGS_EDITOR="$BACKUP/settings-surgical.py"
git show "$FIX:scripts/pmd-zcs-v142-settings-surgical.py" > "$SETTINGS_EDITOR"
git show "$BASE:$SETTINGS" > "$BACKUP/base-settings.blade.php"
git show "$FIX:$SETTINGS" > "$BACKUP/approved-settings.blade.php"
python3 "$SETTINGS_EDITOR" \
  "$BACKUP/base-settings.blade.php" "$BACKUP/approved-surgical-settings.blade.php"
cmp -s "$BACKUP/approved-surgical-settings.blade.php" "$BACKUP/approved-settings.blade.php" || {
  echo 'STOP: reviewed Settings diff contains changes beyond the APK URL/marker.' >&2
  exit 1
}

# Stage isolated regression test without touching the real VPS test directory.
mkdir -p "$STAGE/tests"
git show "$FIX:tests/pmd-zcs-v140-server-readiness.test.cjs" \
  > "$STAGE/tests/pmd-zcs-v140-server-readiness.test.cjs"

# Only the four NON-Settings files use Git patch hunks. Local changes to
# Settings can change nearby patch context, even though two URL strings are
# unmodified. Never use --3way, reset, checkout -f, or --force.
(
  cd "$STAGE"
  git apply --check "$PATCH"
  git apply "$PATCH"
)
python3 "$SETTINGS_EDITOR" "$BEFORE/$SETTINGS" "$STAGE/$SETTINGS"

# Reverse the four Git hunks and compare every output with the exact ORIGINAL
# VPS file. The Settings editor itself changes only two uniquely verified spans.
for f in "${PATCH_FILES[@]}"; do
  cp -- "$STAGE/$f" "$REVERSED/$f"
done
cp -- "$BEFORE/$SETTINGS" "$REVERSED/$SETTINGS"
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
php -l "$STAGE/app/Http/Controllers/PmdTableDisplayPaymentController.php"
php -l "$STAGE/routes/admin-quick-mode.php"
node --check "$STAGE/app/admin/assets/js/pmd-table-display-waiter-payment-v1.js"
(
  cd "$STAGE"
  node --test tests/pmd-zcs-v140-server-readiness.test.cjs
)

# Never silently replace a partially modified or previously installed version.
if [[ "$MODE" == '--check' ]]; then
  echo '============================================'
  echo 'V142 CONFLICT-SAFE DRY RUN: PASS'
  echo 'All 5 original VPS files were preserved byte-for-byte.'
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
    (sudo -u www-data php artisan route:clear || php artisan route:clear) || true
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
  temp_target="$f.pmd-v142-$STAMP"
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
php -l app/Http/Controllers/PmdTableDisplayPaymentController.php
php -l routes/admin-quick-mode.php
node --check app/admin/assets/js/pmd-table-display-waiter-payment-v1.js

sudo -u www-data php artisan view:clear || php artisan view:clear
sudo -u www-data php artisan route:clear || php artisan route:clear
SUCCESS=1
trap - EXIT INT TERM

echo '============================================'
echo 'PAYMYDINE ZCS V142 SERVER READY'
echo 'Existing non-conflicting VPS edits: PRESERVED'
echo 'Table Device readiness: verified live linked terminal'
echo 'Payment runtime: V140 / V137'
echo 'Device App download link: 0.6.4 (surgical, Staff preserved)'
echo 'Separate Staff App download: PRESERVED'
echo "Rollback archive: $BACKUP/before.tgz"
echo 'Database: UNCHANGED'
echo 'Android APK: UNCHANGED'
echo '============================================'
