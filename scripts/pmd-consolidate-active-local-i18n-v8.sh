#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
REF="origin/${BRANCH}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-platform-i18n-v8-backups/$STAMP"
OUT="$HOME/pmd-platform-i18n-v8-runs/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

COUPONS="app/admin/views/pmdcoupons/index.blade.php"
KPI="app/admin/assets/js/pmd-kpi-info-v1.js"
RES="app/admin/assets/js/pmd-reservations-lab-schedule-v1.js"
EN="app/admin/i18n/platform/en.php"
DE="app/admin/i18n/platform/de.php"
BOOT="app/admin/views/_partials/pmd_admin_i18n.blade.php"

cd "$ROOT"
mkdir -p "$BACKUP" "$OUT" "$TMP/candidate/app/admin/i18n/platform"

echo "============================================================"
echo " PMD ACTIVE LOCAL I18N CONSOLIDATION V8"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"
echo "OUTPUT=$OUT"

git fetch origin "$BRANCH"
git show "$REF:scripts/pmd-validate-platform-i18n.php" > "$TMP/validate.php"
git show "$REF:scripts/pmd-audit-i18n-authorities-v7.py" > "$TMP/audit-v7.py"
git show "$REF:scripts/pmd-audit-platform-i18n-readonly.py" > "$TMP/platform-audit.py"

for path in "$COUPONS" "$KPI" "$RES" "$EN" "$DE" "$BOOT"; do
  [ -f "$path" ] || { echo "ERROR=Missing live target: $path" >&2; exit 50; }
done

grep -q 'PMD_PLATFORM_MESSAGES_GLOBAL_V1' "$BOOT" || {
  echo "ERROR=Global platform message mount is not active." >&2
  exit 51
}

for path in "$COUPONS" "$KPI" "$RES" "$EN" "$DE"; do
  key="$(echo "$path" | tr '/' '_')"
  cp -a "$path" "$BACKUP/$key.before"
  sha256sum "$path" >> "$BACKUP/hashes.before"
done

cp -a "$COUPONS" "$TMP/coupons.live"
cp -a "$KPI" "$TMP/kpi.live.js"
cp -a "$RES" "$TMP/res.live.js"
cp -a "$EN" "$TMP/candidate/$EN"
cp -a "$DE" "$TMP/candidate/$DE"

echo "[1/8] Extracting exact live EN/DE dictionaries..."
python3 - "$TMP/coupons.live" "$TMP/coupons-copy.php" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text(encoding='utf-8')
start = text.find('    $pmdCouponCopy = [')
end = text.find('    $pmdT = static', start)
if start < 0 or end < 0:
    raise SystemExit('ERROR=Could not locate live coupon dictionary')
block = text[start:end]
if "'en' => [" not in block or "'de' => [" not in block:
    raise SystemExit('ERROR=Coupon dictionary is not EN/DE')
Path(sys.argv[2]).write_text(
    "<?php\n" + block + "\necho json_encode($pmdCouponCopy, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);\n",
    encoding='utf-8',
)
PY
php "$TMP/coupons-copy.php" > "$TMP/coupons-copy.json"

python3 - "$TMP/kpi.live.js" "$TMP/kpi-copy.js" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text(encoding='utf-8')
start = text.find('  var COPY = {')
end = text.find('\n\n  function canonicalKey', start)
if start < 0 or end < 0:
    raise SystemExit('ERROR=Could not locate live KPI dictionary')
block = text[start:end]
if 'en: {' not in block or 'de: {' not in block:
    raise SystemExit('ERROR=KPI dictionary is not EN/DE')
Path(sys.argv[2]).write_text(block + ';\nprocess.stdout.write(JSON.stringify(COPY));\n', encoding='utf-8')
PY
node "$TMP/kpi-copy.js" > "$TMP/kpi-copy.json"

python3 - "$TMP/res.live.js" "$TMP/res-copy.js" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text(encoding='utf-8')
start = text.find('  var pmdCalendarLocaleStrings = {')
end = text.find('\n\n  if (', start)
if start < 0 or end < 0:
    raise SystemExit('ERROR=Could not locate live Reservations dictionary')
block = text[start:end]
if 'en: {' not in block or 'de: {' not in block:
    raise SystemExit('ERROR=Reservations dictionary is not EN/DE')
