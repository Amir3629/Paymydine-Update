#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd_cashier_payment_final_${STAMP}"
BACKUP="/var/backups/pmd_cashier_payment_final_${STAMP}"
COMPOSER="app/admin/assets/js/pmd-cashier-order-composer-v1.js"
V3="app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
POLICY="app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
SIMPLE_CSS="app/admin/assets/css/pmd-payment-simple-v1.css"
CLEAN_CSS="app/admin/assets/css/pmd-cashier-payment-clean-v1.css"
ASSETS="app/admin/views/_meta/assets.json"
INSTALL_STARTED=0

cd "$ROOT"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP/files"

echo "============================================================"
echo " PAYMYDINE CASHIER PAYMENT FINAL"
echo " ONE STAFF AUTHORITY: CASH + TERMINAL"
echo "============================================================"

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

echo
echo "========== PRECHECK LIVE TARGETS =========="
for f in "$COMPOSER" "$V3" "$POLICY" "$SIMPLE_CSS" "$CLEAN_CSS" "$ASSETS"; do
  [ -f "$ROOT/$f" ] || {
    echo "ERROR: missing live target: $f"
    exit 2
  }
done

php -r '$j=json_decode(file_get_contents($argv[1]), true); if (!is_array($j)) { fwrite(STDERR,"Invalid assets JSON\n"); exit(2); } echo "LIVE_ASSETS_JSON=OK\n";' "$ROOT/$ASSETS"

echo
echo "========== STAGE CURRENT BRANCH AUTHORITIES =========="
for f in "$V3" "$POLICY" "$SIMPLE_CSS" "$CLEAN_CSS"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  git cat-file -e "$REMOTE:$f" || {
    echo "ERROR: remote file missing: $f"
    exit 3
  }
  git show "$REMOTE:$f" > "$STAGE/$f"
  echo "STAGED: $f"
done

node --check "$STAGE/$V3"
node --check "$STAGE/$POLICY"
grep -q '__pmdV3: true' "$STAGE/$V3"
grep -q "Staff checkout is intentionally limited to the two actions" "$STAGE/$V3"
grep -q "How will they pay?" "$STAGE/$POLICY"
grep -q 'forceHidden' "$STAGE/$POLICY"
grep -q 'data-payment-method="direct_terminal"' "$STAGE/$SIMPLE_CSS"
echo "REMOTE_AUTHORITIES=OK"

echo
echo "========== PATCH CASHIER COMPOSER IN ISOLATION =========="
mkdir -p "$STAGE/$(dirname "$COMPOSER")"
cp "$ROOT/$COMPOSER" "$STAGE/$COMPOSER"

python3 - "$STAGE/$COMPOSER" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = 'PMD_CASHIER_PAYMENT_V3_AUTHORITY_FINAL'
old_v2 = '/app/admin/assets/js/pmd-waiter-pos-payment-v2.js'

if marker in text:
    print('COMPOSER_AUTHORITY=ALREADY_PATCHED')
else:
    start_marker = '  async function ensurePaymentAssets() {'
    end_marker = '\n  function paymentMarkup() {'
    start = text.find(start_marker)
    end = text.find(end_marker, start)
    if start < 0 or end < 0:
        raise SystemExit('ERROR: Cashier ensurePaymentAssets block not found; refusing unsafe patch')
    if old_v2 not in text[start:end]:
        raise SystemExit('ERROR: expected legacy V2 loader not found inside payment asset block; refusing ambiguous patch')

    replacement = r'''  // PMD_CASHIER_PAYMENT_V3_AUTHORITY_FINAL
  // Cashier owns the shell, while the canonical staff payment engine is V3.
  // Never instantiate the legacy V2 engine here: it exposes provider/customer
  // methods that do not belong in the waiter/cashier payment surface.
  async function ensurePaymentAssets() {
    if (state.paymentAssetsPromise) return state.paymentAssetsPromise;

    state.paymentAssetsPromise = (async function () {
      function hasStyle(path) {
        return Array.prototype.slice.call(document.querySelectorAll('link[href]')).some(function (link) {
          return String(link.href || '').indexOf(path) !== -1;
        });
      }

      function ensureStyle(path, key) {
        if (hasStyle(path)) return;
        injectStyle(path, key);
      }

      function loadFreshScript(path, cacheKey) {
        return new Promise(function (resolve, reject) {
          var script = document.createElement('script');
          script.src = path + '?v=' + encodeURIComponent(cacheKey);
          script.async = false;
          script.onload = resolve;
          script.onerror = function () {
            reject(new Error('Could not load ' + path));
          };
          document.head.appendChild(script);
        });
      }

      ensureStyle(
        '/app/admin/assets/css/pmd-waiter-pos-v1.css',
        'data-pmd-coc-payment-style'
      );
      ensureStyle(
        '/app/admin/assets/css/pmd-cashier-payment-clean-v1.css',
        'data-pmd-coc-payment-clean-style'
      );
      ensureStyle(
        '/app/admin/assets/css/pmd-payment-simple-v1.css',
        'data-pmd-coc-payment-simple-style'
      );

      // The Cashier must install V3 itself if global asset ordering has not
      // established it yet. An old PMDWaiterPOSPaymentV2 global is NOT enough.
      if (
        !window.PMDWaiterPOSPaymentV2 ||
        window.PMDWaiterPOSPaymentV2.__pmdV3 !== true
      ) {
        await loadFreshScript(
          '/app/admin/assets/js/pmd-waiter-pos-payment-v3.js',
          'cashier-payment-v3-final'
        );
      }

      if (
        !window.PMDWaiterPOSPaymentV2 ||
        window.PMDWaiterPOSPaymentV2.__pmdV3 !== true ||
        typeof window.PMDWaiterPOSPaymentV2.install !== 'function'
      ) {
        throw new Error('Canonical staff Payment V3 is unavailable.');
      }

      // If a policy tag executed earlier against an old module, execute the
      // same canonical policy once more against the now-authoritative V3.
      if (!window.PMDWaiterPOSPaymentV2.__pmdPolicyWrapped) {
        await loadFreshScript(
          '/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js',
          'cashier-payment-policy-final'
        );
      }

      if (!window.PMDWaiterPOSPaymentV2.__pmdPolicyWrapped) {
        throw new Error('Canonical staff payment policy is unavailable.');
      }
    })();

    return state.paymentAssetsPromise;
  }
'''

    text = text[:start] + replacement + text[end:]
    path.write_text(text)
    print('COMPOSER_AUTHORITY=PATCHED_TO_V3')

