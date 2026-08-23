#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-inline-widget-r1"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
FRONT_URL="${PMD_FRONTEND_BASE_URL:-https://test2.paymydine.com}"
ADMIN_URL="${PMD_ADMIN_BASE_URL:-https://test1.paymydine.com/admin/pmdfinance}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_inline_widget_r1_${STAMP}"
FRONT_STAGE="$STAGE/frontend-v2"
BACKUP="/var/backups/pmd_sumup_inline_widget_r1_${STAMP}"
INSTALL_STARTED=0
FRONT_ACTIVATED=0
FRONT_ROOT=""

BACKEND_REMOTE_FILES=(
  "app/Services/Payments/SumupOnlineCheckoutService.php"
  "app/main/routes_sumup_self_service.php"
  "app/admin/controllers/SumupTerminalSettings.php"
  "app/Services/Payments/ProviderCapabilityRegistry.php"
  "app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
)

FRONT_REMOTE_BASE="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
FRONT_REMOTE_FILES=(
  "src/runtime/components/SumupInlinePayment.tsx"
)

PATCH_RUNTIME="scripts/patch-pmd-v2-sumup-inline-widget-r1.py"
PATCH_LEGACY="scripts/patch-pmd-sumup-legacy-card-runtime-r1.py"
PATCH_FINANCE="scripts/patch-pmd-finance-provider-first-r1.py"

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/backend" "$BACKUP/frontend"

echo "============================================================"
echo " PAYMYDINE SUMUP INLINE PAYMENT WIDGET R1"
echo " CARD + APPLE PAY + GOOGLE PAY INSIDE PMD"
echo "============================================================"

git fetch origin sumup-inline-widget-r1
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo
echo "========== DETECT LIVE FRONTEND V2 =========="
if ! sudo -u ubuntu -H bash -lc 'command -v pm2 >/dev/null 2>&1'; then
  echo "ERROR: PM2 is not available for ubuntu"
  exit 2
fi
PM2_JSON="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || echo '[]')"
FRONT_ROOT="$(printf '%s' "$PM2_JSON" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin)
name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("pm_cwd", "")))
        break
')"
if [ -z "$FRONT_ROOT" ] || [ ! -d "$FRONT_ROOT" ]; then
  echo "ERROR: PM2 service $FRONT_SERVICE has no usable pm_cwd"
  exit 3
fi
[ -f "$FRONT_ROOT/package.json" ] || { echo "ERROR: frontend-v2 package.json missing"; exit 4; }
[ -d "$FRONT_ROOT/node_modules" ] || { echo "ERROR: frontend-v2 node_modules missing"; exit 5; }
[ -f "$FRONT_ROOT/src/runtime/components/RuntimeOverlays.tsx" ] || { echo "ERROR: RuntimeOverlays.tsx missing"; exit 6; }
[ -f "$FRONT_ROOT/src/runtime/components/StripeInlinePayment.tsx" ] || { echo "ERROR: StripeInlinePayment.tsx missing"; exit 7; }
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"

echo
echo "========== STAGE REMOTE FILES =========="
for f in "${BACKEND_REMOTE_FILES[@]}" "$PATCH_RUNTIME" "$PATCH_LEGACY" "$PATCH_FINANCE"; do
  git cat-file -e "$REMOTE:$f" || { echo "ERROR: remote file missing: $f"; exit 8; }
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done
for f in "${FRONT_REMOTE_FILES[@]}"; do
  rf="$FRONT_REMOTE_BASE/$f"
  git cat-file -e "$REMOTE:$rf" || { echo "ERROR: remote frontend file missing: $rf"; exit 9; }
  mkdir -p "$STAGE/frontend-source/$(dirname "$f")"
  git show "$REMOTE:$rf" > "$STAGE/frontend-source/$f"
  echo "STAGED: $rf"
done

echo
echo "========== SOURCE PREFLIGHT =========="
php -l "$STAGE/app/Services/Payments/SumupOnlineCheckoutService.php"
php -l "$STAGE/app/main/routes_sumup_self_service.php"
php -l "$STAGE/app/admin/controllers/SumupTerminalSettings.php"
php -l "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php"
node --check "$STAGE/app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
python3 -m py_compile "$STAGE/$PATCH_RUNTIME" "$STAGE/$PATCH_LEGACY" "$STAGE/$PATCH_FINANCE"
grep -Fq '/payments/sumup/widget/create-checkout' "$STAGE/app/main/routes_sumup_self_service.php"
grep -Fq 'terminal_provider_configs' "$STAGE/app/Services/Payments/SumupOnlineCheckoutService.php"
grep -Fq 'SumUpCard' "$STAGE/frontend-source/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'googlePay' "$STAGE/frontend-source/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq "['card', 'apple_pay', 'google_pay']" "$STAGE/app/Services/Payments/SumupOnlineCheckoutService.php"
echo "SOURCE_PREFLIGHT=OK"

