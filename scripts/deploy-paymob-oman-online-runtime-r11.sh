#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-origin/feature/paymob-oman-r1}"
TARGET_DOMAIN="${1:-${AUDIT_TENANT:-}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
STAGE_ROOT="$APP_DIR/storage/pmd-paymob-oman-r11-stage-$STAMP"
WORK="$STAGE_ROOT/work"
BACKUP_DIR="/var/backups/paymydine/paymob-oman-online-r11-$STAMP"
V2_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
V2_LIVE="$APP_DIR/$V2_REL"
V2_STAGE="$WORK/$V2_REL"
PM2_SERVICE="${PMD_V2_SERVICE:-paymydine-frontend-v2}"
PM2_PORT="${PMD_V2_PORT:-3002}"

if [ -z "$TARGET_DOMAIN" ]; then
  echo "Usage: bash scripts/deploy-paymob-oman-online-runtime-r11.sh omantest.paymydine.com" >&2
  exit 2
fi

cd "$APP_DIR"

echo "=== PMD PAYMOB OMAN ONLINE RUNTIME R11 ==="
echo "Branch: $BRANCH"
echo "Tenant: $TARGET_DOMAIN"
echo "Frontend service: $PM2_SERVICE :$PM2_PORT"
echo

git fetch origin feature/paymob-oman-r1

rm -rf "$STAGE_ROOT"
mkdir -p "$WORK"
sudo mkdir -p "$BACKUP_DIR/files"

WHOLESALE=(
  "config/paymob_oman.php"
  "app/Services/Payments/PaymobOmanRuntimeGate.php"
  "app/Services/Payments/PaymobOmanPaymentAttemptService.php"
  "app/Services/Payments/PaymobOmanCheckoutService.php"
  "app/Services/Payments/PaymobOmanCallbackService.php"
  "app/Services/Payments/PaymobOmanGuestCatalogService.php"
  "app/Services/Payments/PaymobOmanFinancialAdjustmentService.php"
  "routes/paymob-oman.php"
  "scripts/patch-canonical-provider-settlement-r11.py"
  "scripts/patch-paymob-oman-frontend-r11.py"
  "scripts/patch-paymob-oman-bootstrap-r11.py"
  "scripts/install-paymob-oman-runtime-r11.php"
  "scripts/enable-paymob-oman-sandbox-qa-r11.php"
  "scripts/disable-paymob-oman-sandbox-qa-r11.php"
  "scripts/reconcile-paymob-oman-pending-r11.php"
  "scripts/selftest-paymob-oman-online-r11.php"
  "$V2_REL/src/lib/paymob-oman-client.ts"
)

for path in "${WHOLESALE[@]}"; do
  mkdir -p "$WORK/$(dirname "$path")"
  git show "$BRANCH:$path" > "$WORK/$path"
done

# Build from the CURRENT live frontend source so concurrent work from another
# chat is preserved. node_modules is hard-linked; .next is built only in stage.
[ -d "$V2_LIVE" ] || { echo "STOP: live V2 frontend directory is missing: $V2_LIVE" >&2; exit 3; }
[ -f "$V2_LIVE/package.json" ] || { echo "STOP: live V2 package.json is missing." >&2; exit 3; }
[ -d "$V2_LIVE/node_modules" ] || { echo "STOP: live V2 node_modules is missing; refusing dependency mutation." >&2; exit 3; }
mkdir -p "$V2_STAGE"
(
  cd "$V2_LIVE"
  tar --exclude='./node_modules' --exclude='./.next' -cf - .
) | (
  cd "$V2_STAGE"
  tar -xf -
)
cp -al "$V2_LIVE/node_modules" "$V2_STAGE/node_modules"

# Re-install the new helper into the staged tree after copying current live source.
mkdir -p "$V2_STAGE/src/lib"
git show "$BRANCH:$V2_REL/src/lib/paymob-oman-client.ts" > "$V2_STAGE/src/lib/paymob-oman-client.ts"

