#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
REF="origin/i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-platform-i18n-sweep-backups/${STAMP}"
OUT="${HOME}/pmd-platform-i18n-sweeps/${STAMP}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

BOOT="app/admin/views/_partials/pmd_admin_i18n.blade.php"
SIDE="app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
COUPON_VIEW="app/admin/views/pmdcoupons/index.blade.php"
POLICY_V2="app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
POLICY_ALIAS="app/admin/assets/js/pmd-waiter-pos-payment-policy-r67g.js"
SIDE_EXPECTED_SHA="ac74a053e8a11eb0981f015085ca47dec63f572095d7ae5212a50d9b9f42ed47"

PLATFORM_FILES=(
  "app/admin/classes/PmdPlatformI18n.php"
  "app/admin/i18n/platform/en.php"
  "app/admin/i18n/platform/de.php"
  "app/admin/views/_partials/pmd_platform_messages.blade.php"
  "app/admin/assets/js/pmd-platform-messages.js"
)

mkdir -p "$BACKUP" "$OUT" "$TMP/candidate"
cd "$ROOT"

echo "============================================================"
echo " PMD PLATFORM I18N GLOBAL SWEEP V2"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"
echo "OUTPUT=$OUT"

git fetch origin i18n/platform-catalog-consolidation

for path in "${PLATFORM_FILES[@]}"; do
  mkdir -p "$TMP/candidate/$(dirname "$path")"
  git show "$REF:$path" > "$TMP/candidate/$path"
done

git show "$REF:$POLICY_V2" > "$TMP/policy.new.js"
git show "$REF:$POLICY_ALIAS" > "$TMP/policy.old.js"
git show "$REF:scripts/pmd-validate-platform-i18n.php" > "$TMP/validate.php"
git show "$REF:scripts/pmd-audit-platform-i18n-readonly.py" > "$TMP/audit.py"

php -l "$TMP/candidate/app/admin/classes/PmdPlatformI18n.php"
php -l "$TMP/candidate/app/admin/i18n/platform/en.php"
php -l "$TMP/candidate/app/admin/i18n/platform/de.php"
php -l "$TMP/validate.php"
python3 -m py_compile "$TMP/audit.py"
if command -v node >/dev/null 2>&1; then
  node --check "$TMP/policy.new.js"
fi

mkdir -p "$TMP/mini/app/admin/i18n/platform" "$TMP/mini/scripts"
cp "$TMP/candidate/app/admin/i18n/platform/en.php" "$TMP/mini/app/admin/i18n/platform/en.php"
cp "$TMP/candidate/app/admin/i18n/platform/de.php" "$TMP/mini/app/admin/i18n/platform/de.php"
cp "$TMP/validate.php" "$TMP/mini/scripts/pmd-validate-platform-i18n.php"
php "$TMP/mini/scripts/pmd-validate-platform-i18n.php" "$TMP/mini"

for path in "$BOOT" "$SIDE" "$POLICY_V2" "$POLICY_ALIAS"; do
  [ -f "$path" ] || { echo "ERROR=Missing live file: $path" >&2; exit 10; }
  mkdir -p "$BACKUP/$(dirname "$path")"
  cp -a "$path" "$BACKUP/$path"
  sha256sum "$path" >> "$BACKUP/live-before.sha256"
done

if [ -f "$COUPON_VIEW" ]; then
  mkdir -p "$BACKUP/$(dirname "$COUPON_VIEW")"
  cp -a "$COUPON_VIEW" "$BACKUP/$COUPON_VIEW"
fi

for path in "${PLATFORM_FILES[@]}"; do
  if [ -e "$path" ]; then
    mkdir -p "$BACKUP/existing/$(dirname "$path")"
    cp -a "$path" "$BACKUP/existing/$path"
  fi
done

# Guard the payment policy: only replace the audited old policy or an already-migrated copy.
for path in "$POLICY_V2" "$POLICY_ALIAS"; do
  if cmp -s "$path" "$TMP/policy.new.js"; then
    echo "POLICY_ALREADY_MIGRATED=$path"
  elif cmp -s "$path" "$TMP/policy.old.js"; then
    echo "POLICY_SAFE_TO_MIGRATE=$path"
  else
    echo "ERROR=$path differs from both audited old and new policy; nothing changed." >&2
    exit 11
  fi
done

