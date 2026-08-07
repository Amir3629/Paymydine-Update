#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
CSS="$ROOT/app/admin/assets/css/pmd-order-edit-v2.css"
JS="$ROOT/app/admin/assets/js/pmd-order-edit-v2.js"
DETAILS="$ROOT/app/admin/views/orders/form/order_details.blade.php"

EXPECTED_CSS_SHA="0a4c14a77112eaede8cdfa2c33f1277d4787e6d381af4e6967c94cb73d4255ac"
EXPECTED_JS_SHA="7b5891fa8510533047a2eec823f26a0382d5e4e5a7d2e8ec41c98146e8f59d6d"
EXPECTED_DETAILS_SHA="a0816f18e62c48b604eaee6b24478dc081ced667f4a19af6578016462f7f74c9"
MARKER="PMD_ORDER_EDIT_V7_2_REFERENCE_POLISH"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/deploy-backups/order-edit-v7-2-$STAMP"
TMP="$(mktemp -d /tmp/pmd-order-edit-v7-2.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"

echo "# PayMyDine — Admin Order Edit V7.2 Reference Polish"
echo

CSS_SHA="$(sha256sum "$CSS" | awk '{print $1}')"
JS_SHA="$(sha256sum "$JS" | awk '{print $1}')"
DETAILS_SHA="$(sha256sum "$DETAILS" | awk '{print $1}')"

printf '%s\n' "Current production SHAs:" \
  "$CSS_SHA  $CSS" \
  "$JS_SHA  $JS" \
  "$DETAILS_SHA  $DETAILS"

grep -Fq "$MARKER" "$CSS" && { echo "V7.2 already installed."; exit 0; }

[[ "$CSS_SHA" == "$EXPECTED_CSS_SHA" ]] || { echo "ERROR: CSS baseline mismatch."; exit 1; }
[[ "$JS_SHA" == "$EXPECTED_JS_SHA" ]] || { echo "ERROR: JS baseline mismatch."; exit 1; }
[[ "$DETAILS_SHA" == "$EXPECTED_DETAILS_SHA" ]] || { echo "ERROR: order_details baseline mismatch."; exit 1; }

cp -a "$CSS" "$TMP/pmd-order-edit-v2.css"
cp -a "$JS" "$TMP/pmd-order-edit-v2.js"
cp -a "$DETAILS" "$TMP/order_details.blade.php"

python3 - "$TMP/order_details.blade.php" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
s=p.read_text()
old=re.compile(r'''<div style="border:1px solid #eceef4;border-radius:10px;padding:8px 10px;margin-bottom:8px;">\s*<div style="display:flex;justify-content:space-between;gap:10px;">\s*<div>\s*<strong>#\{\{ \(int\)\$tx->id \}\}</strong>\s*· \{\{ strtoupper\(\(string\)\$tx->payment_method\) \}\}\s*· \{\{ currency_format\(\(float\)\$tx->amount\) \}\}\s*</div>\s*<a href="\{\{ url\('admin/orders/split-receipt/' \. \(int\)\$tx->id\) \}\}" target="_blank">Receipt</a>\s*</div>''',re.S)
new='''<div class="pmd-oe-payment-card">
    <span class="pmd-oe-payment-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M7 9h.01"/><path d="M17 15h.01"/></svg>
    </span>
    <div class="pmd-oe-payment-meta">
        <strong>#{{ (int)$tx->id }} · {{ strtoupper((string)$tx->payment_method) }}</strong>
        <span>{{ currency_format((float)$tx->amount) }}</span>
    </div>
    <a class="pmd-oe-receipt-link" href="{{ url('admin/orders/split-receipt/' . (int)$tx->id) }}" target="_blank" rel="noopener">Beleg anzeigen</a>'''
s,n=old.subn(new,s,count=1)
if n!=1: raise SystemExit(f"ERROR: payment structure match count={n}")

s,n=re.subn(r'''\s*@if \(abs\(\$pmdTxPaymentAdjustment\) >= 0\.01\)\s*<div style="margin-top:6px;font-size:12px;color:#5f6368;">\s*Payment adjustment \(tip/coupon\): \{\{ \$pmdTxPaymentAdjustment >= 0 \? '\+' : '-' \}\}\{\{ currency_format\(abs\(\$pmdTxPaymentAdjustment\)\) \}\}\s*</div>\s*@endif''','',s,count=1,flags=re.S)
if n!=1: raise SystemExit(f"ERROR: adjustment block match count={n}")
p.write_text(s)
PY

python3 - "$TMP/pmd-order-edit-v2.js" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
old="""                row.classList.add('pmd-oe-payments-row');
                Array.prototype.forEach.call(valueCell.children, function (card) {
                    card.classList.add('pmd-oe-payment-card');
                    card.removeAttribute('style');
                    card.querySelectorAll('ul').forEach(function (list) { list.hidden = true; });
                    if (!card.querySelector('.pmd-oe-payment-icon')) {
                        var paymentIcon = document.createElement('span');
                        paymentIcon.className = 'pmd-oe-payment-icon';
                        paymentIcon.innerHTML = icon('cash');
                        card.insertBefore(paymentIcon, card.firstChild);
                    }
                });
"""
new="""                row.classList.add('pmd-oe-payments-row');
                valueCell.querySelectorAll(':scope > div').forEach(function (list) {
                    list.removeAttribute('style');
                    list.classList.add('pmd-oe-payment-list');
                });
                valueCell.querySelectorAll('.pmd-oe-payment-card').forEach(function (card) {
                    card.removeAttribute('style');
                    card.querySelectorAll('ul').forEach(function (list) { list.hidden = true; });
                });
"""
if s.count(old)!=1: raise SystemExit('ERROR: JS payment normalizer baseline not found exactly once')
s=s.replace(old,new,1)
p.write_text(s)
PY

