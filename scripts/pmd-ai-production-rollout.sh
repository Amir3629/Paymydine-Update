#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
REPO="Amir3629/Paymydine-Update"
REF=""
TENANT_HOST=""

usage() {
  cat <<'EOF'
Usage:
  bash scripts/pmd-ai-production-rollout.sh --ref=<40-char-commit> --tenant-host=<tenant>.paymydine.com

Example:
  bash scripts/pmd-ai-production-rollout.sh --ref=0123456789abcdef0123456789abcdef01234567 --tenant-host=tomo.paymydine.com
EOF
}

for arg in "$@"; do
  case "$arg" in
    --ref=*) REF="${arg#--ref=}" ;;
    --tenant-host=*) TENANT_HOST="${arg#--tenant-host=}" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown argument: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ ! "$REF" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "ERROR: --ref must be an exact 40-character commit SHA." >&2
  exit 2
fi
if [[ ! "$TENANT_HOST" =~ ^[a-z0-9][a-z0-9-]*\.paymydine\.com$ ]]; then
  echo "ERROR: --tenant-host must be an explicit *.paymydine.com host." >&2
  exit 2
fi

cd "$ROOT"
[[ -f .env ]] || { echo "ERROR: $ROOT/.env is missing." >&2; exit 3; }
[[ -f artisan ]] || { echo "ERROR: this does not look like the PMD application root." >&2; exit 3; }
command -v curl >/dev/null || { echo "ERROR: curl is required." >&2; exit 3; }
command -v php >/dev/null || { echo "ERROR: php is required." >&2; exit 3; }
sudo -n true >/dev/null || { echo "ERROR: passwordless sudo is required for this production rollout." >&2; exit 3; }

BASE="https://raw.githubusercontent.com/${REPO}/${REF}"
TMP="$(mktemp -d)"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_ROOT="$ROOT/storage/pmd-ai-rollout-backups/$STAMP"
ENV_BACKUP="$BACKUP_ROOT/.env"
INSTALLED=0

FILES=(
  "config/pmd_ai.php"
  "app/Services/AI/AiHealthService.php"
  "app/Services/AI/AiUsageLedger.php"
  "app/Services/AI/PmdAiTenantPolicyService.php"
  "app/Services/AI/AiCapabilityPolicy.php"
  "app/Services/AI/AiRetentionService.php"
  "app/Services/AI/GuestAiContextBuilder.php"
  "app/Services/AI/GuestAiVisitBudgetService.php"
  "app/Services/AI/AiBudgetService.php"
  "app/Services/AI/AiOrchestrator.php"
  "app/Services/AI/GuestMenuAiService.php"
  "app/admin/controllers/Pmdintelligence.php"
  "app/admin/views/pmdintelligence/index.blade.php"
  "scripts/pmd-ai-maintenance.php"
  "scripts/pmd-ai-provider-smoke.php"
  "scripts/pmd-ai-production-contract-audit.php"
  "scripts/pmd-ai-production-rollout.sh"
)

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

rollback() {
  local rc=$?
  if [[ "$INSTALLED" -ne 1 ]]; then
    return "$rc"
  fi

  echo
  echo "================================================"
  echo "ROLLBACK: restoring pre-rollout PMD AI runtime"
  echo "================================================"

  sudo -n cp -a "$ENV_BACKUP" "$ROOT/.env"

  for f in "${FILES[@]}"; do
    if [[ -f "$BACKUP_ROOT/$f" ]]; then
      sudo -n install -D -m "$(stat -c '%a' "$BACKUP_ROOT/$f")" \
        -o "$(stat -c '%u' "$BACKUP_ROOT/$f")" \
        -g "$(stat -c '%g' "$BACKUP_ROOT/$f")" \
        "$BACKUP_ROOT/$f" "$ROOT/$f"
    elif [[ -f "$ROOT/$f" ]]; then
      sudo -n rm -f "$ROOT/$f"
    fi
  done

  sudo -n php artisan optimize:clear >/dev/null || true
  sudo -n systemctl reload php8.3-fpm.service || true
  echo "ROLLBACK COMPLETE: $BACKUP_ROOT"
  return "$rc"
}
trap rollback ERR

echo "================================================"
echo "PMD AI GUARDED PRODUCTION ROLLOUT"
echo "================================================"
echo "TENANT: $TENANT_HOST"
echo "REF: $REF"
echo

# Never print secrets. Prove only the required non-secret runtime contract and
# that a Gemini credential exists.
php <<'PHP'
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$provider = strtolower(trim((string)config('pmd_ai.provider', '')));
$model = trim((string)config('pmd_ai.model', ''));
$key = trim((string)config('pmd_ai.gemini_api_key', ''));
echo 'CURRENT_PROVIDER: '.($provider ?: '(unset)').PHP_EOL;
echo 'CURRENT_MODEL: '.($model ?: '(unset)').PHP_EOL;
echo 'GEMINI_KEY_PRESENT: '.($key !== '' ? 'YES' : 'NO').PHP_EOL;
if ($provider !== 'gemini' || $model === '' || $key === '') exit(12);
PHP

