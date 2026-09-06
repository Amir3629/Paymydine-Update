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
    'paymydine-r70-compact-payment-switcher-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)

for path in (COMPOSER, CSS, CASHIER):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

payment_hash_before = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()


def replace_between(text, start_token, end_token, replacement, label):
    start = text.find(start_token)
    if start < 0:
        raise SystemExit(f'STOP {label}: start token not found')
    end = text.find(end_token, start)
    if end < 0:
        raise SystemExit(f'STOP {label}: end token not found')
    return text[:start] + replacement + text[end:]


def bump_asset(text, filename, version):
    pos = text.find(filename)
    if pos < 0:
        raise SystemExit(f'STOP asset not found: {filename}')
    qpos = text.find('?v=', pos)
    if qpos < 0 or qpos > pos + 320:
        raise SystemExit(f'STOP asset cache key not found: {filename}')
    end = text.find("'", qpos)
    if end < 0:
        raise SystemExit(f'STOP asset cache terminator not found: {filename}')
    return text[:qpos] + '?v=' + version + text[end:]


# ---------------------------------------------------------------------------
# 1) Cashier composer: replace the R69 card with a compact, inline switcher.
#    Canonical settlement values still come exclusively from Payment V3.
# ---------------------------------------------------------------------------
s = COMPOSER.read_text(encoding='utf-8')

if 'PMD_R69_CASHIER_SETTLEMENT_REVIEW' not in s:
    raise SystemExit('STOP R69 settlement presentation is not installed')

