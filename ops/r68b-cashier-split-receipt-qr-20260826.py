#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
R60T = ROOT / 'app/main/routes/api-v1-guest-order-flow-r60t.php'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'
CSS = ROOT / 'app/admin/assets/css/pmd-cashier-lab-order-center.css'

for path in (R60T, CASHIER, CSS):
    if not path.is_file():
        raise SystemExit(f'STOP missing: {path}')

backup = Path('/root') / ('paymydine-r68b-split-qr-' + datetime.now().strftime('%Y%m%d_%H%M%S'))
for path in (R60T, CASHIER, CSS):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

# ---------------------------------------------------------------------------
# 1) Cashier Split visual polish.
#    This does NOT alter Payment V3 or its settlement calculations.
# ---------------------------------------------------------------------------
css = CSS.read_text(encoding='utf-8')
marker = 'PMD_R68B_CASHIER_SPLIT_POLISH'
if marker not in css:
    css += r'''

/* PMD_R68B_CASHIER_SPLIT_POLISH */
.pmd-pos-payment-modal [data-pos-cashier-split-tabs] {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  margin-top: 10px;
}

.pmd-pos-payment-modal [data-pos-cashier-split-tabs] > button {
  min-height: 54px;
  padding: 10px 12px;
  border: 1px solid #c9dce5;
  border-radius: 14px;
  background: #ffffff;
  color: #143247;
  font: inherit;
  font-weight: 800;
  line-height: 1.15;
  text-align: center;
  white-space: normal;
  transition: border-color .14s ease, background-color .14s ease, color .14s ease, box-shadow .14s ease;
}

.pmd-pos-payment-modal [data-pos-cashier-split-tabs] > button:hover {
  border-color: #14836f;
}

.pmd-pos-payment-modal [data-pos-cashier-split-tabs] > button.is-active {
  border-color: #0b816c;
  background: #eaf7f3;
  color: #086b5a;
  box-shadow: inset 0 0 0 1px #0b816c;
}

.pmd-pos-payment-modal [data-pos-split-panel] {
  margin-top: 10px;
}

.pmd-pos-payment-modal [data-pos-split-panel] .pmd-pos-split-equal,
.pmd-pos-payment-modal [data-pos-split-panel] .pmd-pos-split-custom,
.pmd-pos-payment-modal [data-pos-split-panel] .pmd-pos-split-items {
  border-radius: 14px;
  background: #f5f9fb;
}

@media (max-width: 640px) {
  .pmd-pos-payment-modal [data-pos-cashier-split-tabs] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
'''
    CSS.write_text(css, encoding='utf-8')

# Force a fresh copy of the real Cashier Order Center stylesheet.
text = CASHIER.read_text(encoding='utf-8')
needle = 'pmd-cashier-lab-order-center.css'
pos = text.find(needle)
if pos < 0:
    raise SystemExit('STOP Cashier Order Center CSS asset not found')
qpos = text.find('?v=', pos)
if qpos < 0 or qpos > pos + 300:
    raise SystemExit('STOP Cashier Order Center CSS cache key not found')
end = text.find("'", qpos)
if end < 0:
    raise SystemExit('STOP Cashier Order Center CSS cache terminator not found')
