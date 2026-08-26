#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
PAYMENT = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'
PAYMENT_CSS = ROOT / 'app/admin/assets/css/pmd-cashier-payment-clean-v1.css'
COMPOSER = ROOT / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'

for path in (PAYMENT, PAYMENT_CSS, COMPOSER, CASHIER):
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r77-cashier-payment-first-paint-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)

for path in (PAYMENT, PAYMENT_CSS, COMPOSER, CASHIER):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)


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
# 1. Cashier first paint: render the authoritative payment summary while the
#    nested modal is still CLOSED, then expose the finished modal exactly once.
#    No requestAnimationFrame reveal, no hidden mounted is-show state.
#    Non-Cashier / Waiter behavior stays unchanged.
# ---------------------------------------------------------------------------
payment = PAYMENT.read_text(encoding='utf-8')
marker = 'PMD_R77_CASHIER_PAYMENT_RENDER_BEFORE_SHOW'

if marker not in payment:
    old = """      async function openPayment() {
        if (!state.activeOrderId) return toast('Save the order before taking payment.', true);
        if (state.cart && state.cart.length) return toast('Save new items before taking payment.', true);
        resetPaymentState();
        var modal = $('[data-pos-payment-modal]');
        if (!modal) return;

        if (cashierMode) {
          modal.classList.add(
            'pmd-payment-is-preparing'
          );
        }

        modal.classList.add('is-show');
        modal.setAttribute(
          'aria-hidden',
          'false'
        );

        state.payment.open = true;

        await loadPaymentSummary(true);

        if (cashierMode) {
          window.requestAnimationFrame(
            function () {
              modal.classList.remove(
                'pmd-payment-is-preparing'
              );
            }
          );
        }
      }
"""

    new = """      async function openPayment() {
        if (!state.activeOrderId) return toast('Save the order before taking payment.', true);
        if (state.cart && state.cart.length) return toast('Save new items before taking payment.', true);
        resetPaymentState();
        var modal = $('[data-pos-payment-modal]');
        if (!modal) return;

        state.payment.open = true;

        if (cashierMode) {
          // PMD_R77_CASHIER_PAYMENT_RENDER_BEFORE_SHOW
          // Build the complete Cashier payment UI while the modal is closed.
          // The user sees one finished frame instead of hidden -> mounted ->
          // rendered -> requestAnimationFrame reveal.
          modal.classList.remove(
            'is-show',
            'pmd-payment-is-preparing'
          );
          modal.setAttribute(
            'aria-hidden',
            'true'
          );

          await loadPaymentSummary(true);

          modal.classList.add('is-show');
          modal.setAttribute(
            'aria-hidden',
            'false'
          );
          return;
        }

        modal.classList.add('is-show');
        modal.setAttribute(
          'aria-hidden',
          'false'
        );

        await loadPaymentSummary(true);
      }
"""

    payment = replace_once(
        payment,
        old,
        new,
        'Cashier Payment first-paint lifecycle'
    )

PAYMENT.write_text(payment, encoding='utf-8')


# ---------------------------------------------------------------------------
# 2. Cashier Payment geometry owner: Tip/Coupon must stay in normal document
#    flow and reserve their full height before Cash received begins.
#    This is presentation only; Tip/Coupon calculation and handlers are not
#    changed.
# ---------------------------------------------------------------------------
css = PAYMENT_CSS.read_text(encoding='utf-8')
css_marker = 'PMD_R77_CASHIER_PAYMENT_CANONICAL_ADJUSTMENTS'

