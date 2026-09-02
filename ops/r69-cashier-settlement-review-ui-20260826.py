#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
COMPOSER = ROOT / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
CSS = ROOT / 'app/admin/assets/css/pmd-cashier-lab-order-center.css'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'
PAYMENT_V3 = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'

for path in (COMPOSER, CSS, CASHIER, PAYMENT_V3):
    if not path.is_file():
        raise SystemExit(f'STOP missing: {path}')

backup = Path('/root') / (
    'paymydine-r69-settlement-review-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)

for path in (COMPOSER, CSS, CASHIER):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

payment_hash_before = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f'STOP {label}: expected 1 target, found {count}'
        )
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# 1) Cashier Composer: expose canonical settlement state in the payment modal
#    and in the right rail. Payment V3 itself remains untouched.
# ---------------------------------------------------------------------------
s = COMPOSER.read_text(encoding='utf-8')

# Keep the fourth Split tab compact and on one line.
old_custom = '<button type="button" data-split-mode="custom">Custom amount</button>'
new_custom = '<button type="button" data-split-mode="custom">Custom</button>'
if new_custom not in s:
    s = replace_once(s, old_custom, new_custom, 'Custom split label')

# Financial activity strip inside the Pay modal.
ledger_anchor = "              '<div class=\"pmd-pos-payment-balance\" data-pos-payment-balance></div>',"
ledger_markup = ledger_anchor + "\n              '<div class=\"pmd-coc-payment-ledger\" data-coc-payment-ledger hidden></div>',"
if 'data-coc-payment-ledger' not in s:
    s = replace_once(
        s,
        ledger_anchor,
        ledger_markup,
        'payment ledger markup'
    )

# Compact settlement/review card in the order rail, immediately above actions.
rail_anchor = "        '<div class=\"pmd-coc__rail-actions\">',"
rail_markup = (
    "        '<div class=\"pmd-coc__settlement-review\" "
    "data-coc-settlement-review hidden></div>',\n" + rail_anchor
)
if 'data-coc-settlement-review' not in s:
    s = replace_once(
        s,
        rail_anchor,
        rail_markup,
        'rail settlement review markup'
    )

