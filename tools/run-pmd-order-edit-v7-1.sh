#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
CSS="$ROOT/app/admin/assets/css/pmd-order-edit-v2.css"
DETAILS="$ROOT/app/admin/views/orders/form/order_details.blade.php"

EXPECTED_CSS_SHA="0a4c14a77112eaede8cdfa2c33f1277d4787e6d381af4e6967c94cb73d4255ac"
EXPECTED_DETAILS_SHA="$(sha256sum "$DETAILS" | awk '{print $1}')"
MARKER="PMD_ORDER_EDIT_V7_1_POLISH"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/deploy-backups/order-edit-v7-1-$STAMP"
TMP="$(mktemp -d /tmp/pmd-order-edit-v7-1.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"

echo "# PayMyDine — Admin Order Edit V7.1 Polish"
echo

CURRENT_CSS_SHA="$(sha256sum "$CSS" | awk '{print $1}')"
CURRENT_DETAILS_SHA="$(sha256sum "$DETAILS" | awk '{print $1}')"

echo "Current CSS:     $CURRENT_CSS_SHA"
echo "Current Details: $CURRENT_DETAILS_SHA"

if grep -Fq "$MARKER" "$CSS"; then
  echo "V7.1 is already installed. Nothing to do."
  exit 0
fi

if [[ "$CURRENT_CSS_SHA" != "$EXPECTED_CSS_SHA" ]]; then
  echo "ERROR: CSS changed after V7. Refusing to overwrite unknown production changes."
  echo "Expected: $EXPECTED_CSS_SHA"
  echo "Current:  $CURRENT_CSS_SHA"
  exit 1
fi

cp -a "$DETAILS" "$TMP/order_details.blade.php"
cp -a "$CSS" "$TMP/pmd-order-edit-v2.css"

python3 - "$TMP/order_details.blade.php" <<'PY'
from pathlib import Path
import re, sys
p = Path(sys.argv[1])
s = p.read_text()

pattern = re.compile(r'''<div style="border:1px solid #eceef4;border-radius:10px;padding:8px 10px;margin-bottom:8px;">\s*<div style="display:flex;justify-content:space-between;gap:10px;">\s*<div>\s*<strong>#\{\{ \(int\)\$tx->id \}\}</strong>\s*· \{\{ strtoupper\(\(string\)\$tx->payment_method\) \}\}\s*· \{\{ currency_format\(\(float\)\$tx->amount\) \}\}\s*</div>\s*<a href="\{\{ url\('admin/orders/split-receipt/' \. \(int\)\$tx->id\) \}\}" target="_blank">Receipt</a>\s*</div>''', re.S)

replacement = '''<div class="pmd-oe-payment-card">
    <span class="pmd-oe-payment-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="6" width="18" height="12" rx="2"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M7 9h.01"/><path d="M17 15h.01"/>
        </svg>
    </span>
    <div class="pmd-oe-payment-meta">
        <strong>#{{ (int)$tx->id }} · {{ strtoupper((string)$tx->payment_method) }}</strong>
        <span>{{ currency_format((float)$tx->amount) }}</span>
    </div>
    <a class="pmd-oe-receipt-link" href="{{ url('admin/orders/split-receipt/' . (int)$tx->id) }}" target="_blank" rel="noopener">Beleg anzeigen</a>'''

s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit(f"ERROR: expected payment-card block exactly once, matched {n}")

# The tip/coupon adjustment is already represented by the canonical totals below.
# Keeping the calculation is harmless, but the machine-oriented line is removed from UI.
s2, n2 = re.subn(r'''\s*@if \(abs\(\$pmdTxPaymentAdjustment\) >= 0\.01\)\s*<div style="margin-top:6px;font-size:12px;color:#5f6368;">\s*Payment adjustment \(tip/coupon\): \{\{ \$pmdTxPaymentAdjustment >= 0 \? '\+' : '-' \}\}\{\{ currency_format\(abs\(\$pmdTxPaymentAdjustment\)\) \}\}\s*</div>\s*@endif''', '', s2, count=1, flags=re.S)
if n2 != 1:
    raise SystemExit(f"ERROR: expected adjustment block exactly once, matched {n2}")

p.write_text(s2)
PY

cat >> "$TMP/pmd-order-edit-v2.css" <<'CSS'

