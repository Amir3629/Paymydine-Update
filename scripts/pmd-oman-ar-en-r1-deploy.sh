#!/usr/bin/env bash
set -euo pipefail

SHA="${1:?Usage: $0 <commit-sha> [root]}"
ROOT="${2:-/var/www/paymydine}"
FRONTEND="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
PMD_SERVICE="${PMD_SERVICE:-paymydine-frontend-v2}"
PMD_PORT="${PMD_PORT:-3002}"
BASE_URL="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SHA}"
STAGE="/tmp/pmd-oman-ar-en-r1-${$}"
BACKUP="/home/ubuntu/pmd-backups/oman-ar-en-r1-$(date +%Y%m%d_%H%M%S)"

cleanup() {
  rm -rf "$STAGE"
}
trap cleanup EXIT

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

cd "$ROOT"
mkdir -p "$STAGE"

paths=(
  'app/Services/Platform/PlatformLanguageRegistry.php'
  'app/Services/Platform/TenantCustomerLanguageService.php'
  'app/Services/Platform/SuperAdminTenantMarketService.php'
  'language/ar/admin/lang.php'
  'language/ar/main/lang.php'
  'language/ar/system/lang.php'
  'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/lib/i18n.ts'
  'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/server/bootstrap.ts'
  'scripts/pmd-audit-platform-i18n.php'
  'scripts/pmd-sync-oman-customer-languages-r1.php'
)

declare -A base_sha final_sha
base_sha['app/Services/Platform/PlatformLanguageRegistry.php']='-'
final_sha['app/Services/Platform/PlatformLanguageRegistry.php']='6b0a08deeadf86bd54fc191104ed49dcc36da352'
base_sha['app/Services/Platform/TenantCustomerLanguageService.php']='-'
final_sha['app/Services/Platform/TenantCustomerLanguageService.php']='025c541701430a9d2b9c42149e28eabfbca2b8bf'
base_sha['app/Services/Platform/SuperAdminTenantMarketService.php']='b5044253f064bb464b17c7d9ac2ff1a17c3cedd8'
final_sha['app/Services/Platform/SuperAdminTenantMarketService.php']='c81c8e0f45ac00a12de184e9b7cb5ad2826bcae9'
base_sha['language/ar/admin/lang.php']='-'
final_sha['language/ar/admin/lang.php']='340d738b9c72afc77ead6710bf8315e8b3447a65'
base_sha['language/ar/main/lang.php']='-'
final_sha['language/ar/main/lang.php']='56a35203a4bfe58a6053f6fbb9016fc4def04af1'
base_sha['language/ar/system/lang.php']='-'
final_sha['language/ar/system/lang.php']='073b4d7b94beb3af0318e3bfb0e23d9b14622355'
base_sha['frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/lib/i18n.ts']='f591c081f4005e3a0c366587cb65fa75a6623828'
final_sha['frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/lib/i18n.ts']='a1963b2c232e3aae63ab7c6abc146b7293010350'
base_sha['frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/server/bootstrap.ts']='3ddc0dda2f028a36dbd158c475a1a9c88cb38f53'
final_sha['frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/server/bootstrap.ts']='d8f7b740da21e83e7ee3e6bdcb8bea562c528cbe'
base_sha['scripts/pmd-audit-platform-i18n.php']='ad6ba2b06fdcf3f9dcadfebba9412e483b310488'
final_sha['scripts/pmd-audit-platform-i18n.php']='65fb0e517ed5286cfef16287ec81831e488de2e4'
base_sha['scripts/pmd-sync-oman-customer-languages-r1.php']='-'
final_sha['scripts/pmd-sync-oman-customer-languages-r1.php']='a6e3ba7f7f6d811ba6331280310af486d79ce55f'

printf '\n======================================================\n'
printf '1/8 DOWNLOAD + VERIFY IMMUTABLE OMAN LANGUAGE FILES\n'
printf '======================================================\n'

for path in "${paths[@]}"; do
  staged="$STAGE/$path"
  mkdir -p "$(dirname "$staged")"
  curl -fL --retry 3 --connect-timeout 20 "$BASE_URL/$path" -o "$staged"
  actual="$(git hash-object "$staged")"
  expected="${final_sha[$path]}"
  echo "$path"
  echo "  expected final: $expected"
  echo "  actual final:   $actual"
  [[ "$actual" == "$expected" ]] || fail "downloaded blob mismatch for $path"
done

printf '\n======================================================\n'
printf '2/8 PREFLIGHT CURRENT VPS SOURCE - NO WRITES YET\n'
printf '======================================================\n'

for path in "${paths[@]}"; do
  target="$ROOT/$path"
  base="${base_sha[$path]}"
  final="${final_sha[$path]}"

  if [[ -f "$target" ]]; then
    current="$(git hash-object "$target")"
    echo "$path => $current"

    if [[ "$current" == "$final" ]]; then
      continue
    fi

    if [[ "$base" == '-' ]]; then
      fail "new-file path already exists with unknown content: $path"
    fi

    [[ "$current" == "$base" ]] || fail "current VPS source changed since audited main: $path"
  else
    [[ "$base" == '-' ]] || fail "expected existing VPS source is missing: $path"
  fi
done

echo 'VPS source preflight: OK'

