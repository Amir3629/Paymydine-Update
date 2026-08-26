#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
PAYMENT_CSS = ROOT / 'app/admin/assets/css/pmd-cashier-payment-clean-v1.css'
COMPOSER = ROOT / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'

for path in (PAYMENT_CSS, COMPOSER, CASHIER):
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r78-cashier-payment-flow-layout-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)

for path in (PAYMENT_CSS, COMPOSER, CASHIER):
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


css = PAYMENT_CSS.read_text(encoding='utf-8')
old_marker = '/* PMD_R77_CASHIER_PAYMENT_CANONICAL_ADJUSTMENTS */'
new_marker = '/* PMD_R78_CASHIER_PAYMENT_FLOW_LAYOUT */'

if new_marker not in css:
    start = css.find(old_marker)
    if start < 0:
        raise SystemExit(
            'STOP R77 final payment block not found; do not stack another owner'
        )

    # R77 was intentionally the final block in this Cashier-only stylesheet.
    # Replace it rather than layering an additional override after it.
    css = css[:start].rstrip() + r'''

/* PMD_R78_CASHIER_PAYMENT_FLOW_LAYOUT */
/*
 * Final Cashier Payment layout owner.
 *
 * Root cause fixed here: .pmd-pos-payment-main is a vertical flex container.
 * Its cards were allowed to flex-shrink to fit the viewport, so the Tip /
 * Coupon card border became shorter than its own controls and those controls
 * visually spilled into Cash received. Payment cards now keep their natural
 * height and the dialog scrolls when the viewport is shorter.
 */
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-dialog {
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

/* Tip + Coupon: one contained card with natural height. */
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

/* Cash received is the next independent card, never part of adjustments. */
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
[data-pos-collection-fields] .pmd-pos-payment-fields,
body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-cash-field] {
  position: static !important;
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  height: auto !important;
  margin: 0 !important;
  overflow: visible !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-cash-field] > span {
  display: block !important;
  margin: 0 0 8px !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
[data-pos-cash-received] {
  -moz-appearance: textfield !important;
  appearance: textfield !important;
  width: 100% !important;
  max-width: none !important;
  height: 46px !important;
  min-height: 46px !important;
  margin: 0 !important;
  padding: 0 14px !important;
  text-align: center !important;
  font-size: 18px !important;
  font-weight: 900 !important;
  line-height: 46px !important;
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
.pmd-cashier-keypad,
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-cashier-tenders {
  position: static !important;
  width: 100% !important;
  min-width: 0 !important;
  flex: 0 0 auto !important;
}

@media (max-width: 680px) {
  body #pmd-cashier-order-composer-v1.pmd-coc
  .pmd-pos-payment-main > .pmd-pos-adjustments:not([hidden]) {
    grid-template-columns: 1fr !important;
  }
}
''' + '\n'

PAYMENT_CSS.write_text(css, encoding='utf-8')

composer = COMPOSER.read_text(encoding='utf-8')
if 'pmd-cashier-payment-clean-v1.css?v=20260826-r78-flow' not in composer:
    composer = replace_once(
        composer,
        '/app/admin/assets/css/pmd-cashier-payment-clean-v1.css?v=20260826-r77',
        '/app/admin/assets/css/pmd-cashier-payment-clean-v1.css?v=20260826-r78-flow',
        'Cashier Payment CSS cache key'
    )
COMPOSER.write_text(composer, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260826-r78-payment-flow-layout'
)
CASHIER.write_text(php, encoding='utf-8')

print('+ node --check', COMPOSER)
subprocess.run(['node', '--check', str(COMPOSER)], cwd=ROOT, check=True)

print('+ php -l', CASHIER)
subprocess.run(['php', '-l', str(CASHIER)], cwd=ROOT, check=True)

print('')
print('R78 CASHIER PAYMENT FLOW LAYOUT APPLIED')
print('Backup:', backup)
print('- R77 final layout block replaced, not stacked')
print('- Payment cards no longer flex-shrink below their contents')
print('- Tip/Coupon controls remain inside their card')
print('- Cash received starts below the completed Tip/Coupon card')
print('- native number spinner removed from Cash received')
print('- short viewports scroll the Payment dialog instead of crushing cards')
print('- Payment V3 / settlement / split / coupon / tip / terminal / invoice logic changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
