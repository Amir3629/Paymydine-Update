#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-$(pwd)}"
ENV_FILE="$ROOT/.env"

if [ ! -f "$ROOT/artisan" ] || [ ! -f "$ROOT/scripts/pmd-ai-provider-smoke.php" ]; then
  echo "ERROR: PayMyDine repository not found at: $ROOT"
  echo "Set PMD_ROOT=/var/www/paymydine and run again."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing production .env at: $ENV_FILE"
  exit 1
fi

# Production files on the VPS are commonly root-owned. Re-exec once with sudo
# instead of partially applying a recovery as the ubuntu deploy user.
if [ ! -w "$ENV_FILE" ] && [ "$(id -u)" -ne 0 ]; then
  echo "Production .env is not writable by $(id -un). Re-running recovery with sudo..."
  exec sudo env PMD_ROOT="$ROOT" bash "$0"
fi

cd "$ROOT"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/pmd-patch-backups/ai-runtime-recovery-r1-$TS"
mkdir -p "$BACKUP"
cp -a "$ENV_FILE" "$BACKUP/.env"
chmod 600 "$BACKUP/.env" 2>/dev/null || true

echo "Backup created: $BACKUP/.env"
echo

safe_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^[[:space:]]*${key}=" "$ENV_FILE" | tail -n 1 || true)"
  if [ -z "$line" ]; then
    printf '%s' '<unset>'
  else
    printf '%s' "${line#*=}" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
  fi
}

has_nonempty_env_key() {
  local key="$1"
  python3 - "$ENV_FILE" "$key" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
value = None
for raw in path.read_text(encoding='utf-8', errors='replace').splitlines():
    stripped = raw.strip()
    if not stripped or stripped.startswith('#') or '=' not in stripped:
        continue
    k, v = stripped.split('=', 1)
    if k.strip() == key:
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in {'"', "'"}:
            v = v[1:-1]
        value = v.strip()
print('yes' if value else 'no')
PY
}

set_env_values() {
  python3 - "$ENV_FILE" "$@" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
pairs = sys.argv[2:]
updates = {}
for pair in pairs:
    if '=' not in pair:
        raise SystemExit('Invalid env update: ' + pair)
    key, value = pair.split('=', 1)
    updates[key] = value

text = path.read_text(encoding='utf-8')
lines = text.splitlines()
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
            # Remove duplicate active definitions so runtime authority is unique.
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
}

clear_config() {
  php artisan config:clear >/dev/null
}

reload_fpm() {
  local service=""
  for candidate in php8.4-fpm php8.3-fpm php8.2-fpm php8.1-fpm; do
    if systemctl is-active --quiet "$candidate" 2>/dev/null; then
      service="$candidate"
      break
    fi
  done

  if [ -n "$service" ]; then
    systemctl reload "$service"
    echo "Reloaded $service"
  else
    echo "NOTE: No active php-fpm service was detected; no service reload was performed."
  fi
}

show_recent_ai_log() {
  local log=""
  if [ -d "$ROOT/storage/logs" ]; then
    log="$(find "$ROOT/storage/logs" -maxdepth 1 -type f -name '*.log' -printf '%T@ %p\n' 2>/dev/null | sort -nr | awk 'NR==1 {$1=""; sub(/^ /,""); print; exit}')"
  fi

  if [ -n "$log" ] && [ -r "$log" ]; then
    echo
    echo "Recent PMD AI server log lines (API keys redacted):"
    tail -n 500 "$log" \
      | grep -Ei 'PMD Intelligence request failed|PMD AI|Gemini|OpenAI|circuit|provider' \
      | tail -n 35 \
      | sed -E 's/AIza[0-9A-Za-z_-]{20,}/[REDACTED_API_KEY]/g' \
      || true
  fi
}

run_provider_smoke() {
  echo "Running provider-neutral PMD smoke as www-data..."
  if id www-data >/dev/null 2>&1; then
    sudo -u www-data php scripts/pmd-ai-provider-smoke.php
  else
    php scripts/pmd-ai-provider-smoke.php
  fi
}

run_gemini_smoke() {
  echo "Running direct Gemini transport smoke as www-data..."
  if id www-data >/dev/null 2>&1; then
    sudo -u www-data php scripts/pmd-ai-gemini-smoke.php
  else
    php scripts/pmd-ai-gemini-smoke.php
  fi
}

echo "=== PMD AI runtime recovery R1 ==="
echo "Repository: $ROOT"
echo "Global AI enabled: $(safe_env_value PMD_AI_ENABLED)"
echo "Provider: $(safe_env_value PMD_AI_PROVIDER)"
echo "Model: $(safe_env_value PMD_AI_MODEL)"
echo "Gemini force IPv4: $(safe_env_value PMD_AI_GEMINI_FORCE_IPV4)"
echo "Gemini API key present: $(has_nonempty_env_key GEMINI_API_KEY)"
echo "OpenAI API key present: $(has_nonempty_env_key OPENAI_API_KEY)"
echo

# First validate the code contract. This makes no paid provider call.
echo "Checking PHP syntax and PMD AI production contract..."
php -l config/pmd_ai.php >/dev/null
php -l app/Services/AI/AiOrchestrator.php >/dev/null
php -l app/Services/AI/AiHealthService.php >/dev/null
php -l app/Services/AI/GeminiGenerateContentProvider.php >/dev/null
php -l app/admin/controllers/Pmdintelligence.php >/dev/null
php scripts/pmd-ai-production-contract-audit.php

echo
clear_config