# Global message payload: reuse the existing common Admin i18n head partial.
python3 - "$BOOT" "$TMP/boot.candidate" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1])
out = Path(sys.argv[2])
text = src.read_text(encoding='utf-8')
marker = 'PMD_PLATFORM_MESSAGES_GLOBAL_V1'
block = "{{-- PMD_PLATFORM_MESSAGES_GLOBAL_V1 --}}\n@include('admin::_partials.pmd_platform_messages')\n\n"
if marker not in text:
    anchor = '@php\n'
    if text.count(anchor) < 1:
        raise SystemExit('ERROR=Could not find the first @php anchor in pmd_admin_i18n')
    text = text.replace(anchor, block + anchor, 1)
if text.count(marker) != 1:
    raise SystemExit('ERROR=Global platform message marker count is not 1')
out.write_text(text, encoding='utf-8')
print('GLOBAL_MESSAGE_BOOT_CANDIDATE_OK=1')
PY

# Side Menu: live file was previously audited and matches the platform branch exactly.
SIDE_SHA="$(sha256sum "$SIDE" | awk '{print $1}')"
if ! grep -q 'PMD_SIDE_MENU_PLATFORM_I18N_V1' "$SIDE"; then
  if [ "$SIDE_SHA" != "$SIDE_EXPECTED_SHA" ]; then
    echo "ERROR=Side Menu changed since audited hash $SIDE_EXPECTED_SHA; nothing changed." >&2
    exit 12
  fi
fi

python3 - "$SIDE" "$TMP/side.candidate" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1])
out = Path(sys.argv[2])
text = src.read_text(encoding='utf-8')
marker = 'PMD_SIDE_MENU_PLATFORM_I18N_V1'

if marker not in text:
    anchor = "    $pmdSm2IsDe = $pmdSm2Locale === 'de';\n"
    if anchor not in text:
        raise SystemExit('ERROR=Side Menu locale anchor missing')
    text = text.replace(
        anchor,
        anchor + "    // PMD_SIDE_MENU_PLATFORM_I18N_V1\n    $pmdSm2T = static fn(string $key): string => \\Admin\\Classes\\PmdPlatformI18n::translate($key);\n",
        1,
    )

replacements = [
    ('aria-label="Admin navigation"', 'aria-label="{{ $pmdSm2T(\'nav.admin_navigation\') }}"'),
    ('aria-label="Expand menu"', 'aria-label="{{ $pmdSm2T(\'nav.expand_menu\') }}"'),
    ('<span class="pmd-sm2__label">Dashboard</span>', '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.dashboard\') }}</span>'),
    ('<span class="pmd-sm2__label">Manager</span>', '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.manager\') }}</span>'),
    ("<span class=\"pmd-sm2__label\">{{ $pmdSm2IsDe ? 'Buchhaltung' : 'Accountant' }}</span>", "<span class=\"pmd-sm2__label\">{{ $pmdSm2T('nav.accountant') }}</span>"),
    ('<span class="pmd-sm2__label">Orders</span>', '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.orders\') }}</span>'),
    ('<span class="pmd-sm2__label">Reservations</span>', '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.reservations\') }}</span>'),
    ('<span class="pmd-sm2__label">Coupons &amp; Gifts</span>', '<span class="pmd-sm2__label">{{ $pmdSm2T(\'nav.coupons_gifts\') }}</span>'),
    ("<span class=\"pmd-sm2__label\">{{ $pmdSm2IsDe ? 'Menü' : 'Menu' }}</span>", "<span class=\"pmd-sm2__label\">{{ $pmdSm2T('nav.menu') }}</span>"),
    ("<span class=\"pmd-sm2__label\">{{ $pmdSm2IsDe ? 'Einstellungen' : 'Settings' }}</span>", "<span class=\"pmd-sm2__label\">{{ $pmdSm2T('nav.settings') }}</span>"),
    ('aria-label="Account actions"', 'aria-label="{{ $pmdSm2T(\'nav.account_actions\') }}"'),
    ('aria-label="Log out"', 'aria-label="{{ $pmdSm2T(\'nav.logout\') }}"'),
    ('title="Logout"', 'title="{{ $pmdSm2T(\'nav.logout\') }}"'),
    ('<span class="pmd-sm2__account-label">Logout</span>', '<span class="pmd-sm2__account-label">{{ $pmdSm2T(\'nav.logout\') }}</span>'),
    ("button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');", "button.setAttribute('aria-label', open ? @json($pmdSm2T('nav.close_navigation')) : @json($pmdSm2T('nav.open_navigation')));"),
    ("if (window.confirm('Are you sure you want to log out?')) {", "if (window.confirm(@json($pmdSm2T('nav.logout') . '?'))) {")
]

for old, new in replacements:
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise SystemExit('ERROR=Side Menu expected anchor missing: ' + old[:80])

if text.count(marker) != 1:
    raise SystemExit('ERROR=Side Menu platform i18n marker count is not 1')
