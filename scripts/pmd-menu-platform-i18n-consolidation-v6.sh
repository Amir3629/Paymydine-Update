#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
REF="origin/${BRANCH}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-menu-platform-i18n-v6-backups/$STAMP"
OUT="$HOME/pmd-menu-platform-i18n-v6-runs/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

VIEW="app/admin/views/pmdmenus/index.blade.php"
SMART="app/admin/assets/js/pmd-menu-smart-categories-v1.js"
EN="app/admin/i18n/platform/en.php"
DE="app/admin/i18n/platform/de.php"
BOOT="app/admin/views/_partials/pmd_admin_i18n.blade.php"

cd "$ROOT"
mkdir -p "$BACKUP" "$OUT" "$TMP/candidate/app/admin/i18n/platform"

echo "============================================================"
echo " PMD MENU PLATFORM I18N CONSOLIDATION V6"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"
echo "OUTPUT=$OUT"

git fetch origin "$BRANCH"
git show "$REF:scripts/pmd-validate-platform-i18n.php" > "$TMP/validate.php"

for path in "$VIEW" "$SMART" "$EN" "$DE" "$BOOT"; do
  [ -f "$path" ] || { echo "ERROR=Missing live target: $path" >&2; exit 40; }
done

grep -q 'PMD_PLATFORM_MESSAGES_GLOBAL_V1' "$BOOT" || {
  echo "ERROR=Global platform-message mount is not active; refusing Menu migration." >&2
  exit 41
}

cp -a "$VIEW" "$BACKUP/pmdmenus-index.blade.php.before"
cp -a "$SMART" "$BACKUP/pmd-menu-smart-categories-v1.js.before"
cp -a "$EN" "$BACKUP/platform-en.php.before"
cp -a "$DE" "$BACKUP/platform-de.php.before"
sha256sum "$VIEW" "$SMART" "$EN" "$DE" > "$BACKUP/hashes.before"

cp -a "$VIEW" "$TMP/view.live"
cp -a "$SMART" "$TMP/smart.live.js"
cp -a "$EN" "$TMP/candidate/$EN"
cp -a "$DE" "$TMP/candidate/$DE"

echo "[1/7] Extracting exact live Menu EN/DE dictionaries..."
python3 - "$TMP/view.live" "$TMP/menu-manager-copy.php" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding='utf-8')
start = text.find('    $pmdMenuCopy = [')
end_marker = '    $pmdT = static function'
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('ERROR=Could not locate live $pmdMenuCopy dictionary block')
block = text[start:end]
if "'en' => [" not in block or "'de' => [" not in block:
    raise SystemExit('ERROR=Menu manager dictionary is not an EN/DE pair')
Path(sys.argv[2]).write_text(
    "<?php\n" + block + "\n"
    + "echo json_encode($pmdMenuCopy, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);\n",
    encoding='utf-8',
)
PY
php "$TMP/menu-manager-copy.php" > "$TMP/menu-manager-copy.json"

python3 - "$TMP/smart.live.js" "$TMP/menu-smart-copy.js" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding='utf-8')
start = text.find('  var copy = {')
end_marker = '\n\n  var localeMatch = '
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('ERROR=Could not locate live Smart Category copy dictionary')
block = text[start:end]
if 'en: {' not in block or 'de: {' not in block:
    raise SystemExit('ERROR=Smart Category dictionary is not an EN/DE pair')
Path(sys.argv[2]).write_text(
    block + ';\nprocess.stdout.write(JSON.stringify(copy));\n',
    encoding='utf-8',
)
PY
node "$TMP/menu-smart-copy.js" > "$TMP/menu-smart-copy.json"

python3 - "$TMP/menu-manager-copy.json" "$TMP/menu-smart-copy.json" <<'PY'
import json, sys
for path in sys.argv[1:]:
    data = json.load(open(path, encoding='utf-8'))
    if sorted(data) != ['de', 'en']:
        raise SystemExit(f'ERROR={path} locales are {sorted(data)}')
    if set(data['en']) != set(data['de']):
        raise SystemExit(f'ERROR={path} EN/DE key sets differ')
    if not data['en']:
        raise SystemExit(f'ERROR={path} dictionary is empty')
print('LIVE_MENU_DICTIONARIES_EXTRACTED=1')
PY

