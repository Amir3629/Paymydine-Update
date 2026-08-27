#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-settings-i18n-v17-3-backups/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP"

echo "============================================================"
echo " PMD SETTINGS PLATFORM I18N V17.3"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

echo "[1/6] Verifying installed V16.2 base..."
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
  echo "ERROR=V17_3_REQUIRES_FULL_V16_2_BASE:$BASE_PRESENT/${#BASE_FILES[@]}" >&2
  echo "NOTE=No V17.3 write was attempted." >&2
  exit 101
fi
grep -Fq 'fromEnglish: fromEnglish' app/admin/assets/js/pmd-platform-messages.js
echo "V16_2_BASE_READY=1"

echo "[2/6] Hardening temporary V17 patcher + validator to match the real runtime contract..."
V17_SCRIPT="$TMP/pmd-settings-platform-i18n-v17.sh"
git show "origin/$BRANCH:scripts/pmd-settings-platform-i18n-v17.sh" > "$V17_SCRIPT"

python3 - "$V17_SCRIPT" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')

load_anchor = 'git show "origin/$BRANCH:scripts/pmd-settings-dynamic-i18n-v17.py" > "$PATCHER"\n'
if text.count(load_anchor) != 1:
    raise SystemExit('ERROR=V17_3_PATCHER_LOAD_ANCHOR_MISMATCH')

injection = load_anchor + r"""python3 - "$PATCHER" <<'PYFIX'
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
    print('V17_3_PROVIDER_FIELD_LABEL_SCOPED_OK=1')
'''
if text.count(old) != 1:
    raise SystemExit('ERROR=V17_3_PROVIDER_FIELD_PATCHER_ANCHOR_MISMATCH')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('V17_3_TEMP_DYNAMIC_PATCHER_HARDENED=1')
PYFIX
"""
text = text.replace(load_anchor, injection, 1)

wrong = 'grep -Fq "settingsText(\'Configure\')"'
right = 'grep -Fq "settingsHtml(\'Configure\')"'
count = text.count(wrong)
if count != 2:
    raise SystemExit(f'ERROR=V17_3_CONFIGURE_VALIDATOR_ANCHOR_MISMATCH:{count}/2')
text = text.replace(wrong, right)

path.write_text(text, encoding='utf-8')
print('V17_3_CONFIGURE_VALIDATOR_FIXED=1')
print('V17_3_TEMP_V17_WRAPPER_HARDENED=1')
PY

bash -n "$V17_SCRIPT"
echo "V17_3_TEMP_V17_WRAPPER_VALID=1"

echo "[3/6] Running guarded dynamic Settings V17 migration..."
PMD_ROOT="$ROOT" bash "$V17_SCRIPT"

for rel in \
  app/admin/i18n/platform/en.php \
  app/admin/i18n/platform/de.php \
  app/admin/assets/js/pmd-payment-provider-catalogue-v1.js \
  app/admin/assets/js/pmd-sumup-self-service-v1.js \
  app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js; do
  grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' "$rel" || {
    echo "ERROR=V17_3_DYNAMIC_MARKER_MISSING:$rel" >&2
    exit 120
  }
done
grep -Fq "settingsHtml('Configure')" app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
echo "V17_DYNAMIC_SETTINGS_READY=1"

echo "[4/6] Building Restaurant-profile residual-i18n candidates; no residual write yet..."
CANDIDATE="$TMP/restaurant-candidate"
mkdir -p "$CANDIDATE/app/admin/i18n/platform" "$CANDIDATE/app/admin/views/pmdsettings"
for rel in \
  app/admin/i18n/platform/en.php \
  app/admin/i18n/platform/de.php \
  app/admin/views/pmdsettings/restaurant.blade.php; do
  cp "$rel" "$CANDIDATE/$rel"
  cp "$rel" "$BACKUP/${rel//\//__}.before"
done

python3 - "$CANDIDATE" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
marker = 'PMD_SETTINGS_RESTAURANT_RESIDUAL_I18N_V17_3'
en_path = root / 'app/admin/i18n/platform/en.php'
de_path = root / 'app/admin/i18n/platform/de.php'
view_path = root / 'app/admin/views/pmdsettings/restaurant.blade.php'

def die(msg):
    print('ERROR=' + msg, file=sys.stderr)
    raise SystemExit(2)

def add_catalog_key(path: Path, key: str, value: str):
    text = path.read_text(encoding='utf-8')
    key_re = re.compile(r"^\s*'" + re.escape(key) + r"'\s*=>", re.M)
    if key_re.search(text):
        return text
    pos = text.rfind('];')
    if pos < 0:
        die('catalog closing marker missing: ' + str(path))
    encoded = value.replace('\\', '\\\\').replace("'", "\\'")
    return text[:pos] + f"    '{key}' => '{encoded}',\n" + text[pos:]

