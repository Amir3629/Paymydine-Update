#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R18_BRANCH:-origin/fix/platform-performance-complete-r18}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r18-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r18-stage.XXXXXX)"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/classes/PmdCleanWorkspaceControllerV1.php"
  "app/admin/Services/PmdSharedFloorRegistryV1.php"
)

cleanup_stage() {
  if [ -d "$STAGE" ]; then
    rm -rf "$STAGE" >/dev/null 2>&1 || true
  fi
}

restore_files() {
  for file in "${FILES[@]}"; do
    if [ ! -f "$BACKUP/$file" ]; then
      continue
    fi

    uid="$(stat -c '%u' "$BACKUP/$file")"
    gid="$(stat -c '%g' "$BACKUP/$file")"
    mode="$(stat -c '%a' "$BACKUP/$file")"
    restore_tmp="$ROOT/$file.pmd-r18-rollback-$STAMP.tmp"

    sudo install -o "$uid" -g "$gid" -m "$mode" "$BACKUP/$file" "$restore_tmp"
    sudo mv -f "$restore_tmp" "$ROOT/$file"
    echo "RESTORED $file" >&2
  done
}

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== R18 DEPLOY FAILED: RESTORING PRE-RUN FILES =====" >&2
    restore_files
    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    echo "Rollback completed from: $BACKUP" >&2
  fi

  cleanup_stage
  exit "$status"
}

trap rollback_if_needed EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine PERFORMANCE R18"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r18

echo
echo "===== STAGE + VALIDATE R18 FILES ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$BRANCH:$file" > "$STAGE/$file"

  if [ ! -s "$STAGE/$file" ]; then
    echo "ERROR: staged file is empty: $file" >&2
    exit 1
  fi

  php -l "$STAGE/$file"
  echo "VALIDATED $file"
done

grep -q 'PMD_PERF_R18_REQUEST_LOCAL_FLOOR_IDENTITY'   "$STAGE/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_FINANCE_MICROCACHE'   "$STAGE/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_SINGLE_WORKSPACE_LOCATION'   "$STAGE/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS'   "$STAGE/app/admin/Services/PmdSharedFloorRegistryV1.php"

# R18 must not replace or regress the successful R17 schema strategy.
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA'     "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi

echo "OK R18 markers present"
echo "OK R17 lazy metadata strategy remains untouched"

echo
echo "===== BACKUP CURRENT LIVE FILES ====="
for file in "${FILES[@]}"; do
  if [ ! -f "$ROOT/$file" ]; then
    echo "ERROR: live file missing: $file" >&2
    exit 1
  fi

  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY VALIDATED R18 FILES ====="
DEPLOY_STARTED=1

for file in "${FILES[@]}"; do
  uid="$(stat -c '%u' "$ROOT/$file")"
  gid="$(stat -c '%g' "$ROOT/$file")"
  mode="$(stat -c '%a' "$ROOT/$file")"
  live_tmp="$ROOT/$file.pmd-r18-$STAMP.tmp"

  sudo install -o "$uid" -g "$gid" -m "$mode" "$STAGE/$file" "$live_tmp"
  sudo mv -f "$live_tmp" "$ROOT/$file"

  cmp -s "$STAGE/$file" "$ROOT/$file"
  php -l "$ROOT/$file"
  echo "DEPLOYED + VERIFIED $file"
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
echo " R18 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
