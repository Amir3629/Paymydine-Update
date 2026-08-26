#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
ORDER_JS = ROOT / 'app/admin/assets/js/pmd-cashier-lab-order-center.js'
ORDER_CSS = ROOT / 'app/admin/assets/css/pmd-cashier-lab-order-center.css'
VISUAL_CSS = ROOT / 'app/admin/assets/css/pmd-cashier-ui-r51.css'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'
SPLIT_VIEW = ROOT / 'app/admin/views/orders/split_receipt.blade.php'
CUSTOMER_INVOICE = ROOT / 'app/admin/views/orders/customer_invoice.blade.php'
PAYMENT_V3 = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'

files = [
    ORDER_JS, ORDER_CSS, VISUAL_CSS, CASHIER,
    SPLIT_VIEW, CUSTOMER_INVOICE, PAYMENT_V3,
]
for path in files:
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r73-order-center-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)
for path in files:
    if path == PAYMENT_V3:
        continue
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

payment_hash_before = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            'STOP ' + label + ': expected 1 target, found ' + str(count)
        )
    return text.replace(old, new, 1)


def bump_asset(text, filename, version):
    pos = text.find(filename)
    if pos < 0:
        raise SystemExit('STOP asset not found: ' + filename)
    qpos = text.find('?v=', pos)
    if qpos < 0 or qpos > pos + 420:
        raise SystemExit('STOP asset cache key not found: ' + filename)
    end = text.find("'", qpos)
    if end < 0:
        raise SystemExit('STOP asset cache terminator not found: ' + filename)
    return text[:qpos] + '?v=' + version + text[end:]


# ---------------------------------------------------------------------------
# 1. One click owner for Open order / Take payment.
# ---------------------------------------------------------------------------
js = ORDER_JS.read_text(encoding='utf-8')
if 'PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW' not in js:
    raise SystemExit('STOP R72 is not installed')

if 'PMD_R73_ORDER_CENTER_SINGLE_CLICK_OWNER' not in js:
    anchor = '  function renderLoading() {'
    helper = r'''  // PMD_R73_ORDER_CENTER_SINGLE_CLICK_OWNER
  function openCashierComposerR73(openPaymentAfter) {
    var api = window.PMDCashierOrderComposerV1;

    if (!api || typeof api.openEdit !== 'function') {
      renderError(new Error('Cashier Order Composer is unavailable.'));
      return;
    }

    var orderId = Number(state.orderId || 0);
    if (!orderId) return;

    var opening;

    try {
      // openEdit reveals the native Composer shell before its first await.
      // Start it first, then hide Order Center: no blank-frame blink.
      opening = Promise.resolve(api.openEdit(orderId));
    } catch (error) {
      renderError(error);
      return;
    }

    closeCenter();

    opening.then(function (opened) {
      if (!opened || !openPaymentAfter) return;

      // Reuse the Composer's own primary action. With an active unpaid/partial
      // order and no unsent cart, that canonical action is Pay.
      var primary = document.querySelector(
        '#pmd-cashier-order-composer-v1 [data-coc-primary]'
      );

      if (primary && !primary.disabled) {
        primary.click();
      }
    }).catch(function (error) {
      console.error('[PMD R73] Composer transition failed', error);
    });
  }


'''
    if anchor not in js:
        raise SystemExit('STOP renderLoading anchor not found')
    js = js.replace(anchor, helper + anchor, 1)

    refresh_block = """      if (type === 'refresh') {
        event.preventDefault();
        loadDetails();
        return;
      }

"""
    direct_block = refresh_block + r'''      if (type === 'composer-open') {
        event.preventDefault();
        openCashierComposerR73(false);
        return;
      }

      if (type === 'composer-payment') {
        event.preventDefault();
        openCashierComposerR73(true);
        return;
      }

'''
    js = replace_once(
        js,
        refresh_block,
        direct_block,
        'direct Order Center action owner'
    )

    js = replace_once(
        js,
        "              'data-pmd-r37-action=\"items\">',\n              'Open order',",
        "              'data-pmd-r37-action=\"composer-open\">',\n              'Open order',",
        'Open order action name'
    )

    js = replace_once(
        js,
        "              'data-pmd-r37-action=\"payment\">',\n              'Take payment',",
        "              'data-pmd-r37-action=\"composer-payment\">',\n              'Take payment',",
        'Take payment action name'
    )

