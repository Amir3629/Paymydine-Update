#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

SHA="${1:?Usage: $0 <commit-sha> [root]}"
ROOT="${2:-/var/www/paymydine}"
FRONTEND="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
PMD_SERVICE="${PMD_SERVICE:-paymydine-frontend-v2}"
PMD_PORT="${PMD_PORT:-3002}"
BASE_URL="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SHA}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
DOWNLOAD_STAGE="/tmp/pmd-oman-ar-en-r1-download-$$"
BUILD_STAGE="$ROOT/storage/pmd-oman-ar-en-r1-stage-${STAMP}-$$"
V2_STAGE="$BUILD_STAGE/v2"
BACKUP="/home/ubuntu/pmd-backups/oman-ar-en-r1-${STAMP}"
activation_started=0
db_sync_started=0
rollback_running=0

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

rollback() {
  [[ "$rollback_running" == '0' ]] || return 0
  rollback_running=1
  set +e
  echo "Activation failed before tenant language writes; restoring source/build from $BACKUP" >&2

  if [[ -f "$BACKUP/new-files.txt" ]]; then
    while IFS= read -r rel; do
      [[ -n "$rel" ]] && sudo rm -f "$ROOT/$rel"
    done < "$BACKUP/new-files.txt"
  fi

  if [[ -d "$BACKUP/files" ]]; then
    sudo cp -a "$BACKUP/files/." "$ROOT/"
  fi

  if [[ -d "$BACKUP/next.previous" ]]; then
    sudo rm -rf "$FRONTEND/.next"
    sudo mv "$BACKUP/next.previous" "$FRONTEND/.next"
  fi

  sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null 2>&1 || true
  echo "Rollback attempted. Backup: $BACKUP" >&2
  set -e
}

on_exit() {
  rc=$?
  if [[ "$rc" != '0' && "$activation_started" == '1' && "$db_sync_started" == '0' ]]; then
    rollback
  fi
  rm -rf "$DOWNLOAD_STAGE"
  if [[ "$rc" == '0' ]]; then
    sudo rm -rf "$BUILD_STAGE" >/dev/null 2>&1 || true
  fi
  exit "$rc"
}
trap on_exit EXIT

cd "$ROOT"
mkdir -p "$DOWNLOAD_STAGE"

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
printf '1/9 DOWNLOAD + VERIFY IMMUTABLE OMAN LANGUAGE FILES\n'
printf '======================================================\n'

for path in "${paths[@]}"; do
  staged="$DOWNLOAD_STAGE/$path"
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
printf '2/9 PREFLIGHT CURRENT VPS SOURCE - NO WRITES YET\n'
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
printf '3/9 PHP SYNTAX + BASELINE FRONTEND HEALTH\n'
printf '======================================================\n'

for file in \
  app/Services/Platform/PlatformLanguageRegistry.php \
  app/Services/Platform/TenantCustomerLanguageService.php \
  app/Services/Platform/SuperAdminTenantMarketService.php \
  language/ar/admin/lang.php \
  language/ar/main/lang.php \
  language/ar/system/lang.php \
  scripts/pmd-audit-platform-i18n.php \
  scripts/pmd-sync-oman-customer-languages-r1.php; do
  php -l "$DOWNLOAD_STAGE/$file"
done

[[ -d "$FRONTEND" ]] || fail "Frontend V2 directory missing: $FRONTEND"
[[ -f "$FRONTEND/package.json" ]] || fail 'Frontend V2 package.json missing.'
[[ -d "$FRONTEND/node_modules" ]] || fail 'Frontend V2 node_modules is missing.'

pm2_json="$(sudo -u ubuntu -H pm2 jlist)"
pm2_cwd="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["pm_cwd"]??""; exit;}}')"
pm2_status="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["status"]??""; exit;}}')"
[[ "$pm2_cwd" == "$FRONTEND" ]] || fail "PM2 cwd mismatch for $PMD_SERVICE: $pm2_cwd"
[[ "$pm2_status" == 'online' ]] || fail "PM2 service is not online before deployment: $pm2_status"
curl -fsS --connect-timeout 5 --max-time 15 "http://127.0.0.1:${PMD_PORT}/api/health" >/dev/null

echo 'Baseline Frontend V2 health: OK'

printf '\n======================================================\n'
printf '4/9 STAGE + BUILD FRONTEND V2 OFFLINE FROM LIVE .next\n'
printf '======================================================\n'

sudo mkdir -p "$V2_STAGE"
sudo chown -R ubuntu:ubuntu "$BUILD_STAGE"

tar -C "$FRONTEND" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$V2_STAGE" -xf -
cp -al "$FRONTEND/node_modules" "$V2_STAGE/node_modules"
cp "$DOWNLOAD_STAGE/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/lib/i18n.ts" "$V2_STAGE/src/lib/i18n.ts"
cp "$DOWNLOAD_STAGE/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/server/bootstrap.ts" "$V2_STAGE/src/server/bootstrap.ts"

