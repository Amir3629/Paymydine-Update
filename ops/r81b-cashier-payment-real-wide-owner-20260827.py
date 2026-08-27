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
    'paymydine-r81b-cashier-payment-wide-owner-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)
for path in (UI_CSS, PAYMENT_CSS, COMPOSER, CASHIER):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

payment_hash_before = hashlib.sha256(PAYMENT_JS.read_bytes()).hexdigest()


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


# ------------------------------------------------------------------
# 1. Real final Cashier UI owner.
# R81 may already have written this file before stopping later, so this
# section deliberately supports both the R75 and partially-applied R81 state.
# ------------------------------------------------------------------
ui = UI_CSS.read_text(encoding='utf-8')

if '/* PMD_R81B_WIDE_COMPOSER_STABLE_PAYMENT */' not in ui:
    if '/* PMD_R81_WIDE_COMPOSER_STABLE_PAYMENT */' in ui:
        ui = ui.replace(
            '/* PMD_R81_WIDE_COMPOSER_STABLE_PAYMENT */',
            '/* PMD_R81B_WIDE_COMPOSER_STABLE_PAYMENT */',
            1,
        )
    elif '/* PMD_R75_WIDE_COMPOSER_STABLE_PAYMENT */' in ui:
        ui = ui.replace(
            '/* PMD_R75_WIDE_COMPOSER_STABLE_PAYMENT */',
            '/* PMD_R81B_WIDE_COMPOSER_STABLE_PAYMENT */',
            1,
        )
    else:
        raise SystemExit('STOP final Cashier UI payment owner marker not found')

final_selector = '''body #pmd-cashier-order-composer-v1.pmd-coc.pmd-coc
.pmd-pos-payment-modal
.pmd-pos-payment-dialog {'''

