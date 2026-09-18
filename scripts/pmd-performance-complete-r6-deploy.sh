#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R6_BRANCH:-origin/fix/platform-performance-complete-r6}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r6-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r6-stage.XXXXXX)"
STATE="$BACKUP/.state"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

FILES=(
  "app/Database/PmdCachedMySqlBuilder.php"
  "app/Database/PmdCachedMySqlConnection.php"
  "app/admin/ServiceProvider.php"
  "app/admin/controllers/PmdWaiterDashboardV150.php"
)

cleanup_stage() {
  rm -rf "$STAGE"
}

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== R6 DEPLOY FAILED: RESTORING PRE-RUN FILES =====" >&2

    for file in "${FILES[@]}"; do
      marker="$STATE/${file//\//__}"

      if [ -f "$marker.existed" ]; then
        uid="$(stat -c '%u' "$BACKUP/$file")"
        gid="$(stat -c '%g' "$BACKUP/$file")"
        mode="$(stat -c '%a' "$BACKUP/$file")"
        restore_tmp="$ROOT/$file.pmd-r6-rollback-$STAMP.tmp"

        sudo install -o "$uid" -g "$gid" -m "$mode" "$BACKUP/$file" "$restore_tmp"
        sudo mv -f "$restore_tmp" "$ROOT/$file"
        echo "RESTORED $file" >&2
      else
        sudo rm -f "$ROOT/$file"
        echo "REMOVED NEW FILE $file" >&2
      fi
    done

    while IFS= read -r marker; do
      parent_marker="$(basename "$marker")"
      parent="${parent_marker%.dir-new}"
      parent="${parent//__/\/}"

      if [ -d "$ROOT/$parent" ]; then
        sudo rmdir "$ROOT/$parent" >/dev/null 2>&1 || true
      fi
    done < <(find "$STATE" -maxdepth 1 -type f -name '*.dir-new' -print 2>/dev/null)

    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    echo "Rollback completed from: $BACKUP" >&2
  fi

  cleanup_stage
  exit "$status"
}

trap rollback_if_needed EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine COMPLETE PERFORMANCE R6.1 DEPLOY"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r6

echo
echo "===== STAGE + VALIDATE ALL R6 FILES ====="

for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  mkdir -p "$(dirname "$staged")"
  git show "$BRANCH:$file" > "$staged"

  case "$file" in
    *.php)
      php -l "$staged"
      ;;
    *.js)
      if command -v node >/dev/null 2>&1; then
        node --check "$staged"
      fi
      ;;
  esac

  echo "VALIDATED $file"
done

echo
echo "===== BACKUP CURRENT LIVE FILES ====="

mkdir -p "$BACKUP" "$STATE"

for file in "${FILES[@]}"; do
  marker="$STATE/${file//\//__}"

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
  live_tmp="$ROOT/$file.pmd-r6-$STAMP.tmp"
  parent="$(dirname "$file")"

  if [ ! -d "$parent" ]; then
    parent_marker="$STATE/${parent//\//__}.dir-new"
    ancestor="$(dirname "$parent")"

    if [ ! -d "$ancestor" ]; then
      echo "ERROR: expected ancestor directory missing: $ancestor" >&2
      exit 1
    fi

    dir_uid="$(stat -c '%u' "$ancestor")"
    dir_gid="$(stat -c '%g' "$ancestor")"

    sudo install -d -o "$dir_uid" -g "$dir_gid" -m 755 "$parent"
    touch "$parent_marker"
    echo "CREATED DIRECTORY $parent"
  fi

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
echo "===== R6 CONTENT VERIFICATION ====="
for file in "${FILES[@]}"; do
  if cmp -s "$STAGE/$file" "$file"; then
    echo "MATCH $file"
  else
    echo "MISMATCH $file" >&2
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
echo " R6.1 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