printf '\n======================================================\n'
printf '3/8 BACKUP + INSTALL ONLY THE AUDITED FILES\n'
printf '======================================================\n'

mkdir -p "$BACKUP"
for path in "${paths[@]}"; do
  target="$ROOT/$path"
  staged="$STAGE/$path"
  final="${final_sha[$path]}"

  if [[ -f "$target" ]] && [[ "$(git hash-object "$target")" == "$final" ]]; then
    echo "Already current: $path"
    continue
  fi

  if [[ -f "$target" ]]; then
    mkdir -p "$BACKUP/$(dirname "$path")"
    cp -a "$target" "$BACKUP/$path"
  fi

  sudo mkdir -p "$(dirname "$target")"
  sudo install -m 0644 "$staged" "$target"
  [[ "$(git hash-object "$target")" == "$final" ]] || fail "installed blob mismatch for $path"
done

echo "Backup: $BACKUP"

printf '\n======================================================\n'
printf '4/8 PHP + LANGUAGE ARCHITECTURE CHECKS\n'
printf '======================================================\n'

php -l app/Services/Platform/PlatformLanguageRegistry.php
php -l app/Services/Platform/TenantCustomerLanguageService.php
php -l app/Services/Platform/SuperAdminTenantMarketService.php
php -l language/ar/admin/lang.php
php -l language/ar/main/lang.php
php -l language/ar/system/lang.php
php -l scripts/pmd-audit-platform-i18n.php
php -l scripts/pmd-sync-oman-customer-languages-r1.php
php scripts/pmd-audit-platform-i18n.php

php -r '
require "bootstrap/autoload.php";
$app=require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$r=new App\Services\Platform\PlatformLanguageRegistry();
$p=(new App\Services\Platform\CountryPlatformProfileRegistry())->requireProfile("OM");
if (!$r->marketPackReady("ar")) { fwrite(STDERR,"Arabic market pack not ready\n"); exit(31); }
if ($r->direction("ar") !== "rtl") { fwrite(STDERR,"Arabic direction is not RTL\n"); exit(32); }
if (($p["languages"]["eligible"] ?? []) !== ["en","ar"]) { fwrite(STDERR,"Oman eligible languages are not en,ar\n"); exit(33); }
echo "Oman language architecture: EN + AR / RTL OK\n";
'

grep -q "const ar: UiLabels" "$FRONTEND/src/lib/i18n.ts"
grep -q "supportedUiLocales" "$FRONTEND/src/lib/i18n.ts"
grep -q "supportedUiLocales" "$FRONTEND/src/server/bootstrap.ts"

printf '\n======================================================\n'
printf '5/8 BUILD FRONTEND V2 BEFORE ENABLING ARABIC TENANTS\n'
printf '======================================================\n'

[[ -d "$FRONTEND" ]] || fail "Frontend V2 directory missing: $FRONTEND"
[[ -f "$FRONTEND/package.json" ]] || fail 'Frontend V2 package.json missing.'
command -v npm >/dev/null 2>&1 || fail 'npm is unavailable.'

sudo -u ubuntu -H bash -lc "cd '$FRONTEND' && npm run build"

printf '\n======================================================\n'
printf '6/8 RESTART + VERIFY LIVE FRONTEND V2\n'
printf '======================================================\n'

command -v pm2 >/dev/null 2>&1 || fail 'pm2 is unavailable.'
pm2_json="$(sudo -u ubuntu -H pm2 jlist)"
pm2_cwd="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["pm_cwd"]??""; exit;}}')"
pm2_status="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["status"]??""; exit;}}')"

[[ "$pm2_cwd" == "$FRONTEND" ]] || fail "PM2 cwd mismatch for $PMD_SERVICE: $pm2_cwd"
[[ "$pm2_status" == 'online' ]] || fail "PM2 service is not online before restart: $pm2_status"

sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null
sleep 3

pm2_json="$(sudo -u ubuntu -H pm2 jlist)"
pm2_status="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["status"]??""; exit;}}')"
[[ "$pm2_status" == 'online' ]] || fail "PM2 service failed to return online: $pm2_status"

curl -fsS --connect-timeout 5 --max-time 15 "http://127.0.0.1:${PMD_PORT}/api/health" >/dev/null

echo "Frontend V2 live on port $PMD_PORT: OK"

printf '\n======================================================\n'
printf '7/8 OMAN TENANT DRY-RUN\n'
printf '======================================================\n'

php scripts/pmd-sync-oman-customer-languages-r1.php

printf '\n======================================================\n'
printf '8/8 APPLY + VERIFY OMAN ENGLISH / ARABIC\n'
printf '======================================================\n'

php scripts/pmd-sync-oman-customer-languages-r1.php --apply

printf '\n======================================================\n'
printf 'OMAN EN + AR CUSTOMER LANGUAGE R1 COMPLETE\n'
printf '======================================================\n'
echo 'Oman customer menus are configured for English + Arabic; English remains default.'
echo 'Arabic customer UI is RTL.'
echo 'Admin Arabic is intentionally not exposed until a complete canonical Admin Arabic catalogue exists.'
echo 'Restaurant-created menu/category names were not auto-translated or modified.'
echo 'No payment/currency/order/reservation/business data was changed.'