# Preserve current live route/shared settlement authorities and patch them in stage.
mkdir -p "$WORK/routes" "$WORK/app/Services/Payments"
cp routes/terminal-payments.php "$WORK/routes/terminal-payments.php"
if [ -f app/Services/Payments/CanonicalProviderSettlementService.php ]; then
  cp app/Services/Payments/CanonicalProviderSettlementService.php "$WORK/app/Services/Payments/CanonicalProviderSettlementService.php"
else
  git show "$BRANCH:app/Services/Payments/CanonicalProviderSettlementService.php" > "$WORK/app/Services/Payments/CanonicalProviderSettlementService.php"
fi

echo "--- Patch live-derived backend authorities in stage ---"
python3 - "$WORK/routes/terminal-payments.php" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
text = p.read_text()
marker = 'PMD_PAYMOB_OMAN_ROUTE_LOADER_R11'
if marker not in text:
    text = text.rstrip() + "\n\n// PMD_PAYMOB_OMAN_ROUTE_LOADER_R11\nrequire_once __DIR__.'/paymob-oman.php';\n"
if marker not in text or "paymob-oman.php" not in text:
    raise SystemExit('STOP: Paymob route loader patch failed')
p.write_text(text)
print('Paymob route loader patch: OK')
PY

python3 "$WORK/scripts/patch-canonical-provider-settlement-r11.py" "$WORK"

echo "--- Patch current live V2 source in stage ---"
python3 "$WORK/scripts/patch-paymob-oman-bootstrap-r11.py" "$WORK"
python3 "$WORK/scripts/patch-paymob-oman-frontend-r11.py" "$WORK"

# Ensure the staged bootstrap uses the normalizer contract we inspected.
grep -q "provider_code.*providerCode.*provider" "$V2_STAGE/src/server/normalize.ts" || {
  echo "STOP: V2 normalizePayments provider_code contract is missing." >&2
  exit 4
}

echo
echo "--- Python patch-script preflight ---"
python3 -m py_compile \
  "$WORK/scripts/patch-canonical-provider-settlement-r11.py" \
  "$WORK/scripts/patch-paymob-oman-bootstrap-r11.py" \
  "$WORK/scripts/patch-paymob-oman-frontend-r11.py"

echo
echo "--- PHP preflight ---"
PHP_FILES=(
  "$WORK/config/paymob_oman.php"
  "$WORK/app/Services/Payments/CanonicalProviderSettlementService.php"
  "$WORK/app/Services/Payments/PaymobOmanRuntimeGate.php"
  "$WORK/app/Services/Payments/PaymobOmanPaymentAttemptService.php"
  "$WORK/app/Services/Payments/PaymobOmanCheckoutService.php"
  "$WORK/app/Services/Payments/PaymobOmanCallbackService.php"
  "$WORK/app/Services/Payments/PaymobOmanGuestCatalogService.php"
  "$WORK/app/Services/Payments/PaymobOmanFinancialAdjustmentService.php"
  "$WORK/routes/terminal-payments.php"
  "$WORK/routes/paymob-oman.php"
  "$WORK/scripts/install-paymob-oman-runtime-r11.php"
  "$WORK/scripts/enable-paymob-oman-sandbox-qa-r11.php"
  "$WORK/scripts/disable-paymob-oman-sandbox-qa-r11.php"
  "$WORK/scripts/reconcile-paymob-oman-pending-r11.php"
  "$WORK/scripts/selftest-paymob-oman-online-r11.php"
)
for file in "${PHP_FILES[@]}"; do php -l "$file"; done

