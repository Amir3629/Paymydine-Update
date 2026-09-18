#!/usr/bin/env bash
set -u

ROOT="${PMD_ROOT:-$(pwd)}"
ENV_FILE="$ROOT/.env"

if [ ! -f "$ROOT/artisan" ] || [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: PayMyDine repository or .env not found at: $ROOT"
  exit 1
fi

cd "$ROOT"

echo "=== PMD Admin 500 rescue R3 ==="
echo "This script never prints .env contents or API keys."
echo "This script never asks for the Linux/VPS password."
echo

echo "Current .env metadata:"
stat -c 'owner=%U group=%G mode=%a file=%n' "$ENV_FILE" 2>/dev/null || ls -l "$ENV_FILE"
echo

CURRENT_USER="$(id -un)"
CURRENT_GROUPS="$(id -nG 2>/dev/null || true)"
ENV_OWNER="$(stat -c '%U' "$ENV_FILE" 2>/dev/null || true)"
ENV_GROUP="$(stat -c '%G' "$ENV_FILE" 2>/dev/null || true)"
ENV_MODE="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || true)"

# AI recovery R1 deliberately chmodded its backup to 600, then restored that
# backup with cp -a. That can make the production .env owner-only while PHP-FPM
# runs as www-data. Fix access without making the secret file world-readable.
ACCESS_FIXED=0

if [ "$ENV_OWNER" = "$CURRENT_USER" ]; then
  if command -v setfacl >/dev/null 2>&1 && getent passwd www-data >/dev/null 2>&1; then
    if setfacl -m u:www-data:r "$ENV_FILE" 2>/dev/null; then
      echo "Granted read-only .env ACL to www-data."
      ACCESS_FIXED=1
    fi
  fi

  if [ "$ACCESS_FIXED" -eq 0 ] && [ "$ENV_GROUP" = "www-data" ]; then
    if chmod 640 "$ENV_FILE" 2>/dev/null; then
      echo "Restored .env mode to 640 for existing www-data group."
      ACCESS_FIXED=1
    fi
  fi

  if [ "$ACCESS_FIXED" -eq 0 ] && printf '%s\n' "$CURRENT_GROUPS" | tr ' ' '\n' | grep -qx 'www-data'; then
    if chgrp www-data "$ENV_FILE" 2>/dev/null && chmod 640 "$ENV_FILE" 2>/dev/null; then
      echo "Restored .env group to www-data with mode 640."
      ACCESS_FIXED=1
    fi
  fi
fi

if [ "$ACCESS_FIXED" -eq 0 ]; then
  echo "NOTE: Could not safely change .env access without elevated privileges."
  echo "That is okay for the immediate recovery because Laravel production config will be cached below."
fi

echo
echo "Rebuilding Laravel production config cache..."
CONFIG_OUTPUT="$(php artisan config:cache 2>&1)"
CONFIG_STATUS=$?
printf '%s\n' "$CONFIG_OUTPUT" | sed -E   -e 's/(GEMINI_API_KEY|OPENAI_API_KEY|DB_PASSWORD|MAIL_PASSWORD)=([^[:space:]]+)/\1=[REDACTED]/g'   -e 's/AIza[0-9A-Za-z_-]{20,}/[REDACTED_API_KEY]/g'   -e 's/sk-[0-9A-Za-z_-]{16,}/[REDACTED_API_KEY]/g'

if [ "$CONFIG_STATUS" -ne 0 ]; then
  echo
  echo "ERROR: Laravel config cache rebuild failed."
  echo "Collecting recent server exception lines..."
else
  echo "Laravel config cache rebuilt."
fi

php artisan view:clear >/dev/null 2>&1 || true

echo
echo "Runtime file metadata:"
stat -c 'owner=%U group=%G mode=%a file=%n' "$ENV_FILE" 2>/dev/null || true
if [ -f "$ROOT/bootstrap/cache/config.php" ]; then
  stat -c 'owner=%U group=%G mode=%a file=%n' "$ROOT/bootstrap/cache/config.php" 2>/dev/null || true
else
  echo "bootstrap/cache/config.php is missing."
fi

echo
echo "Checking important writable paths:"
for p in   "$ROOT/storage"   "$ROOT/storage/logs"   "$ROOT/storage/framework"   "$ROOT/storage/framework/sessions"   "$ROOT/storage/framework/views"   "$ROOT/bootstrap/cache"
do
  if [ ! -e "$p" ]; then
    echo "MISSING: $p"
    continue
  fi
  stat -c 'owner=%U group=%G mode=%a file=%n' "$p" 2>/dev/null || true
done

echo
echo "Checking Laravel boot + admin login route..."
set +e
ROUTE_OUTPUT="$(php artisan route:list --path=admin/login 2>&1)"
ROUTE_STATUS=$?
set -e
printf '%s\n' "$ROUTE_OUTPUT" | head -n 40 | sed -E   -e 's/AIza[0-9A-Za-z_-]{20,}/[REDACTED_API_KEY]/g'   -e 's/sk-[0-9A-Za-z_-]{16,}/[REDACTED_API_KEY]/g'

echo
echo "Recent application errors:"
LATEST_LOG=""
if [ -d "$ROOT/storage/logs" ]; then
  LATEST_LOG="$(find "$ROOT/storage/logs" -maxdepth 1 -type f -name '*.log' -printf '%T@ %p\n' 2>/dev/null | sort -nr | awk 'NR==1 {$1=""; sub(/^ /,""); print; exit}')"
fi

if [ -n "$LATEST_LOG" ] && [ -r "$LATEST_LOG" ]; then
  echo "Log: $LATEST_LOG"
  tail -n 500 "$LATEST_LOG"     | grep -Ei 'production\.ERROR|local\.ERROR|ERROR|CRITICAL|exception|permission denied|failed to open|Dotenv|ParseError|TypeError|SQLSTATE'     | tail -n 100     | sed -E       -e 's/AIza[0-9A-Za-z_-]{20,}/[REDACTED_API_KEY]/g'       -e 's/sk-[0-9A-Za-z_-]{16,}/[REDACTED_API_KEY]/g'       -e 's/(password|secret|token|api[_-]?key)(["'"'"'=: ]+)[^ ,"'"'"']+ /\1\2[REDACTED] /Ig'     || true
else
  echo "No readable Laravel log found."
fi

echo
if [ "$CONFIG_STATUS" -eq 0 ] && [ "$ROUTE_STATUS" -eq 0 ]; then
  echo "ADMIN_RESCUE_RESULT=BOOT_OK"
  echo "Now hard-refresh /admin/login."
  echo "If the browser still returns 500, send the Recent application errors section above."
else
  echo "ADMIN_RESCUE_RESULT=NEEDS_LOG_REVIEW"
fi
