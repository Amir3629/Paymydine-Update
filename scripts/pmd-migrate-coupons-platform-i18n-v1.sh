#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
REF="origin/i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-coupons-i18n-backups/${STAMP}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

VIEW="app/admin/views/pmdcoupons/index.blade.php"
STABLE_JS="app/admin/assets/js/pmd-coupon-stable-r24.js"

NEW_FILES=(
  "app/admin/classes/PmdPlatformI18n.php"
  "app/admin/i18n/platform/en.php"
  "app/admin/i18n/platform/de.php"
  "app/admin/views/_partials/pmd_platform_messages.blade.php"
  "app/admin/assets/js/pmd-platform-messages.js"
)

cd "$ROOT"
mkdir -p "$BACKUP" "$TMP/candidate"

echo "============================================================"
echo " PMD COUPONS PLATFORM I18N MIGRATION V1"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

git fetch origin i18n/platform-catalog-consolidation

for path in "${NEW_FILES[@]}"; do
  mkdir -p "$TMP/candidate/$(dirname "$path")"
  git show "$REF:$path" > "$TMP/candidate/$path"
done

git show "$REF:$STABLE_JS" > "$TMP/branch-stable.js"
git show "$REF:scripts/pmd-validate-platform-i18n.php" > "$TMP/validate.php"

php -l "$TMP/candidate/app/admin/classes/PmdPlatformI18n.php"
php -l "$TMP/candidate/app/admin/i18n/platform/en.php"
php -l "$TMP/candidate/app/admin/i18n/platform/de.php"
php -l "$TMP/validate.php"

# Validate the candidate catalogue in an isolated mini-root.
mkdir -p "$TMP/mini/app/admin/i18n/platform" "$TMP/mini/scripts"
cp "$TMP/candidate/app/admin/i18n/platform/en.php" "$TMP/mini/app/admin/i18n/platform/en.php"
cp "$TMP/candidate/app/admin/i18n/platform/de.php" "$TMP/mini/app/admin/i18n/platform/de.php"
cp "$TMP/validate.php" "$TMP/mini/scripts/pmd-validate-platform-i18n.php"
php "$TMP/mini/scripts/pmd-validate-platform-i18n.php" "$TMP/mini"

[ -f "$VIEW" ] || { echo "ERROR=Missing $VIEW" >&2; exit 10; }
[ -f "$STABLE_JS" ] || { echo "ERROR=Missing $STABLE_JS" >&2; exit 11; }

sha256sum "$VIEW" | tee "$BACKUP/view.sha256.before"
sha256sum "$STABLE_JS" | tee "$BACKUP/stable-js.sha256.before"
cp -a "$VIEW" "$BACKUP/index.blade.php.before"
cp -a "$STABLE_JS" "$BACKUP/pmd-coupon-stable-r24.js.before"

for path in "${NEW_FILES[@]}"; do
  if [ -e "$path" ]; then
    mkdir -p "$BACKUP/existing/$(dirname "$path")"
    cp -a "$path" "$BACKUP/existing/$path"
  fi
done

python3 - "$VIEW" "$TMP/view.candidate" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
text = src.read_text(encoding='utf-8')
marker = "PMD_PLATFORM_I18N_COUPONS_V1"

if marker not in text:
    if not text.startswith('@php'):
        raise SystemExit('ERROR=Unexpected coupons view start; refusing patch')
    text = "{{-- PMD_PLATFORM_I18N_COUPONS_V1 --}}\n@include('admin::_partials.pmd_platform_messages')\n" + text

old_total = "'overview' => 'Gutscheinübersicht', 'total' => 'Codes', 'total_help'"
new_total = "'overview' => 'Gutscheinübersicht', 'total' => 'Gutscheincodes', 'total_help'"
if old_total in text:
    text = text.replace(old_total, new_total, 1)
elif new_total not in text:
    raise SystemExit('ERROR=German total label anchor not found')

old_voucher = "'coupon' => 'Gutschein', 'gift_card' => 'Geschenkkarte', 'voucher' => 'Voucher', 'credit'"
new_voucher = "'coupon' => 'Gutschein', 'gift_card' => 'Geschenkkarte', 'voucher' => 'Wertgutschein', 'credit'"
if old_voucher in text:
    text = text.replace(old_voucher, new_voucher, 1)
elif new_voucher not in text:
    raise SystemExit('ERROR=German voucher label anchor not found')

if text.count(marker) != 1:
    raise SystemExit('ERROR=Coupons platform i18n marker count is not 1')