Path(sys.argv[2]).write_text(block + ';\nprocess.stdout.write(JSON.stringify(pmdCalendarLocaleStrings));\n', encoding='utf-8')
PY
node "$TMP/res-copy.js" > "$TMP/res-copy.json"

python3 - "$TMP/coupons-copy.json" "$TMP/kpi-copy.json" "$TMP/res-copy.json" <<'PY'
import json, sys
for path in sys.argv[1:]:
    data = json.load(open(path, encoding='utf-8'))
    if sorted(data) != ['de', 'en']:
        raise SystemExit(f'ERROR={path} locales={sorted(data)}')
    if set(data['en']) != set(data['de']):
        raise SystemExit(f'ERROR={path} EN/DE keys differ')
    if not data['en']:
        raise SystemExit(f'ERROR={path} empty dictionary')
print('ACTIVE_DICTIONARIES_EXTRACTED=1')
PY

echo "[2/8] Merging live dictionaries into the canonical catalog..."
python3 - "$TMP/candidate/$EN" "$TMP/candidate/$DE" "$TMP/coupons-copy.json" "$TMP/kpi-copy.json" "$TMP/res-copy.json" "$TMP/maps.json" <<'PY'
from pathlib import Path
import json, re, sys

en_path, de_path, coupons_path, kpi_path, res_path, maps_path = map(Path, sys.argv[1:])
coupons = json.loads(coupons_path.read_text(encoding='utf-8'))
kpi = json.loads(kpi_path.read_text(encoding='utf-8'))
res = json.loads(res_path.read_text(encoding='utf-8'))

def snake(name):
    value = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', str(name)).replace('-', '_')
    value = re.sub(r'[^A-Za-z0-9_]+', '_', value)
    return value.strip('_').lower()

def php_quote(value):
    return "'" + str(value).replace('\\', '\\\\').replace("'", "\\'") + "'"

sources = [
    ('coupons.manager', coupons),
    ('kpi.info', kpi),
    ('reservations.schedule', res),
]

extras = {
    'en': {
        'kpi.info.about': 'About this KPI',
        'kpi.info.fallback': 'This KPI shows the current value for :name.',
    },
    'de': {
        'kpi.info.about': 'Info zu dieser KPI',
        'kpi.info.fallback': 'Diese KPI zeigt den aktuellen Wert für :name.',
    },
}

def additions_for(locale):
    peer = 'de' if locale == 'en' else 'en'
    out = {}
    for prefix, data in sources:
        for key, value in data[locale].items():
            peer_value = data[peer][key]
            if str(value) == '' and str(peer_value) == '':
                continue
            if str(value) == '' or str(peer_value) == '':
                raise SystemExit(f'ERROR={prefix}.{key} empty in only one locale')
            out[prefix + '.' + snake(key)] = value
    out.update(extras[locale])
    return out

def merge(path, locale):
    text = path.read_text(encoding='utf-8')
    additions = additions_for(locale)
    missing = []
    for key, value in sorted(additions.items()):
        if re.search(r"^\s*'" + re.escape(key) + r"'\s*=>", text, re.M):
            continue
        missing.append(f"    {php_quote(key)} => {php_quote(value)},\n")
    if missing:
        close = text.rfind('\n];')
        if close < 0:
            raise SystemExit(f'ERROR=Catalog closing array missing: {path}')
        text = text[:close] + '\n\n    // PMD_ACTIVE_LOCAL_I18N_CONSOLIDATION_V8\n' + ''.join(missing) + text[close:]
        path.write_text(text, encoding='utf-8')
    return additions, len(missing)

en_add, en_new = merge(en_path, 'en')
de_add, de_new = merge(de_path, 'de')
if set(en_add) != set(de_add):
    raise SystemExit('ERROR=V8 canonical key sets differ')

maps = {
    'kpi': {key: 'kpi.info.' + snake(key) for key in kpi['en'] if str(kpi['en'][key]) != '' or str(kpi['de'][key]) != ''},
    'reservations': {key: 'reservations.schedule.' + snake(key) for key in res['en'] if str(res['en'][key]) != '' or str(res['de'][key]) != ''},
}
maps_path.write_text(json.dumps(maps, ensure_ascii=False, sort_keys=True), encoding='utf-8')
print(f'V8_PLATFORM_KEYS_TOTAL={len(en_add)}')
print(f'CATALOG_EN_ADDED={en_new}')
print(f'CATALOG_DE_ADDED={de_new}')
PY