out.write_text(text, encoding='utf-8')
print('SIDE_MENU_CANDIDATE_OK=1')
PY

# Once the global payload is mounted, remove the temporary Coupons-only mount.
if [ -f "$COUPON_VIEW" ]; then
  python3 - "$COUPON_VIEW" "$TMP/coupon.candidate" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1])
out = Path(sys.argv[2])
text = src.read_text(encoding='utf-8')
text = text.replace("{{-- PMD_PLATFORM_I18N_COUPONS_V1 --}}\n@include('admin::_partials.pmd_platform_messages')\n", '')
out.write_text(text, encoding='utf-8')
print('COUPON_GLOBAL_MOUNT_DEDUPED=1')
PY
fi

echo "--- SIDE MENU DIFF ---"
diff -u "$SIDE" "$TMP/side.candidate" | sed -n '1,220p' || true

echo "INSTALLING_PLATFORM_RUNTIME=1"
for path in "${PLATFORM_FILES[@]}"; do
  target="$ROOT/$path"
  if [ -e "$target" ]; then
    sudo tee "$target" < "$TMP/candidate/$path" >/dev/null
  else
    sudo install -D -m 0644 "$TMP/candidate/$path" "$target"
  fi
done

echo "INSTALLING_GLOBAL_BOOT=1"
sudo tee "$ROOT/$BOOT" < "$TMP/boot.candidate" >/dev/null

echo "INSTALLING_SIDE_MENU_I18N=1"
sudo tee "$ROOT/$SIDE" < "$TMP/side.candidate" >/dev/null

echo "INSTALLING_PAYMENT_POLICY_I18N=1"
sudo tee "$ROOT/$POLICY_V2" < "$TMP/policy.new.js" >/dev/null
sudo tee "$ROOT/$POLICY_ALIAS" < "$TMP/policy.new.js" >/dev/null

if [ -f "$COUPON_VIEW" ] && [ -f "$TMP/coupon.candidate" ]; then
  sudo tee "$ROOT/$COUPON_VIEW" < "$TMP/coupon.candidate" >/dev/null
fi

php -l "$ROOT/app/admin/classes/PmdPlatformI18n.php"
php -l "$ROOT/app/admin/i18n/platform/en.php"
php -l "$ROOT/app/admin/i18n/platform/de.php"
php "$TMP/validate.php" "$ROOT"
if command -v node >/dev/null 2>&1; then
  node --check "$ROOT/$POLICY_V2"
  node --check "$ROOT/$POLICY_ALIAS"
fi

grep -q 'PMD_PLATFORM_MESSAGES_GLOBAL_V1' "$BOOT"
grep -q 'PMD_SIDE_MENU_PLATFORM_I18N_V1' "$SIDE"
grep -q 'PMD_PAYMENT_PLATFORM_I18N_V1' "$POLICY_V2"
grep -q 'PMD_PAYMENT_PLATFORM_I18N_V1' "$POLICY_ALIAS"
grep -q "payment.split_part" "$ROOT/app/admin/i18n/platform/de.php"

php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICE="$(systemctl list-units --type=service --all --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1; exit}')"
if [ -n "$FPM_SERVICE" ]; then
  echo "RELOADING_FPM=$FPM_SERVICE"
  sudo systemctl reload "$FPM_SERVICE"
fi

for path in "$BOOT" "$SIDE" "$POLICY_V2" "$POLICY_ALIAS"; do
  sha256sum "$path" >> "$BACKUP/live-after.sha256"
done

echo
echo "[POST-SWEEP READ-ONLY COVERAGE AUDIT]"
python3 "$TMP/audit.py" "$ROOT" \
  --json-out "$OUT/platform-i18n-audit.json" \
  --tsv-out "$OUT/platform-i18n-candidates.tsv" \
  | tee "$OUT/platform-i18n-audit.txt"

echo
echo "============================================================"
echo " PLATFORM I18N GLOBAL SWEEP COMPLETE"
echo "============================================================"
echo "GLOBAL_PLATFORM_MESSAGES_OK=1"
echo "SIDE_MENU_PLATFORM_I18N_OK=1"
echo "PAYMENT_PLATFORM_I18N_OK=1"
echo "CATALOG_VALIDATION_OK=1"
echo "SWEEP_OK=1"
echo "BACKUP=$BACKUP"
echo "AUDIT=$OUT/platform-i18n-audit.txt"
echo "CANDIDATES=$OUT/platform-i18n-candidates.tsv"
echo "NEXT=Hard refresh Cashier/Waiter in German and reopen Payment. The audit count printed above is the remaining migration backlog; do not treat it as finished until it is cleared or explicitly excluded as dynamic restaurant/user content."