# Try the production configuration exactly as it stands. The provider smoke
# bypasses the cached health circuit and markSuccess() closes a stale circuit
# when the provider is actually healthy.
echo "Step 1: testing current production provider configuration..."
set +e
CURRENT_SMOKE_OUTPUT="$(run_provider_smoke 2>&1)"
CURRENT_SMOKE_STATUS=$?
set -e
printf '%s\n' "$CURRENT_SMOKE_OUTPUT"

if [ "$CURRENT_SMOKE_STATUS" -eq 0 ] && printf '%s\n' "$CURRENT_SMOKE_OUTPUT" | grep -q 'RESULT: PASS'; then
  echo
  echo "Current provider is healthy. A stale provider-health circuit was the likely 503 cause."
  clear_config
  reload_fpm
  echo
  echo "AI_RECOVERY_RESULT=PASS"
  echo "No .env values were changed. Provider smoke marked the runtime healthy and reset its circuit."
  echo "Backup (unused but retained): $BACKUP/.env"
  exit 0
fi

# Historical PMD production evidence shows Gemini 3.7 Flash with low thinking
# and forced IPv4 was the last transport configuration that passed the live VPS
# smoke after the host's unsupported-location IPv6 path was discovered.
if [ "$(has_nonempty_env_key GEMINI_API_KEY)" != "yes" ]; then
  echo
  echo "ERROR: Current provider smoke failed and no GEMINI_API_KEY is available server-side."
  echo "No AI provider can be safely reconstructed without a server-side credential."
  show_recent_ai_log
  echo
  echo "AI_RECOVERY_RESULT=FAIL"
  echo "No .env changes were retained."
  exit 20
fi

echo
echo "Step 2: current provider failed; testing PayMyDine's last known-good Gemini transport contract..."

# Fail closed while the fallback transport is validated.
set_env_values \
  'PMD_AI_ENABLED=false' \
  'PMD_AI_PROVIDER=gemini' \
  'PMD_AI_MODEL=gemini-3.7-flash' \
  'PMD_AI_GEMINI_THINKING_LEVEL=low' \
  'PMD_AI_GEMINI_FORCE_IPV4=true' \
  'PMD_AI_GEMINI_TRANSIENT_RETRIES=1' \
  'PMD_AI_GEMINI_RETRY_DELAY_MS=350' \
  'PMD_AI_REQUIRE_EXPLICIT_PROVIDER=true'

clear_config

set +e
GEMINI_SMOKE_OUTPUT="$(run_gemini_smoke 2>&1)"
GEMINI_SMOKE_STATUS=$?
set -e
printf '%s\n' "$GEMINI_SMOKE_OUTPUT" \
  | sed -E 's/AIza[0-9A-Za-z_-]{20,}/[REDACTED_API_KEY]/g'

if [ "$GEMINI_SMOKE_STATUS" -ne 0 ] || ! printf '%s\n' "$GEMINI_SMOKE_OUTPUT" | grep -q 'RESULT: PASS'; then
  echo
  echo "The known-good Gemini transport contract also failed. Restoring the original .env."
  cp -a "$BACKUP/.env" "$ENV_FILE"
  clear_config
  reload_fpm
  show_recent_ai_log
  echo
  echo "AI_RECOVERY_RESULT=FAIL"
  echo "Original .env restored from: $BACKUP/.env"
  echo "The remaining failure is provider/account/quota/network/model-side, not the PMD Intelligence browser UI."
  exit 21
fi

# Transport is healthy. Re-enable the global switch and run the provider-neutral
# smoke so AiHealthService::markSuccess() clears any stale circuit for this model.
set_env_values 'PMD_AI_ENABLED=true'
clear_config

echo
echo "Step 3: validating the restored production runtime and resetting provider health..."
set +e
FINAL_SMOKE_OUTPUT="$(run_provider_smoke 2>&1)"
FINAL_SMOKE_STATUS=$?
set -e
printf '%s\n' "$FINAL_SMOKE_OUTPUT" \
  | sed -E 's/AIza[0-9A-Za-z_-]{20,}/[REDACTED_API_KEY]/g'

if [ "$FINAL_SMOKE_STATUS" -ne 0 ] || ! printf '%s\n' "$FINAL_SMOKE_OUTPUT" | grep -q 'RESULT: PASS'; then
  echo
  echo "Final PMD provider smoke failed after Gemini transport passed. Restoring original .env."
  cp -a "$BACKUP/.env" "$ENV_FILE"
  clear_config
  reload_fpm
  show_recent_ai_log
  echo
  echo "AI_RECOVERY_RESULT=FAIL"
  echo "Original .env restored from: $BACKUP/.env"
  exit 22
fi

reload_fpm

echo
echo "Final safe runtime configuration:"
echo "PMD_AI_ENABLED=$(safe_env_value PMD_AI_ENABLED)"
echo "PMD_AI_PROVIDER=$(safe_env_value PMD_AI_PROVIDER)"
echo "PMD_AI_MODEL=$(safe_env_value PMD_AI_MODEL)"
echo "PMD_AI_GEMINI_THINKING_LEVEL=$(safe_env_value PMD_AI_GEMINI_THINKING_LEVEL)"
echo "PMD_AI_GEMINI_FORCE_IPV4=$(safe_env_value PMD_AI_GEMINI_FORCE_IPV4)"
echo "GEMINI_API_KEY=PRESENT (value intentionally not printed)"
echo
echo "AI_RECOVERY_RESULT=PASS"
echo "Backup: $BACKUP/.env"
echo "Rollback:"
echo "  sudo cp -a '$BACKUP/.env' '$ENV_FILE'"
echo "  cd '$ROOT' && sudo php artisan config:clear"