echo
echo "== Download exact reviewed runtime files =="
for f in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$f")"
  curl -fsSL --retry 3 --connect-timeout 10 "$BASE/$f" -o "$TMP/$f"
  echo "DOWNLOADED: $f"
done

echo
echo "== Syntax/contract preflight on downloaded files =="
for f in "${FILES[@]}"; do
  case "$f" in
    *.php) php -l "$TMP/$f" >/dev/null; echo "PHP OK: $f" ;;
    *.sh) bash -n "$TMP/$f"; echo "BASH OK: $f" ;;
  esac
done

grep -Fq 'PMD_AI_ADMIN_TENANT_ALLOWLIST' "$TMP/config/pmd_ai.php"
grep -Fq 'class AiHealthService' "$TMP/app/Services/AI/AiHealthService.php"
grep -Fq 'pmd_ai_usage_daily' "$TMP/app/Services/AI/AiUsageLedger.php"
grep -Fq "getopt('', ['tenant-host:'])" "$TMP/scripts/pmd-ai-maintenance.php"

echo
echo "== Backup current runtime =="
sudo -n mkdir -p "$BACKUP_ROOT"
sudo -n cp -a .env "$ENV_BACKUP"
for f in "${FILES[@]}"; do
  if [[ -f "$ROOT/$f" ]]; then
    sudo -n mkdir -p "$BACKUP_ROOT/$(dirname "$f")"
    sudo -n cp -a "$ROOT/$f" "$BACKUP_ROOT/$f"
  fi
done
echo "BACKUP: $BACKUP_ROOT"

echo
echo "== Install reviewed runtime =="
for f in "${FILES[@]}"; do
  if [[ -f "$ROOT/$f" ]]; then
    uid="$(stat -c '%u' "$ROOT/$f")"
    gid="$(stat -c '%g' "$ROOT/$f")"
    mode="$(stat -c '%a' "$ROOT/$f")"
  else
    parent="$ROOT/$(dirname "$f")"
    sudo -n mkdir -p "$parent"
    uid="$(stat -c '%u' "$parent")"
    gid="$(stat -c '%g' "$parent")"
    mode="644"
    [[ "$f" == *.sh ]] && mode="755"
  fi
  sudo -n install -D -o "$uid" -g "$gid" -m "$mode" "$TMP/$f" "$ROOT/$f"
  echo "UPDATED: $f"
done
INSTALLED=1

echo
echo "== Fail-closed Admin canary: allow only this tenant =="
sudo -n php -r '
$file=$argv[1]; $key=$argv[2]; $value=$argv[3];
$lines=file($file, FILE_IGNORE_NEW_LINES);
if ($lines===false) exit(2);
$out=[];
foreach ($lines as $line) {
  if (str_starts_with($line, $key."=")) continue;
  $out[]=$line;
}
$out[]=$key."=".$value;
if (file_put_contents($file, implode(PHP_EOL,$out).PHP_EOL, LOCK_EX)===false) exit(3);
' .env PMD_AI_ADMIN_TENANT_ALLOWLIST "${TENANT_HOST%%.*},$TENANT_HOST"

echo
echo "== Clear Laravel runtime and reload PHP =="
sudo -n php artisan optimize:clear
sudo -n systemctl reload php8.3-fpm.service

echo
echo "== Production source contract =="
php scripts/pmd-ai-production-contract-audit.php

echo
echo "== Real Gemini provider smoke =="
php scripts/pmd-ai-provider-smoke.php

echo
echo "== Explicit tenant maintenance + policy/usage check =="
php scripts/pmd-ai-maintenance.php --tenant-host="$TENANT_HOST"

echo
echo "== Live Guest AI status through Nginx/PHP-FPM =="
STATUS="$(curl -ksS --max-time 20 --resolve "$TENANT_HOST:443:127.0.0.1" \
  "https://$TENANT_HOST/api/v1/guest-ai/status?location_id=1")"
echo "$STATUS"
[[ "$STATUS" == *'"enabled":true'* ]] || {
  echo "ERROR: live Guest AI is not enabled for location 1." >&2
  false
}

# Final Laravel state, intentionally excluding every credential value.
echo
echo "== Final non-secret PMD AI state =="
php <<'PHP'
<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$state = [
  'enabled' => (bool)config('pmd_ai.enabled', false),
  'provider' => (string)config('pmd_ai.provider', ''),
  'model' => (string)config('pmd_ai.model', ''),
  'guest_enabled' => (bool)config('pmd_ai.guest_enabled', false),
  'guest_model' => (string)config('pmd_ai.guest_model', ''),
  'gemini_key_present' => trim((string)config('pmd_ai.gemini_api_key', '')) !== '',
  'admin_tenant_allowlist' => (array)config('pmd_ai.admin_tenant_allowlist', []),
];
echo json_encode($state, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
PHP

trap - ERR

echo
echo "================================================"
echo "PMD AI PRODUCTION ROLLOUT: PASS"
echo "================================================"
echo "BACKUP: $BACKUP_ROOT"
echo "Next: browser-test Admin Intelligence and Digital Menu AI."
