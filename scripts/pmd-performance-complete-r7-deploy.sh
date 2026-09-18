#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R7_BRANCH:-origin/fix/platform-performance-complete-r7}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r7-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r7-stage.XXXXXX)"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/assets/js/pmd-site-access-hub-v13.js"
  "app/admin/assets/js/notifications.js"
  "app/admin/controllers/Cashierlab.php"
  "app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php"
  "app/admin/views/_meta/assets.json"
)

cleanup_stage() {
  rm -rf "$STAGE"
}

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== R7 DEPLOY FAILED: RESTORING PRE-RUN FILES =====" >&2

    for file in "${FILES[@]}"; do
      marker="$BACKUP/.state/${file//\//__}"

      if [ -f "$marker.existed" ]; then
        uid="$(stat -c '%u' "$BACKUP/$file")"
        gid="$(stat -c '%g' "$BACKUP/$file")"
        mode="$(stat -c '%a' "$BACKUP/$file")"
        restore_tmp="$ROOT/$file.pmd-r7-rollback-$STAMP.tmp"

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
echo " PayMyDine COMPLETE PERFORMANCE R7 DEPLOY"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r7

echo
echo "===== STAGE + VALIDATE ALL R7 FILES ====="

for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  mkdir -p "$(dirname "$staged")"
  git show "$BRANCH:$file" > "$staged"

  if [ ! -s "$staged" ]; then
    echo "ERROR: staged file is empty: $file" >&2
    exit 1
  fi

  case "$file" in
    *.php)
      php -l "$staged"
      ;;
    *.js)
      if command -v node >/dev/null 2>&1; then
        node --check "$staged"
      fi
      ;;
    *.json)
      php -r '
        $path = $argv[1];
        $data = json_decode(file_get_contents($path), true);
        if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
            fwrite(STDERR, "Invalid JSON: ".$path."\n");
            exit(1);
        }
      ' "$staged"
      ;;
  esac

  echo "VALIDATED $file"
done

echo
echo "===== R7 CONTENT PRECHECK ====="
grep -q 'PMD_PERF_R7_SIGNIN_COUNTDOWN_NO_REFRESH_STORM'   "$STAGE/app/admin/assets/js/pmd-site-access-hub-v13.js"
grep -q 'pmd-site-access-hub-v13.js'   "$STAGE/app/admin/views/_meta/assets.json"
grep -q 'PMD_PERF_R7_CASHIER_NO_HIDDEN_CALENDAR'   "$STAGE/app/admin/controllers/Cashierlab.php"
grep -q 'PMD_PERF_R7_SLIM_CASHIER_ORDER_ROWS'   "$STAGE/app/admin/controllers/Cashierlab.php"
grep -q 'PMD_PERF_R7_NOTIFICATION_FIRST_POLL_DEDUP'   "$STAGE/app/admin/assets/js/notifications.js"
echo "OK R7 markers present"

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
  live_tmp="$ROOT/$file.pmd-r7-$STAMP.tmp"

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
echo "===== POST-DEPLOY CHECKS ====="
php -l app/admin/controllers/Cashierlab.php
node --check app/admin/assets/js/pmd-site-access-hub-v13.js
node --check app/admin/assets/js/notifications.js

php -r '
  $data = json_decode(file_get_contents("app/admin/views/_meta/assets.json"), true);
  if (!is_array($data)) exit(1);
  $paths = array_map(static fn($row) => $row["path"] ?? "", $data["script"] ?? []);
  if (!in_array("js/pmd-site-access-hub-v13.js", $paths, true)) {
      fwrite(STDERR, "R7 v13 asset manifest entry missing\n");
      exit(1);
  }
  echo "OK asset manifest loads sign-in hub v13\n";
'

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
echo " R7 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