echo "[2/7] Moving both live dictionaries into the canonical platform catalog..."
python3 - "$TMP/candidate/$EN" "$TMP/candidate/$DE" "$TMP/menu-manager-copy.json" "$TMP/menu-smart-copy.json" "$TMP/smart-key-map.json" <<'PY'
from pathlib import Path
import json, re, sys

en_path, de_path, manager_path, smart_path, map_path = map(Path, sys.argv[1:])
manager = json.loads(manager_path.read_text(encoding='utf-8'))
smart = json.loads(smart_path.read_text(encoding='utf-8'))

def snake(name):
    value = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', name).replace('-', '_')
    value = re.sub(r'[^A-Za-z0-9_]+', '_', value)
    return value.strip('_').lower()

def php_quote(value):
    return "'" + str(value).replace('\\', '\\\\').replace("'", "\\'") + "'"

def merge(path, locale):
    text = path.read_text(encoding='utf-8')
    additions = {}
    for key, value in manager[locale].items():
        additions['menu.manager.' + key] = value
    for key, value in smart[locale].items():
        additions['menu.smart.' + snake(key)] = value

    missing = []
    for key, value in sorted(additions.items()):
        if re.search(r"^\s*'" + re.escape(key) + r"'\s*=>", text, re.M):
            continue
        missing.append(f"    {php_quote(key)} => {php_quote(value)},\n")

    if missing:
        close = text.rfind('\n];')
        if close < 0:
            raise SystemExit(f'ERROR=Could not locate catalogue closing array in {path}')
        text = text[:close] + '\n\n    // PMD_MENU_PLATFORM_I18N_GLOBAL_V1\n' + ''.join(missing) + text[close:]
        path.write_text(text, encoding='utf-8')
    return len(additions), len(missing)

en_total, en_added = merge(en_path, 'en')
de_total, de_added = merge(de_path, 'de')
if en_total != de_total:
    raise SystemExit('ERROR=Menu catalog addition totals differ by locale')

key_map = {key: 'menu.smart.' + snake(key) for key in smart['en']}
map_path.write_text(json.dumps(key_map, ensure_ascii=False, sort_keys=True), encoding='utf-8')
print(f'MENU_PLATFORM_KEYS_TOTAL={en_total}')
print(f'CATALOG_EN_ADDED={en_added}')
print(f'CATALOG_DE_ADDED={de_added}')
PY

php -l "$TMP/candidate/$EN"
php -l "$TMP/candidate/$DE"
mkdir -p "$TMP/mini/app/admin/i18n/platform" "$TMP/mini/scripts"
cp "$TMP/candidate/$EN" "$TMP/mini/app/admin/i18n/platform/en.php"
cp "$TMP/candidate/$DE" "$TMP/mini/app/admin/i18n/platform/de.php"
cp "$TMP/validate.php" "$TMP/mini/scripts/pmd-validate-platform-i18n.php"
php "$TMP/mini/scripts/pmd-validate-platform-i18n.php" "$TMP/mini" | tee "$OUT/catalog-validation.txt"

echo "[3/7] Replacing the Menu manager's page-local PHP dictionary with central messages..."
python3 - "$TMP/view.live" "$TMP/view.candidate" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
if 'PMD_MENU_MANAGER_PLATFORM_I18N_GLOBAL_V1' in text:
    Path(sys.argv[2]).write_text(text, encoding='utf-8')
    raise SystemExit(0)

start = text.find('    $pmdMenuLocale = ')
end_start = text.find('    $pmdT = static function', start)
if start < 0 or end_start < 0:
    raise SystemExit('ERROR=Could not locate Menu manager locale/dictionary owner')
end = text.find('    };', end_start)
if end < 0:
    raise SystemExit('ERROR=Could not locate end of Menu manager translator closure')
end += len('    };')

