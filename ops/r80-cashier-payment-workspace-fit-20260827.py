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
    'paymydine-r80-cashier-payment-workspace-' +
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


def bump_js_asset(text, filename, version):
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

if '/* PMD_R80_CASHIER_PAYMENT_WORKSPACE_FIT */' not in css:
    css = replace_once(
        css,
        '/* PMD_R79_CASHIER_PAYMENT_WIDE_SIDE_KEYPAD */',
        '/* PMD_R80_CASHIER_PAYMENT_WORKSPACE_FIT */',
        'R79 final owner marker'
    )

    css = replace_once(
        css,
        """body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-dialog {
  width: min(860px, calc(100vw - 28px)) !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: min(94dvh, 900px) !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}""",
        """body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-dialog {
  box-sizing: border-box !important;
  width: min(920px, calc(100vw - 32px)) !important;
  max-width: min(920px, calc(100vw - 32px)) !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: min(94dvh, 900px) !important;
  overflow: hidden !important;
}""",
        'desktop payment dialog geometry'
    )

    css = replace_once(
        css,
        """body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-body {
  overflow: visible !important;
}""",
        """body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-body {
  display: block !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}""",
        'payment body overflow owner'
    )

    css = replace_once(
        css,
        """  grid-template-columns: minmax(300px, 1fr) minmax(300px, 0.86fr) !important;""",
        """  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.88fr) !important;""",
        'cash workspace columns'
    )

    # Keep the summary in normal flow. Older generic staff styles can make it
    # sticky; when the cash workspace became two-column that sticky footer was
    # visually covering the keypad. R80 makes Cashier the sole geometry owner.
    anchor = """body #pmd-cashier-order-composer-v1.pmd-coc
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
"""

    summary = anchor + r'''

/* Payment summary belongs below the cash workspace, never over it. */
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary {
  position: static !important;
  inset: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  z-index: auto !important;
  box-sizing: border-box !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.7fr) !important;
  align-items: stretch !important;
  gap: 10px !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 10px 0 0 !important;
  padding: 10px !important;
  transform: none !important;
  overflow: visible !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary > [data-pos-payment-totals] {
  grid-column: 1 / -1 !important;
  min-width: 0 !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-change-box,
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary > [data-pos-change-box] {
  position: static !important;
  grid-column: 1 !important;
  align-self: stretch !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 50px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-pay-button,
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary > [data-pos-pay-button] {
  position: static !important;
  grid-column: 2 !important;
  align-self: stretch !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 50px !important;
  margin: 0 !important;
  transform: none !important;
}

body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-payment-secondary,
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-payment-history-wrap,
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-summary > .pmd-pos-payment-safety {
  grid-column: 1 / -1 !important;
  position: static !important;
}
'''
    css = replace_once(css, anchor, summary, 'summary normal-flow anchor')

    # R79 collapses only below 760px. With a 920px desktop card, collapse the
    # side keypad a little earlier so medium/small screens can never clip it.
    css = replace_once(
        css,
        '@media (max-width: 760px) {',
        '@media (max-width: 820px) {',
        'responsive cash breakpoint'
    )

PAYMENT_CSS.write_text(css, encoding='utf-8')

composer = COMPOSER.read_text(encoding='utf-8')
composer = bump_js_asset(
    composer,
    'pmd-cashier-payment-clean-v1.css',
    '20260827-r80-workspace-fit'
)
COMPOSER.write_text(composer, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_js_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260827-r80-payment-workspace-fit'
)
CASHIER.write_text(php, encoding='utf-8')

print('+ node --check', COMPOSER)
subprocess.run(['node', '--check', str(COMPOSER)], cwd=ROOT, check=True)

print('+ php -l', CASHIER)
subprocess.run(['php', '-l', str(CASHIER)], cwd=ROOT, check=True)

payment_hash_after = hashlib.sha256(PAYMENT_JS.read_bytes()).hexdigest()
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP: Payment V3 changed unexpectedly')

print('')
print('R80 CASHIER PAYMENT WORKSPACE FIT APPLIED')
print('Backup:', backup)
print('- real dialog max-width constraint reset; desktop card can reach 920px')
print('- full 3-column keypad stays inside the Payment card')
print('- Cash received / quick tenders remain left; keypad remains right')
print('- Change + Pay are normal-flow footer controls and cannot cover keypad')
print('- <=820px falls back to the safe vertical layout')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('- settlement / split / coupon / tip / terminal / invoice backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