text = text[:qpos] + '?v=20260826-r68b-split-qr-final' + text[end:]
CASHIER.write_text(text, encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Staff-created shared bill gets a signed final-invoice pointer per valid
#    scanner/device session as well. The existing final-invoice route remains
#    authoritative and still returns 409 until the WHOLE bill is paid.
# ---------------------------------------------------------------------------
php = R60T.read_text(encoding='utf-8')

old = "if ($origin === 'guest_self' && trim($guestSessionId) !== '') {"
new = "if (in_array($origin, ['guest_self', 'staff_shared'], true) && trim($guestSessionId) !== '') {"
if new not in php:
    if php.count(old) != 1:
        raise SystemExit(f'STOP invoice pointer origin target count: {php.count(old)}')
    php = php.replace(old, new, 1)

old_call = "$shared[] = $pmdR60tPayload($order, $context, 'staff_shared');"
new_call = "$shared[] = $pmdR60tPayload($order, $context, 'staff_shared', $guestSessionId);"
if new_call not in php:
    if php.count(old_call) != 1:
        raise SystemExit(f'STOP shared payload target count: {php.count(old_call)}')
    php = php.replace(old_call, new_call, 1)

# Split is payable only while money actually remains. Paid staff history must
# never keep a payment/split action enabled.
old_can_split = "$payload['canSplit'] = $origin === 'staff_shared';"
new_can_split = """$remainingForPayment = max(0, (float)($order->order_total ?? 0) - (float)($order->settled_amount ?? 0));
    $payload['canSplit'] = $origin === 'staff_shared' && $remainingForPayment > 0.0001;
    $payload['remainingPayableAmount'] = round($remainingForPayment, 4);"""
if "remainingPayableAmount" not in php:
    if php.count(old_can_split) != 1:
        raise SystemExit(f'STOP canSplit target count: {php.count(old_can_split)}')
    php = php.replace(old_can_split, new_can_split, 1)

# ---------------------------------------------------------------------------
# 3) Table visit, not payment completion, owns shared bill history.
#    Partial bill remains payable by QR. Fully-paid current-visit staff bill
#    remains visible as history/final invoice. Explicit Free/Customer Left is
#    the boundary that removes it and prevents it appearing to the next visit.
# ---------------------------------------------------------------------------
flow_marker = 'PMD_R68B_SHARED_STAFF_VISIT_HISTORY'
if flow_marker not in php:
    old_block = '''        // Staff/Cashier/Waiter orders are shared only while money remains due.\n        // Once fully settled, a later scanner must not inherit an old staff bill.\n        $total = max(0, (float)($order->order_total ?? 0));\n        $settled = max(0, (float)($order->settled_amount ?? 0));\n        $settlement = strtolower(trim((string)($order->settlement_status ?? '')));\n        $financiallyOpen = !in_array($settlement, ['paid', 'settled', 'cancelled', 'canceled', 'failed', 'refunded', 'void', 'voided'], true)\n            && ($total <= 0 || $settled < $total - 0.0001);\n        if (!$financiallyOpen) continue;\n        $shared[] = $pmdR60tPayload($order, $context, 'staff_shared', $guestSessionId);'''

    alt_block = old_block.replace(
        "$pmdR60tPayload($order, $context, 'staff_shared', $guestSessionId)",
        "$pmdR60tPayload($order, $context, 'staff_shared')"
    )

    new_block = '''        // PMD_R68B_SHARED_STAFF_VISIT_HISTORY\n        // Payment completion never ends the physical visit. Keep this staff bill\n        // in the current visit as payment/history; the explicit table release is\n        // the only lifecycle boundary.\n        $total = max(0, (float)($order->order_total ?? 0));\n        $settled = max(0, (float)($order->settled_amount ?? 0));\n        $settlement = strtolower(trim((string)($order->settlement_status ?? '')));\n        $financiallyOpen = !in_array($settlement, ['paid', 'settled', 'cancelled', 'canceled', 'failed', 'refunded', 'void', 'voided'], true)\n            && ($total <= 0 || $settled < $total - 0.0001);\n\n        $belongsToCurrentVisit = true;\n        try {\n            $physicalTableId = max(0, (int)($context['table']->table_id ?? $context['table']->id ?? 0));\n            if ($physicalTableId > 0 && \\Illuminate\\Support\\Facades\\Schema::hasTable('pmd_table_status_history')) {\n                $historyColumns = \\Illuminate\\Support\\Facades\\Schema::getColumnListing('pmd_table_status_history');\n                if (in_array('table_id', $historyColumns, true) && in_array('created_at', $historyColumns, true)) {\n                    $releaseQuery = DB::table('pmd_table_status_history')->where('table_id', $physicalTableId);\n                    $releaseQuery->where(function ($history) use ($historyColumns) {\n                        $added = false;\n                        if (in_array('reason', $historyColumns, true)) {\n                            $history->whereIn('reason', [\n                                'customer_left',\n                                'customer_left_skip_cleaning',\n                                'cashier_manual_free',\n                                'cleaning_complete',\n                            ]);\n                            $added = true;\n                        }\n                        if (in_array('new_status', $historyColumns, true)) {\n                            if ($added) $history->orWhereIn('new_status', ['cleaning', 'available']);\n                            else $history->whereIn('new_status', ['cleaning', 'available']);\n                            $added = true;\n                        }\n                        if (!$added) $history->whereRaw('1 = 0');\n                    });\n                    $lastReleaseAt = $releaseQuery->orderByDesc('created_at')->value('created_at');\n                    $lastReleaseTs = $lastReleaseAt ? (strtotime((string)$lastReleaseAt) ?: 0) : 0;\n                    $orderCreatedTs = !empty($order->created_at) ? (strtotime((string)$order->created_at) ?: 0) : 0;\n                    if ($lastReleaseTs > 1787723959 && $orderCreatedTs > 0) {\n                        $belongsToCurrentVisit = $orderCreatedTs > $lastReleaseTs;\n                    }\n                }\n            }\n        } catch (\\Throwable $ignored) {\n            // Legacy fallback: never resurrect a fully-paid historical bill if\n            // lifecycle history cannot be resolved.\n            $belongsToCurrentVisit = $financiallyOpen;\n        }\n\n        if (!$belongsToCurrentVisit) continue;\n        $shared[] = $pmdR60tPayload($order, $context, 'staff_shared', $guestSessionId);'''

    if old_block in php:
        php = php.replace(old_block, new_block, 1)
    elif alt_block in php:
        php = php.replace(alt_block, new_block, 1)
    else:
        raise SystemExit('STOP staff shared financial block not found')

R60T.write_text(php, encoding='utf-8')

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def run(cmd):
    print('+', ' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT, check=True)

run(['php', '-l', str(R60T)])
run(['php', '-l', str(CASHIER)])

print('')
print('R68B CASHIER SPLIT + SHARED QR PAYMENT FLOW APPLIED')
print('Backup:', backup)
print('- Cashier Split UI polished; Payment V3 implementation untouched')
print('- canonical partial settlement/transaction receipt remains unchanged')
print('- remaining staff balance stays payable on the same canonical order')
print('- same-table QR scanners can pay the remaining shared staff bill')
print('- fully-paid current-visit staff order remains visible for final invoice')
print('- paid history has canSplit=false / remainingPayableAmount=0')
print('- explicit Customer Left / Free remains the history/session cutoff')
print('- final invoice still unlocks only after full settlement')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