php -l "$TMP/candidate/$EN"
php -l "$TMP/candidate/$DE"
mkdir -p "$TMP/mini/app/admin/i18n/platform" "$TMP/mini/scripts"
cp "$TMP/candidate/$EN" "$TMP/mini/app/admin/i18n/platform/en.php"
cp "$TMP/candidate/$DE" "$TMP/mini/app/admin/i18n/platform/de.php"
cp "$TMP/validate.php" "$TMP/mini/scripts/pmd-validate-platform-i18n.php"
php "$TMP/mini/scripts/pmd-validate-platform-i18n.php" "$TMP/mini" | tee "$OUT/catalog-validation-before.txt"

echo "[3/8] Building live-derived Coupon candidate..."
python3 - "$TMP/coupons.live" "$TMP/coupons.candidate" <<'PY'
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text(encoding='utf-8')
if 'PMD_COUPON_MANAGER_PLATFORM_I18N_V8' not in text:
    locale_pattern = re.compile(
        r"\n\s*\$pmdCouponLocale\s*=\s*strtolower\(trim\(\(string\)request\(\)->cookie\('pmd_admin_locale', app\(\)->getLocale\(\)\)\)\);\s*\n"
        r"\s*\$pmdCouponLocale\s*=\s*str_starts_with\(\$pmdCouponLocale, 'de'\) \? 'de' : 'en';\s*\n"
    )
    replacement = "\n    // PMD_COUPON_MANAGER_PLATFORM_I18N_V8\n    $pmdCouponLocale = \\Admin\\Classes\\PmdPlatformI18n::currentLocale();\n"
    text, count = locale_pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit('ERROR=Coupon manual locale owner not found exactly once')

start = text.find('    $pmdCouponCopy = [')
end = text.find('    $pmdT = static', start)
if start >= 0:
    if end < 0:
        raise SystemExit('ERROR=Coupon translator anchor missing')
    line_end = text.find('\n', end)
    if line_end < 0:
        line_end = len(text)
    new_t = "    $pmdT = static fn(string $key): string => \\Admin\\Classes\\PmdPlatformI18n::translate('coupons.manager.'.strtolower($key), [], $pmdCouponLocale, $key);"
    text = text[:start] + new_t + text[line_end:]

Path(sys.argv[2]).write_text(text, encoding='utf-8')
PY

grep -q 'PMD_COUPON_MANAGER_PLATFORM_I18N_V8' "$TMP/coupons.candidate"
if grep -Fq '$pmdCouponCopy = [' "$TMP/coupons.candidate"; then
  echo "ERROR=Coupon local dictionary survived candidate" >&2; exit 52
fi
if grep -Fq "request()->cookie('pmd_admin_locale'" "$TMP/coupons.candidate"; then
  echo "ERROR=Coupon manual locale survived candidate" >&2; exit 53
fi

echo "COUPON_GLOBAL_CANDIDATE=1"

echo "[4/8] Building live-derived KPI candidate..."
python3 - "$TMP/kpi.live.js" "$TMP/maps.json" "$TMP/kpi.candidate.js" <<'PY'
from pathlib import Path
import json, re, sys
text = Path(sys.argv[1]).read_text(encoding='utf-8')
maps = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
key_map = maps['kpi']

if 'PMD_KPI_PLATFORM_I18N_V8' not in text:
    locale_old = """  function locale() {\n    var value = String(window.PMD_ADMIN_LOCALE || document.documentElement.lang || 'en').toLowerCase();\n    return value.indexOf('de') === 0 ? 'de' : 'en';\n  }\n"""
    locale_new = """  // PMD_KPI_PLATFORM_I18N_V8\n  function locale() {\n    if (window.PMDPlatformMessages && typeof window.PMDPlatformMessages.locale === 'function') {\n      return String(window.PMDPlatformMessages.locale() || 'en').toLowerCase();\n    }\n    return String(document.documentElement.lang || 'en').toLowerCase();\n  }\n\n  function pmdT(key, fallback, replacements) {\n    if (window.PMDPlatformMessages && typeof window.PMDPlatformMessages.t === 'function') {\n      return window.PMDPlatformMessages.t(key, replacements || {}, fallback == null ? key : fallback);\n    }\n    return fallback == null ? key : fallback;\n  }\n"""
    if text.count(locale_old) != 1:
        raise SystemExit('ERROR=KPI locale owner anchor mismatch')
    text = text.replace(locale_old, locale_new, 1)

