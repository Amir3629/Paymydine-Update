#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
PAYMENT_CSS = ROOT / 'app/admin/assets/css/pmd-cashier-payment-clean-v1.css'
PAYMENT_JS = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'
COMPOSER = ROOT / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'

for path in (PAYMENT_CSS, PAYMENT_JS, COMPOSER, CASHIER):
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r79-cashier-wide-side-keypad-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)

for path in (PAYMENT_CSS, COMPOSER, CASHIER):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

payment_hash_before = hashlib.sha256(PAYMENT_JS.read_bytes()).hexdigest()


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


css = PAYMENT_CSS.read_text(encoding='utf-8')
old_marker = '/* PMD_R78_CASHIER_PAYMENT_FLOW_LAYOUT */'
new_marker = '/* PMD_R79_CASHIER_PAYMENT_WIDE_SIDE_KEYPAD */'

if new_marker not in css:
    start = css.find(old_marker)
    if start < 0:
        raise SystemExit(
            'STOP R78 final payment owner not found; do not stack another owner'
        )

    # R78 is the final Cashier payment owner. Replace it in place so there is
    # still exactly one final geometry authority.
    css = css[:start].rstrip() + r'''

/* PMD_R79_CASHIER_PAYMENT_WIDE_SIDE_KEYPAD */
/*
 * Final Cashier Payment geometry owner.
 * Desktop uses a wider card and a side-by-side cash workspace:
 * amount/quick tenders on the left, numeric keypad on the right.
 * Mobile keeps the natural vertical flow.
 */
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-dialog {
  width: min(860px, calc(100vw - 28px)) !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: min(94dvh, 900px) !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-body {
  overflow: visible !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-main {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  gap: 10px !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-main > .pmd-pos-payment-balance,
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-main > .pmd-pos-payment-block,
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-main > [data-pos-collection-fields],
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-main > .pmd-pos-payment-summary {
  flex: 0 0 auto !important;
  flex-shrink: 0 !important;
  min-width: 0 !important;
}

/* Tip + Coupon remain one contained natural-height card. */
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]) {
  position: static !important;
  inset: auto !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  grid-auto-rows: auto !important;
  align-items: start !important;
  align-content: start !important;
  gap: 14px !important;
  box-sizing: border-box !important;
  width: 100% !important;
  height: auto !important;
  min-height: max-content !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 14px !important;
  overflow: visible !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]) > div {
  position: static !important;
  inset: auto !important;
  display: grid !important;
  grid-template-rows: auto auto auto !important;
  align-content: start !important;
  gap: 8px !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: max-content !important;
  margin: 0 !important;
  padding: 0 !important;
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
.pmd-pos-adjustments .pmd-pos-payment-block-title b {
  margin: 0 !important;
  font-size: 14px !important;
  line-height: 1.2 !important;
  font-weight: 900 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-adjustments .pmd-pos-payment-block-title span {
  display: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-tip-buttons {
  position: static !important;
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  align-items: stretch !important;
  gap: 7px !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  margin: 0 !important;
  overflow: visible !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-tip-buttons > button {
  position: static !important;
  inset: auto !important;
  width: 100% !important;
  min-width: 0 !important;
  height: 42px !important;
  min-height: 42px !important;
  margin: 0 !important;
  padding: 0 7px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 10px !important;
  white-space: nowrap !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-custom-tip]:not([hidden]) {
  position: static !important;
  width: 100% !important;
  height: 42px !important;
  min-height: 42px !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-coupon-row {
  position: static !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 104px !important;
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
  height: 42px !important;
  min-height: 42px !important;
  margin: 0 !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-coupon-row [data-pos-coupon-apply] {
  padding: 0 10px !important;
  border-radius: 10px !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-coupon-result {
  position: static !important;
  min-height: 0 !important;
  margin: 0 !important;
}

/* Cash workspace: left amount/tenders, right keypad. */
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-main > [data-pos-collection-fields] {
  position: static !important;
  inset: auto !important;
  clear: both !important;
  box-sizing: border-box !important;
  width: 100% !important;
  height: auto !important;
  min-height: max-content !important;
  margin: 0 !important;
  padding: 12px 14px 14px !important;
  overflow: visible !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-collection-fields] .pmd-pos-payment-fields {
  position: static !important;
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  margin: 0 !important;
  overflow: visible !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-cash-field] {
  position: static !important;
  display: grid !important;
  grid-template-columns: minmax(300px, 1fr) minmax(300px, 0.86fr) !important;
  grid-template-areas:
    'cash-title cash-keypad'
    'cash-input cash-keypad'
    'cash-tenders cash-keypad' !important;
  grid-template-rows: auto auto auto !important;
  column-gap: 14px !important;
  row-gap: 8px !important;
  align-items: start !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  height: auto !important;
  margin: 0 !important;
  overflow: visible !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-cashier-cash-title {
  grid-area: cash-title !important;
  display: block !important;
  align-self: end !important;
  margin: 0 !important;
  padding: 0 !important;
  color: #557487 !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-cash-received] {
  grid-area: cash-input !important;
  -moz-appearance: textfield !important;
  appearance: textfield !important;
  width: 100% !important;
  max-width: none !important;
  height: 52px !important;
  min-height: 52px !important;
  margin: 0 !important;
  padding: 0 14px !important;
  text-align: center !important;
  font-size: 20px !important;
  font-weight: 900 !important;
  line-height: 52px !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-cash-received]::-webkit-outer-spin-button,
body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-cash-received]::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-cashier-keypad {
  grid-area: cash-keypad !important;
  position: static !important;
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  align-self: stretch !important;
  gap: 7px !important;
  width: 100% !important;
  min-width: 0 !important;
  height: 100% !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-cashier-keypad > button {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 45px !important;
  height: 45px !important;
  margin: 0 !important;
  padding: 0 !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 10px !important;
  font-size: 17px !important;
  line-height: 1 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-cashier-tenders {
  grid-area: cash-tenders !important;
  position: static !important;
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  gap: 6px !important;
  width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-cashier-tenders > button {
  width: 100% !important;
  min-width: 0 !important;
  height: 40px !important;
  min-height: 40px !important;
  margin: 0 !important;
  padding: 0 5px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 9px !important;
  line-height: 1 !important;
}

/* Narrow screens keep the proven vertical R78 behavior. */
@media (max-width: 760px) {
  body #pmd-cashier-order-composer-v1.pmd-coc
  .pmd-pos-payment-dialog {
    width: calc(100vw - 12px) !important;
    max-height: calc(100dvh - 12px) !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc
  .pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]) {
    grid-template-columns: 1fr !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc
  [data-pos-cash-field] {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-areas:
      'cash-title'
      'cash-input'
      'cash-keypad'
      'cash-tenders' !important;
    gap: 8px !important;
  }

  body #pmd-cashier-order-composer-v1.pmd-coc
  .pmd-cashier-keypad {
    height: auto !important;
  }
}
''' + '\n'

