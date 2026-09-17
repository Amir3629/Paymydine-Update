#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-$(pwd)}"
ENV_FILE="$ROOT/.env"

if [ ! -f "$ROOT/artisan" ] || [ ! -f "$ROOT/scripts/pmd-ai-provider-smoke.php" ]; then
  echo "ERROR: PayMyDine repository not found at: $ROOT"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing production .env at: $ENV_FILE"
  exit 1
fi

# This recovery intentionally NEVER asks for the Linux/VPS password.
if [ ! -w "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE is not writable by $(id -un)."
  echo "This script will not request a VPS password or modify permissions automatically."
  exit 2
fi

cd "$ROOT"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/pmd-patch-backups/ai-rekey-r2-$TS"
mkdir -p "$BACKUP"
cp -a "$ENV_FILE" "$BACKUP/.env"
chmod 600 "$BACKUP/.env" 2>/dev/null || true

echo "=== PMD AI Gemini re-key recovery R2 ==="
echo "Backup created: $BACKUP/.env"
echo "No Linux/VPS password will be requested."
echo

read -r -s -p "Paste the NEW Gemini API key here (input hidden): " NEW_GEMINI_API_KEY
echo

NEW_GEMINI_API_KEY="$(printf '%s' "$NEW_GEMINI_API_KEY" | tr -d '\r\n')"
if [ ${#NEW_GEMINI_API_KEY} -lt 20 ]; then
  echo "ERROR: The supplied key looks empty or too short. Nothing changed."
  exit 3
fi

python3 - "$ENV_FILE" "$NEW_GEMINI_API_KEY" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
new_key = sys.argv[2]

updates = {
    'GEMINI_API_KEY': new_key,
    'PMD_AI_ENABLED': 'true',
    'PMD_AI_PROVIDER': 'gemini',
    'PMD_AI_MODEL': 'gemini-3.7-flash',
    'PMD_AI_GEMINI_THINKING_LEVEL': 'low',
    'PMD_AI_GEMINI_FORCE_IPV4': 'true',
    'PMD_AI_GEMINI_TRANSIENT_RETRIES': '1',
    'PMD_AI_GEMINI_RETRY_DELAY_MS': '350',
    'PMD_AI_REQUIRE_EXPLICIT_PROVIDER': 'true',
}

lines = path.read_text(encoding='utf-8').splitlines()
seen = set()
out = []
for line in lines:
    stripped = line.lstrip()
    if not stripped or stripped.startswith('#') or '=' not in stripped:
        out.append(line)
        continue
    key = stripped.split('=', 1)[0].strip()
    if key in updates:
        if key in seen:
            continue
        out.append(f'{key}={updates[key]}')
        seen.add(key)
    else:
        out.append(line)

for key, value in updates.items():
    if key not in seen:
        out.append(f'{key}={value}')

path.write_text('\n'.join(out) + '\n', encoding='utf-8')
PY

# Remove the shell copy as soon as the .env update is complete.
unset NEW_GEMINI_API_KEY

php artisan config:clear >/dev/null

echo
echo "Testing the replacement key with the PayMyDine provider smoke..."

set +e
if id www-data >/dev/null 2>&1 && sudo -n -u www-data true >/dev/null 2>&1; then
  SMOKE_OUTPUT="$(sudo -n -u www-data php scripts/pmd-ai-provider-smoke.php 2>&1)"
  SMOKE_STATUS=$?
else
  echo "NOTE: passwordless www-data execution unavailable; testing with current deploy user."
  SMOKE_OUTPUT="$(php scripts/pmd-ai-provider-smoke.php 2>&1)"
  SMOKE_STATUS=$?
fi
set -e

printf '%s\n' "$SMOKE_OUTPUT" | sed -E 's/AIza[0-9A-Za-z_-]{20,}/[REDACTED_API_KEY]/g'

if [ "$SMOKE_STATUS" -ne 0 ] || ! printf '%s\n' "$SMOKE_OUTPUT" | grep -q 'RESULT: PASS'; then
  echo
  echo "Replacement key/provider test FAILED. Restoring the previous .env."
  cp -a "$BACKUP/.env" "$ENV_FILE"
  php artisan config:clear >/dev/null || true
  echo "AI_REKEY_RESULT=FAIL"
  echo "Original .env restored."
  echo "No service reload was attempted and no VPS password is required."
  exit 20
fi

# A successful provider smoke calls AiHealthService::markSuccess(), which closes
# the cached provider circuit for this model. Laravel config:clear is sufficient
# for normal request boot; FPM reload is only a best-effort convenience.
php artisan config:clear >/dev/null
php artisan view:clear >/dev/null 2>&1 || true

SERVICE=""
for candidate in php8.4-fpm php8.3-fpm php8.2-fpm php8.1-fpm; do
  if systemctl is-active --quiet "$candidate" 2>/dev/null; then
    SERVICE="$candidate"
    break
  fi
done

if [ -n "$SERVICE" ]; then
  if sudo -n systemctl reload "$SERVICE" >/dev/null 2>&1; then
    echo "Reloaded $SERVICE non-interactively."
  else
    echo "NOTE: $SERVICE reload skipped because this SSH user has no passwordless service-management permission."
    echo "This is not fatal: Laravel config cache is already cleared and the provider smoke passed."
  fi
fi

echo
echo "AI_REKEY_RESULT=PASS"
echo "Provider: gemini"
echo "Model: gemini-3.7-flash"
echo "Gemini force IPv4: true"
echo "Gemini API key: PRESENT (value intentionally never printed)"
echo "Provider health circuit: reset by successful smoke"
echo "Backup: $BACKUP/.env"