helper_marker = 'PMD_R69_CASHIER_SETTLEMENT_REVIEW'
if helper_marker not in s:
    helper = r'''  // PMD_R69_CASHIER_SETTLEMENT_REVIEW
  // Read-only presentation adapter over the canonical Payment V3 summary.
  // No settlement calculation is duplicated here.
  function pmdR69SettlementSnapshot() {
    var summary =
      state.payment && state.payment.summary
        ? state.payment.summary
        : null;

    var settlement =
      summary && summary.settlement
        ? summary.settlement
        : null;

    var activeOrderId = num(state.activeOrderId, 0);

    if (!activeOrderId || !settlement) {
      return null;
    }

    var summaryOrder = summary.order || {};
    var summaryOrderId = num(
      summaryOrder.order_id != null
        ? summaryOrder.order_id
        : summaryOrder.id,
      0
    );

    if (
      summaryOrderId > 0 &&
      summaryOrderId !== activeOrderId
    ) {
      return null;
    }

    var total = num(
      settlement.order_total,
      num(summaryOrder.order_total, existingTotal())
    );

    if (total <= 0) {
      total = existingTotal();
    }

    var paid = num(
      settlement.settled_amount,
      num(
        settlement.settledAmount,
        num(summaryOrder.settled_amount, 0)
      )
    );

    var remaining = num(
      settlement.remaining_amount,
      num(
        settlement.remainingAmount,
        Math.max(0, total - paid)
      )
    );

    total = Math.max(0, roundMoney(total));
    paid = Math.max(0, roundMoney(paid));
    remaining = Math.max(0, roundMoney(remaining));

    if (total > 0 && paid > total) {
      paid = total;
    }

    var status =
      total > 0 && remaining <= 0.005
        ? 'paid'
        : paid > 0.005
          ? 'partial'
          : 'unpaid';

    return {
      orderId: activeOrderId,
      total: total,
      paid: paid,
      remaining: remaining,
      status: status,
      transactions: Array.isArray(summary.transactions)
        ? summary.transactions
        : []
    };
  }

  function pmdR69StatusLabel(status) {
    if (status === 'paid') return 'Paid';
    if (status === 'partial') return 'Part paid';
    return 'Unpaid';
  }

  function pmdR69ReceiptLinks(snapshot) {
    return snapshot.transactions
      .filter(function (tx) {
        return !!(tx && tx.receipt_url);
      })
      .slice(0, 2)
      .map(function (tx, index) {
        var amount = num(tx.amount, 0);
        var method = String(
          tx.payment_method || tx.method || 'Payment'
        ).replace(/_/g, ' ');

        var label =
          'Receipt ' + (index + 1) +
          (amount > 0 ? ' · ' + money(amount) : '');

        return [
          '<a class="pmd-coc__settlement-receipt" ',
            'href="', esc(tx.receipt_url), '" ',
            'target="_blank" rel="noopener noreferrer">',
            '<span>', esc(method), '</span>',
            '<b>', esc(label), '</b>',
          '</a>'
        ].join('');
      })
      .join('');
  }

  function renderSettlementReview() {
    var snapshot = pmdR69SettlementSnapshot();
    var ledger = rootQuery('[data-coc-payment-ledger]');
    var review = rootQuery('[data-coc-settlement-review]');

    if (!snapshot) {
      if (ledger) {
        ledger.hidden = true;
        ledger.innerHTML = '';
      }

      if (review) {
        review.hidden = true;
        review.innerHTML = '';
      }

      return;
    }

    var label = pmdR69StatusLabel(snapshot.status);

    // The payment modal needs this strip only once financial activity exists.
    if (ledger) {
      if (snapshot.paid > 0.005 || snapshot.status === 'paid') {
        ledger.hidden = false;
        ledger.innerHTML = [
          '<div class="pmd-coc-payment-ledger__status is-',
            snapshot.status,
          '">', esc(label), '</div>',
          '<div><span>Order total</span><b>', money(snapshot.total), '</b></div>',
          '<div><span>Paid</span><b>', money(snapshot.paid), '</b></div>',
          '<div><span>Remaining</span><b>', money(snapshot.remaining), '</b></div>'
        ].join('');
      } else {
        ledger.hidden = true;
        ledger.innerHTML = '';
      }
    }

    if (!review) return;

    var receiptLinks = pmdR69ReceiptLinks(snapshot);
    var finalAction =
      snapshot.status === 'paid'
        ? '<button type="button" class="pmd-coc__settlement-action is-primary" data-coc-final-invoice>Final invoice</button>'
        : '<span class="pmd-coc__settlement-invoice-hint">Final invoice after full payment</span>';

    review.hidden = false;
    review.innerHTML = [
      '<div class="pmd-coc__settlement-head">',
        '<strong>Payment</strong>',
        '<span class="pmd-coc__settlement-pill is-', snapshot.status, '">',
          esc(label),
        '</span>',
      '</div>',
      '<div class="pmd-coc__settlement-money">',
        '<div><span>Paid</span><b>', money(snapshot.paid), '</b></div>',
        '<div><span>Remaining</span><b>', money(snapshot.remaining), '</b></div>',
      '</div>',
      receiptLinks
        ? '<div class="pmd-coc__settlement-receipts">' + receiptLinks + '</div>'
        : '',
      '<div class="pmd-coc__settlement-actions">',
        '<button type="button" class="pmd-coc__settlement-action" data-coc-review-bill>Review bill</button>',
        finalAction,
      '</div>'
    ].join('');
  }

'''

    s = replace_once(
        s,
        '  function updateFooter() {',
        helper + '  function updateFooter() {',
        'settlement review helper anchor'
    )

    s = replace_once(
        s,
        '  function updateFooter() {\n',
        '  function updateFooter() {\n    renderSettlementReview();\n',
        'settlement review update hook'
    )

