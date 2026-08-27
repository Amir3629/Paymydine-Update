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
    'paymydine-r83-cashier-payment-taller-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)
for path in (PAYMENT_CSS, COMPOSER, CASHIER):
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


css = PAYMENT_CSS.read_text(encoding='utf-8')

marker_r82 = '/* PMD_R82_CASHIER_PAYMENT_FLAT_RESPONSIVE_LAYOUT */'
marker_r83 = '/* PMD_R83_CASHIER_PAYMENT_TALLER_TOUCH_TARGETS */'

if marker_r83 not in css:
    marker = css.find(marker_r82)
    if marker < 0:
        raise SystemExit('STOP R82 final payment layout owner not found')

    head = css[:marker]
    tail = css[marker:]
    tail = tail.replace(marker_r82, marker_r83, 1)

    compact_marker = '/* Compact height profile for common laptop/embedded frames. */'
    compact_pos = tail.find(compact_marker)
    if compact_pos < 0:
        raise SystemExit('STOP R82 compact profile not found')

    normal = tail[:compact_pos]
    compact = tail[compact_pos:]

    # Give the dialog more vertical room before any internal scrolling is needed.
    old = 'max-height: calc(100dvh - 24px) !important;'
    if old not in normal:
        raise SystemExit('STOP R82 dialog max-height not found')
    normal = normal.replace(
        old,
        'max-height: calc(100dvh - 12px) !important;',
        1,
    )

    # Slightly more breathing room around the content without returning to
    # nested card-on-card spacing.
    normal = normal.replace(
        'padding: 8px 12px 10px !important;',
        'padding: 10px 14px 12px !important;',
        1,
    )
    normal = normal.replace(
        'padding: 8px 2px !important;',
        'padding: 10px 2px !important;',
    )

    # Increase all operational touch targets in the normal desktop profile.
    # Descending order avoids a replacement created by an earlier replacement
    # being changed a second time.
    normal_sizes = [
        (52, 58),
        (50, 56),
        (48, 54),
        (44, 50),
        (42, 48),
        (38, 44),
        (36, 42),
        (34, 40),
    ]
    for old_px, new_px in normal_sizes:
        normal = normal.replace(
            f'height: {old_px}px !important;',
            f'height: {new_px}px !important;',
        )
        normal = normal.replace(
            f'min-height: {old_px}px !important;',
            f'min-height: {new_px}px !important;',
        )
        normal = normal.replace(
            f'line-height: {old_px}px !important;',
            f'line-height: {new_px}px !important;',
        )
        normal = normal.replace(
            f'grid-auto-rows: {old_px}px !important;',
            f'grid-auto-rows: {new_px}px !important;',
        )

    # R82 compacted fairly early at 780px viewport height. Keep the compact
    # profile only for genuinely short frames; regular laptop frames now get
    # the taller controls.
    compact = compact.replace(
        '@media (min-width: 901px) and (max-height: 780px) {',
        '@media (min-width: 901px) and (max-height: 690px) {',
        1,
    )

    # Even the emergency short-frame profile should remain touchable.
    compact_sizes = [
        (48, 52),
        (44, 48),
        (42, 46),
        (36, 42),
        (34, 40),
        (32, 38),
    ]
    for old_px, new_px in compact_sizes:
        compact = compact.replace(
            f'height: {old_px}px !important;',
            f'height: {new_px}px !important;',
        )
        compact = compact.replace(
            f'min-height: {old_px}px !important;',
            f'min-height: {new_px}px !important;',
        )
        compact = compact.replace(
            f'line-height: {old_px}px !important;',
            f'line-height: {new_px}px !important;',
        )
        compact = compact.replace(
            f'grid-auto-rows: {old_px}px !important;',
            f'grid-auto-rows: {new_px}px !important;',
        )

    css = head + normal + compact
    PAYMENT_CSS.write_text(css, encoding='utf-8')

# Fresh browser keys only; no settlement/payment JS changes.
composer = COMPOSER.read_text(encoding='utf-8')
composer = bump_asset(
    composer,
    'pmd-cashier-payment-clean-v1.css',
    '20260827-r83-taller-touch-targets',
)
COMPOSER.write_text(composer, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260827-r83-payment-taller',
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
print('R83 CASHIER PAYMENT TALLER TOUCH TARGETS APPLIED')
print('Backup:', backup)
print('- R82 final owner updated in place; no new CSS owner stacked')
print('- Payment dialog may use almost the full available viewport height')
print('- split / method / tip / coupon / cash / keypad / footer controls are taller')
print('- normal desktop profile stays active down to 690px viewport height')
print('- genuinely short frames remain scroll-safe')
print('- Payment V3 implementation hash unchanged:', payment_hash_after)
print('- settlement / split / coupon / tip / terminal / invoice backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