if final_selector not in ui[ui.find('/* PMD_R81B_WIDE_COMPOSER_STABLE_PAYMENT */'):]:
    anchor = '''body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-modal {
  background: rgba(7, 26, 31, .42) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
'''
    if anchor not in ui:
        raise SystemExit('STOP final Cashier payment backdrop anchor not found')

    final_owner = anchor + r'''

/* Real desktop Payment width authority. */
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
    ui = ui.replace(anchor, final_owner, 1)

# If the partial R81 owner already exists, normalize its intended width.
marker_pos = ui.find('/* PMD_R81B_WIDE_COMPOSER_STABLE_PAYMENT */')
ui_head = ui[:marker_pos]
ui_tail = ui[marker_pos:]
ui_tail = ui_tail.replace(
    'width: min(920px, calc(100vw - 32px)) !important;',
    'width: min(1100px, calc(100vw - 32px)) !important;',
)
ui_tail = ui_tail.replace(
    'max-width: min(920px, calc(100vw - 32px)) !important;',
    'max-width: min(1100px, calc(100vw - 32px)) !important;',
)
ui = ui_head + ui_tail
UI_CSS.write_text(ui, encoding='utf-8')


# ------------------------------------------------------------------
# 2. Existing Cashier payment geometry owner.
# R80 has duplicate 920px declarations in the live file, so R81B patches all
# occurrences inside the final R80 owner instead of assuming there is one.
# ------------------------------------------------------------------
css = PAYMENT_CSS.read_text(encoding='utf-8')

if '/* PMD_R81B_CASHIER_PAYMENT_REAL_WIDE_OWNER */' not in css:
    if '/* PMD_R81_CASHIER_PAYMENT_REAL_WIDE_OWNER */' in css:
        css = css.replace(
            '/* PMD_R81_CASHIER_PAYMENT_REAL_WIDE_OWNER */',
            '/* PMD_R81B_CASHIER_PAYMENT_REAL_WIDE_OWNER */',
            1,
        )
    elif '/* PMD_R80_CASHIER_PAYMENT_WORKSPACE_FIT */' in css:
        css = css.replace(
            '/* PMD_R80_CASHIER_PAYMENT_WORKSPACE_FIT */',
            '/* PMD_R81B_CASHIER_PAYMENT_REAL_WIDE_OWNER */',
            1,
        )
    else:
        raise SystemExit('STOP R80/R81 final payment geometry owner not found')

marker = css.find('/* PMD_R81B_CASHIER_PAYMENT_REAL_WIDE_OWNER */')
if marker < 0:
    raise SystemExit('STOP R81B payment marker missing')

head = css[:marker]
tail = css[marker:]

# Normalize every duplicated R80 desktop width inside the final owner.
old_width = 'width: min(920px, calc(100vw - 32px)) !important;'
old_max = 'max-width: min(920px, calc(100vw - 32px)) !important;'

if old_width in tail:
    tail = tail.replace(
        old_width,
        'width: min(1100px, calc(100vw - 32px)) !important;',
    )
elif 'width: min(1100px, calc(100vw - 32px)) !important;' not in tail:
    raise SystemExit('STOP desktop payment width declaration not found')

if old_max in tail:
    tail = tail.replace(
        old_max,
        'max-width: min(1100px, calc(100vw - 32px)) !important;',
    )
elif 'max-width: min(1100px, calc(100vw - 32px)) !important;' not in tail:
    raise SystemExit('STOP desktop payment max-width declaration not found')

old_cols = 'grid-template-columns: minmax(0, 1fr) minmax(320px, 0.88fr) !important;'
if old_cols in tail:
    tail = tail.replace(
        old_cols,
        'grid-template-columns: minmax(0, 1fr) minmax(390px, 0.96fr) !important;',
    )

# Patch the desktop keypad block(s) that still use height:100%.
keypad_pattern = re.compile(
    r'(body #pmd-cashier-order-composer-v1\.pmd-coc\n'
    r'\.pmd-cashier-keypad \{)(?P<body>.*?)(\n\})',
    re.S,
)
keypad_hits = 0
parts = []
last = 0
for match in keypad_pattern.finditer(tail):
    body = match.group('body')
    new_body = body
    if 'height: 100% !important;' in new_body:
        new_body = new_body.replace(
            'height: 100% !important;',
            'height: auto !important;\n  grid-auto-rows: 45px !important;',
            1,
        )
        new_body = new_body.replace(
            'align-self: stretch !important;',
            'align-self: start !important;',
            1,
        )
        keypad_hits += 1
    parts.append(tail[last:match.start('body')])
    parts.append(new_body)
    last = match.end('body')
parts.append(tail[last:])
tail = ''.join(parts)

if keypad_hits == 0 and 'grid-auto-rows: 45px !important;' not in tail:
    raise SystemExit('STOP Cashier keypad height owner not found')

# Ensure the desktop cash grid reserves the keypad's real four-row footprint.
cash_pattern = re.compile(
    r'(body #pmd-cashier-order-composer-v1\.pmd-coc\n'
    r'\[data-pos-cash-field\] \{)(?P<body>.*?)(\n\})',
    re.S,
)
parts = []
last = 0
cash_hits = 0
for match in cash_pattern.finditer(tail):
    body = match.group('body')
    new_body = body
    if 'grid-template-areas:' in new_body:
        if 'min-height: 210px !important;' not in new_body:
            if 'height: auto !important;' not in new_body:
                raise SystemExit('STOP Cash field auto-height declaration missing')
            new_body = new_body.replace(
                'height: auto !important;',
                'height: auto !important;\n  min-height: 210px !important;',
                1,
            )
        cash_hits += 1
    parts.append(tail[last:match.start('body')])
    parts.append(new_body)
    last = match.end('body')
parts.append(tail[last:])
tail = ''.join(parts)

if cash_hits == 0:
    raise SystemExit('STOP desktop Cash field grid owner not found')

# Use the vertical layout earlier on medium screens.
tail = tail.replace(
    '@media (max-width: 820px) {',
    '@media (max-width: 900px) {',
)

css = head + tail
PAYMENT_CSS.write_text(css, encoding='utf-8')


# ------------------------------------------------------------------
# 3. Fresh browser cache keys only. No payment/business logic changes.
# ------------------------------------------------------------------
composer = COMPOSER.read_text(encoding='utf-8')
composer = bump_asset(
    composer,
    'pmd-cashier-payment-clean-v1.css',
    '20260827-r81b-real-wide-owner',
)
COMPOSER.write_text(composer, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260827-r81b-payment-real-wide',
)
php = bump_asset(
    php,
    'pmd-cashier-ui-r51.css',
    '20260827-r81b-payment-real-wide',
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
print('R81B CASHIER PAYMENT REAL WIDE OWNER APPLIED')
print('Backup:', backup)
print('- handles the partially-applied R81 state safely')
print('- patches all duplicate R80 920px declarations inside the final owner')
print('- real high-specificity Cashier UI owner is 1100px on desktop')
print('- keypad contributes its full four-row height')
print('- Change + Pay stay below the complete keypad')
print('- <=900px keeps the safe vertical layout')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('- settlement / split / coupon / tip / terminal / invoice backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
