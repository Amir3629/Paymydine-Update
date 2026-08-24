#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-inline-widget-r1"
FRONT_SERVICE="${PMD_FRONTEND_SERVICE:-paymydine-frontend-v2}"
FRONT_URL="${PMD_FRONTEND_BASE_URL:-https://test2.paymydine.com}"
ADMIN_URL="${PMD_ADMIN_BASE_URL:-https://test1.paymydine.com/admin/pmdfinance}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_sumup_method_ux_r1_${STAMP}"
FRONT_STAGE="$STAGE/frontend-build"
BACKUP="/var/backups/pmd_sumup_method_ux_r1_${STAMP}"
INSTALL_STARTED=0
FRONT_ACTIVATED=0
FRONT_ROOT=""
PATCH="scripts/patch-pmd-sumup-method-ux-r1.py"
FORM="app/admin/views/pmdfinance/_inline_payment_form_v1.blade.php"

PHP_TARGETS=(
  "app/admin/models/Payments_model.php"
  "app/admin/controllers/Payments.php"
  "app/Services/Payments/ProviderCapabilityRegistry.php"
)
FRONT_TARGETS=(
  "src/runtime/components/SumupInlinePayment.tsx"
  "src/runtime/components/RuntimeOverlays.module.css"
)

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/backend" "$BACKUP/frontend"

echo "============================================================"
echo " PAYMYDINE SUMUP METHOD UX R1"
echo " COMPACT METHOD EDITOR + THEMED INLINE WALLETS"
echo "============================================================"

git fetch origin sumup-inline-widget-r1
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo
echo "========== DETECT LIVE FRONTEND V2 =========="
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
  exit 2
fi
[ -f "$FRONT_ROOT/package.json" ] || { echo "ERROR: frontend package.json missing"; exit 3; }
[ -d "$FRONT_ROOT/node_modules" ] || { echo "ERROR: frontend node_modules missing"; exit 4; }
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "FRONTEND_ROOT=$FRONT_ROOT"

echo
echo "========== STAGE PATCH + COMPACT FORM =========="
for f in "$PATCH" "$FORM"; do
  git cat-file -e "$REMOTE:$f" || { echo "ERROR: remote file missing: $f"; exit 5; }
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done
python3 -m py_compile "$STAGE/$PATCH"

echo
echo "========== COPY LIVE AUTHORITIES INTO STAGE =========="
for f in "${PHP_TARGETS[@]}"; do
  [ -f "$ROOT/$f" ] || { echo "ERROR: live target missing: $f"; exit 6; }
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$ROOT/$f" "$STAGE/$f"
  echo "COPIED: $f"
done
for f in "${FRONT_TARGETS[@]}"; do
  [ -f "$FRONT_ROOT/$f" ] || { echo "ERROR: live frontend target missing: $f"; exit 7; }
  mkdir -p "$STAGE/frontend-v2/$(dirname "$f")"
  cp "$FRONT_ROOT/$f" "$STAGE/frontend-v2/$f"
  echo "COPIED_FRONTEND: $f"
done

python3 "$STAGE/$PATCH" "$STAGE"

echo
echo "========== STATIC PREFLIGHT =========="
php -l "$STAGE/app/admin/models/Payments_model.php"
php -l "$STAGE/app/admin/controllers/Payments.php"
php -l "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php"
grep -Fq "'apple_pay' => ['stripe', 'sumup', 'vr_payment']" "$STAGE/app/admin/models/Payments_model.php"
grep -Fq "'google_pay' => ['stripe', 'sumup', 'vr_payment']" "$STAGE/app/admin/models/Payments_model.php"
grep -Fq 'PMD_METHOD_PROVIDER_IS_ENABLEMENT_R1' "$STAGE/app/admin/controllers/Payments.php"
grep -Fq 'self::METHOD_APPLE_PAY' "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php"
grep -Fq 'self::METHOD_GOOGLE_PAY' "$STAGE/app/Services/Payments/ProviderCapabilityRegistry.php"
grep -Fq 'Not offered' "$STAGE/$FORM"
grep -Fq 'readonly required' "$STAGE/$FORM"
if grep -Eq '>Priority<|>Description<|>Enabled<|>Default method<' "$STAGE/$FORM"; then
  echo "ERROR: compact payment form still exposes legacy fields"
  exit 8
fi
grep -Fq 'function requestedSumupMethods' "$STAGE/frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'styles.sumupInlineBox' "$STAGE/frontend-v2/src/runtime/components/SumupInlinePayment.tsx"
grep -Fq 'PMD_SUMUP_WIDGET_THEME_R1' "$STAGE/frontend-v2/src/runtime/components/RuntimeOverlays.module.css"
echo "STATIC_PREFLIGHT=OK"

