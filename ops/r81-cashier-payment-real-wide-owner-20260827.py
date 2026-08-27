#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import re
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
UI_CSS = ROOT / 'app/admin/assets/css/pmd-cashier-ui-r51.css'
PAYMENT_CSS = ROOT / 'app/admin/assets/css/pmd-cashier-payment-clean-v1.css'
PAYMENT_JS = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'
COMPOSER = ROOT / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'

for path in (UI_CSS, PAYMENT_CSS, PAYMENT_JS, COMPOSER, CASHIER):
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r81-cashier-payment-wide-owner-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)
for path in (UI_CSS, PAYMENT_CSS, COMPOSER, CASHIER):
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


def patch_block(text, selector_pattern, mutator, label, start_at=0):
    pattern = re.compile(
        selector_pattern + r'\s*\{(?P<body>.*?)\n\}',
        re.S,
    )
    match = pattern.search(text, start_at)
    if not match:
        raise SystemExit('STOP block not found: ' + label)
    old_body = match.group('body')
    new_body = mutator(old_body)
    if new_body == old_body:
        raise SystemExit('STOP block unchanged: ' + label)
    return text[:match.start('body')] + new_body + text[match.end('body'):]


# ------------------------------------------------------------
# 1. REAL VISUAL AUTHORITY: pmd-cashier-ui-r51.css
# ------------------------------------------------------------
# Older sections in this file contain more-specific 520/560px rules such as:
#   #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
#   .pmd-pos-payment-modal .pmd-pos-payment-dialog
# Those beat the 920px rule in pmd-cashier-payment-clean-v1.css.
# R81 extends the existing FINAL R75 authority instead of stacking a new file.

ui = UI_CSS.read_text(encoding='utf-8')

if '/* PMD_R81_WIDE_COMPOSER_STABLE_PAYMENT */' not in ui:
    ui = replace_once(
        ui,
        '/* PMD_R75_WIDE_COMPOSER_STABLE_PAYMENT */',
        '/* PMD_R81_WIDE_COMPOSER_STABLE_PAYMENT */',
        'R75 final visual owner marker',
    )

    anchor = """body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-modal {
  background: rgba(7, 26, 31, .42) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
"""

    final_owner = anchor + r'''

/*
 * R81 real desktop Payment width authority.
 * This selector intentionally matches/exceeds the specificity of the old
 * 520/560px Cashier rules above, and lives in the final Cashier UI owner.
 */
body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-modal
.pmd-pos-payment-dialog {
  box-sizing: border-box !important;
  width: min(1100px, calc(100vw - 32px)) !important;
  max-width: min(1100px, calc(100vw - 32px)) !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: min(94dvh, 880px) !important;
}

@media (max-width: 900px) {
  body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
  .pmd-pos-payment-modal
  .pmd-pos-payment-dialog {
    width: calc(100vw - 12px) !important;
    max-width: calc(100vw - 12px) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-height: calc(100dvh - 12px) !important;
  }
}
'''
    ui = replace_once(
        ui,
        anchor,
        final_owner,
        'R75 final payment backdrop anchor',
    )

UI_CSS.write_text(ui, encoding='utf-8')


# ------------------------------------------------------------
# 2. CASH WORKSPACE GEOMETRY: replace R80 in the existing owner
# ------------------------------------------------------------
css = PAYMENT_CSS.read_text(encoding='utf-8')

