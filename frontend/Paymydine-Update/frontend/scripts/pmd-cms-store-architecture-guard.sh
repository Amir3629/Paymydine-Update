#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "❌ $1"; exit 1; }
pass() { echo "✅ $1"; }

for f in \
  store/cms/types.ts \
  store/cms/defaults.ts \
  store/cms/merchant-settings.ts \
  store/cms/vat-settings.ts \
  store/cms/coupon-settings.ts \
  store/cms/cms-config-store.ts \
  store/cms/payment-settings-store.ts \
  store/cms/tax-settings-store.ts \
  store/cms/tip-settings-store.ts \
  store/cms/coupon-store.ts \
  store/cms/index.ts \
  docs/CMS_STORE_SPLIT.md
do
  [[ -f "$f" ]] || fail "missing CMS split file: $f"
done
pass "CMS split/focused consumer files are present"

if ! grep -q '@/store/cms/defaults' store/cms-store.ts; then
  fail "cms-store.ts still owns defaults instead of importing CMS defaults module"
fi
pass "cms-store imports defaults from focused module"

if ! grep -q 'buildMerchantSettingsFromSettingsPayload' store/cms-store.ts; then
  fail "cms-store.ts still owns merchant settings parsing"
fi
pass "merchant settings parsing extracted"

if ! grep -q 'buildVATSettingsFromApiData' store/cms-store.ts; then
  fail "cms-store.ts still owns VAT parsing"
fi
pass "VAT parsing extracted"

if ! grep -q 'buildAppliedCouponFromApiData' store/cms-store.ts; then
  fail "cms-store.ts still owns coupon data mapping"
fi
pass "coupon mapping extracted"

cms_lines=$(wc -l < store/cms-store.ts | awk '{print $1}')
if [[ "$cms_lines" -gt 260 ]]; then
  fail "cms-store.ts is $cms_lines lines; expected <= 260 after split"
fi
pass "cms-store.ts line count: $cms_lines"

active_facade_imports=$(grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  '@/store/cms-store' app components features lib types 2>/dev/null || true)

if [[ -n "$active_facade_imports" ]]; then
  echo "$active_facade_imports"
  fail "active UI still imports broad @/store/cms-store facade"
fi
pass "active UI imports focused CMS/payment/tax/tip/coupon hooks"

for needle in \
  'useCmsConfigStore' \
  'usePaymentSettingsStore' \
  'useTaxSettingsStore' \
  'useTipSettingsStore' \
  'useCouponStore'
do
  if ! grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git "$needle" app components features store 2>/dev/null | grep -q .; then
    fail "missing focused consumer usage: $needle"
  fi
done
pass "focused CMS consumer hooks are used"

echo "✅ CMS store architecture guard passed"