if css_marker not in css:
    css = css.rstrip() + r'''

/* PMD_R77_CASHIER_PAYMENT_CANONICAL_ADJUSTMENTS */
/* Final Cashier Payment geometry authority for Tip / Coupon / Cash received. */
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-modal,
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-dialog {
  animation: none !important;
  transition: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-modal.pmd-payment-is-preparing {
  display: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-adjustments:not([hidden]) {
  position: static !important;
  inset: auto !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  align-items: start !important;
  gap: 12px 14px !important;
  box-sizing: border-box !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 14px !important;
  overflow: visible !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-adjustments:not([hidden]) > div {
  position: static !important;
  inset: auto !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  gap: 8px !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  overflow: visible !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-adjustments .pmd-pos-payment-block-title {
  position: static !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  min-height: 22px !important;
  margin: 0 !important;
  padding: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-tip-buttons {
  position: static !important;
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  align-items: stretch !important;
  gap: 8px !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  margin: 0 !important;
  overflow: visible !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-tip-buttons button {
  position: static !important;
  inset: auto !important;
  width: 100% !important;
  min-width: 0 !important;
  height: 44px !important;
  min-height: 44px !important;
  margin: 0 !important;
  padding: 0 8px !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-custom-tip]:not([hidden]) {
  position: static !important;
  width: 100% !important;
  height: 44px !important;
  min-height: 44px !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-coupon-row {
  position: static !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 96px !important;
  align-items: stretch !important;
  gap: 8px !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  margin: 0 !important;
  overflow: visible !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-coupon-row [data-pos-coupon-code],
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-coupon-row [data-pos-coupon-apply] {
  position: static !important;
  inset: auto !important;
  width: 100% !important;
  min-width: 0 !important;
  height: 44px !important;
  min-height: 44px !important;
  margin: 0 !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-collection-fields] {
  position: static !important;
  clear: both !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  transform: none !important;
}

@media (max-width: 680px) {
  body #pmd-cashier-order-composer-v1.pmd-coc
  .pmd-pos-adjustments:not([hidden]) {
    grid-template-columns: 1fr !important;
  }
}
''' + '\n'

PAYMENT_CSS.write_text(css, encoding='utf-8')


# ---------------------------------------------------------------------------
# 3. Force fresh Cashier-only Payment assets. The globally loaded Waiter V3
#    stays available, but Cashier Composer intentionally reloads the canonical
#    module with its Cashier context. Bump only those cache keys.
# ---------------------------------------------------------------------------
composer = COMPOSER.read_text(encoding='utf-8')

if 'cashier-payment-v3-r77-20260826' not in composer:
    composer = replace_once(
        composer,
        "'cashier-payment-v3-r67h-20260826'",
        "'cashier-payment-v3-r77-20260826'",
        'Cashier Payment V3 cache key'
    )

if 'pmd-cashier-payment-clean-v1.css?v=20260826-r77' not in composer:
    composer = replace_once(
        composer,
        '/app/admin/assets/css/pmd-cashier-payment-clean-v1.css?v=20260826-r67h',
        '/app/admin/assets/css/pmd-cashier-payment-clean-v1.css?v=20260826-r77',
        'Cashier Payment CSS cache key'
    )

COMPOSER.write_text(composer, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260826-r77-payment-first-paint'
)
CASHIER.write_text(php, encoding='utf-8')


# ---------------------------------------------------------------------------
# 4. Syntax/integrity checks. No backend settlement/provider/invoice file is
#    modified by this patch.
# ---------------------------------------------------------------------------
print('+ node --check', PAYMENT)
subprocess.run(['node', '--check', str(PAYMENT)], cwd=ROOT, check=True)

print('+ node --check', COMPOSER)
subprocess.run(['node', '--check', str(COMPOSER)], cwd=ROOT, check=True)

print('+ php -l', CASHIER)
subprocess.run(['php', '-l', str(CASHIER)], cwd=ROOT, check=True)

print('')
print('R77 CASHIER PAYMENT FIRST-PAINT + LAYOUT APPLIED')
print('Backup:', backup)
print('- Cashier Payment summary renders before the modal becomes visible')
print('- requestAnimationFrame reveal removed from Cashier Payment open')
print('- Tip and Coupon stay fully inside their own row')
print('- Cash received starts only after Tip/Coupon complete')
print('- settlement/split/coupon/tip/terminal/invoice backend changed: 0')
print('- Waiter Payment open behavior unchanged')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
