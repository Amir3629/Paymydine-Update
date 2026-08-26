#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
VISUAL = ROOT / 'app/admin/assets/css/pmd-cashier-ui-r51.css'
POLICY = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js'
COMPOSER = ROOT / 'app/admin/assets/js/pmd-cashier-order-composer-r51.js'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'
PAYMENT_V3 = ROOT / 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'

for path in (VISUAL, POLICY, COMPOSER, CASHIER, PAYMENT_V3):
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r75-wide-composer-payment-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)

for path in (VISUAL, POLICY, COMPOSER, CASHIER):
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
# 1. Make the desktop Cashier Composer larger without changing its structure.
#    This gives the catalog enough room for four useful cards per row and
#    gives the order rail more width and vertical working space.
# ---------------------------------------------------------------------------
css = VISUAL.read_text(encoding='utf-8')

if 'PMD_R75_WIDE_COMPOSER_STABLE_PAYMENT' not in css:
    css = replace_once(
        css,
        '  width: min(1120px, calc(100vw - 44px)) !important;\n'
        '  height: min(720px, calc(100dvh - 44px)) !important;\n'
        '  min-height: 0 !important;\n'
        '  max-height: calc(100dvh - 44px) !important;',
        '  width: min(1380px, calc(100vw - 28px)) !important;\n'
        '  height: min(840px, calc(100dvh - 28px)) !important;\n'
        '  min-height: 0 !important;\n'
        '  max-height: calc(100dvh - 28px) !important;',
        'Composer desktop geometry'
    )

    css = replace_once(
        css,
        '  grid-template-columns:\n'
        '    minmax(0, 1fr)\n'
        '    minmax(290px, 310px) !important;',
        '  grid-template-columns:\n'
        '    minmax(0, 1fr)\n'
        '    minmax(350px, 380px) !important;',
        'Composer order rail width'
    )

    css = replace_once(
        css,
        '  grid-template-columns:\n'
        '    repeat(auto-fill, minmax(190px, 1fr)) !important;',
        '  grid-template-columns:\n'
        '    repeat(auto-fill, minmax(200px, 1fr)) !important;',
        'Composer menu grid'
    )

    # R51 previously hid only the dialog during the authoritative payment
    # summary fetch. Keep the whole nested payment layer invisible instead,
    # so the underlying Composer remains stable until Payment is ready.
    old_prepare = (
        'body #pmd-cashier-order-composer-v1.pmd-coc\n'
        '.pmd-pos-payment-modal.pmd-payment-is-preparing\n'
        '.pmd-pos-payment-dialog {\n'
        '  visibility: hidden !important;\n'
        '}'
    )
    new_prepare = (
        'body #pmd-cashier-order-composer-v1.pmd-coc\n'
        '.pmd-pos-payment-modal.pmd-payment-is-preparing {\n'
        '  visibility: hidden !important;\n'
        '  opacity: 0 !important;\n'
        '  pointer-events: none !important;\n'
        '}'
    )
    css = replace_once(
        css,
        old_prepare,
        new_prepare,
        'Payment first paint authority'
    )

    css = css.rstrip() + r'''

/* PMD_R75_WIDE_COMPOSER_STABLE_PAYMENT */
/*
 * Nested backdrop-filter over the already blurred Cashier Composer can force
 * an expensive compositor repaint when Payment opens. A stable dim layer is
 * enough here and avoids the visible flash without changing Payment logic.
 */
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-pos-payment-modal {
  background: rgba(7, 26, 31, .42) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
''' + '\n'

VISUAL.write_text(css, encoding='utf-8')


# ---------------------------------------------------------------------------
# 2. One owner for Payment open/reveal.
#    V3 already owns pmd-payment-is-preparing. Remove the duplicate policy
#    wrapper only; presentation policy still runs after every V3 render.
# ---------------------------------------------------------------------------
policy = POLICY.read_text(encoding='utf-8')

if 'PMD_R75_PAYMENT_OPEN_SINGLE_OWNER' not in policy:
    policy = replace_once(
        policy,
        '    var originalOpenPayment = api.openPayment;\n',
        '',
        'duplicate Payment open reference'
    )

    start_marker = (
        '    // V3 intentionally opens the modal before it fetches the fresh settlement\n'
    )
    end_marker = '    api.renderPayment = function () {'

    start = policy.find(start_marker)
    end = policy.find(end_marker, start)

    if start < 0 or end < 0:
        raise SystemExit('STOP duplicate Payment open wrapper boundaries not found')

    replacement = (
        '    // PMD_R75_PAYMENT_OPEN_SINGLE_OWNER\n'
        '    // Payment V3 owns the preparing/reveal lifecycle. This policy\n'
        '    // only normalizes and presents the DOM after V3 renders it.\n\n'
    )

    policy = policy[:start] + replacement + policy[end:]

POLICY.write_text(policy, encoding='utf-8')


# ---------------------------------------------------------------------------
# 3. Force a genuinely fresh Cashier policy URL and fresh Composer asset.
#    Payment V3 itself is not changed.
# ---------------------------------------------------------------------------
composer = COMPOSER.read_text(encoding='utf-8')
composer = replace_once(
    composer,
    "'cashier-payment-policy-r67h-20260826'",
    "'cashier-payment-policy-r75-20260826'",
    'Cashier policy cache key'
)
COMPOSER.write_text(composer, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-order-composer-r51.js',
    '20260826-r75-wide-stable-payment'
)
php = bump_asset(
    php,
    'pmd-cashier-ui-r51.css',
    '20260826-r75-wide-stable-payment'
)
CASHIER.write_text(php, encoding='utf-8')


# ---------------------------------------------------------------------------
# 4. Syntax + payment-engine integrity checks.
# ---------------------------------------------------------------------------
print('+ node --check', POLICY)
subprocess.run(['node', '--check', str(POLICY)], cwd=ROOT, check=True)

print('+ node --check', COMPOSER)
subprocess.run(['node', '--check', str(COMPOSER)], cwd=ROOT, check=True)

print('+ php -l', CASHIER)
subprocess.run(['php', '-l', str(CASHIER)], cwd=ROOT, check=True)

payment_hash_after = hashlib.sha256(PAYMENT_V3.read_bytes()).hexdigest()
if payment_hash_after != payment_hash_before:
    raise SystemExit('STOP Payment V3 implementation changed unexpectedly')

print('')
print('R75 CASHIER WIDE COMPOSER + STABLE PAYMENT APPLIED')
print('Backup:', backup)
print('- Composer desktop size: up to 1380 x 840')
print('- catalog gets room for four menu cards per row')
print('- right order summary rail widened to 350-380px')
print('- longer Composer gives the order rail more vertical space')
print('- duplicate policy-level Payment open wrapper removed')
print('- Payment V3 is the single preparing/reveal owner')
print('- nested Payment backdrop blur removed to avoid compositor flash')
print('- Payment V3 hash unchanged:', payment_hash_after)
print('- settlement/payment backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