ORDER_JS.write_text(js, encoding='utf-8')


# ---------------------------------------------------------------------------
# 2. One visual authority.
# R51 loads after Order Center and uses !important, so it is the real owner.
# Remove the obsolete R72 lower-priority compact block.
# ---------------------------------------------------------------------------
css = ORDER_CSS.read_text(encoding='utf-8')
start_marker = '/* PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW_START */'
end_marker = '/* PMD_R72_CASHIER_VERTICAL_ORDER_REVIEW_END */'
if start_marker in css:
    start = css.find(start_marker)
    end = css.find(end_marker, start)
    if end < 0:
        raise SystemExit('STOP R72 CSS end marker missing')
    end += len(end_marker)
    css = css[:start].rstrip() + '\n\n' + css[end:].lstrip()
ORDER_CSS.write_text(css, encoding='utf-8')

visual = VISUAL_CSS.read_text(encoding='utf-8')
section_start = visual.find('   PAID / ORDER CENTER')
section_end = visual.find('   DATE RANGE - ALWAYS ABOVE ORDER CARDS', section_start)
if section_start < 0 or section_end < 0:
    raise SystemExit('STOP R51 Order Center visual section not found')

# Find the comment fences around both section headings.
block_start = visual.rfind('/* ==========================================================', 0, section_start)
block_end = visual.rfind('/* ==========================================================', 0, section_end)
if block_start < 0 or block_end < 0 or block_end <= block_start:
    raise SystemExit('STOP R51 Order Center visual boundaries not found')

portrait = r'''/* ==========================================================
   PAID / ORDER CENTER
   PMD_R73_ORDER_CENTER_PORTRAIT_AUTHORITY
   Single final Cashier visual owner.
   ========================================================== */

body .pmd-cashier-order-center.pmd-cashier-order-center {
  isolation: isolate !important;
  font-family: Roboto, Arial, sans-serif !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center::before {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  z-index: 0 !important;
  pointer-events: none !important;
  background: rgba(5, 20, 22, .26) !important;
  backdrop-filter: blur(12px) saturate(.94) !important;
  -webkit-backdrop-filter: blur(12px) saturate(.94) !important;
}

body .pmd-cashier-order-center .pmd-cashier-order-center__backdrop {
  display: none !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__dialog {
  position: relative !important;
  z-index: 1 !important;
  width: min(440px, calc(100vw - 24px)) !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: min(84dvh, 760px) !important;
  overflow: hidden !important;
  border: 1px solid #d3e1e8 !important;
  border-radius: 17px !important;
  background: #f8fbfc !important;
  box-shadow: 0 24px 64px rgba(8, 28, 38, .22) !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center.is-document
.pmd-cashier-order-center__dialog {
  position: relative !important;
  z-index: 1 !important;
  width: min(900px, calc(100vw - 44px)) !important;
  max-height: min(86dvh, 820px) !important;
  border: 1px solid #d3e1e8 !important;
  border-radius: 19px !important;
  background: #f8fbfc !important;
  box-shadow: 0 28px 72px rgba(8, 28, 38, .22) !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__header {
  min-height: 56px !important;
  padding: 9px 11px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__identity h2 {
  font-size: 18px !important;
  line-height: 1.1 !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__identity p {
  margin-top: 3px !important;
  font-size: 10.5px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
button.pmd-cashier-order-center__close {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  min-height: 38px !important;
  padding: 0 !important;
  border-radius: 11px !important;
  font-size: 22px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__body {
  min-height: 0 !important;
  padding: 8px 10px 9px !important;
  overflow: auto !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__status-row {
  gap: 5px !important;
  margin-bottom: 6px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__pill {
  min-height: 25px !important;
  padding: 0 8px !important;
  font-size: 10px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__money {
  grid-template-columns: 1fr !important;
  gap: 5px !important;
  margin-bottom: 6px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__money > div {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  min-height: 36px !important;
  padding: 6px 9px !important;
  border-radius: 9px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__money span {
  margin: 0 !important;
  font-size: 9px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__money strong {
  font-size: 14px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__breakdown {
  margin: 0 0 6px !important;
  border-radius: 9px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__breakdown-row {
  min-height: 30px !important;
  padding: 0 9px !important;
  font-size: 10px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section {
  margin-top: 6px !important;
  padding: 8px !important;
  border-radius: 10px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section-head {
  margin-bottom: 5px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section-head strong {
  font-size: 12px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section-head span {
  font-size: 9px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__item {
  gap: 6px !important;
  padding: 6px 7px !important;
  border-radius: 8px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__item-name,
body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__item-price {
  font-size: 11px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__item-name small {
  margin-top: 2px !important;
  font-size: 9px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__section:has(.pmd-cashier-order-center__note:empty) {
  display: none !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer {
  min-height: 0 !important;
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 5px !important;
  padding: 7px 10px 9px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__action {
  min-height: 35px !important;
  padding: 0 9px !important;
  border-radius: 9px !important;
  font-size: 10.5px !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer [data-pmd-r37-action="composer-open"],
body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer [data-pmd-r37-action="composer-payment"],
body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__footer [data-pmd-r37-action="invoice"] {
  grid-column: 1 / -1 !important;
}

body .pmd-cashier-order-center.pmd-cashier-order-center:not(.is-document)
.pmd-cashier-order-center__action.is-primary {
  border-color: #053a32 !important;
  background: #053a32 !important;
  color: #fff !important;
  box-shadow: none !important;
}

'''