echo
echo "--- R11 fail-closed invariants ---"
grep -q "PMD_PAYMOB_OMAN_ATTEMPT_STORE_R11" "$WORK/app/Services/Payments/PaymobOmanPaymentAttemptService.php"
grep -q "PMD_PAYMOB_OMAN_CHECKOUT_R11" "$WORK/app/Services/Payments/PaymobOmanCheckoutService.php"
grep -q "PMD_PAYMOB_OMAN_CALLBACK_SETTLEMENT_R11" "$WORK/app/Services/Payments/PaymobOmanCallbackService.php"
grep -q "PMD_PAYMOB_OMAN_GUEST_CATALOG_R11" "$WORK/app/Services/Payments/PaymobOmanGuestCatalogService.php"
grep -q "PMD_PAYMOB_OMAN_FINAL_TOTALS_R11" "$WORK/app/Services/Payments/PaymobOmanFinancialAdjustmentService.php"
grep -q "PMD_CANONICAL_PROVIDER_GROUP_IDEMPOTENCY_R11" "$WORK/app/Services/Payments/CanonicalProviderSettlementService.php"
grep -q "PMD_CANONICAL_PROVIDER_RACE_RECHECK_R11" "$WORK/app/Services/Payments/CanonicalProviderSettlementService.php"
grep -q "PMD_PAYMOB_OMAN_GUEST_ROUTES_R11" "$WORK/routes/paymob-oman.php"
grep -q "PMD_PAYMOB_OMAN_ROUTE_LOADER_R11" "$WORK/routes/terminal-payments.php"
grep -q "return false;" "$WORK/app/Services/Payments/PaymobOmanRuntimeGate.php"
grep -q "'terminal_ready' => false" "$WORK/app/Services/Payments/PaymobOmanRuntimeGate.php"
grep -q "PMD_PAYMOB_OMAN_BOOTSTRAP_R11" "$V2_STAGE/src/server/bootstrap.ts"
grep -q "PMD_PAYMOB_OMAN_VERIFY_R11" "$V2_STAGE/src/lib/client-api.ts"
grep -q "PMD_PAYMOB_OMAN_PHONE_R11" "$V2_STAGE/src/lib/client-api.ts"
grep -q "PMD_PAYMOB_OMAN_BACKEND_SETTLEMENT_RETURN_R11" "$V2_STAGE/app/payment/return/PaymentReturnClient.tsx"
grep -q "PMD_PAYMOB_OMAN_PHONE_DIALOG_R11" "$V2_STAGE/src/lib/paymob-oman-client.ts"
# Provider registry must remain unpromoted until real sandbox evidence exists.
php -r '
$text=file_get_contents($argv[1]);
$start=strpos($text, "\x27paymob\x27 => [");
if($start===false){fwrite(STDERR,"Paymob registry block missing\n");exit(2);}
$end=strpos($text, "\x27worldline\x27 => [",$start);
$block=substr($text,$start,$end-$start);
if(!str_contains($block,"\x27implemented_capabilities\x27 => []") || !str_contains($block,"\x27implemented_payment_methods\x27 => []")){
 fwrite(STDERR,"Paymob registry was promoted before sandbox QA\n");exit(3);
}
echo "Provider registry remains fail-closed\n";
' app/Services/Payments/ProviderCapabilityRegistry.php

echo
echo "--- Existing Admin asset ordering invariant ---"
php -r '
$data=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);
$s=array_column($data["script"]??[],"path");
$r7=array_search("js/pmd-new-tenant-onboarding-r7.js",$s,true);
$legacy=array_search("js/pmd-payment-provider-catalogue-v1.js",$s,true);
$finance=array_search("js/pmd-finance-market-r4.js",$s,true);
if($r7===false||$legacy===false||$finance===false||!($r7<$legacy&&$legacy<$finance)){fwrite(STDERR,"R7 Finance ordering broken\n");exit(2);}
echo "R7 Finance ordering preserved: {$r7} -> {$legacy} -> {$finance}\n";
' app/admin/views/_meta/assets.json

echo
echo "--- Verify exact production V2 process before staging build ---"
[ "$PM2_SERVICE" = "paymydine-frontend-v2" ] || { echo "STOP: refusing unknown PM2 service $PM2_SERVICE" >&2; exit 5; }
[ "$PM2_PORT" = "3002" ] || { echo "STOP: refusing unknown V2 port $PM2_PORT" >&2; exit 5; }
PM2_JSON="$(sudo -u ubuntu -H pm2 jlist)"
PM2_CWD="$(printf '%s' "$PM2_JSON" | PMD_SERVICE="$PM2_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true);foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["pm_cwd"]??"";exit;}}')"
PM2_STATUS="$(printf '%s' "$PM2_JSON" | PMD_SERVICE="$PM2_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true);foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["status"]??"";exit;}}')"
[ "$PM2_CWD" = "$V2_LIVE" ] || { echo "STOP: PM2 cwd mismatch: $PM2_CWD" >&2; exit 5; }
[ "$PM2_STATUS" = "online" ] || { echo "STOP: V2 PM2 service is not online: $PM2_STATUS" >&2; exit 5; }
curl --fail --silent --show-error "http://127.0.0.1:$PM2_PORT/api/health" >/dev/null || { echo "STOP: baseline V2 health failed." >&2; exit 5; }