cat >> "$TMP/pmd-order-edit-v2.css" <<'CSS'

/* PMD_ORDER_EDIT_V7_2_REFERENCE_POLISH */
html.pmd-order-edit-v7 .form-widget>form{gap:15px !important;}
html.pmd-order-edit-v7 .form-fields{margin-top:0 !important;padding-top:0 !important;}
html.pmd-order-edit-v7 .pmd-oe-tabs{
  display:inline-block !important;
  width:max-content !important;
  max-width:100% !important;
  margin-top:-28px !important;
  margin-bottom:0 !important;
}
html.pmd-order-edit-v7 .pmd-oe-panes{margin-top:14px !important;}
html.pmd-order-edit-v7 .pmd-oe-workspace{
  grid-template-columns:minmax(0,2.08fr) minmax(390px,.96fr) !important;
  gap:20px !important;
}
html.pmd-order-edit-v7 .pmd-oe-summary-payment>h2{display:none !important;}
html.pmd-order-edit-v7 .pmd-oe-summary-payment::before{margin-bottom:12px !important;}
html.pmd-order-edit-v7 .pmd-oe-payment-list{
  display:block !important;
  width:100% !important;
  margin:0 !important;
  padding:0 !important;
  text-align:left !important;
}
html.pmd-order-edit-v7 .pmd-oe-payment-card{
  display:grid !important;
  grid-template-columns:44px minmax(125px,1fr) auto !important;
  align-items:center !important;
  gap:10px 12px !important;
  width:100% !important;
  margin:8px 0 14px !important;
  padding:12px !important;
  border:1px solid #e1e8e5 !important;
  border-radius:13px !important;
  background:#fbfcfc !important;
  font-size:12px !important;
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
  gap:3px !important;
}
html.pmd-order-edit-v7 .pmd-oe-payment-meta strong{
  color:#203531 !important;
  font-size:12px !important;
  font-weight:850 !important;
  line-height:1.25 !important;
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
html.pmd-order-edit-v7 .pmd-oe-summary-section{padding:15px 0 !important;}
html.pmd-order-edit-v7 .pmd-oe-summary{padding:19px 20px !important;}
html.pmd-order-edit-v7 .pmd-oe-summary .order-details-table td:first-child{width:48% !important;}
@media(max-width:1120px){
  html.pmd-order-edit-v7 .pmd-oe-tabs{margin-top:-10px !important;}
  html.pmd-order-edit-v7 .pmd-oe-workspace{grid-template-columns:1fr !important;}
}
@media(max-width:720px){
  html.pmd-order-edit-v7 .pmd-oe-tabs{display:block !important;width:100% !important;margin-top:0 !important;}
  html.pmd-order-edit-v7 .pmd-oe-payment-card{grid-template-columns:42px minmax(0,1fr) !important;}
  html.pmd-order-edit-v7 .pmd-oe-receipt-link{grid-column:1/-1 !important;width:100% !important;}
}
CSS

php -l "$TMP/order_details.blade.php" >/dev/null
node --check "$TMP/pmd-order-edit-v2.js"
grep -Fq "$MARKER" "$TMP/pmd-order-edit-v2.css"
grep -Fq 'pmd-oe-payment-meta' "$TMP/order_details.blade.php"
! grep -Fq 'Payment adjustment (tip/coupon):' "$TMP/order_details.blade.php"
! grep -Eq 'MutationObserver|setInterval\s*\(' "$TMP/pmd-order-edit-v2.js"

echo "Prepared V7.2 validation: PASSED"

mkdir -p "$BACKUP"
cp -a "$CSS" "$BACKUP/pmd-order-edit-v2.css"
cp -a "$JS" "$BACKUP/pmd-order-edit-v2.js"
cp -a "$DETAILS" "$BACKUP/order_details.blade.php"

install_keep(){
  local src="$1" dst="$2"
  sudo install -o "$(stat -c '%u' "$dst")" -g "$(stat -c '%g' "$dst")" -m "$(stat -c '%a' "$dst")" "$src" "$dst"
}
install_keep "$TMP/pmd-order-edit-v2.css" "$CSS"
install_keep "$TMP/pmd-order-edit-v2.js" "$JS"
install_keep "$TMP/order_details.blade.php" "$DETAILS"

php artisan view:clear
FPM_SERVICE="$(systemctl list-units --type=service --state=active --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1; exit}')"
[[ -z "$FPM_SERVICE" ]] || sudo systemctl reload "$FPM_SERVICE"

echo
echo "Order Edit V7.2: DEPLOYED"
echo "Tabs width: COMPACT"
echo "Top whitespace: REDUCED"
echo "Payment transaction: CLEAN 3-COLUMN CARD"
echo "Machine payment-adjustment line: HIDDEN"
echo "Receipt action: CLEAN BUTTON"
echo "Global header/sidebar: UNCHANGED"
echo "Page background: #f5f7fa"
echo "Payment calculations/database: UNCHANGED"
echo "New observers/polling: NONE"
echo "Backup: $BACKUP"
echo
echo "Final SHAs:"
sha256sum "$CSS" "$JS" "$DETAILS"
