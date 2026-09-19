#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R17_BRANCH:-origin/fix/platform-performance-complete-r17}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r17-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r17-stage.XXXXXX)"
FILE="app/Database/PmdCachedMySqlBuilder.php"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

cleanup_stage() {
  if [ -d "$STAGE" ]; then
    find "$STAGE" -mindepth 1 -delete >/dev/null 2>&1 || true
    rmdir "$STAGE" >/dev/null 2>&1 || true
  fi
}

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== R17 DEPLOY FAILED: RESTORING PRE-RUN FILE =====" >&2

    if [ -f "$BACKUP/$FILE" ]; then
      uid="$(stat -c '%u' "$BACKUP/$FILE")"
      gid="$(stat -c '%g' "$BACKUP/$FILE")"
      mode="$(stat -c '%a' "$BACKUP/$FILE")"
      restore_tmp="$ROOT/$FILE.pmd-r17-rollback-$STAMP.tmp"

      sudo install -o "$uid" -g "$gid" -m "$mode" "$BACKUP/$FILE" "$restore_tmp"
      sudo mv -f "$restore_tmp" "$ROOT/$FILE"
      echo "RESTORED $FILE" >&2
    fi

    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    echo "Rollback completed from: $BACKUP" >&2
  fi

  cleanup_stage
  exit "$status"
}

trap rollback_if_needed EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine PERFORMANCE R17 HOTFIX"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r17

mkdir -p "$STAGE/$(dirname "$FILE")"
git show "$BRANCH:$FILE" > "$STAGE/$FILE"

if [ ! -s "$STAGE/$FILE" ]; then
  echo "ERROR: staged builder is empty" >&2
  exit 1
fi

php -l "$STAGE/$FILE"

grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$STAGE/$FILE"
grep -q "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'" "$STAGE/$FILE"
grep -q 'SHOW COLUMNS FROM' "$STAGE/$FILE"

if grep -q 'information_schema.COLUMNS' "$STAGE/$FILE"; then
  echo "ERROR: R16 full information_schema column catalogue is still present" >&2
  exit 1
fi

echo "OK R17 lazy metadata strategy present"

echo
echo "===== FLAME COMPATIBILITY SMOKE ====="

php <<'PHP'
<?php
require 'vendor/autoload.php';

$connection = new App\Database\PmdCachedMySqlConnection(
    static function () {
        throw new RuntimeException(
            'PDO should not be needed for compatibility smoke test.'
        );
    },
    'pmd_r17_smoke',
    '',
    ['driver' => 'mysql']
);

$query = $connection->query();

if (!($query instanceof Igniter\Flame\Database\Query\Builder)) {
    fwrite(STDERR, "ERROR: Flame query builder not preserved\n");
    exit(1);
}

if (!method_exists($query, 'flushDuplicateCache')) {
    fwrite(STDERR, "ERROR: flushDuplicateCache missing\n");
    exit(1);
}

$schema = $connection->getSchemaBuilder();

if (!($schema instanceof App\Database\PmdCachedMySqlBuilder)) {
    fwrite(STDERR, "ERROR: R17 schema builder not active\n");
    exit(1);
}

echo "OK Flame builder + R17 schema builder compatibility\n";
PHP

echo
echo "===== BACKUP CURRENT LIVE FILE ====="
mkdir -p "$BACKUP/$(dirname "$FILE")"
cp -a "$FILE" "$BACKUP/$FILE"
echo "BACKED UP $FILE"

echo
echo "===== DEPLOY R17 BUILDER ====="
DEPLOY_STARTED=1

uid="$(stat -c '%u' "$FILE")"
gid="$(stat -c '%g' "$FILE")"
mode="$(stat -c '%a' "$FILE")"
live_tmp="$ROOT/$FILE.pmd-r17-$STAMP.tmp"

sudo install -o "$uid" -g "$gid" -m "$mode" "$STAGE/$FILE" "$live_tmp"
sudo mv -f "$live_tmp" "$ROOT/$FILE"

cmp -s "$STAGE/$FILE" "$ROOT/$FILE"
php -l "$ROOT/$FILE"

grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/$FILE"

if grep -q 'information_schema.COLUMNS' "$ROOT/$FILE"; then
  echo "ERROR: live builder still contains full R16 catalogue" >&2
  exit 1
fi

echo "DEPLOYED + VERIFIED $FILE"

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
echo " R17 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