if '/* PMD_R81_CASHIER_PAYMENT_REAL_WIDE_OWNER */' not in css:
    css = replace_once(
        css,
        '/* PMD_R80_CASHIER_PAYMENT_WORKSPACE_FIT */',
        '/* PMD_R81_CASHIER_PAYMENT_REAL_WIDE_OWNER */',
        'R80 payment geometry owner marker',
    )

    marker = css.find('/* PMD_R81_CASHIER_PAYMENT_REAL_WIDE_OWNER */')
    if marker < 0:
        raise SystemExit('STOP R81 payment marker missing')

    head = css[:marker]
    tail = css[marker:]

    tail = replace_once(
        tail,
        'width: min(920px, calc(100vw - 32px)) !important;',
        'width: min(1100px, calc(100vw - 32px)) !important;',
        'R80 desktop width',
    )
    tail = replace_once(
        tail,
        'max-width: min(920px, calc(100vw - 32px)) !important;',
        'max-width: min(1100px, calc(100vw - 32px)) !important;',
        'R80 desktop max-width',
    )

    # Wider card: give the left cash controls and right keypad balanced room.
    tail = replace_once(
        tail,
        'grid-template-columns: minmax(0, 1fr) minmax(320px, 0.88fr) !important;',
        'grid-template-columns: minmax(0, 1fr) minmax(390px, 0.96fr) !important;',
        'cash workspace column widths',
    )

    # The previous keypad had height:100%. Its parent height was largely
    # determined by the shorter left column, so the fourth keypad row could
    # overflow and visually collide with Change/Pay. Let the keypad contribute
    # its real four-row height to the parent grid instead.
    keypad_pattern = re.compile(
        r'(body #pmd-cashier-order-composer-v1\.pmd-coc\n'
        r'\.pmd-cashier-keypad \{)(?P<body>.*?)(\n\})',
        re.S,
    )
    km = keypad_pattern.search(tail)
    if not km:
        raise SystemExit('STOP Cashier keypad block not found')
    keypad_body = km.group('body')
    if 'height: 100% !important;' not in keypad_body:
        raise SystemExit('STOP Cashier keypad height owner not found')
    keypad_body = keypad_body.replace(
        'height: 100% !important;',
        'height: auto !important;\n  grid-auto-rows: 45px !important;',
        1,
    )
    keypad_body = keypad_body.replace(
        'align-self: stretch !important;',
        'align-self: start !important;',
        1,
    )
    tail = tail[:km.start('body')] + keypad_body + tail[km.end('body'):]

    # Reserve the keypad's actual four-row footprint so the summary begins
    # only after the entire keypad, never after the shorter left column.
    cash_pattern = re.compile(
        r'(body #pmd-cashier-order-composer-v1\.pmd-coc\n'
        r'\[data-pos-cash-field\] \{)(?P<body>.*?)(\n\})',
        re.S,
    )
    cm = cash_pattern.search(tail)
    if not cm:
        raise SystemExit('STOP Cash field grid block not found')
    cash_body = cm.group('body')
    if 'min-height: 210px !important;' not in cash_body:
        cash_body = cash_body.replace(
            'height: auto !important;',
            'height: auto !important;\n  min-height: 210px !important;',
            1,
        )
    tail = tail[:cm.start('body')] + cash_body + tail[cm.end('body'):]

    # Medium screens switch back to the proven vertical layout before the
    # two-column workspace becomes cramped.
    tail = replace_once(
        tail,
        '@media (max-width: 820px) {',
        '@media (max-width: 900px) {',
        'R80 responsive breakpoint',
    )

    css = head + tail

PAYMENT_CSS.write_text(css, encoding='utf-8')


# ------------------------------------------------------------
# 3. Cache keys only. No payment/business logic changes.
# ------------------------------------------------------------
composer = COMPOSER.read_text(encoding='utf-8')
composer = bump_asset(
    composer,
    'pmd-cashier-payment-clean-v1.css',
    '20260827-r81-real-wide-owner',
)
COMPOSER.write_text(composer, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260827-r81-payment-real-wide',
)
php = bump_asset(
    php,
    'pmd-cashier-ui-r51.css',
    '20260827-r81-payment-real-wide',
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
print('R81 CASHIER PAYMENT REAL WIDE OWNER APPLIED')
print('Backup:', backup)
print('- fixed the actual high-specificity Cashier UI width authority')
print('- desktop Payment can now reach 1100px, not 520/560px')
print('- keypad contributes its real four-row height; no footer collision')
print('- Cash received/tenders stay left; full 3-column keypad stays right')
print('- Change + Pay start only after the keypad finishes')
print('- <=900px uses the safe vertical layout')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('- settlement / split / coupon / tip / terminal / invoice backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