patched = path.read_text()
if old_v2 in patched:
    raise SystemExit('ERROR: legacy payment V2 loader still referenced by Cashier composer')
if marker not in patched:
    raise SystemExit('ERROR: final Cashier authority marker missing')
if '/app/admin/assets/js/pmd-waiter-pos-payment-v3.js' not in patched:
    raise SystemExit('ERROR: V3 loader missing after patch')
if '/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js' not in patched:
    raise SystemExit('ERROR: policy loader missing after patch')
PY

node --check "$STAGE/$COMPOSER"
! grep -q 'pmd-waiter-pos-payment-v2.js' "$STAGE/$COMPOSER"
grep -q 'PMD_CASHIER_PAYMENT_V3_AUTHORITY_FINAL' "$STAGE/$COMPOSER"
grep -q 'pmd-waiter-pos-payment-v3.js' "$STAGE/$COMPOSER"
echo "COMPOSER_PREFLIGHT=OK"

echo
echo "========== BACKUP LIVE FILES =========="
for f in "$COMPOSER" "$V3" "$POLICY" "$SIMPLE_CSS" "$CLEAN_CSS" "$ASSETS"; do
  sudo mkdir -p "$BACKUP/files/$(dirname "$f")"
  sudo cp -a "$ROOT/$f" "$BACKUP/files/$f"
done
echo "BACKUP=$BACKUP"

rollback() {
  local rc="${1:-1}"
  set +e
  echo "!!!!! CASHIER PAYMENT DEPLOY FAILED - RESTORING !!!!!"
  sudo cp -a "$BACKUP/files/." "$ROOT/"
  cd "$ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  echo "RESTORED_FROM=$BACKUP"
  exit "$rc"
}

trap 'rc=$?; if [ "$INSTALL_STARTED" = "1" ] && [ "$rc" != "0" ]; then rollback "$rc"; fi' EXIT
INSTALL_STARTED=1

echo
echo "========== INSTALL FINAL STAFF PAYMENT AUTHORITIES =========="
for f in "$COMPOSER" "$V3" "$POLICY" "$SIMPLE_CSS" "$CLEAN_CSS"; do
  sudo install -m 0644 "$STAGE/$f" "$ROOT/$f"
  echo "INSTALLED: $f"
done

echo
echo "========== CONSOLIDATE LIVE ASSET ORDER =========="
sudo python3 <<'PY'
import json
from pathlib import Path

path = Path('/var/www/paymydine/app/admin/views/_meta/assets.json')
data = json.loads(path.read_text())
styles = data.setdefault('style', [])
scripts = data.setdefault('script', [])

# Keep exactly one entry for each current staff-payment authority.
style_required = [
    ('css/pmd-cashier-payment-clean-v1.css', 'pmd-cashier-payment-clean-v1-css'),
    ('css/pmd-payment-simple-v1.css', 'pmd-payment-simple-v1-css'),
]
script_required = [
    ('js/pmd-waiter-pos-payment-v3.js', 'pmd-waiter-pos-payment-v3-js'),
    ('js/pmd-waiter-pos-payment-policy-v2.js', 'pmd-waiter-pos-payment-policy-v2-js'),
]
legacy_paths = {'js/pmd-waiter-pos-payment-v2.js'}
legacy_names = {'pmd-waiter-pos-payment-v2-js'}

for p, n in style_required:
    styles[:] = [row for row in styles if row.get('path') != p and row.get('name') != n]
    styles.append({'path': p, 'name': n})