echo
echo "--- Staged V2 production build (live .next untouched) ---"
(
  cd "$V2_STAGE"
  npm run build
)
[ -d "$V2_STAGE/.next" ] || { echo "STOP: staged V2 build did not produce .next" >&2; exit 6; }
echo "STAGED V2 BUILD: OK"

echo
echo "--- Backup live target files/build ---"
NEW_FILES="$BACKUP_DIR/new-files.txt"
: > "$NEW_FILES"
backup_file() {
  local path="$1"
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/files/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/files/$path"
  else
    printf '%s\n' "$path" | sudo tee -a "$NEW_FILES" >/dev/null
  fi
}

RUNTIME_TARGETS=(
  "config/paymob_oman.php"
  "app/Services/Payments/CanonicalProviderSettlementService.php"
  "app/Services/Payments/PaymobOmanRuntimeGate.php"
  "app/Services/Payments/PaymobOmanPaymentAttemptService.php"
  "app/Services/Payments/PaymobOmanCheckoutService.php"
  "app/Services/Payments/PaymobOmanCallbackService.php"
  "app/Services/Payments/PaymobOmanGuestCatalogService.php"
  "app/Services/Payments/PaymobOmanFinancialAdjustmentService.php"
  "routes/terminal-payments.php"
  "routes/paymob-oman.php"
  "scripts/patch-canonical-provider-settlement-r11.py"
  "scripts/patch-paymob-oman-frontend-r11.py"
  "scripts/patch-paymob-oman-bootstrap-r11.py"
  "scripts/install-paymob-oman-runtime-r11.php"
  "scripts/enable-paymob-oman-sandbox-qa-r11.php"
  "scripts/disable-paymob-oman-sandbox-qa-r11.php"
  "scripts/reconcile-paymob-oman-pending-r11.php"
  "scripts/selftest-paymob-oman-online-r11.php"
  "$V2_REL/src/lib/paymob-oman-client.ts"
  "$V2_REL/src/lib/client-api.ts"
  "$V2_REL/src/server/bootstrap.ts"
  "$V2_REL/app/payment/return/PaymentReturnClient.tsx"
)
for path in "${RUNTIME_TARGETS[@]}"; do backup_file "$path"; done
if [ -d "$V2_LIVE/.next" ]; then
  sudo mkdir -p "$BACKUP_DIR"
  sudo mv "$V2_LIVE/.next" "$BACKUP_DIR/next.previous"
fi

activation_started=1
rollback_running=0
rollback() {
  local rc="${1:-1}"
  [ "$rollback_running" = "0" ] || exit "$rc"
  rollback_running=1
  set +e
  echo "R11 activation failed; restoring files/build from $BACKUP_DIR" >&2
  if [ -f "$NEW_FILES" ]; then
    while IFS= read -r path; do [ -n "$path" ] && sudo rm -f "$APP_DIR/$path"; done < "$NEW_FILES"
  fi
  if [ -d "$BACKUP_DIR/files" ]; then sudo cp -a "$BACKUP_DIR/files/." "$APP_DIR/"; fi
  if [ -d "$BACKUP_DIR/next.previous" ]; then
    sudo rm -rf "$V2_LIVE/.next"
    sudo mv "$BACKUP_DIR/next.previous" "$V2_LIVE/.next"
  fi
  (cd "$APP_DIR" && sudo php artisan optimize:clear >/dev/null 2>&1) || true
  sudo -u ubuntu -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null 2>&1 || true
  rm -rf "$STAGE_ROOT"
  echo "Rollback complete. Additive pmd_paymob_payment_attempts schema may remain; it contains no synthetic payments." >&2
  exit "$rc"
}
trap 'rc=$?; if [ "${activation_started:-0}" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT

install_file() {
  local src="$1" dst="$2"
  local parent owner group mode
  parent="$(dirname "$dst")"
  sudo mkdir -p "$parent"
  if [ -e "$dst" ]; then
    owner="$(stat -c '%U' "$dst")"
    group="$(stat -c '%G' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    owner="$(stat -c '%U' "$parent" 2>/dev/null || echo root)"
    group="$(stat -c '%G' "$parent" 2>/dev/null || echo root)"
    mode="644"
  fi
  sudo install -o "$owner" -g "$group" -m "$mode" "$src" "$dst"
}

echo
echo "--- Activate backend + source files ---"
for path in "${WHOLESALE[@]}"; do
  install_file "$WORK/$path" "$APP_DIR/$path"
done
install_file "$WORK/app/Services/Payments/CanonicalProviderSettlementService.php" "$APP_DIR/app/Services/Payments/CanonicalProviderSettlementService.php"
install_file "$WORK/routes/terminal-payments.php" "$APP_DIR/routes/terminal-payments.php"
install_file "$V2_STAGE/src/lib/client-api.ts" "$V2_LIVE/src/lib/client-api.ts"
install_file "$V2_STAGE/src/server/bootstrap.ts" "$V2_LIVE/src/server/bootstrap.ts"
install_file "$V2_STAGE/app/payment/return/PaymentReturnClient.tsx" "$V2_LIVE/app/payment/return/PaymentReturnClient.tsx"

# Activate the already-built staged Next tree; no production build runs here.
sudo mv "$V2_STAGE/.next" "$V2_LIVE/.next"

echo
echo "--- Installed syntax + invariant validation ---"
for file in \
  app/Services/Payments/CanonicalProviderSettlementService.php \
  app/Services/Payments/PaymobOmanRuntimeGate.php \
  app/Services/Payments/PaymobOmanPaymentAttemptService.php \
  app/Services/Payments/PaymobOmanCheckoutService.php \
  app/Services/Payments/PaymobOmanCallbackService.php \
  app/Services/Payments/PaymobOmanGuestCatalogService.php \
  app/Services/Payments/PaymobOmanFinancialAdjustmentService.php \
  routes/terminal-payments.php routes/paymob-oman.php \
  scripts/install-paymob-oman-runtime-r11.php \
  scripts/enable-paymob-oman-sandbox-qa-r11.php \
  scripts/disable-paymob-oman-sandbox-qa-r11.php \
  scripts/reconcile-paymob-oman-pending-r11.php \
  scripts/selftest-paymob-oman-online-r11.php; do
  php -l "$file"
done

grep -q "PMD_CANONICAL_PROVIDER_RACE_RECHECK_R11" app/Services/Payments/CanonicalProviderSettlementService.php
grep -q "PMD_PAYMOB_OMAN_ROUTE_LOADER_R11" routes/terminal-payments.php
grep -q "PMD_PAYMOB_OMAN_VERIFY_R11" "$V2_LIVE/src/lib/client-api.ts"
grep -q "PMD_PAYMOB_OMAN_BACKEND_SETTLEMENT_RETURN_R11" "$V2_LIVE/app/payment/return/PaymentReturnClient.tsx"
grep -q "PMD_PAYMOB_OMAN_BOOTSTRAP_R11" "$V2_LIVE/src/server/bootstrap.ts"

echo
echo "--- Clear backend caches ---"
sudo php artisan optimize:clear || php artisan optimize:clear

echo
echo "--- Software selftest ---"
php scripts/selftest-paymob-oman-online-r11.php

echo
echo "--- Install tenant attempt schema + fail-closed runtime audit ---"
php scripts/install-paymob-oman-runtime-r11.php "$TARGET_DOMAIN"

echo
echo "--- Existing Oman location/payment isolation audit ---"
php scripts/audit-location-market-r4.php "$TARGET_DOMAIN"