replacement = r'''    // PMD_MENU_MANAGER_PLATFORM_I18N_GLOBAL_V1
    $pmdMenuLocale = \Admin\Classes\PmdPlatformI18n::currentLocale();
    $pmdMenuPlatformPrefix = 'menu.manager.';
    $pmdMenuCopy = [];

    foreach (\Admin\Classes\PmdPlatformI18n::messages($pmdMenuLocale) as $pmdMenuMessageKey => $pmdMenuMessageValue) {
        if (!str_starts_with($pmdMenuMessageKey, $pmdMenuPlatformPrefix)) {
            continue;
        }

        $pmdMenuCopy[substr($pmdMenuMessageKey, strlen($pmdMenuPlatformPrefix))] = $pmdMenuMessageValue;
    }

    $pmdT = static function ($key) use ($pmdMenuCopy) {
        return $pmdMenuCopy[(string)$key] ?? (string)$key;
    };'''

text = text[:start] + replacement + text[end:]
Path(sys.argv[2]).write_text(text, encoding='utf-8')
PY

grep -q 'PMD_MENU_MANAGER_PLATFORM_I18N_GLOBAL_V1' "$TMP/view.candidate"
if grep -Fq "'menu_header' => 'Menu header'" "$TMP/view.candidate"; then
  echo "ERROR=Old Menu manager English dictionary survived candidate patch" >&2
  exit 42
fi
if grep -Fq "'menu_header' => 'Menü-Kopfbereich'" "$TMP/view.candidate"; then
  echo "ERROR=Old Menu manager German dictionary survived candidate patch" >&2
  exit 43
fi

echo "MENU_MANAGER_GLOBAL_CANDIDATE=1"

echo "[4/7] Replacing Smart Category's manual cookie/local dictionary with global messages..."
python3 - "$TMP/smart.live.js" "$TMP/smart-key-map.json" "$TMP/smart.candidate.js" <<'PY'
from pathlib import Path
import json, sys

text = Path(sys.argv[1]).read_text(encoding='utf-8')
key_map = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
if 'PMD_MENU_SMART_PLATFORM_I18N_GLOBAL_V1' in text:
    Path(sys.argv[3]).write_text(text, encoding='utf-8')
    raise SystemExit(0)

start = text.find('  var copy = {')
locale_start = text.find('\n\n  var localeMatch = ', start)
if start < 0 or locale_start < 0:
    raise SystemExit('ERROR=Could not locate Smart Category local dictionary owner')

t_line = text.find('  var t = copy[', locale_start)
if t_line < 0:
    raise SystemExit('ERROR=Could not locate Smart Category local t owner')
end = text.find('\n', t_line)
if end < 0:
    end = len(text)

