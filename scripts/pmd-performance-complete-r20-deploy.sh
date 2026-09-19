#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R20_BRANCH:-origin/fix/platform-performance-complete-r20}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r20-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r20-stage.XXXXXX)"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/classes/AdminController.php"
  "app/admin/middleware/LogUserLastSeen.php"
  "app/Http/Middleware/PmdSiteAccessGateMiddleware.php"
  "app/Services/PmdSiteAccessService.php"
  "app/Services/PmdTrustedLoginDeviceService.php"
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
    restore_tmp="$ROOT/$file.pmd-r20-rollback-$STAMP.tmp"

    sudo install -o "$uid" -g "$gid" -m "$mode" "$BACKUP/$file" "$restore_tmp"
    sudo mv -f "$restore_tmp" "$ROOT/$file"
    echo "RESTORED $file" >&2
  done
}

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== R20 DEPLOY FAILED: RESTORING PRE-RUN FILES =====" >&2
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
echo " PayMyDine PERFORMANCE R20"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r20

echo
echo "===== STAGE + VALIDATE R20 FILES ====="
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

echo
echo "===== R20 CONTENT PRECHECK ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT'   "$STAGE/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R20_REUSE_EAGER_STAFF_LOCATIONS'   "$STAGE/app/Services/PmdSiteAccessService.php"
grep -q 'PMD_PERF_R20_VERIFIED_TRUST_FASTPATH'   "$STAGE/app/Services/PmdTrustedLoginDeviceService.php"
grep -q 'site_access_resume'   "$STAGE/app/Http/Middleware/PmdSiteAccessGateMiddleware.php"
grep -q 'admin_auth_user'   "$STAGE/app/admin/classes/AdminController.php"

# Preserve the successful R19/R18/R17 performance stack already live.
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE'   "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS'   "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA'     "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi

echo "OK R20 markers present"
echo "OK R19/R18/R17 performance stack remains present"

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
echo "===== DEPLOY VALIDATED R20 FILES ====="
DEPLOY_STARTED=1

for file in "${FILES[@]}"; do
  uid="$(stat -c '%u' "$ROOT/$file")"
  gid="$(stat -c '%g' "$ROOT/$file")"
  mode="$(stat -c '%a' "$ROOT/$file")"
  live_tmp="$ROOT/$file.pmd-r20-$STAMP.tmp"

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
echo " R20 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