en = en_path.read_text(encoding='utf-8')
de = de_path.read_text(encoding='utf-8')
if marker in en or marker in de:
    die('restaurant residual catalogue marker already present in candidate')

en = add_catalog_key(en_path, 'settings.restaurant.choose_file', 'Choose file')
en_path.write_text(en, encoding='utf-8')
de = add_catalog_key(de_path, 'settings.restaurant.choose_file', 'Datei auswählen')
de_path.write_text(de, encoding='utf-8')
en = add_catalog_key(en_path, 'settings.restaurant.no_file_selected', 'No file selected')
en_path.write_text(en, encoding='utf-8')
de = add_catalog_key(de_path, 'settings.restaurant.no_file_selected', 'Keine Datei ausgewählt')
de_path.write_text(de, encoding='utf-8')

for path in (en_path, de_path):
    text = path.read_text(encoding='utf-8')
    pos = text.rfind('];')
    if pos < 0:
        die('catalog close missing while adding marker')
    text = text[:pos] + f"    // {marker}\n" + text[pos:]
    path.write_text(text, encoding='utf-8')

text = view_path.read_text(encoding='utf-8')
if marker in text:
    die('restaurant residual view marker already present')

mandatory = {
    '<p>Shown on your digital menu.</p>': "<p>{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Shown on your digital menu.', 'settings.') }}</p>",
    '<small class="pmd-profile-logo-help-r19">PNG, JPG or WEBP · max 5 MB.</small>': "<small class=\"pmd-profile-logo-help-r19\">{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish('PNG, JPG or WEBP · max 5 MB.', 'settings.') }}</small>",
    '<span>Remove logo</span>': "<span>{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Remove logo', 'settings.') }}</span>",
}
for old, new in mandatory.items():
    count = text.count(old)
    if count != 1:
        die('restaurant mandatory residual anchor mismatch: ' + old[:70] + f' count={count}')
    text = text.replace(old, new, 1)

optional = {
    '<small class="pmd-profile-logo-source-r20">Current backend value: {{ $pmdProfile[\'site_logo\'] }}</small>': "<small class=\"pmd-profile-logo-source-r20\">{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Current backend value', 'settings.') }}: {{ $pmdProfile['site_logo'] }}</small>",
    'alt="Current restaurant logo"': "alt=\"{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Current restaurant logo', 'settings.') }}\"",
    '<span class="pmd-profile-logo-empty-r19">No restaurant logo selected</span>': "<span class=\"pmd-profile-logo-empty-r19\">{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish('No restaurant logo selected', 'settings.') }}</span>",
}
for old, new in optional.items():
    if old in text:
        text = text.replace(old, new, 1)

file_input = '''                                    <input
                                        id="pmd-restaurant-logo-r19"
                                        type="file"
                                        name="pmd_restaurant_logo"
                                        accept="image/png,image/jpeg,image/webp"
                                    >'''
if text.count(file_input) != 1:
    die('restaurant native file input anchor mismatch')
custom_file = '''                                    {{-- PMD_SETTINGS_RESTAURANT_RESIDUAL_I18N_V17_3 --}}
                                    <input
                                        id="pmd-restaurant-logo-r19"
                                        class="pmd-profile-logo-native-file-v17-3"
                                        type="file"
                                        name="pmd_restaurant_logo"
                                        accept="image/png,image/jpeg,image/webp"
                                    >
                                    <div class="pmd-profile-logo-file-control-v17-3">
                                        <label for="pmd-restaurant-logo-r19" class="pmd-profile-logo-file-button-v17-3">
                                            {{ \\Admin\\Classes\\PmdPlatformI18n::translate('settings.restaurant.choose_file', [], null, 'Choose file') }}
                                        </label>
                                        <span data-pmd-logo-file-name-v17-3 aria-live="polite">
                                            {{ \\Admin\\Classes\\PmdPlatformI18n::translate('settings.restaurant.no_file_selected', [], null, 'No file selected') }}
                                        </span>
                                    </div>'''
text = text.replace(file_input, custom_file, 1)

style_close = '</style>'
if text.count(style_close) < 1:
    die('restaurant critical style close missing')
style = '''

/* PMD_SETTINGS_RESTAURANT_RESIDUAL_I18N_V17_3 */
.pmd-profile-logo-native-file-v17-3 {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    opacity: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
}
.pmd-profile-logo-file-control-v17-3 {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    min-height: 42px !important;
}
.pmd-profile-logo-file-button-v17-3 {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 32px !important;
    padding: 6px 12px !important;
    border: 1px solid #d6dee8 !important;
    border-radius: 8px !important;
    background: #f5f7fa !important;
    color: #172b35 !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    margin: 0 !important;
}
.pmd-profile-logo-file-control-v17-3 > span {
    color: #52636c !important;
    font-size: 13px !important;
}
'''
text = text.replace(style_close, style + '\n' + style_close, 1)

