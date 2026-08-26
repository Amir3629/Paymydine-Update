#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
OVERLAY = ROOT / 'app/admin/assets/js/pmd-overlay-single-visual-plane-v4.js'
LAYOUT = ROOT / 'app/admin/views/layouts/default.blade.php'

for path in (OVERLAY, LAYOUT):
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r76-cashier-payment-no-global-animation-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)

for path in (OVERLAY, LAYOUT):
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


# ---------------------------------------------------------------------------
# The global Admin modal equalizer intentionally animates every
# .pmd-pos-payment-modal.is-show by creating a second visual plane and running
# Web Animations (blur 0 -> 8px, card opacity/scale) for 180ms.
#
# Cashier Composer already owns its own nested Payment presentation. Exclude
# only that nested Payment modal from the global equalizer. Other Admin modals
# keep their existing global visual treatment.
# ---------------------------------------------------------------------------
js = OVERLAY.read_text(encoding='utf-8')
marker = 'PMD_R76_CASHIER_PAYMENT_SKIP_GLOBAL_VISUAL_PLANE'

if marker not in js:
    old = """  function isModalRoot(el) {
    if (!el || el.nodeType !== 1 || !isVisible(el)) return false;
    if (el.classList && el.classList.contains(PLANE_CLASS)) return false;

    try {
      if (el.matches(explicitRootSelector)) return true;
"""

    new = """  function isModalRoot(el) {
    if (!el || el.nodeType !== 1 || !isVisible(el)) return false;
    if (el.classList && el.classList.contains(PLANE_CLASS)) return false;

    // PMD_R76_CASHIER_PAYMENT_SKIP_GLOBAL_VISUAL_PLANE
    // Cashier Composer is already a modal visual plane. Its nested Payment
    // modal must not receive a second 180ms blur/fade/scale animation from
    // this global Admin equalizer, otherwise Safari/desktop shows a blink.
    if (
      el.matches &&
      el.matches('.pmd-pos-payment-modal') &&
      el.closest &&
      el.closest('#pmd-cashier-order-composer-v1.pmd-coc')
    ) {
      return false;
    }

    try {
      if (el.matches(explicitRootSelector)) return true;
"""

    js = replace_once(
        js,
        old,
        new,
        'global overlay Cashier Payment exclusion'
    )

OVERLAY.write_text(js, encoding='utf-8')


# ---------------------------------------------------------------------------
# Fresh URL for the global visual-plane script.
# ---------------------------------------------------------------------------
blade = LAYOUT.read_text(encoding='utf-8')
old_version = (
    '/app/admin/assets/js/pmd-overlay-single-visual-plane-v4.js'
    '?v=20260826-console-proven-v4'
)
new_version = (
    '/app/admin/assets/js/pmd-overlay-single-visual-plane-v4.js'
    '?v=20260826-r76-cashier-payment-stable'
)

if new_version not in blade:
    blade = replace_once(
        blade,
        old_version,
        new_version,
        'global overlay cache key'
    )

LAYOUT.write_text(blade, encoding='utf-8')

print('+ node --check', OVERLAY)
subprocess.run(['node', '--check', str(OVERLAY)], cwd=ROOT, check=True)

print('')
print('R76 CASHIER PAYMENT GLOBAL ANIMATION EXCLUSION APPLIED')
print('Backup:', backup)
print('- Cashier nested Payment no longer enters global modal equalizer')
print('- removed extra 180ms blur/fade/scale owner for Cashier Payment')
print('- Composer visual treatment unchanged')
print('- other Admin modals unchanged')
print('- Payment V3 changed: 0')
print('- settlement/payment backend changed: 0')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