r70_marker = 'PMD_R70_CASHIER_COMPACT_SETTLEMENT_SWITCHER'
if r70_marker not in s:
    new_render = r'''  // PMD_R70_CASHIER_COMPACT_SETTLEMENT_SWITCHER
  // Keep financial context tiny in the order rail. Unpaid orders need no
  // extra card; partial/paid orders get a small Balance/Receipts switcher.
  function renderSettlementReview() {
    var snapshot = pmdR69SettlementSnapshot();
    var ledger = rootQuery('[data-coc-payment-ledger]');
    var review = rootQuery('[data-coc-settlement-review]');

    // In Cashier mode Payment V3 renders paymentPayable() in this hero. The
    // value is the amount for this payer now, not the whole order total.
    var payNowLabel = rootQuery(
      '[data-pos-payment-balance] .pmd-pos-balance-hero > span'
    );
    if (payNowLabel) payNowLabel.textContent = 'Pay now';

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

    // Payment modal: one slim financial context strip, never a second card grid.
    if (ledger) {
      if (snapshot.paid > 0.005 || snapshot.status === 'paid') {
        ledger.hidden = false;
        ledger.innerHTML = [
          '<span class="pmd-coc-payment-ledger__status is-',
            snapshot.status,
          '">', esc(label), '</span>',
          '<span>Order <b>', money(snapshot.total), '</b></span>',
          '<span>Paid <b>', money(snapshot.paid), '</b></span>',
          '<span>Left <b>', money(snapshot.remaining), '</b></span>'
        ].join('');
      } else {
        ledger.hidden = true;
        ledger.innerHTML = '';
      }
    }

    if (!review) return;

    var receipts = snapshot.transactions.filter(function (tx) {
      return !!(tx && tx.receipt_url);
    });

    // No redundant Payment card for a completely untouched/unpaid order.
    if (snapshot.status === 'unpaid' && receipts.length === 0) {
      review.hidden = true;
      review.innerHTML = '';
      review.removeAttribute('data-mode');
      return;
    }

    var mode = review.getAttribute('data-mode');
    if (mode !== 'receipts') mode = 'balance';
    if (mode === 'receipts' && receipts.length === 0) mode = 'balance';
    review.setAttribute('data-mode', mode);

    var progressMax = snapshot.total > 0 ? snapshot.total : 1;
    var receiptLinks = pmdR69ReceiptLinks(snapshot);

    var balancePane = [
      '<div class="pmd-coc__settlement-pane" data-coc-settlement-pane="balance"',
        mode === 'balance' ? '' : ' hidden',
      '>',
        '<progress value="', snapshot.paid, '" max="', progressMax, '"></progress>',
        '<div class="pmd-coc__settlement-balance-copy">',
          '<span><b>', money(snapshot.paid), '</b> paid of ', money(snapshot.total), '</span>',
          '<strong>',
            snapshot.status === 'paid'
              ? 'Settled'
              : money(snapshot.remaining) + ' left',
          '</strong>',
        '</div>',
      '</div>'
    ].join('');

    var receiptsPane = receipts.length > 0
      ? [
          '<div class="pmd-coc__settlement-pane pmd-coc__settlement-receipts" ',
            'data-coc-settlement-pane="receipts"',
            mode === 'receipts' ? '' : ' hidden',
          '>',
            receiptLinks,
          '</div>'
        ].join('')
      : '';

    var invoiceAction = snapshot.status === 'paid'
      ? '<button type="button" class="pmd-coc__settlement-switch-action is-invoice" data-coc-final-invoice>Invoice</button>'
      : '';

    review.hidden = false;
    review.innerHTML = [
      '<div class="pmd-coc__settlement-compact-head">',
        '<span class="pmd-coc__settlement-pill is-', snapshot.status, '">',
          esc(label),
        '</span>',
        '<strong>',
          snapshot.status === 'paid'
            ? money(snapshot.paid) + ' settled'
            : money(snapshot.remaining) + ' remaining',
        '</strong>',
      '</div>',
      '<div class="pmd-coc__settlement-switch">',
        '<button type="button" class="pmd-coc__settlement-switch-action',
          mode === 'balance' ? ' is-active' : '',
        '" data-coc-settlement-view="balance">Balance</button>',
        receipts.length > 0
          ? '<button type="button" class="pmd-coc__settlement-switch-action' +
              (mode === 'receipts' ? ' is-active' : '') +
              '" data-coc-settlement-view="receipts">Receipts</button>'
          : '',
        invoiceAction,
      '</div>',
      balancePane,
      receiptsPane
    ].join('');
  }

'''

    s = replace_between(
        s,
        '  function renderSettlementReview() {',
        '  function updateFooter() {',
        new_render,
        'R69 renderSettlementReview replacement'
    )

    new_actions = r'''    var settlementViewAction = event.target.closest('[data-coc-settlement-view]');
    if (settlementViewAction) {
      event.preventDefault();
      event.stopPropagation();

      var settlementReview = rootQuery('[data-coc-settlement-review]');
      if (settlementReview) {
        settlementReview.setAttribute(
          'data-mode',
          settlementViewAction.getAttribute('data-coc-settlement-view') || 'balance'
        );
        renderSettlementReview();
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

    s = replace_between(
        s,
        "    var reviewBillAction = event.target.closest('[data-coc-review-bill]');",
        "    var primaryAction = event.target.closest('[data-coc-primary]');",
        new_actions,
        'R69 Review bill handler removal'
    )

COMPOSER.write_text(s, encoding='utf-8')


# ---------------------------------------------------------------------------
# 2) Replace the R69 visual block instead of stacking another CSS owner.
# ---------------------------------------------------------------------------
css = CSS.read_text(encoding='utf-8')
old_css_marker = '/* PMD_R69_CASHIER_SETTLEMENT_REVIEW_UI */'
new_css_marker = '/* PMD_R70_CASHIER_COMPACT_SETTLEMENT_SWITCHER_UI */'

if new_css_marker not in css:
    pos = css.find(old_css_marker)
    if pos < 0:
        raise SystemExit('STOP R69 settlement CSS block not found')

    css = css[:pos].rstrip() + '\n\n' + r'''/* PMD_R70_CASHIER_COMPACT_SETTLEMENT_SWITCHER_UI */

/* Split tabs remain one-line touch targets. */
.pmd-pos-payment-modal [data-pos-cashier-split-tabs] > button {
  min-height: 50px !important;
  padding: 9px 10px !important;
  white-space: nowrap !important;
  line-height: 1 !important;
}

/* One slim financial context row inside the Pay modal. */
.pmd-coc-payment-ledger:not([hidden]) {
  display: flex !important;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid #cfe3dd;
  border-radius: 12px;
  background: #f7fbfa;
  overflow-x: auto;
}

.pmd-coc-payment-ledger > span {
  flex: 0 0 auto;
  color: #637b89;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.pmd-coc-payment-ledger > span b {
  color: #17384c;
  font-size: 11px;
}

.pmd-coc-payment-ledger__status {
  min-height: 26px;
  padding: 5px 9px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900 !important;
}

.pmd-coc-payment-ledger__status.is-partial {
  color: #936000 !important;
  background: #fff4d3;
}

.pmd-coc-payment-ledger__status.is-paid {
  color: #08745a !important;
  background: #e6f6f0;
}

/* Tip/Coupon ends before Cash received starts. */
.pmd-coc .pmd-pos-adjustments:not([hidden]) {
  padding-bottom: 18px !important;
  margin-bottom: 8px !important;
  gap: 18px !important;
}

.pmd-coc .pmd-pos-adjustments:not([hidden]) + [data-pos-collection-fields] {
  margin-top: 6px !important;
}