echo
echo "========== STAGE + PATCH LEGACY CARD COMPAT =========="
mkdir -p "$STAGE/routes"
cp "$ROOT/routes/admin-app-before.php" "$STAGE/routes/admin-app-before.php"
python3 "$STAGE/$PATCH_LEGACY" "$STAGE/routes/admin-app-before.php"
php -l "$STAGE/routes/admin-app-before.php"
if grep -Fq "SumUp credentials are incomplete" "$STAGE/routes/admin-app-before.php"; then
  echo "ERROR: stale SumUp legacy credential error still present"
  exit 10
fi

echo
echo "========== STAGE FINANCE PROVIDER-FIRST VIEW =========="
mkdir -p "$STAGE/app/admin/views/pmdfinance"
cp "$ROOT/app/admin/views/pmdfinance/index.blade.php" "$STAGE/app/admin/views/pmdfinance/index.blade.php"
python3 "$STAGE/$PATCH_FINANCE" "$STAGE/app/admin/views/pmdfinance/index.blade.php"
python3 - "$STAGE/app/admin/views/pmdfinance/index.blade.php" <<'PY'
from pathlib import Path
import sys
text=Path(sys.argv[1]).read_text()
p=text.find('id="payment-providers"')
m=text.find('id="payment-methods"')
if p < 0 or m < 0 or p >= m:
    raise SystemExit('ERROR: provider section is not before method section after staging')
print('PMDFINANCE_PROVIDER_FIRST=OK')
PY

echo
echo "========== ISOLATED FRONTEND V2 BUILD =========="
mkdir -p "$FRONT_STAGE"
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
for f in "${FRONT_REMOTE_FILES[@]}"; do
  mkdir -p "$FRONT_STAGE/$(dirname "$f")"
  cp "$STAGE/frontend-source/$f" "$FRONT_STAGE/$f"
done
python3 "$STAGE/$PATCH_RUNTIME" "$FRONT_STAGE/src/runtime/components/RuntimeOverlays.tsx"
grep -Fq "SumupInlinePayment" "$FRONT_STAGE/src/runtime/components/RuntimeOverlays.tsx"
grep -Fq "selectedProvider === 'sumup'" "$FRONT_STAGE/src/runtime/components/RuntimeOverlays.tsx"

sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend-v2 build produced no .next"; exit 11; }
if ! grep -Rsl --binary-files=text '/api/v1/payments/sumup/widget/create-checkout' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend does not contain SumUp widget endpoint"
  exit 12
fi
echo "FRONTEND_BUILD=OK"

echo
echo "========== BACKUP =========="
for f in "${BACKEND_REMOTE_FILES[@]}" "routes/admin-app-before.php" "app/admin/views/_meta/assets.json" "app/admin/views/pmdfinance/index.blade.php"; do
  if [ -e "$ROOT/$f" ]; then
    sudo mkdir -p "$BACKUP/backend/$(dirname "$f")"
    sudo cp -a "$ROOT/$f" "$BACKUP/backend/$f"
  fi
done
for f in "src/runtime/components/RuntimeOverlays.tsx" "src/runtime/components/SumupInlinePayment.tsx"; do
  if [ -e "$FRONT_ROOT/$f" ]; then
    sudo mkdir -p "$BACKUP/frontend/$(dirname "$f")"
    sudo cp -a "$FRONT_ROOT/$f" "$BACKUP/frontend/$f"
  fi
done
if [ -d "$FRONT_ROOT/.next" ]; then
  sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! SUMUP INLINE R1 FAILED - RESTORING !!!!!"
  if [ -d "$BACKUP/backend" ]; then sudo cp -a "$BACKUP/backend/." "$ROOT/"; fi
  if [ -d "$BACKUP/frontend" ]; then sudo cp -a "$BACKUP/frontend/." "$FRONT_ROOT/"; fi
  if [ "$FRONT_ACTIVATED" = "1" ]; then
    sudo rm -rf "$FRONT_ROOT/.next"
    if [ -d "$BACKUP/frontend-next.previous" ]; then
      sudo cp -a "$BACKUP/frontend-next.previous" "$FRONT_ROOT/.next"
      sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
    fi
    sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env >/dev/null 2>&1 || true
  fi
  cd "$ROOT"
  sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}
trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo
echo "========== INSTALL BACKEND =========="
for f in "app/Services/Payments/SumupOnlineCheckoutService.php" "app/main/routes_sumup_self_service.php" "app/admin/controllers/SumupTerminalSettings.php" "app/Services/Payments/ProviderCapabilityRegistry.php"; do
  sudo mkdir -p "$ROOT/$(dirname "$f")"
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done
sudo install -m 0644 "$STAGE/routes/admin-app-before.php" "$ROOT/routes/admin-app-before.php"
sudo install -m 0644 "$STAGE/app/admin/views/pmdfinance/index.blade.php" "$ROOT/app/admin/views/pmdfinance/index.blade.php"
echo "INSTALLED: routes/admin-app-before.php (canonical credential bridge)"
echo "INSTALLED: app/admin/views/pmdfinance/index.blade.php (providers first)"

php -l "$ROOT/app/Services/Payments/SumupOnlineCheckoutService.php"
php -l "$ROOT/app/main/routes_sumup_self_service.php"
php -l "$ROOT/app/admin/controllers/SumupTerminalSettings.php"
php -l "$ROOT/routes/admin-app-before.php"

