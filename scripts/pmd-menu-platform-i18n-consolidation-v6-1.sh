#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
REF="origin/${BRANCH}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"

echo "============================================================"
echo " PMD MENU PLATFORM I18N CONSOLIDATION V6.1"
echo "============================================================"

git fetch origin "$BRANCH"
git show "$REF:scripts/pmd-menu-platform-i18n-consolidation-v6.sh" > "$TMP/v6.sh"

python3 - "$TMP/v6.sh" "$TMP/v6-fixed.sh" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text(encoding='utf-8')

old_merge = '''    additions = {}
    for key, value in manager[locale].items():
        additions['menu.manager.' + key] = value
    for key, value in smart[locale].items():
        additions['menu.smart.' + snake(key)] = value
'''
new_merge = '''    additions = {}
    peer_locale = 'de' if locale == 'en' else 'en'
    for key, value in manager[locale].items():
        peer_value = manager[peer_locale][key]
        if str(value) == '' and str(peer_value) == '':
            continue
        if str(value) == '' or str(peer_value) == '':
            raise SystemExit(f'ERROR=Menu manager key {key} is empty in only one locale')
        additions['menu.manager.' + key] = value
    for key, value in smart[locale].items():
        peer_value = smart[peer_locale][key]
        if str(value) == '' and str(peer_value) == '':
            continue
        if str(value) == '' or str(peer_value) == '':
            raise SystemExit(f'ERROR=Smart Menu key {key} is empty in only one locale')
        additions['menu.smart.' + snake(key)] = value
'''

old_map = "key_map = {key: 'menu.smart.' + snake(key) for key in smart['en']}"
new_map = "key_map = {key: ('' if str(smart['en'][key]) == '' and str(smart['de'][key]) == '' else 'menu.smart.' + snake(key)) for key in smart['en']}"

if source.count(old_merge) != 1:
    raise SystemExit('ERROR=Could not patch V6 merge block exactly once')
if source.count(old_map) != 1:
    raise SystemExit('ERROR=Could not patch V6 smart key-map exactly once')

source = source.replace(old_merge, new_merge, 1)
source = source.replace(old_map, new_map, 1)
source = source.replace(' PMD MENU PLATFORM I18N CONSOLIDATION V6"', ' PMD MENU PLATFORM I18N CONSOLIDATION V6.1"', 1)

Path(sys.argv[2]).write_text(source, encoding='utf-8')
print('V6_1_EMPTY_NOOP_POLICY_PATCHED=1')
PY

bash -n "$TMP/v6-fixed.sh"
grep -q "peer_value = smart\[peer_locale\]\[key\]" "$TMP/v6-fixed.sh"
grep -q "str(smart\['en'\]\[key\]) == ''" "$TMP/v6-fixed.sh"

echo "V6_1_WRAPPER_VALIDATED=1"
bash "$TMP/v6-fixed.sh"

echo "============================================================"
echo " PMD MENU PLATFORM I18N CONSOLIDATION V6.1 COMPLETE"
echo "============================================================"
echo "MENU_PLATFORM_I18N_V6_1_OK=1"