/* No large payment card. The settlement surface exists only after activity. */
.pmd-coc__settlement-review:not([hidden]) {
  display: grid;
  gap: 7px;
  margin-top: 10px;
}

.pmd-coc__settlement-compact-head {
  min-height: 34px;
  padding: 0 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pmd-coc__settlement-compact-head > strong {
  color: #17384c;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}

.pmd-coc__settlement-pill {
  display: inline-flex;
  align-items: center;
  min-height: 25px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 900;
  white-space: nowrap;
}

.pmd-coc__settlement-pill.is-partial {
  color: #936000;
  background: #fff4d3;
}

.pmd-coc__settlement-pill.is-paid {
  color: #08745a;
  background: #e6f6f0;
}

/* Small segmented switcher: Balance / Receipts / Invoice. */
.pmd-coc__settlement-switch {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 3px;
  padding: 3px;
  border-radius: 11px;
  background: #edf3f5;
}

.pmd-coc__settlement-switch-action {
  min-width: 0;
  min-height: 34px;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #607785;
  font: inherit;
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
}

.pmd-coc__settlement-switch-action.is-active {
  background: #fff;
  color: #17384c;
  box-shadow: 0 1px 4px rgba(17, 48, 66, .08);
}

.pmd-coc__settlement-switch-action.is-invoice {
  color: #08745a;
}

/* Switched content stays tiny. */
.pmd-coc__settlement-pane:not([hidden]) {
  display: grid;
  gap: 7px;
  padding: 8px 10px;
  border: 1px solid #e0eaee;
  border-radius: 10px;
  background: #fff;
}

.pmd-coc__settlement-pane progress {
  width: 100%;
  height: 6px;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
}

.pmd-coc__settlement-pane progress::-webkit-progress-bar {
  background: #e8eff2;
  border-radius: 999px;
}

.pmd-coc__settlement-pane progress::-webkit-progress-value {
  background: #0c7a62;
  border-radius: 999px;
}

.pmd-coc__settlement-pane progress::-moz-progress-bar {
  background: #0c7a62;
  border-radius: 999px;
}

.pmd-coc__settlement-balance-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #6c818e;
  font-size: 9.5px;
  font-weight: 700;
}

.pmd-coc__settlement-balance-copy b,
.pmd-coc__settlement-balance-copy strong {
  color: #17384c;
  font-weight: 900;
}

.pmd-coc__settlement-receipts {
  gap: 5px !important;
}

.pmd-coc__settlement-receipt {
  min-height: 34px;
  padding: 6px 8px;
  border: 1px solid #dde8ec;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #17384c;
  text-decoration: none;
  background: #fbfdfe;
}

.pmd-coc__settlement-receipt span {
  color: #748995;
  font-size: 9px;
  text-transform: capitalize;
}

.pmd-coc__settlement-receipt b {
  font-size: 9.5px;
  font-weight: 900;
}

@media (max-width: 620px) {
  .pmd-coc-payment-ledger:not([hidden]) {
    gap: 9px;
  }

  .pmd-coc__settlement-compact-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .pmd-coc__settlement-balance-copy {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }
}
''' + '\n'

CSS.write_text(css, encoding='utf-8')


# ---------------------------------------------------------------------------
# 3) Fresh Cashier assets only. Payment V3 is intentionally not modified.
# ---------------------------------------------------------------------------
controller = CASHIER.read_text(encoding='utf-8')
controller = bump_asset(
    controller,
    'pmd-cashier-order-composer-r51.js',
    '20260826-r70-compact-payment-switcher'
)
controller = bump_asset(
    controller,
    'pmd-cashier-lab-order-center.css',
    '20260826-r70-compact-payment-switcher'
)
CASHIER.write_text(controller, encoding='utf-8')


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def run(cmd):
    print('+', ' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT, check=True)

run(['node', '--check', str(COMPOSER)])
run(['php', '-l', str(CASHIER)])

payment_hash_after = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()
if payment_hash_before != payment_hash_after:
    raise SystemExit('STOP Payment V3 changed unexpectedly')

print('')
print('R70 CASHIER COMPACT PAYMENT SWITCHER APPLIED')
print('Backup:', backup)
print('- unpaid orders no longer show a redundant Payment card')
print('- partial/paid state is a compact status + remaining line')
print('- Balance / Receipts switch inline inside the order rail')
print('- Review bill button and duplicate large modal entry removed')
print('- Invoice appears only as a small action after full settlement')
print('- Pay modal settlement context reduced to one slim strip')
print('- cashier payment amount is labelled Pay now, not Total')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