out.write_text(text, encoding='utf-8')
print('VIEW_CANDIDATE_OK=1')
PY

python3 - "$STABLE_JS" "$TMP/stable.candidate" <<'PY'
from pathlib import Path
import re
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
text = src.read_text(encoding='utf-8')

if 'PMD_COUPON_STABLE_R24' not in text:
    raise SystemExit('ERROR=Coupon stable authority marker missing')

pattern = re.compile(
    r"\n    function localeCopy\(\) \{.*?\n    \}\n\n    function cleanHeader",
    re.S,
)
replacement = r'''
    function platformText(key, fallback) {
        var runtime = window.PMDPlatformMessages;
        if (runtime && typeof runtime.t === 'function') {
            return runtime.t(key, {}, fallback);
        }
        return fallback;
    }

    function localeCopy() {
        return {
            title: platformText('coupons.smart_add.title', 'Add new coupon / card'),
            help: platformText('coupons.smart_add.help', 'Create a coupon, gift card or voucher.')
        };
    }

    function cleanHeader'''

next_text, count = pattern.subn(replacement, text, count=1)
if count == 0:
    if "platformText('coupons.smart_add.title'" in text:
        next_text = text
    else:
        raise SystemExit('ERROR=Legacy localeCopy block not found; refusing patch')

next_text = next_text.replace("version: '24.0.0'", "version: '24.1.0-platform-i18n'", 1)

if 'document.cookie.match' in next_text:
    raise SystemExit('ERROR=Direct locale cookie read still present')
if "platformText('coupons.smart_add.title'" not in next_text:
    raise SystemExit('ERROR=Platform smart-add key missing after patch')

out.write_text(next_text, encoding='utf-8')
print('STABLE_JS_CANDIDATE_OK=1')
PY

# Ensure only the intended view changes occurred.
diff -u "$VIEW" "$TMP/view.candidate" | sed -n '1,180p' || true
diff -u "$STABLE_JS" "$TMP/stable.candidate" | sed -n '1,180p' || true

echo "INSTALLING_NEW_PLATFORM_RUNTIME=1"
for path in "${NEW_FILES[@]}"; do
  sudo install -D -m 0644 "$TMP/candidate/$path" "$ROOT/$path"
done

echo "INSTALLING_PATCHED_COUPONS_FILES=1"
sudo tee "$ROOT/$VIEW" < "$TMP/view.candidate" >/dev/null
sudo tee "$ROOT/$STABLE_JS" < "$TMP/stable.candidate" >/dev/null

php -l "$ROOT/app/admin/classes/PmdPlatformI18n.php"
php -l "$ROOT/app/admin/i18n/platform/en.php"
php -l "$ROOT/app/admin/i18n/platform/de.php"
php "$TMP/validate.php" "$ROOT"

# Static post-install assertions.
grep -q 'PMD_PLATFORM_I18N_COUPONS_V1' "$VIEW"
grep -q "pmd_platform_messages" "$VIEW"
grep -q 'Gutscheincodes' "$VIEW"
grep -q 'Wertgutschein' "$VIEW"
grep -q "platformText('coupons.smart_add.title'" "$STABLE_JS"
if grep -q 'document.cookie.match' "$STABLE_JS"; then
  echo "ERROR=Direct cookie locale read survived install" >&2
  exit 20
fi

php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICE="$(systemctl list-units --type=service --all --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1; exit}')"
if [ -n "$FPM_SERVICE" ]; then
  echo "RELOADING_FPM=$FPM_SERVICE"
  sudo systemctl reload "$FPM_SERVICE"
fi

sha256sum "$VIEW" | tee "$BACKUP/view.sha256.after"
sha256sum "$STABLE_JS" | tee "$BACKUP/stable-js.sha256.after"

echo "============================================================"
echo " COUPONS PLATFORM I18N MIGRATION COMPLETE"
echo "============================================================"
echo "COUPONS_PLATFORM_I18N_OK=1"
echo "BACKUP=$BACKUP"
echo "NEXT=Hard refresh /admin/coupons in German and verify the smart-add card, Gutscheincodes and Wertgutschein."
echo "ROLLBACK_VIEW=sudo tee '$ROOT/$VIEW' < '$BACKUP/index.blade.php.before' >/dev/null"
echo "ROLLBACK_JS=sudo tee '$ROOT/$STABLE_JS' < '$BACKUP/pmd-coupon-stable-r24.js.before' >/dev/null"