# Ensure V3 refreshes update the read-only settlement UI too.
old_refresh_adapter = 'refreshData: refreshData'
new_refresh_adapter = '''refreshData: async function (silent) {
          await refreshData(silent);
          renderSettlementReview();
        }'''
if new_refresh_adapter not in s:
    s = replace_once(
        s,
        old_refresh_adapter,
        new_refresh_adapter,
        'Payment V3 refresh adapter'
    )

# Render the ledger immediately after the canonical Payment V3 opens.
old_open = '    state.paymentApi.openPayment();'
new_open = '''    await state.paymentApi.openPayment();
    renderSettlementReview();'''
if new_open not in s:
    s = replace_once(s, old_open, new_open, 'open payment wrapper')

# Reuse the existing full Order Center for review/history/receipts.
action_anchor = "    var primaryAction = event.target.closest('[data-coc-primary]');"
if 'data-coc-review-bill' in s and 'var reviewBillAction' not in s:
    action_handler = r'''    var reviewBillAction = event.target.closest('[data-coc-review-bill]');
    if (reviewBillAction) {
      event.preventDefault();
      event.stopPropagation();

      var reviewOrderId = num(state.activeOrderId, 0);
      if (
        reviewOrderId > 0 &&
        window.PMDCashierOrderCenter &&
        typeof window.PMDCashierOrderCenter.open === 'function'
      ) {
        closeComposer(true);
        window.PMDCashierOrderCenter.open(reviewOrderId);
      } else {
        toast('Order review is unavailable.', true);
      }
      return;
    }

    var finalInvoiceAction = event.target.closest('[data-coc-final-invoice]');
    if (finalInvoiceAction) {
      event.preventDefault();
      event.stopPropagation();
      openInvoice();
      return;
    }

'''
    s = replace_once(
        s,
        action_anchor,
        action_handler + action_anchor,
        'review bill action anchor'
    )

# The rail total is the whole order, not the remaining amount.
if "'Current bill'" in s:
    s = s.replace("'Current bill'", "'Order total'", 1)

