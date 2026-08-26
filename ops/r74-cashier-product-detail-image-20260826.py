#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil
import subprocess

ROOT = Path('/var/www/paymydine')
VISUAL = ROOT / 'app/admin/assets/css/pmd-cashier-ui-r51.css'
CASHIER = ROOT / 'app/admin/controllers/Cashierlab.php'

for path in (VISUAL, CASHIER):
    if not path.is_file():
        raise SystemExit('STOP missing: ' + str(path))

backup = Path('/root') / (
    'paymydine-r74-product-detail-image-' +
    datetime.now().strftime('%Y%m%d_%H%M%S')
)
for path in (VISUAL, CASHIER):
    dest = backup / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)


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

css = VISUAL.read_text(encoding='utf-8')
start = '/* PMD_R74_PRODUCT_DETAIL_IMAGE_START */'
end = '/* PMD_R74_PRODUCT_DETAIL_IMAGE_END */'

rule = r'''/* PMD_R74_PRODUCT_DETAIL_IMAGE_START */
/*
 * Final Cashier visual authority for the real menu image in Food Details.
 * The base Composer already intends cover/fill. Reassert it here because
 * global admin image rules can otherwise win later in the cascade.
 * PayMyDine/logo fallback remains excluded and keeps its existing contain UI.
 */
body #pmd-cashier-order-composer-v1.pmd-coc
.pmd-coc-product__image > img[data-coc-detail-image]:not(.is-pmd-logo-fallback):not([src*="/brand/paymydine-logo.svg"]) {
  position: absolute !important;
  inset: 0 !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  object-fit: cover !important;
  object-position: center center !important;
}
/* PMD_R74_PRODUCT_DETAIL_IMAGE_END */'''

if start in css:
    a = css.find(start)
    b = css.find(end, a)
    if b < 0:
        raise SystemExit('STOP existing R74 end marker missing')
    b += len(end)
    css = css[:a].rstrip() + '\n\n' + rule + css[b:]
else:
    css = css.rstrip() + '\n\n' + rule + '\n'

VISUAL.write_text(css, encoding='utf-8')

php = CASHIER.read_text(encoding='utf-8')
php = bump_asset(
    php,
    'pmd-cashier-ui-r51.css',
    '20260826-r74-product-detail-image'
)
CASHIER.write_text(php, encoding='utf-8')

print('+ php -l', CASHIER)
subprocess.run(['php', '-l', str(CASHIER)], cwd=ROOT, check=True)

print('')
print('R74 CASHIER PRODUCT DETAIL IMAGE APPLIED')
print('Backup:', backup)
print('- real Food Details image now fills the media box')
print('- object-fit: cover / centered')
print('- logo fallback remains contain-style')
print('- no order/payment/settlement JS or backend changed')
print('Next: php artisan view:clear && sudo systemctl reload php8.3-fpm')