/* PMD_ORDER_EDIT_V7_1_POLISH */
html.pmd-order-edit-v7 .form-widget>form{gap:16px !important;}
html.pmd-order-edit-v7 .form-fields{margin-top:0 !important;padding-top:0 !important;}
html.pmd-order-edit-v7 .pmd-oe-tabs{
  display:inline-block !important;
  width:max-content !important;
  max-width:100% !important;
  margin-top:-30px !important;
  margin-bottom:0 !important;
}
html.pmd-order-edit-v7 .pmd-oe-panes{margin-top:14px !important;}
html.pmd-order-edit-v7 .pmd-oe-workspace{
  grid-template-columns:minmax(0,2.12fr) minmax(380px,.94fr) !important;
  gap:20px !important;
}
html.pmd-order-edit-v7 .pmd-oe-summary-payment>h2{display:none !important;}
html.pmd-order-edit-v7 .pmd-oe-summary-payment::before{margin-bottom:12px !important;}
html.pmd-order-edit-v7 .pmd-oe-payments-row>td:first-child,
html.pmd-order-edit-v7 .pmd-oe-payments-row>th:first-child{
  margin:0 0 9px !important;
  padding:0 !important;
  color:#647874 !important;
  font-size:12px !important;
  font-weight:800 !important;
}
html.pmd-order-edit-v7 .pmd-oe-payment-card{
  display:grid !important;
  grid-template-columns:44px minmax(120px,1fr) auto !important;
  align-items:center !important;
  gap:10px 12px !important;
  width:100% !important;
  margin:0 0 14px !important;
  padding:12px !important;
  border:1px solid #e1e8e5 !important;
  border-radius:13px !important;
  background:#fbfcfc !important;
  line-height:1.3 !important;
}
html.pmd-order-edit-v7 .pmd-oe-payment-icon{
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  width:44px !important;
  height:44px !important;
  color:#477a45 !important;
  border-radius:50% !important;
  background:#eef7e9 !important;
}
html.pmd-order-edit-v7 .pmd-oe-payment-icon svg{width:19px !important;height:19px !important;}
html.pmd-order-edit-v7 .pmd-oe-payment-meta{
  display:flex !important;
  flex-direction:column !important;
  min-width:0 !important;
  gap:2px !important;
}
html.pmd-order-edit-v7 .pmd-oe-payment-meta strong{
  color:#203531 !important;
  font-size:12px !important;
  font-weight:850 !important;
  white-space:nowrap !important;
}
html.pmd-order-edit-v7 .pmd-oe-payment-meta span{
  color:#5f716d !important;
  font-size:12px !important;
  font-weight:750 !important;
  white-space:nowrap !important;
}
html.pmd-order-edit-v7 .pmd-oe-receipt-link{
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  min-height:34px !important;
  padding:7px 11px !important;
  color:#344b45 !important;
  border:1px solid #dce4e1 !important;
  border-radius:9px !important;
  background:#fff !important;
  font-size:11px !important;
  font-weight:800 !important;
  text-decoration:none !important;
  white-space:nowrap !important;
}
html.pmd-order-edit-v7 .pmd-oe-receipt-link:hover{
  color:#075b4e !important;
  border-color:#bfd5ce !important;
  background:#f2f8f6 !important;
}
html.pmd-order-edit-v7 .pmd-oe-summary-section{padding:16px 0 !important;}
html.pmd-order-edit-v7 .pmd-oe-summary{padding:19px 20px !important;}
@media(max-width:1120px){
  html.pmd-order-edit-v7 .pmd-oe-tabs{margin-top:-12px !important;}
  html.pmd-order-edit-v7 .pmd-oe-workspace{grid-template-columns:1fr !important;}
}
@media(max-width:720px){
  html.pmd-order-edit-v7 .pmd-oe-tabs{display:block !important;width:100% !important;margin-top:0 !important;}
  html.pmd-order-edit-v7 .pmd-oe-payment-card{grid-template-columns:42px minmax(0,1fr) !important;}
  html.pmd-order-edit-v7 .pmd-oe-receipt-link{grid-column:1 / -1 !important;width:100% !important;}
}
CSS

php -l "$TMP/order_details.blade.php" >/dev/null

grep -Fq "$MARKER" "$TMP/pmd-order-edit-v2.css"
grep -Fq 'pmd-oe-payment-meta' "$TMP/order_details.blade.php"
if grep -Fq 'Payment adjustment (tip/coupon):' "$TMP/order_details.blade.php"; then
  echo "ERROR: machine adjustment line still present."
  exit 1
fi

echo "Prepared V7.1 validation: PASSED"
mkdir -p "$BACKUP"
cp -a "$CSS" "$BACKUP/pmd-order-edit-v2.css"
cp -a "$DETAILS" "$BACKUP/order_details.blade.php"

a_install(){
  local src="$1" dst="$2"
  sudo install -o "$(stat -c '%u' "$dst")" -g "$(stat -c '%g' "$dst")" -m "$(stat -c '%a' "$dst")" "$src" "$dst"
}

a_install "$TMP/pmd-order-edit-v2.css" "$CSS"
a_install "$TMP/order_details.blade.php" "$DETAILS"

php artisan view:clear
FPM_SERVICE="$(systemctl list-units --type=service --state=active --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1; exit}')"
if [[ -n "$FPM_SERVICE" ]]; then sudo systemctl reload "$FPM_SERVICE"; fi

echo
echo "Order Edit V7.1: DEPLOYED"
echo "Tabs: COMPACT WIDTH"
echo "Header-to-tabs whitespace: REDUCED"
echo "Payment card: RESTRUCTURED IN BLADE"
echo "Payment machine adjustment text: REMOVED FROM UI"
echo "Receipt action: CLEAN BUTTON"
echo "Global header/sidebar: UNCHANGED"
echo "Database/payment calculations: UNCHANGED"
echo "Observers/polling added: NONE"
echo "Backup: $BACKUP"
echo
echo "Final SHAs:"
sha256sum "$CSS" "$DETAILS"
