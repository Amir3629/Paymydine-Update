#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"

echo "============================================================"
echo " PMD SETTINGS PLATFORM I18N V17.2"
echo "============================================================"
echo "ROOT=$ROOT"

echo "[1/4] Verifying the already-installed V16.2 base..."
BASE_FILES=(
  "app/admin/classes/PmdPlatformI18n.php"
  "app/admin/i18n/platform/en.php"
  "app/admin/i18n/platform/de.php"
  "app/admin/views/pmdfinance/index.blade.php"
  "app/admin/controllers/Pmdreports.php"
)
BASE_PRESENT=0
for rel in "${BASE_FILES[@]}"; do
  if grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' "$rel"; then
    BASE_PRESENT=$((BASE_PRESENT + 1))
  fi
done
echo "V16_BASE_MARKERS_PRESENT=$BASE_PRESENT"
if [ "$BASE_PRESENT" -ne "${#BASE_FILES[@]}" ]; then
  echo "ERROR=V17_2_REQUIRES_FULL_V16_2_BASE:$BASE_PRESENT/${#BASE_FILES[@]}" >&2
  echo "NOTE=No V17.2 write was attempted." >&2
  exit 101
fi
grep -Fq 'fromEnglish: fromEnglish' app/admin/assets/js/pmd-platform-messages.js
echo "V16_2_BASE_READY=1"

echo "[2/4] Building a temporary hardened V17 wrapper..."
V17_SCRIPT="$TMP/pmd-settings-platform-i18n-v17.sh"
git show "origin/$BRANCH:scripts/pmd-settings-platform-i18n-v17.sh" > "$V17_SCRIPT"

python3 - "$V17_SCRIPT" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
anchor = 'git show "origin/$BRANCH:scripts/pmd-settings-dynamic-i18n-v17.py" > "$PATCHER"\n'
if text.count(anchor) != 1:
    raise SystemExit('ERROR=V17_2_PATCHER_LOAD_ANCHOR_MISMATCH')

injection = anchor + r"""python3 - "$PATCHER" <<'PYFIX'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
old = r'''    text = one(text, "        '<span>' + esc(label) + '</span>',", "        '<span>' + settingsHtml(label) + '</span>',", 'provider field label')
'''
new = r'''    field_start = text.find('  function field(label, key, type, value, placeholder, readonly, help) {')
    field_end = text.find('\n  function envButton(key, label) {', field_start)
    if field_start < 0 or field_end < 0:
        die('provider field function anchors missing')
    field_block = text[field_start:field_end]
    field_label_old = "        '<span>' + esc(label) + '</span>',"
    field_label_new = "        '<span>' + settingsHtml(label) + '</span>',"
    if field_block.count(field_label_old) != 1:
        die(f'provider scoped field label anchor mismatch: {field_block.count(field_label_old)}, expected 1')
    field_block = field_block.replace(field_label_old, field_label_new, 1)
    text = text[:field_start] + field_block + text[field_end:]
    print('V17_2_PROVIDER_FIELD_LABEL_SCOPED_OK=1')
'''
if text.count(old) != 1:
    raise SystemExit('ERROR=V17_2_PROVIDER_FIELD_PATCHER_ANCHOR_MISMATCH')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('V17_2_TEMP_DYNAMIC_PATCHER_HARDENED=1')
PYFIX
"""
path.write_text(text.replace(anchor, injection, 1), encoding='utf-8')
print('V17_2_TEMP_WRAPPER_HARDENED=1')
PY

bash -n "$V17_SCRIPT"
echo "V17_2_TEMP_WRAPPER_VALID=1"

echo "[3/4] Running guarded V17 dynamic Settings migration..."
PMD_ROOT="$ROOT" bash "$V17_SCRIPT"

echo "[4/4] Final V17.2 verification..."
for rel in \
  app/admin/i18n/platform/en.php \
  app/admin/i18n/platform/de.php \
  app/admin/assets/js/pmd-payment-provider-catalogue-v1.js \
  app/admin/assets/js/pmd-sumup-self-service-v1.js \
  app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js; do
  grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' "$rel" || {
    echo "ERROR=V17_2_FINAL_MARKER_MISSING:$rel" >&2
    exit 130
  }
done

grep -Fq "settingsHtml(label)" app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -Fq "settingsHtml('PAYMENT PROVIDER')" app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -Fq "settingsText('Configure')" app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -Fq "settingsHtml('PAYMENT TERMINALS')" app/admin/assets/js/pmd-sumup-self-service-v1.js
grep -Fq "settingsText('Online Card & Wallets')" app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js

echo "V17_2_PROVIDER_FIELD_SCOPE_OK=1"
echo "SETTINGS_PLATFORM_I18N_V17_2_OK=1"
echo "NEXT=Hard refresh /admin/pmdfinance, /admin/pmddevices and /admin/pmdreports/sales in German."