start = text.find('  var COPY = {')
end = text.find('\n\n  function canonicalKey', start)
if start >= 0:
    if end < 0:
        raise SystemExit('ERROR=KPI dictionary end missing')
    mapping = json.dumps(key_map, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    helper = "  var PMD_KPI_MESSAGE_KEYS = " + mapping + ";"
    text = text[:start] + helper + text[end:]

old_explanation = re.compile(
    r"  function explanation\(card\) \{.*?\n  \}\n\n  function close",
    re.S,
)
new_explanation = """  function explanation(card) {\n    var key = canonicalKey(card.getAttribute('data-pmd-dashboard2-kpi'));\n    var messageKey = PMD_KPI_MESSAGE_KEYS[key] || '';\n    var copy = messageKey ? pmdT(messageKey, '') : '';\n    if (copy) return copy;\n    var title = card.querySelector('.pmd-r2-kpi-v2401-title');\n    var name = title ? String(title.textContent || '').trim() : key;\n    return pmdT('kpi.info.fallback', 'This KPI shows the current value for :name.', {name: name});\n  }\n\n  function close"""
text, count = old_explanation.subn(new_explanation, text, count=1)
if count != 1:
    raise SystemExit('ERROR=KPI explanation owner mismatch')

old_label = "      var label = lang === 'de' ? 'Info zu dieser KPI' : 'About this KPI';"
new_label = "      var label = pmdT('kpi.info.about', 'About this KPI');"
if old_label in text:
    text = text.replace(old_label, new_label, 1)
text = text.replace('    var lang = locale();\n    Array.prototype.forEach.call(section.querySelectorAll(\'[data-pmd-kpi-info-button]\'), function (button) {', "    Array.prototype.forEach.call(section.querySelectorAll('[data-pmd-kpi-info-button]'), function (button) {", 1)

Path(sys.argv[3]).write_text(text, encoding='utf-8')
PY

node --check "$TMP/kpi.candidate.js"
grep -q 'PMD_KPI_PLATFORM_I18N_V8' "$TMP/kpi.candidate.js"
if grep -Fq 'var COPY = {' "$TMP/kpi.candidate.js"; then
  echo "ERROR=KPI local dictionary survived candidate" >&2; exit 54
fi

echo "KPI_GLOBAL_CANDIDATE=1"

echo "[5/8] Building live-derived Reservations candidate..."
python3 - "$TMP/res.live.js" "$TMP/maps.json" "$TMP/res.candidate.js" <<'PY'
from pathlib import Path
import json, re, sys
text = Path(sys.argv[1]).read_text(encoding='utf-8')
maps = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
key_map = maps['reservations']

old_locale = "  var locale = String(boot.locale || 'en').toLowerCase() === 'de' ? 'de' : 'en';"
new_locale = "  // PMD_RESERVATIONS_SCHEDULE_PLATFORM_I18N_V8\n  var locale = (window.PMDPlatformMessages && typeof window.PMDPlatformMessages.locale === 'function')\n    ? String(window.PMDPlatformMessages.locale() || 'en').toLowerCase()\n    : String(boot.locale || document.documentElement.lang || 'en').toLowerCase();\n  locale = locale.indexOf('de') === 0 ? 'de' : 'en';"
if 'PMD_RESERVATIONS_SCHEDULE_PLATFORM_I18N_V8' not in text:
    if text.count(old_locale) != 1:
        raise SystemExit('ERROR=Reservations locale owner mismatch')
    text = text.replace(old_locale, new_locale, 1)

start = text.find('  var pmdCalendarLocaleStrings = {')
end = text.find('\n\n  if (', start)
if start >= 0:
    if end < 0:
        raise SystemExit('ERROR=Reservations local dictionary end missing')
    mapping = json.dumps(key_map, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    helper = """  var PMD_RESERVATION_MESSAGE_KEYS = %s;\n\n  function pmdReservationT(property, fallback) {\n    var key = PMD_RESERVATION_MESSAGE_KEYS[property] || '';\n    if (key && window.PMDPlatformMessages && typeof window.PMDPlatformMessages.t === 'function') {\n      return window.PMDPlatformMessages.t(key, {}, fallback == null ? property : fallback);\n    }\n    return fallback == null ? property : fallback;\n  }""" % mapping
    text = text[:start] + helper + text[end:]

old_owned = re.compile(
    r"  var pmdCalendarLocaleOwnedStrings =\n    pmdCalendarLocaleStrings\[locale\]\n    \|\| pmdCalendarLocaleStrings\.en;\n\n  Object\.keys\(\n    pmdCalendarLocaleOwnedStrings\n  \)\.forEach\(function \(key\) \{\n    strings\[key\] =\n      pmdCalendarLocaleOwnedStrings\[key\];\n  \}\);",
    re.S,
)
new_owned = """  Object.keys(PMD_RESERVATION_MESSAGE_KEYS).forEach(function (property) {\n    strings[property] = pmdReservationT(property, strings[property] || property);\n  });"""
text, count = old_owned.subn(new_owned, text, count=1)
if count != 1:
    raise SystemExit('ERROR=Reservations locale-owned merge block mismatch')

Path(sys.argv[3]).write_text(text, encoding='utf-8')
PY

node --check "$TMP/res.candidate.js"
grep -q 'PMD_RESERVATIONS_SCHEDULE_PLATFORM_I18N_V8' "$TMP/res.candidate.js"
if grep -Fq 'pmdCalendarLocaleStrings = {' "$TMP/res.candidate.js"; then
  echo "ERROR=Reservations local dictionary survived candidate" >&2; exit 55
fi

echo "RESERVATIONS_GLOBAL_CANDIDATE=1"

echo "[6/8] Final validation before ANY write..."
php "$TMP/mini/scripts/pmd-validate-platform-i18n.php" "$TMP/mini" >/dev/null
node --check "$TMP/kpi.candidate.js"
node --check "$TMP/res.candidate.js"
grep -q "coupons.manager.title" "$TMP/candidate/$EN"
grep -q "kpi.info.revenue" "$TMP/candidate/$EN"
grep -q "reservations.schedule.new_reservation" "$TMP/candidate/$EN"
echo "ALL_V8_CANDIDATES_VALID=1"

echo "[7/8] Installing validated live-derived candidates..."
sudo tee "$EN" < "$TMP/candidate/$EN" >/dev/null
sudo tee "$DE" < "$TMP/candidate/$DE" >/dev/null
sudo tee "$COUPONS" < "$TMP/coupons.candidate" >/dev/null
sudo tee "$KPI" < "$TMP/kpi.candidate.js" >/dev/null
sudo tee "$RES" < "$TMP/res.candidate.js" >/dev/null

php -l "$EN"
php -l "$DE"
node --check "$KPI"
node --check "$RES"
php "$TMP/validate.php" "$ROOT" | tee "$OUT/catalog-validation-after.txt"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "COUPONS_GLOBAL_I18N_OK=1"
echo "KPI_GLOBAL_I18N_OK=1"
echo "RESERVATIONS_GLOBAL_I18N_OK=1"

echo "[8/8] Re-running authority and platform audits read-only..."
python3 "$TMP/audit-v7.py" "$ROOT" | tee "$OUT/authority-audit-after.txt"
python3 "$TMP/platform-audit.py" "$ROOT" \
  --json-out "$OUT/platform-audit-after.json" \
  --tsv-out "$OUT/platform-candidates-after.tsv" \
  | tee "$OUT/platform-audit-after.txt"

echo "============================================================"
echo " PMD ACTIVE LOCAL I18N CONSOLIDATION V8 COMPLETE"
echo "============================================================"
echo "ACTIVE_LOCAL_I18N_V8_OK=1"
echo "BACKUP=$BACKUP"
echo "OUTPUT=$OUT"
echo "NEXT=Hard refresh Coupons, Dashboard/ManagerLab KPI info, and Reservations Calendar in German. Then use the printed V7 counts as the next migration backlog."