echo
echo "========== INSTALL ADMIN WALLET UI =========="
sudo install -m 0644 "$STAGE/app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js" "$ROOT/app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
sudo python3 <<'PY'
import json
from pathlib import Path
path = Path('/var/www/paymydine/app/admin/views/_meta/assets.json')
data = json.loads(path.read_text())
scripts = data.setdefault('script', [])
asset = {'path': 'js/pmd-sumup-inline-wallet-settings-v1.js', 'name': 'pmd-sumup-inline-wallet-settings-v1-js'}
scripts[:] = [row for row in scripts if row.get('path') != asset['path'] and row.get('name') != asset['name']]
insert_at = len(scripts)
for i, row in enumerate(scripts):
    if row.get('path') == 'js/pmd-payment-provider-catalogue-v1.js' or row.get('name') == 'pmd-payment-provider-catalogue-v1-js':
        insert_at = i + 1
        break
scripts.insert(insert_at, asset)
path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print('ADMIN_ASSET_MERGED=YES')
PY
node --check "$ROOT/app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js"
grep -Fq 'pmd-sumup-inline-wallet-settings-v1.js' "$ROOT/app/admin/views/_meta/assets.json"

echo
echo "========== INSTALL FRONTEND V2 SOURCE + BUILD =========="
sudo install -o ubuntu -g ubuntu -m 0644 "$FRONT_STAGE/src/runtime/components/RuntimeOverlays.tsx" "$FRONT_ROOT/src/runtime/components/RuntimeOverlays.tsx"
sudo install -o ubuntu -g ubuntu -m 0644 "$FRONT_STAGE/src/runtime/components/SumupInlinePayment.tsx" "$FRONT_ROOT/src/runtime/components/SumupInlinePayment.tsx"
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONT_ACTIVATED=1

grep -Fq "SumupInlinePayment" "$FRONT_ROOT/src/runtime/components/RuntimeOverlays.tsx"
grep -Fq '/api/v1/payments/sumup/widget/create-checkout' "$FRONT_ROOT/src/runtime/components/SumupInlinePayment.tsx"

echo
echo "========== CLEAR CACHE + ROUTE CHECK =========="
cd "$ROOT"
sudo -u www-data php artisan optimize:clear
php artisan route:list 2>/dev/null | grep -E 'payments/sumup/(widget|self-service)' || true

echo
echo "========== RESTART ONLY FRONTEND V2 =========="
sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 4
PM2_AFTER="$(sudo -u ubuntu -H pm2 jlist 2>/dev/null || echo '[]')"
STATUS_AFTER="$(printf '%s' "$PM2_AFTER" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin); name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("status", "unknown"))); break
')"
CWD_AFTER="$(printf '%s' "$PM2_AFTER" | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin); name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("pm_cwd", ""))); break
')"
echo "FRONTEND_STATUS_AFTER=$STATUS_AFTER"
echo "FRONTEND_CWD_AFTER=$CWD_AFTER"
[ "$STATUS_AFTER" = "online" ] || { echo "ERROR: frontend-v2 not online"; exit 13; }
[ "$CWD_AFTER" = "$FRONT_ROOT" ] || { echo "ERROR: frontend-v2 cwd changed"; exit 14; }

echo
echo "========== HTTP SMOKE =========="
FRONT_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' "$FRONT_URL/?pmd_sumup_inline_r1=$STAMP" || true)"
ADMIN_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' "$ADMIN_URL?pmd_sumup_inline_r1=$STAMP" || true)"
echo "FRONTEND_HTTP=$FRONT_CODE"
echo "ADMIN_HTTP=$ADMIN_CODE"
case "$FRONT_CODE" in 200|301|302) ;; *) echo "ERROR: frontend HTTP smoke failed"; exit 15;; esac
case "$ADMIN_CODE" in 200|301|302|403) ;; *) echo "ERROR: admin HTTP smoke failed"; exit 16;; esac

INSTALL_STARTED=0
trap - EXIT

echo
echo "============================================================"
echo " SUCCESS - SUMUP INLINE PAYMENT WIDGET R1 INSTALLED"
echo "============================================================"
echo "CHECKOUT_UI=embedded"
echo "REDIRECT_FOR_CARD=no"
echo "SUMUP_WIDGET_ENDPOINT=/api/v1/payments/sumup/widget/create-checkout"
echo "SUMUP_STATUS_ENDPOINT=/api/v1/payments/sumup/widget/status"
echo "CARD_FIELDS=SumUp_Payment_Widget"
echo "APPLE_PAY=SumUp_widget_when_eligible_and_onboarded"
echo "GOOGLE_PAY=SumUp_widget_when_eligible_and_onboarded"
echo "WERO_SUMUP=no_current_public_method"
echo "SECRET_SOURCE=terminal_provider_configs"
echo "LEGACY_CREATE_SESSION_BRIDGE=enabled"
echo "PMDFINANCE_ORDER=providers_then_methods"
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "OTHER_PM2_SERVICES=untouched"
echo "DATABASE_MIGRATIONS=none"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
