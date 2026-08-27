#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"

echo "============================================================"
echo " PMD SETTINGS PLATFORM I18N V17.1"
echo "============================================================"
echo "ROOT=$ROOT"

echo "[1/3] Detecting base state..."
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

if [ "$BASE_PRESENT" -eq 0 ]; then
  echo "V16_2_BASE_ACTION=INSTALL_WITH_REPORTS_ANCHOR_COMPAT"
  BASE_SCRIPT="$TMP/pmd-settings-reports-platform-i18n-v16-2.sh"
  git show "origin/$BRANCH:scripts/pmd-settings-reports-platform-i18n-v16-2.sh" > "$BASE_SCRIPT"

  python3 - "$BASE_SCRIPT" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
anchor = 'git show "origin/$BRANCH:scripts/pmd-settings-reports-i18n-v16.py" > "$PATCHER"\n'
if text.count(anchor) != 1:
    raise SystemExit('ERROR=V17_1_BASE_PATCHER_LOAD_ANCHOR_MISMATCH')

injection = anchor + r'''python3 - "$PATCHER" <<'PYFIX'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
old = """    for old, new in replacements:
        if old not in text: die(f'Reports JS guarded anchor missing: {old[:70]}')
        text = text.replace(old, new, 1)
"""
new = """    donut_anchor = \"escapeHtml(tableData.title || 'Distribution') + ' distribution'\"
    for old, new in replacements:
        if old not in text:
            if old == donut_anchor:
                pattern = re.compile(r\"escapeHtml\\(tableData\\.title\\s*\\|\\|\\s*'[^']+'\\)\\s*\\+\\s*'[^']*distribution[^']*'\")
                text, count = pattern.subn(new, text, count=1)
                if count == 1:
                    print('V16_REPORTS_DONUT_ARIA_VARIANT_COMPAT_OK=1')
                    continue
                print('V16_REPORTS_DONUT_ARIA_VARIANT_NOT_PRESENT=1')
                continue
            die(f'Reports JS guarded anchor missing: {old[:70]}')
        text = text.replace(old, new, 1)
"""
if text.count(old) != 1:
    raise SystemExit('ERROR=V17_1_REPORTS_GUARD_LOOP_ANCHOR_MISMATCH')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('V17_1_TEMP_REPORTS_PATCHER_HARDENED=1')
PYFIX
'''
path.write_text(text.replace(anchor, injection, 1), encoding='utf-8')
print('V17_1_TEMP_BASE_WRAPPER_HARDENED=1')
PY

  bash -n "$BASE_SCRIPT"
  PMD_ROOT="$ROOT" bash "$BASE_SCRIPT"
elif [ "$BASE_PRESENT" -eq "${#BASE_FILES[@]}" ]; then
  echo "V16_2_BASE_ACTION=ALREADY_INSTALLED"
else
  echo "ERROR=V16_2_BASE_PARTIAL_STATE:$BASE_PRESENT/${#BASE_FILES[@]}" >&2
  echo "NOTE=No V17.1 dynamic-runtime write was attempted." >&2
  exit 101
fi

for rel in "${BASE_FILES[@]}"; do
  grep -Fq 'PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16' "$rel" || {
    echo "ERROR=V17_1_BASE_VERIFY_FAILED:$rel" >&2
    exit 102
  }
done
echo "V16_2_BASE_READY=1"

echo "[2/3] Running the guarded dynamic Settings runtime migration..."
git show "origin/$BRANCH:scripts/pmd-settings-platform-i18n-v17.sh" | PMD_ROOT="$ROOT" bash

echo "[3/3] Final V17.1 verification..."
grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' app/admin/i18n/platform/en.php
grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' app/admin/i18n/platform/de.php
grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' app/admin/assets/js/pmd-sumup-self-service-v1.js
grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js

echo "SETTINGS_PLATFORM_I18N_V17_1_OK=1"
echo "NEXT=Hard refresh /admin/pmdfinance and /admin/pmdreports/sales in German."