script = '''
<script id="pmd-settings-restaurant-file-label-v17-3">
(function () {
    var input = document.getElementById('pmd-restaurant-logo-r19');
    var label = document.querySelector('[data-pmd-logo-file-name-v17-3]');
    if (!input || !label) return;
    var emptyText = @json(\\Admin\\Classes\\PmdPlatformI18n::translate('settings.restaurant.no_file_selected', [], null, 'No file selected'));
    input.addEventListener('change', function () {
        label.textContent = input.files && input.files.length ? input.files[0].name : emptyText;
    });
})();
</script>
'''
text += '\n' + script

view_path.write_text(text, encoding='utf-8')
print('V17_3_RESTAURANT_SUBTITLE_I18N_OK=1')
print('V17_3_RESTAURANT_LOGO_COPY_I18N_OK=1')
print('V17_3_RESTAURANT_CUSTOM_FILE_PICKER_OK=1')
PY

VALIDATOR="$TMP/pmd-validate-platform-i18n.php"
git show "origin/$BRANCH:scripts/pmd-validate-platform-i18n.php" > "$VALIDATOR"
php -l "$CANDIDATE/app/admin/i18n/platform/en.php"
php -l "$CANDIDATE/app/admin/i18n/platform/de.php"
php "$VALIDATOR" "$CANDIDATE"
grep -Fq 'PMD_SETTINGS_RESTAURANT_RESIDUAL_I18N_V17_3' "$CANDIDATE/app/admin/views/pmdsettings/restaurant.blade.php"
grep -Fq "settings.restaurant.choose_file" "$CANDIDATE/app/admin/i18n/platform/en.php"
grep -Fq "settings.restaurant.choose_file" "$CANDIDATE/app/admin/i18n/platform/de.php"
if grep -Fq '>Shown on your digital menu.<' "$CANDIDATE/app/admin/views/pmdsettings/restaurant.blade.php"; then
  echo "ERROR=Restaurant subtitle still raw English in candidate" >&2
  exit 131
fi
if grep -Fq '>Remove logo<' "$CANDIDATE/app/admin/views/pmdsettings/restaurant.blade.php"; then
  echo "ERROR=Restaurant remove-logo still raw English in candidate" >&2
  exit 132
fi
echo "ALL_V17_3_RESTAURANT_CANDIDATES_VALID=1"

echo "[5/6] Concurrency guard + installing validated Restaurant residual candidates..."
for rel in \
  app/admin/i18n/platform/en.php \
  app/admin/i18n/platform/de.php \
  app/admin/views/pmdsettings/restaurant.blade.php; do
  before="$BACKUP/${rel//\//__}.before"
  if ! cmp -s "$rel" "$before"; then
    echo "ERROR=LIVE_TARGET_CHANGED_DURING_V17_3:$rel" >&2
    echo "NOTE=No Restaurant residual candidate was installed." >&2
    exit 140
  fi
done
echo "V17_3_RESTAURANT_CONCURRENCY_GUARD_OK=1"

for rel in \
  app/admin/i18n/platform/en.php \
  app/admin/i18n/platform/de.php \
  app/admin/views/pmdsettings/restaurant.blade.php; do
  sudo tee "$rel" < "$CANDIDATE/$rel" >/dev/null
done
php -l app/admin/i18n/platform/en.php >/dev/null
php -l app/admin/i18n/platform/de.php >/dev/null
php "$VALIDATOR" "$ROOT"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[6/6] Final installed verification..."
grep -Fq 'PMD_SETTINGS_DYNAMIC_I18N_V17' app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -Fq "settingsHtml('Configure')" app/admin/assets/js/pmd-payment-provider-catalogue-v1.js
grep -Fq 'PMD_SETTINGS_RESTAURANT_RESIDUAL_I18N_V17_3' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "settings.restaurant.choose_file" app/admin/i18n/platform/en.php
grep -Fq "settings.restaurant.choose_file" app/admin/i18n/platform/de.php

echo "V17_3_DYNAMIC_SETTINGS_I18N_OK=1"
echo "V17_3_RESTAURANT_PROFILE_I18N_OK=1"
echo "SETTINGS_PLATFORM_I18N_V17_3_OK=1"
echo "BACKUP=$BACKUP"
echo "NEXT=Hard refresh /admin/pmdfinance, /admin/pmddevices, /admin/pmdsettings/restaurant and /admin/pmdreports/sales in German."