echo
echo "--- Restart ONLY the proven V2 PM2 service ---"
sudo -u ubuntu -H pm2 restart "$PM2_SERVICE" --update-env
for attempt in 1 2 3 4 5 6 7 8; do
  if curl --fail --silent --show-error "http://127.0.0.1:$PM2_PORT/api/health" >/dev/null; then
    echo "Local V2 health: OK"
    break
  fi
  sleep 2
  [ "$attempt" != "8" ] || { echo "V2 local health failed after restart" >&2; exit 20; }
done
curl -k --fail --silent --show-error "https://$TARGET_DOMAIN/api/health" >/dev/null || { echo "Public V2 health failed" >&2; exit 21; }
echo "Public V2 health: OK"

echo
echo "--- Paymob guest catalog HTTP contract ---"
CATALOG_FILE="$STAGE_ROOT/paymob-catalog.json"
curl -k --fail --silent --show-error "https://$TARGET_DOMAIN/api/v1/payments/paymob/catalog" -o "$CATALOG_FILE"
php -r '
$d=json_decode(file_get_contents($argv[1]),true,512,JSON_THROW_ON_ERROR);
if(!($d["ok"]??false) || !($d["active_market"]??false) || ($d["country_code"]??"")!=="OM"){
 fwrite(STDERR,"Paymob catalog did not resolve Oman market\n");exit(2);
}
if(($d["runtime_gate"]["guest_ready"]??true)!==false){fwrite(STDERR,"Production guest gate unexpectedly open\n");exit(3);}
if(($d["provider_enabled"]??true)!==false){fwrite(STDERR,"Paymob provider unexpectedly enabled before sandbox QA\n");exit(4);}
$enabled=array_values(array_filter($d["methods"]??[],fn($m)=>(bool)($m["enabled"]??false)));
if($enabled){fwrite(STDERR,"Paymob guest methods unexpectedly enabled before sandbox QA\n");exit(5);}
echo "Catalog: OM / fail-closed / no guest methods offered\n";
' "$CATALOG_FILE"

echo
echo "--- Paymob callback route negative-security probe ---"
CALLBACK_FILE="$STAGE_ROOT/paymob-callback-negative.json"
set +e
CALLBACK_STATUS="$(curl -k -sS --max-time 15 -o "$CALLBACK_FILE" -w '%{http_code}' \
  -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' \
  --data '{}' "https://$TARGET_DOMAIN/api/v1/payments/paymob/callback")"
CURL_STATUS=$?
set -e
if [ "$CURL_STATUS" -ne 0 ]; then
  echo "Callback negative probe could not reach endpoint" >&2
  exit 22
fi
case "$CALLBACK_STATUS" in
  401) echo "Callback rejects missing/invalid HMAC: HTTP 401 OK" ;;
  404) echo "Callback route returned 404" >&2; cat "$CALLBACK_FILE" >&2 || true; exit 23 ;;
  *) echo "Unexpected callback negative-probe status: HTTP $CALLBACK_STATUS" >&2; cat "$CALLBACK_FILE" >&2 || true; exit 24 ;;
esac

activation_started=0
trap - EXIT
rm -rf "$STAGE_ROOT"

echo
echo "=========================================================="
echo "PAYMOB OMAN ONLINE R11 SOFTWARE DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=========================================================="
echo "- Durable Paymob attempts are persisted before provider calls."
echo "- Unified Checkout Intention creation is server-authoritative."
echo "- Callback HMAC + amount + currency + reference are verified."
echo "- Provider transaction idempotency is safe for duplicate/concurrent callbacks."
echo "- Verified callbacks/inquiry settle through PMD's shared canonical authority."
echo "- Full, split and multi-order allocations are supported."
echo "- Tip/coupon final totals are rebuilt from canonical paid transactions."
echo "- Missing callbacks can recover through the reconciliation sweep."
echo "- V2 Paymob return flow never browser-marks an order paid."
echo "- V2 production build was staged before swap and health-checked after restart."
echo "- PRODUCTION GUEST PAYMOB REMAINS CODE-LOCKED until real sandbox certification."
echo "- Paymob provider/method rows remain disabled now; no payment can be created."
echo "- Paymob terminal runtime remains blocked pending the private Oman ECR/Cloud contract."
echo "- When Paymob Test credentials arrive, use the dedicated sandbox QA arm script; do not paste secrets into chat."