PAYMENT_CSS.write_text(css, encoding='utf-8')

composer = COMPOSER.read_text(encoding='utf-8')
if 'pmd-cashier-payment-clean-v1.css?v=20260827-r79-wide-keypad' not in composer:
    composer = replace_once(
        composer,
        '/app/admin/assets/css/pmd-cashier-payment-clean-v1.css?v=20260826-r78-flow',
        '/app/admin/assets/css/pmd-cashier-payment-clean-v1.css?v=20260827-r79-wide-keypad',
        'Cashier Payment CSS cache key'
    )
COMPOSER.write_text(composer, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260827-r79-wide-side-keypad'
)
CASHIER.write_text(php, encoding='utf-8')

print('+ node --check', COMPOSER)
subprocess.run(['node', '--check', str(COMPOSER)], cwd=ROOT, check=True)

print('+ php -l', CASHIER)
subprocess.run(['php', '-l', str(CASHIER)], cwd=ROOT, check=True)

payment_hash_after = hashlib.sha256(PAYMENT_JS.read_bytes()).hexdigest()
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP Payment V3 implementation changed unexpectedly')

print('')
print('R79 CASHIER WIDE PAYMENT + SIDE KEYPAD APPLIED')
print('Backup:', backup)
print('- Payment card widened to max 860px on desktop')
print('- Cash received + quick tenders stay on the left')
print('- full numeric keypad sits on the right')
print('- less vertical scrolling during cash settlement')
print('- mobile remains vertical and scroll-safe')
print('- R78 containment/flex-shrink fix preserved')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('- settlement / split / coupon / tip / terminal / invoice backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