(
  cd "$V2_STAGE"
  npm run build
)

[[ -d "$V2_STAGE/.next" ]] || fail 'Staged Frontend V2 build did not produce .next.'
echo "Staged Frontend V2 build: OK ($V2_STAGE)"

printf '\n======================================================\n'
printf '5/9 BACKUP + ACTIVATE AUDITED SOURCE AND STAGED BUILD\n'
printf '======================================================\n'

mkdir -p "$BACKUP/files"
: > "$BACKUP/new-files.txt"

for path in "${paths[@]}"; do
  target="$ROOT/$path"
  if [[ -f "$target" ]]; then
    current="$(git hash-object "$target")"
    if [[ "$current" != "${final_sha[$path]}" ]]; then
      mkdir -p "$BACKUP/files/$(dirname "$path")"
      cp -a "$target" "$BACKUP/files/$path"
    fi
  else
    printf '%s\n' "$path" >> "$BACKUP/new-files.txt"
  fi
done

if [[ -d "$FRONTEND/.next" ]]; then
  sudo mv "$FRONTEND/.next" "$BACKUP/next.previous"
fi

activation_started=1

for path in "${paths[@]}"; do
  target="$ROOT/$path"
  staged="$DOWNLOAD_STAGE/$path"
  final="${final_sha[$path]}"

  if [[ -f "$target" ]] && [[ "$(git hash-object "$target")" == "$final" ]]; then
    continue
  fi

  sudo mkdir -p "$(dirname "$target")"
  sudo install -m 0644 "$staged" "$target"
  [[ "$(git hash-object "$target")" == "$final" ]] || fail "installed blob mismatch for $path"
done

sudo mv "$V2_STAGE/.next" "$FRONTEND/.next"

php scripts/pmd-audit-platform-i18n.php
php artisan optimize:clear >/dev/null 2>&1 || true

echo "Backup: $BACKUP"

printf '\n======================================================\n'
printf '6/9 VERIFY LANGUAGE ARCHITECTURE AFTER ACTIVATION\n'
printf '======================================================\n'

php -r '
require "bootstrap/autoload.php";
$app=require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$r=new App\Services\Platform\PlatformLanguageRegistry();
$p=(new App\Services\Platform\CountryPlatformProfileRegistry())->requireProfile("OM");
if (!$r->marketPackReady("ar")) { fwrite(STDERR,"Arabic customer pack not ready\n"); exit(31); }
if ($r->direction("ar") !== "rtl") { fwrite(STDERR,"Arabic direction is not RTL\n"); exit(32); }
if (($p["languages"]["eligible"] ?? []) !== ["en","ar"]) { fwrite(STDERR,"Oman eligible languages are not en,ar\n"); exit(33); }
echo "Oman language architecture: EN + AR / RTL OK\n";
'

grep -q "const ar: UiLabels" "$FRONTEND/src/lib/i18n.ts"
grep -q "supportedUiLocales" "$FRONTEND/src/lib/i18n.ts"
grep -q "supportedUiLocales" "$FRONTEND/src/server/bootstrap.ts"

printf '\n======================================================\n'
printf '7/9 RESTART + VERIFY LIVE FRONTEND V2\n'
printf '======================================================\n'

sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null

for attempt in 1 2 3 4 5 6; do
  if curl -fsS --connect-timeout 5 --max-time 15 "http://127.0.0.1:${PMD_PORT}/api/health" >/dev/null; then
    break
  fi
  sleep 2
  [[ "$attempt" != '6' ]] || fail 'Frontend V2 health failed after restart.'
done

echo "Frontend V2 live on port $PMD_PORT: OK"

printf '\n======================================================\n'
printf '8/9 OMAN TENANT LANGUAGE DRY-RUN\n'
printf '======================================================\n'

php scripts/pmd-sync-oman-customer-languages-r1.php

printf '\n======================================================\n'
printf '9/9 APPLY + VERIFY ALL OMAN ENGLISH / ARABIC SETTINGS\n'
printf '======================================================\n'

# From this point a failure may mean some tenant settings were already written.
# Keep the Arabic-capable source/build active; the sync is idempotent and can be rerun.
db_sync_started=1
php scripts/pmd-sync-oman-customer-languages-r1.php --apply

db_sync_started=0
activation_started=0

printf '\n======================================================\n'
printf 'OMAN EN + AR CUSTOMER LANGUAGE R1 COMPLETE\n'
printf '======================================================\n'
echo 'Oman customer menus are configured for English + Arabic; English remains default.'
echo 'Arabic customer UI is RTL.'
echo 'Admin Arabic is intentionally not exposed until a complete canonical Admin Arabic catalogue exists.'
echo 'Restaurant-created menu/category names were not auto-translated or modified.'
echo 'No payment/currency/order/reservation/business data was changed.'
echo "Backup: $BACKUP"
