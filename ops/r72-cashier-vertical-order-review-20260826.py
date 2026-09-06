#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
ORDER_CENTER = ROOT / 'app/admin/assets/js/pmd-cashier-lab-order-center.js'
CSS = ROOT / 'app/admin/assets/css/pmd-cashier-lab-order-center.css'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'
PAYMENT_V3 = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'

for path in (ORDER_CENTER, CSS, CASHIER, PAYMENT_V3):
    if not path.is_file():
        raise SystemExit(f'STOP missing: {path}')

backup = Path('/root') / (
    'paymydine-r72-order-review-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)

for path in (ORDER_CENTER, CSS, CASHIER):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

payment_hash_before = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP {label}: expected 1 target, found {count}')
    return text.replace(old, new, 1)


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
    if qpos < 0 or qpos > pos + 360:
        raise SystemExit(f'STOP asset cache key not found: {filename}')
    end = text.find("'", qpos)
    if end < 0:
        raise SystemExit(f'STOP asset cache terminator not found: {filename}')
    return text[:qpos] + '?v=' + version + text[end:]


# ---------------------------------------------------------------------------
# 1) Order Center behavior.
#    - Keep canonical R39 payment/item lock untouched.
#    - Restore a visible Open order entry after partial payment.
#      The existing Cashier Composer capture handler owns data-action="items"
#      and calls PMDCashierOrderComposerV1.openEdit(orderId).
#    - Customer-facing document wording is Invoice-only after R71.
# ---------------------------------------------------------------------------
js = ORDER_CENTER.read_text(encoding='utf-8')

marker = 'PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW'
if marker not in js:
    latest_start = '  function latestReceiptUrl() {'
    latest_end = '  function parseVoidAudit(value) {'
    latest_replacement = r'''  // PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW
  // R71 made split invoices the customer-facing document. Keep the old
  // function name only as an internal compatibility shim for R37 callers.
  function latestReceiptUrl() {
    var transactions =
      state.payment
      && Array.isArray(state.payment.transactions)
        ? state.payment.transactions
        : [];

    var row = transactions.find(function (transaction) {
      return transaction && (transaction.invoice_url || transaction.receipt_url);
    });

    if (!row) return '';

    var url = String(row.invoice_url || row.receipt_url || '');

    if (url.indexOf('/admin/orders/split-receipt/') >= 0) {
      url = url.replace(
        '/admin/orders/split-receipt/',
        '/admin/orders/split-invoice/'
      );
    }

    return url;
  }

'''
    js = replace_between(
        js,
        latest_start,
        latest_end,
        latest_replacement,
        'latest split invoice resolver'
    )

    footer_start = '    footer.innerHTML = [\n'
    footer_anchor = js.find('    var receiptUrl = latestReceiptUrl();')
    if footer_anchor < 0:
        raise SystemExit('STOP footer receipt anchor not found')
    footer_pos = js.find(footer_start, footer_anchor)
    footer_end_token = "    ].join('');\n\n    syncCardFinancials("
    footer_end = js.find(footer_end_token, footer_pos)
    if footer_pos < 0 or footer_end < 0:
        raise SystemExit('STOP renderDetails footer boundaries not found')

    new_footer = r'''    var canOpenComposer = !paidComplete;

    footer.innerHTML = [
      canOpenComposer
        ? [
            '<button type="button" ',
              'class="pmd-cashier-order-center__action is-primary" ',
              'data-pmd-r37-action="items">',
              'Open order',
            '</button>'
          ].join('')
        : '',

      canOpenPos
      && due > 0.0001
        ? [
            '<button type="button" ',
              'class="pmd-cashier-order-center__action is-payment" ',
              'data-pmd-r37-action="payment">',
              'Take payment',
            '</button>'
          ].join('')
        : '',

      settlementStatus === 'paid'
        ? [
            '<button type="button" ',
              'class="pmd-cashier-order-center__action is-primary" ',
              'data-pmd-r37-action="invoice">',
              'Final invoice',
            '</button>'
          ].join('')
        : '',

      receiptUrl
        ? [
            '<button type="button" ',
              'class="pmd-cashier-order-center__action" ',
              'data-pmd-r37-action="receipt">',
              'Invoice',
            '</button>'
          ].join('')
        : '',

      '<button type="button" ',
        'class="pmd-cashier-order-center__action" ',
        'data-pmd-r37-close>',
        'Close',
      '</button>'
    ].join('');

'''
    js = js[:footer_pos] + new_footer + js[footer_end + len("    ].join('');\n\n"):]

    old_title = r'''    title.textContent =
      (
        isReceipt
          ? 'Receipt'
          : 'Invoice'
      )
      + ' · Order #'
      + state.orderId;'''
    new_title = r'''    title.textContent =
      (isReceipt ? 'Invoice' : 'Final invoice')
      + ' · Order #'
      + state.orderId;'''
    js = replace_once(js, old_title, new_title, 'document title wording')

    old_frame = r'''      frame.title = isReceipt
        ? 'Receipt preview'
        : 'Invoice preview';'''
    new_frame = r'''      frame.title = isReceipt
        ? 'Invoice preview'
        : 'Final invoice preview';'''
    js = replace_once(js, old_frame, new_frame, 'document frame wording')

    js = js.replace(
        "isReceipt\n              ? 'receipt'\n              : 'invoice',",
        "isReceipt\n              ? 'invoice'\n              : 'final invoice',",
        1
    )

    js = js.replace(
        "isReceipt\n                ? 'Receipt could not be loaded.'\n                : 'Invoice could not be loaded.',",
        "isReceipt\n                ? 'Invoice could not be loaded.'\n                : 'Final invoice could not be loaded.',",
        1
    )

    js = js.replace(
        "'Print / reprint',",
        "'Print invoice',",
        1
    )

ORDER_CENTER.write_text(js, encoding='utf-8')


# ---------------------------------------------------------------------------
# 2) Compact vertical Order Center visual authority.
#    Document preview keeps its wider dedicated layout.
# ---------------------------------------------------------------------------
css = CSS.read_text(encoding='utf-8')
css_start = '/* PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW_START */'
css_end = '/* PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW_END */'

r72_css = r'''/* PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW_START */
/* Compact read/review surface only. No ordering/payment business logic. */

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__dialog {
  width: min(430px, calc(100vw - 24px));
  max-height: min(88vh, 780px);
  border-radius: 18px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__header {
  gap: 10px;
  padding: 11px 13px 10px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__identity h2 {
  font-size: 17px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__identity p {
  margin-top: 3px;
  font-size: 11.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__close {
  flex-basis: 38px;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  font-size: 22px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__body {
  padding: 9px 11px 10px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__status-row {
  gap: 5px;
  margin-bottom: 7px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__pill {
  min-height: 25px;
  padding: 0 8px;
  font-size: 10px;
}

/* Money becomes a vertical ledger, not three wide cards. */
.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__money {
  grid-template-columns: 1fr;
  gap: 5px;
  margin-bottom: 7px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__money > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  padding: 7px 10px;
  border-radius: 10px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__money span {
  margin: 0;
  font-size: 9.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__money strong {
  font-size: 14px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__breakdown {
  margin: 0 0 7px;
  border-radius: 10px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__breakdown-row {
  min-height: 31px;
  padding: 0 10px;
  font-size: 10.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__breakdown-row strong {
  font-size: 11px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__breakdown-row.is-total {
  min-height: 35px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__breakdown-row.is-total strong {
  font-size: 13px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section {
  margin-top: 7px;
  padding: 9px;
  border-radius: 11px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section-head {
  gap: 8px;
  margin-bottom: 6px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section-head strong {
  font-size: 12.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section-head span {
  font-size: 9.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__items,
.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__history {
  gap: 5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__item {
  gap: 7px;
  padding: 7px 8px;
  border-radius: 9px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__qty {
  min-width: 31px;
  min-height: 29px;
  border-radius: 8px;
  font-size: 10.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__item-name {
  font-size: 11.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__item-name small {
  margin-top: 2px;
  font-size: 9.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__item-price {
  font-size: 11.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__history-row {
  gap: 8px;
  padding: 7px 8px;
  border-radius: 9px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__history-row strong,
.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__history-row b {
  font-size: 10.5px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__history-row small {
  margin-top: 1px;
  font-size: 9px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__note {
  font-size: 10.5px;
  line-height: 1.35;
}

/* Empty note is not a card. */
.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section:has(.pmd-cashier-order-center__note:empty) {
  display: none;
}

/* Vertical action hierarchy: main actions first, document/close last. */
.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 9px 11px 11px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__action {
  min-height: 38px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 11px;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer
[data-pmd-r37-action="items"],
.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer
[data-pmd-r37-action="payment"],
.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer
[data-pmd-r37-action="invoice"] {
  grid-column: 1 / -1;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer
[data-pmd-r37-action="items"] {
  border-color: #0d705e;
  background: #0d705e;
  color: #fff;
}

.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer
[data-pmd-r37-action="payment"] {
  border-color: #d49829;
  background: #fff8e8;
  color: #805b15;
}

@media (max-width: 520px) {
  .pmd-cashier-order-center:not(.is-document)
  .pmd-cashier-order-center__dialog {
    width: min(100%, 410px);
    max-height: calc(100vh - 16px);
  }
}

/* PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW_END */'''

if css_start in css:
    start = css.find(css_start)
    end = css.find(css_end, start)
    if end < 0:
        raise SystemExit('STOP existing R72 CSS end marker missing')
    end += len(css_end)
    css = css[:start].rstrip() + '\n\n' + r72_css + css[end:]
else:
    css = css.rstrip() + '\n\n' + r72_css + '\n'

CSS.write_text(css, encoding='utf-8')


# ---------------------------------------------------------------------------
# 3) Cache-bust only the two Order Center assets.
# ---------------------------------------------------------------------------
php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-lab-order-center.css',
    '20260826-r72-compact-vertical'
)
php = bump_asset(
    php,
    'pmd-cashier-lab-order-center.js',
    '20260826-r72-open-order'
)
CASHIER.write_text(php, encoding='utf-8')


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def run(cmd):
    print('+', ' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT, check=True)

run(['node', '--check', str(ORDER_CENTER)])
run(['php', '-l', str(CASHIER)])

payment_hash_after = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP Payment V3 changed unexpectedly')

print('')
print('R72 CASHIER VERTICAL ORDER REVIEW APPLIED')
print('Backup:', backup)
print('- Order review width reduced to ~430px and laid out vertically')
print('- empty Order note card is hidden')
print('- spacing/items/payment history compacted')
print('- Open order is visible again after partial payment')
print('- Open order reuses the existing Cashier Composer/menu grid')
print('- R39 financial/item mutation protection remains untouched')
print('- Receipt wording removed from this Order Center; R71 split Invoice is used')
print('- Payment V3 hash unchanged:', payment_hash_after)
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