visual = visual[:block_start] + portrait + visual[block_end:]
VISUAL_CSS.write_text(visual, encoding='utf-8')


# ---------------------------------------------------------------------------
# 3. Fix R71 split/final invoice regex error.
# ---------------------------------------------------------------------------
broken = "preg_replace('#[?#].*$#', '', $path)"
fixed = "preg_replace('~[?#].*$~', '', $path)"
patched = 0
for view in (SPLIT_VIEW, CUSTOMER_INVOICE):
    text = view.read_text(encoding='utf-8')
    if broken in text:
        text = text.replace(broken, fixed)
        view.write_text(text, encoding='utf-8')
        patched += 1

if patched == 0:
    split_text = SPLIT_VIEW.read_text(encoding='utf-8')
    customer_text = CUSTOMER_INVOICE.read_text(encoding='utf-8')
    if fixed not in split_text and fixed not in customer_text:
        raise SystemExit('STOP invoice regex target not found')


# ---------------------------------------------------------------------------
# 4. Cache-bust actual owners.
# ---------------------------------------------------------------------------
php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-ui-r51.css',
    '20260826-r73-portrait-order-center'
)
php = bump_asset(
    php,
    'pmd-cashier-lab-order-center.js',
    '20260826-r73-single-click-owner'
)
CASHIER.write_text(php, encoding='utf-8')


def run(cmd):
    print('+', ' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT, check=True)

run(['node', '--check', str(ORDER_JS)])
run(['php', '-l', str(CASHIER)])

payment_hash_after = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP Payment V3 changed unexpectedly')

print('')
print('R73 CASHIER ORDER CENTER SINGLE OWNER APPLIED')
print('Backup:', backup)
print('- real final visual owner is pmd-cashier-ui-r51.css')
print('- review modal is portrait ~440px; invoice preview stays wide')
print('- obsolete R72 compact CSS removed from lower-priority stylesheet')
print('- Open order now has one click owner -> native Cashier Composer')
print('- Take payment now has one click owner -> Composer canonical Pay')
print('- split/final invoice preg_replace delimiter error fixed')
print('- Payment V3 hash unchanged:', payment_hash_after)
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