mapping = json.dumps(key_map, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
replacement = "  // PMD_MENU_SMART_PLATFORM_I18N_GLOBAL_V1\n"
replacement += "  var smartMessageKeys = " + mapping + ";\n"
replacement += "  var t = Object.create(null);\n"
replacement += "  Object.keys(smartMessageKeys).forEach(function (property) {\n"
replacement += "    var key = smartMessageKeys[property];\n"
replacement += "    t[property] = (window.PMDPlatformMessages && typeof window.PMDPlatformMessages.t === 'function')\n"
replacement += "      ? window.PMDPlatformMessages.t(key, {}, key)\n"
replacement += "      : key;\n"
replacement += "  });\n"

text = text[:start] + replacement + text[end+1:]
Path(sys.argv[3]).write_text(text, encoding='utf-8')
PY

node --check "$TMP/smart.candidate.js"
grep -q 'PMD_MENU_SMART_PLATFORM_I18N_GLOBAL_V1' "$TMP/smart.candidate.js"
grep -q 'menu.smart.add_food' "$TMP/smart.candidate.js"
if grep -Fq 'var copy = {' "$TMP/smart.candidate.js"; then
  echo "ERROR=Smart Category local copy dictionary survived candidate patch" >&2
  exit 44
fi
if grep -Fq 'document.cookie.match(/(?:^|; )pmd_admin_locale=' "$TMP/smart.candidate.js"; then
  echo "ERROR=Smart Category manual language-cookie owner survived candidate patch" >&2
  exit 45
fi

echo "MENU_SMART_GLOBAL_CANDIDATE=1"

echo "[5/7] Installing only validated live-derived candidates..."
sudo tee "$EN" < "$TMP/candidate/$EN" >/dev/null
sudo tee "$DE" < "$TMP/candidate/$DE" >/dev/null
sudo tee "$VIEW" < "$TMP/view.candidate" >/dev/null
sudo tee "$SMART" < "$TMP/smart.candidate.js" >/dev/null

php -l "$EN"
php -l "$DE"
node --check "$SMART"
php "$TMP/validate.php" "$ROOT" | tee "$OUT/catalog-validation-after.txt"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[6/7] Exact post-install assertions..."
grep -q 'PMD_MENU_MANAGER_PLATFORM_I18N_GLOBAL_V1' "$VIEW"
grep -q 'PMD_MENU_SMART_PLATFORM_I18N_GLOBAL_V1' "$SMART"
grep -q "'menu.smart.add_food' => 'Add new food item'" "$EN"
grep -q "'menu.smart.add_food' =>" "$DE"
grep -q "'menu.smart.add_food_help' =>" "$DE"
if grep -Fq "'menu_header' => 'Menu header'" "$VIEW"; then
  echo "ERROR=Old Menu manager local dictionary is still live" >&2
  exit 46
fi
if grep -Fq 'var copy = {' "$SMART"; then
  echo "ERROR=Old Smart Category local dictionary is still live" >&2
  exit 47
fi

echo "MENU_MANAGER_GLOBAL_I18N_OK=1"
echo "MENU_SMART_GLOBAL_I18N_OK=1"
echo "SCREENSHOT_ADD_FOOD_KEYS_OK=1"

echo "[7/7] Read-only authority inventory after migration..."
python3 - "$ROOT" | tee "$OUT/authority-inventory-after.txt" <<'PY'
PY
python3 - "$ROOT" <<'PY' | tee "$OUT/authority-inventory-after.txt"
from pathlib import Path
import re, sys
root = Path(sys.argv[1])
roots = [root/'app/admin/views', root/'app/admin/assets/js', root/'app/admin/controllers']
files = []
for base in roots:
    if not base.is_dir():
        continue
    for path in base.rglob('*'):
        if path.is_file() and (path.suffix in {'.js','.php'} or path.name.endswith('.blade.php')):
            files.append(path)

bilingual = []
manual_locale = []
legacy = []
for path in files:
    try:
        text = path.read_text(encoding='utf-8', errors='replace')
    except Exception:
        continue
    rel = str(path.relative_to(root))
    has_en_de = bool(re.search(r"['\"]?en['\"]?\s*(?:=>|:)\s*[\[{]", text)) and bool(re.search(r"['\"]?de['\"]?\s*(?:=>|:)\s*[\[{]", text))
    named_copy = bool(re.search(r'(?i)(?:\$|\b(?:var|let|const)\s+)[A-Za-z_][A-Za-z0-9_]*(?:copy|translations|dictionary|i18n|messages)[A-Za-z0-9_]*\s*=\s*[\[{]', text))
    if has_en_de and named_copy and 'app/admin/i18n/platform/' not in rel:
        bilingual.append(rel)
    if 'pmd_admin_locale' in text and ('document.cookie' in text or 'request()->cookie' in text):
        if rel not in {'app/admin/classes/PmdPlatformI18n.php'}:
            manual_locale.append(rel)
    if 'pmd-admin-i18n-v1.js' in text or 'pmd-admin-i18n-page-authority-v2.js' in text or rel.endswith('pmd-admin-i18n-v1.js') or rel.endswith('pmd-admin-i18n-page-authority-v2.js'):
        legacy.append(rel)

print('BILINGUAL_LOCAL_AUTHORITY_FILES=' + str(len(sorted(set(bilingual)))))
for item in sorted(set(bilingual)):
    print('BILINGUAL_LOCAL=' + item)
print('MANUAL_LOCALE_OWNER_FILES=' + str(len(sorted(set(manual_locale)))))
for item in sorted(set(manual_locale)):
    print('MANUAL_LOCALE=' + item)
print('LEGACY_TRANSLATOR_RELATED_FILES=' + str(len(sorted(set(legacy)))))
for item in sorted(set(legacy)):
    print('LEGACY_TRANSLATOR=' + item)
PY

echo "============================================================"
echo " MENU PLATFORM I18N V6 COMPLETE"
echo "============================================================"
echo "MENU_PLATFORM_I18N_V6_OK=1"
echo "BACKUP=$BACKUP"
echo "OUTPUT=$OUT"
echo "NEXT=Hard refresh the Menu page in German. 'Add new food item' and its help text must now come from the central catalog; restaurant category names remain unchanged."