echo
echo "========== ISOLATED FRONTEND BUILD =========="
mkdir -p "$FRONT_STAGE"
tar -C "$FRONT_ROOT" --exclude='./node_modules' --exclude='./.next' -cf - . | tar -C "$FRONT_STAGE" -xf -
ln -s "$FRONT_ROOT/node_modules" "$FRONT_STAGE/node_modules"
for f in "${FRONT_TARGETS[@]}"; do
  mkdir -p "$FRONT_STAGE/$(dirname "$f")"
  cp "$STAGE/frontend-v2/$f" "$FRONT_STAGE/$f"
done
sudo -u ubuntu -H env FRONT_STAGE="$FRONT_STAGE" bash -c '
  set -e
  cd "$FRONT_STAGE"
  npm run build -- --webpack
'
[ -d "$FRONT_STAGE/.next" ] || { echo "ERROR: frontend build produced no .next"; exit 9; }
if ! grep -Rsl --binary-files=text 'requestedSumupMethods' "$FRONT_STAGE/.next" >/dev/null 2>&1; then
  echo "ERROR: compiled frontend missing standalone SumUp wallet routing"
  exit 10
fi
echo "FRONTEND_BUILD=OK"

echo
echo "========== BACKUP =========="
for f in "${PHP_TARGETS[@]}" "$FORM"; do
  if [ -e "$ROOT/$f" ]; then
    sudo mkdir -p "$BACKUP/backend/$(dirname "$f")"
    sudo cp -a "$ROOT/$f" "$BACKUP/backend/$f"
  fi
done
for f in "${FRONT_TARGETS[@]}"; do
  sudo mkdir -p "$BACKUP/frontend/$(dirname "$f")"
  sudo cp -a "$FRONT_ROOT/$f" "$BACKUP/frontend/$f"
done
if [ -d "$FRONT_ROOT/.next" ]; then
  sudo cp -a "$FRONT_ROOT/.next" "$BACKUP/frontend-next.previous"
fi
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! SUMUP METHOD UX R1 FAILED - RESTORING !!!!!"
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
echo "========== INSTALL ADMIN PAYMENT UX =========="
for f in "${PHP_TARGETS[@]}"; do
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done
sudo install -m 0644 "$STAGE/$FORM" "$ROOT/$FORM"
echo "INSTALLED: $FORM"
php -l "$ROOT/app/admin/models/Payments_model.php"
php -l "$ROOT/app/admin/controllers/Payments.php"
php -l "$ROOT/app/Services/Payments/ProviderCapabilityRegistry.php"

echo
echo "========== INSTALL THEMED SUMUP FRONTEND =========="
for f in "${FRONT_TARGETS[@]}"; do
  sudo install -o ubuntu -g ubuntu -m 0644 "$STAGE/frontend-v2/$f" "$FRONT_ROOT/$f"
  echo "INSTALLED_FRONTEND_SOURCE: $f"
done
sudo rm -rf "$FRONT_ROOT/.next"
sudo mv "$FRONT_STAGE/.next" "$FRONT_ROOT/.next"
sudo chown -R ubuntu:ubuntu "$FRONT_ROOT/.next"
FRONT_ACTIVATED=1

echo
echo "========== CLEAR CACHE + RESTART FRONTEND V2 =========="
cd "$ROOT"
sudo -u www-data php artisan optimize:clear
sudo -u ubuntu -H pm2 restart "$FRONT_SERVICE" --update-env
sleep 2
STATUS="$(sudo -u ubuntu -H pm2 jlist | FRONT_SERVICE="$FRONT_SERVICE" python3 -c '
import json, os, sys
rows=json.load(sys.stdin)
name=os.environ["FRONT_SERVICE"]
for row in rows:
    if str(row.get("name", "")) == name:
        print(str(row.get("pm2_env", {}).get("status", "")))
        break
')"
[ "$STATUS" = "online" ] || { echo "ERROR: frontend status=$STATUS"; exit 11; }
echo "FRONTEND_STATUS=$STATUS"

echo
echo "========== HTTP SMOKE =========="
FRONT_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$FRONT_URL" || true)"
ADMIN_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$ADMIN_URL" || true)"
echo "FRONTEND_HTTP=$FRONT_HTTP"
echo "ADMIN_HTTP=$ADMIN_HTTP"
[ "$FRONT_HTTP" = "200" ] || { echo "ERROR: frontend smoke failed"; exit 12; }
[ "$ADMIN_HTTP" = "200" ] || { echo "ERROR: admin smoke failed"; exit 13; }

trap - EXIT

echo "============================================================"
echo " SUCCESS - SUMUP METHOD UX R1 INSTALLED"
echo "============================================================"
echo "PAYMENT_METHOD_EDITOR=Name_readonly+Provider_only"
echo "PROVIDER_BLANK=Not_offered"
echo "SUMUP_CARD=enabled"
echo "SUMUP_APPLE_PAY=assignable_when_eligible"
echo "SUMUP_GOOGLE_PAY=assignable_when_eligible"
echo "SUMUP_WERO=not_supported"
echo "SUMUP_WIDGET_THEME=PayMyDine_theme_variables"
echo "FRONTEND_SERVICE=$FRONT_SERVICE"
echo "DATABASE_MIGRATIONS=none"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