COMPOSER.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# 2) Cashier visual polish: clear partial-state hierarchy and better spacing.
# ---------------------------------------------------------------------------
css = CSS.read_text(encoding='utf-8')
css_marker = 'PMD_R69_CASHIER_SETTLEMENT_REVIEW_UI'
if css_marker not in css:
    css += r'''

/* PMD_R69_CASHIER_SETTLEMENT_REVIEW_UI */

/* Split tabs stay compact; the fourth action must never wrap. */
.pmd-pos-payment-modal [data-pos-cashier-split-tabs] > button {
  min-height: 50px !important;
  padding: 9px 10px !important;
  white-space: nowrap !important;
  line-height: 1 !important;
}

/* The payment ledger appears only after money has actually been collected. */
.pmd-coc-payment-ledger:not([hidden]) {
  display: grid !important;
  grid-template-columns: auto repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-items: stretch;
  padding: 10px;
  border: 1px solid #cfe3dd;
  border-radius: 14px;
  background: #f7fbfa;
}

.pmd-coc-payment-ledger > div {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: #fff;
}

.pmd-coc-payment-ledger > div:not(.pmd-coc-payment-ledger__status) {
  display: grid;
  gap: 3px;
}

.pmd-coc-payment-ledger span {
  color: #6d8290;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.pmd-coc-payment-ledger b {
  color: #17384c;
  font-size: 13px;
}

.pmd-coc-payment-ledger__status {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}

.pmd-coc-payment-ledger__status.is-partial {
  color: #9a6500;
  background: #fff7df;
}

.pmd-coc-payment-ledger__status.is-paid {
  color: #08745a;
  background: #eaf7f3;
}

/* Tip/Coupon finishes before the Cash received block begins. */
.pmd-coc .pmd-pos-adjustments:not([hidden]) {
  padding-bottom: 18px !important;
  margin-bottom: 8px !important;
  gap: 18px !important;
}

.pmd-coc .pmd-pos-adjustments:not([hidden]) + [data-pos-collection-fields] {
  margin-top: 6px !important;
}

/* Compact settlement card in the order rail. */
.pmd-coc__settlement-review:not([hidden]) {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #d7e4e9;
  border-radius: 14px;
  background: #f8fbfc;
}

.pmd-coc__settlement-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pmd-coc__settlement-head > strong {
  color: #17384c;
  font-size: 12px;
}

.pmd-coc__settlement-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
}

.pmd-coc__settlement-pill.is-unpaid {
  color: #6d7f8a;
  background: #edf2f4;
}

.pmd-coc__settlement-pill.is-partial {
  color: #956000;
  background: #fff3cf;
}

.pmd-coc__settlement-pill.is-paid {
  color: #08745a;
  background: #dff5ed;
}

.pmd-coc__settlement-money {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pmd-coc__settlement-money > div {
  display: grid;
  gap: 2px;
  padding: 9px 10px;
  border: 1px solid #e0eaee;
  border-radius: 10px;
  background: #fff;
}

.pmd-coc__settlement-money span {
  color: #718693;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.pmd-coc__settlement-money b {
  color: #143247;
  font-size: 13px;
}

.pmd-coc__settlement-receipts {
  display: grid;
  gap: 6px;
}

.pmd-coc__settlement-receipt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid #dbe8ec;
  border-radius: 9px;
  background: #fff;
  color: #315267;
  text-decoration: none;
  font-size: 9px;
}

.pmd-coc__settlement-receipt b {
  color: #0b765f;
  font-size: 9px;
}

.pmd-coc__settlement-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.pmd-coc__settlement-action {
  min-height: 38px;
  border: 1px solid #bcd2dc;
  border-radius: 10px;
  background: #fff;
  color: #17384c;
  font: inherit;
  font-size: 10px;
  font-weight: 900;
}

.pmd-coc__settlement-action.is-primary {
  border-color: #0c7a62;
  background: #0c7a62;
  color: #fff;
}

.pmd-coc__settlement-invoice-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 6px 8px;
  border-radius: 10px;
  background: #eef3f5;
  color: #71838e;
  font-size: 9px;
  font-weight: 800;
  text-align: center;
}

@media (max-width: 640px) {
  .pmd-coc-payment-ledger:not([hidden]) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pmd-coc-payment-ledger__status {
    grid-column: 1 / -1;
  }
}
'''
    CSS.write_text(css, encoding='utf-8')

# ---------------------------------------------------------------------------
# 3) Fresh asset versions. No PM2/frontend-v2 build is involved.
# ---------------------------------------------------------------------------
text = CASHIER.read_text(encoding='utf-8')


def bump_asset(text, filename, version):
    pos = text.find(filename)
    if pos < 0:
        raise SystemExit(f'STOP asset not found: {filename}')

    qpos = text.find('?v=', pos)
    if qpos < 0 or qpos > pos + 350:
        raise SystemExit(f'STOP cache key not found: {filename}')

    end = text.find("'", qpos)
    if end < 0:
        raise SystemExit(f'STOP cache terminator not found: {filename}')

    return text[:qpos] + '?v=' + version + text[end:]


text = bump_asset(
    text,
    'pmd-cashier-order-composer-r51.js',
    '20260826-r69-settlement-review'
)
text = bump_asset(
    text,
    'pmd-cashier-lab-order-center.css',
    '20260826-r69-settlement-review'
)
CASHIER.write_text(text, encoding='utf-8')

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def run(cmd):
    print('+', ' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT, check=True)


run(['node', '--check', str(COMPOSER)])
run(['php', '-l', str(CASHIER)])

payment_hash_after = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP: Payment V3 implementation changed unexpectedly')

print('')
print('R69 CASHIER SETTLEMENT REVIEW UI APPLIED')
print('Backup:', backup)
print('- Split tab label compacted to Custom')
print('- partial state appears in Pay modal: Total / Paid / Remaining')
print('- order rail shows Paid / Remaining and Part paid / Paid status')
print('- latest canonical transaction receipts are linked in the order rail')
print('- Review bill reuses the existing Cashier Order Center')
print('- Final invoice button appears only after Remaining reaches zero')
print('- Tip/Coupon spacing separated from Cash received')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