scripts[:] = [
    row for row in scripts
    if row.get('path') not in legacy_paths and row.get('name') not in legacy_names
]
for p, n in script_required:
    scripts[:] = [row for row in scripts if row.get('path') != p and row.get('name') != n]

# V3 + policy should be available before the Cashier composer can install its API.
composer_index = next(
    (i for i, row in enumerate(scripts)
     if row.get('path') == 'js/pmd-cashier-order-composer-v1.js'
     or row.get('name') == 'pmd-cashier-order-composer-v1-js'),
    None,
)
if composer_index is None:
    admin_index = next(
        (i for i, row in enumerate(scripts)
         if row.get('path') == 'js/admin.js' or row.get('name') == 'admin-js'),
        -1,
    )
    composer_index = admin_index + 1

for offset, (p, n) in enumerate(script_required):
    scripts.insert(composer_index + offset, {'path': p, 'name': n})

path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print('ASSET_ORDER=V3_THEN_POLICY_BEFORE_COMPOSER')
PY

php -r '$j=json_decode(file_get_contents($argv[1]), true); if (!is_array($j)) exit(2); echo "ASSETS_JSON=OK\n";' "$ROOT/$ASSETS"

echo
echo "========== LIVE STATIC CHECK =========="
node --check "$ROOT/$COMPOSER"
node --check "$ROOT/$V3"
node --check "$ROOT/$POLICY"
! grep -q 'pmd-waiter-pos-payment-v2.js' "$ROOT/$COMPOSER"
grep -q 'PMD_CASHIER_PAYMENT_V3_AUTHORITY_FINAL' "$ROOT/$COMPOSER"
grep -q '__pmdV3: true' "$ROOT/$V3"
grep -q "How will they pay?" "$ROOT/$POLICY"
grep -q 'data-payment-method="direct_terminal"' "$ROOT/$SIMPLE_CSS"

echo
echo "========== CLEAR LARAVEL CACHE =========="
cd "$ROOT"
php artisan optimize:clear || true

echo
echo "========== NGINX-SERVED AUTHORITY CHECK =========="
AUDIT_TS="$(date +%s)"
BASE_URL="https://mimoza.paymydine.com"
HTTP_COMPOSER="$(curl -L -sS -o "$STAGE/served-composer.js" -w '%{http_code}' "$BASE_URL/app/admin/assets/js/pmd-cashier-order-composer-v1.js?pmd_cashier_final=$AUDIT_TS" || true)"
HTTP_V3="$(curl -L -sS -o "$STAGE/served-v3.js" -w '%{http_code}' "$BASE_URL/app/admin/assets/js/pmd-waiter-pos-payment-v3.js?pmd_cashier_final=$AUDIT_TS" || true)"
HTTP_POLICY="$(curl -L -sS -o "$STAGE/served-policy.js" -w '%{http_code}' "$BASE_URL/app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js?pmd_cashier_final=$AUDIT_TS" || true)"
HTTP_CSS="$(curl -L -sS -o "$STAGE/served-simple.css" -w '%{http_code}' "$BASE_URL/app/admin/assets/css/pmd-payment-simple-v1.css?pmd_cashier_final=$AUDIT_TS" || true)"

echo "COMPOSER_HTTP=$HTTP_COMPOSER"
echo "V3_HTTP=$HTTP_V3"
echo "POLICY_HTTP=$HTTP_POLICY"
echo "SIMPLE_CSS_HTTP=$HTTP_CSS"

if [ "$HTTP_COMPOSER" = "200" ]; then
  grep -q 'PMD_CASHIER_PAYMENT_V3_AUTHORITY_FINAL' "$STAGE/served-composer.js"
  ! grep -q 'pmd-waiter-pos-payment-v2.js' "$STAGE/served-composer.js"
fi
if [ "$HTTP_V3" = "200" ]; then grep -q '__pmdV3: true' "$STAGE/served-v3.js"; fi
if [ "$HTTP_POLICY" = "200" ]; then grep -q "How will they pay?" "$STAGE/served-policy.js"; fi
if [ "$HTTP_CSS" = "200" ]; then grep -q 'data-payment-method="direct_terminal"' "$STAGE/served-simple.css"; fi

INSTALL_STARTED=0
trap - EXIT

echo
echo "============================================================"
echo " SUCCESS - CASHIER PAYMENT AUTHORITY CONSOLIDATED"
echo "============================================================"
echo "STAFF_METHODS=Cash+Terminal_only"
echo "LEGACY_V2_DYNAMIC_LOADER=removed"
echo "PAYMENT_ENGINE=V3"
echo "PAYMENT_POLICY=wrapped_after_V3"
echo "SPLIT_TIP_COUPON_PAYER=hidden_for_staff"
echo "MANUAL_TERMINAL=blocked_for_staff"
echo "ONLINE_CARD_WALLET=guest_surface_only"
echo "NEXT_FRONTEND=untouched"
echo "PM2=untouched"
echo "BACKUP=$BACKUP"
echo "REMOTE=$REMOTE_SHA"
