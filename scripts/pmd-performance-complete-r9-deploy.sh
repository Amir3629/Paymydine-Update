#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R9_BRANCH:-origin/fix/platform-performance-complete-r9}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r9-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r9-stage.XXXXXX)"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/controllers/Cashierlab.php"
  "app/admin/views/_partials/pmd_operational_date_range_v1.blade.php"
)

cleanup_stage() {
  rm -rf "$STAGE"
}

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== R9 DEPLOY FAILED: RESTORING PRE-RUN FILES =====" >&2

    for file in "${FILES[@]}"; do
      marker="$BACKUP/.state/${file//\//__}"

      if [ -f "$marker.existed" ]; then
        uid="$(stat -c '%u' "$BACKUP/$file")"
        gid="$(stat -c '%g' "$BACKUP/$file")"
        mode="$(stat -c '%a' "$BACKUP/$file")"
        restore_tmp="$ROOT/$file.pmd-r9-rollback-$STAMP.tmp"

        sudo install -o "$uid" -g "$gid" -m "$mode" "$BACKUP/$file" "$restore_tmp"
        sudo mv -f "$restore_tmp" "$ROOT/$file"
        echo "RESTORED $file" >&2
      else
        sudo rm -f "$ROOT/$file"
        echo "REMOVED NEW FILE $file" >&2
      fi
    done

    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    echo "Rollback completed from: $BACKUP" >&2
  fi

  cleanup_stage
  exit "$status"
}

trap rollback_if_needed EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine COMPLETE PERFORMANCE R9 DEPLOY"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r9

echo
echo "===== STAGE + VALIDATE ALL R9 FILES ====="

for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  mkdir -p "$(dirname "$staged")"
  git show "$BRANCH:$file" > "$staged"

  if [ ! -s "$staged" ]; then
    echo "ERROR: staged file is empty: $file" >&2
    exit 1
  fi

  php -l "$staged"
  echo "VALIDATED $file"
done

echo
echo "===== R9 CONTENT PRECHECK ====="
grep -q 'PMD_PERF_R9_CASHIER_ORDERS_SECTION_FASTPATH'   "$STAGE/app/admin/controllers/Cashierlab.php"
grep -q 'PMD_PERF_R9_SKIP_REDUNDANT_800_ORDER_METRICS'   "$STAGE/app/admin/controllers/Cashierlab.php"
grep -q 'PMD_PERF_R9_CASHIER_SECTION_REQUEST'   "$STAGE/app/admin/views/_partials/pmd_operational_date_range_v1.blade.php"
grep -q 'PMD_PERF_R9_NO_BOOT_HISTORY_PREFETCH'   "$STAGE/app/admin/views/_partials/pmd_operational_date_range_v1.blade.php"
echo "OK R9 markers present"

echo
echo "===== BACKUP CURRENT LIVE FILES ====="
mkdir -p "$BACKUP/.state"

for file in "${FILES[@]}"; do
  marker="$BACKUP/.state/${file//\//__}"

  if [ -f "$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$file" "$BACKUP/$file"
    touch "$marker.existed"
    echo "BACKED UP $file"
  else
    touch "$marker.new"
    echo "NEW FILE $file"
  fi
done

echo
echo "===== DEPLOY VALIDATED FILES ====="
DEPLOY_STARTED=1

for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  parent="$(dirname "$file")"
  live_tmp="$ROOT/$file.pmd-r9-$STAMP.tmp"

  if [ -f "$file" ]; then
    uid="$(stat -c '%u' "$file")"
    gid="$(stat -c '%g' "$file")"
    mode="$(stat -c '%a' "$file")"
  else
    uid="$(stat -c '%u' "$parent")"
    gid="$(stat -c '%g' "$parent")"
    mode="644"
  fi

  sudo install -o "$uid" -g "$gid" -m "$mode" "$staged" "$live_tmp"
  sudo mv -f "$live_tmp" "$ROOT/$file"

  if ! cmp -s "$staged" "$ROOT/$file"; then
    echo "ERROR: deployed content mismatch: $file" >&2
    exit 1
  fi

  echo "DEPLOYED + VERIFIED $file"
done

echo
echo "===== POST-DEPLOY PHP SYNTAX ====="
for file in "${FILES[@]}"; do
  php -l "$file"
done

echo
echo "===== R9 CONTENT VERIFICATION ====="
for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  if cmp -s "$staged" "$ROOT/$file"; then
    echo "MATCH $file"
  else
    echo "ERROR: post-deploy mismatch: $file" >&2
    exit 1
  fi
done

echo
echo "===== RELOAD PHP-FPM ====="
sudo systemctl reload php8.3-fpm

echo
echo "===== HEALTH ====="
sudo systemctl is-active php8.3-fpm
sudo nginx -t

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " R9 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
