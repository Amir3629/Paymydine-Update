#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
scan_roots = [
    root / 'app/admin/views',
    root / 'app/admin/assets/js',
    root / 'app/admin/controllers',
]

files: list[Path] = []
for base in scan_roots:
    if not base.is_dir():
        continue
    for path in base.rglob('*'):
        if not path.is_file():
            continue
        if path.name.endswith('.blade.php') or path.suffix.lower() in {'.php', '.js'}:
            files.append(path)

bilingual_local: set[str] = set()
manual_locale: set[str] = set()
legacy_related: set[str] = set()
legacy_loaders: set[str] = set()
central_consumers: set[str] = set()
central_refs = 0

# Covers PHP/JS owners such as $pmdMenuCopy=[...], var copy={...},
# translations={}, messages={}, localeMessages={}, etc. The EN/DE pair must
# occur in the same file so ordinary unrelated variables are not flagged.
named_dictionary = re.compile(
    r'(?is)(?:\$[A-Za-z_][A-Za-z0-9_]*|\b(?:var|let|const)\s+[A-Za-z_][A-Za-z0-9_]*)'
    r'(?:copy|translations?|dictionary|i18n|messages?|locale[A-Za-z0-9_]*)?'
    r'\s*=\s*[\[{]'
)
en_map = re.compile(r"(?i)(?:['\"]?en['\"]?)\s*(?:=>|:)\s*[\[{]")
de_map = re.compile(r"(?i)(?:['\"]?de['\"]?)\s*(?:=>|:)\s*[\[{]")
manual_cookie = re.compile(r'(?i)pmd_admin_locale')
manual_cookie_access = re.compile(r'(?i)(document\.cookie|request\(\)->cookie|cookie\s*\()')
central_ref_re = re.compile(
    r'(?i)(PmdPlatformI18n::(?:translate|messages|currentLocale)|PMDPlatformMessages\.t)\s*\('
)

legacy_names = (
    'pmd-admin-i18n-v1.js',
    'pmd-admin-i18n-page-authority-v2.js',
    'pmd-admin-i18n-catalog-de.js',
)

for path in files:
    try:
        text = path.read_text(encoding='utf-8', errors='replace')
    except Exception:
        continue

    rel = str(path.relative_to(root))

    if (
        'app/admin/i18n/platform/' not in rel
        and en_map.search(text)
        and de_map.search(text)
        and named_dictionary.search(text)
    ):
        bilingual_local.add(rel)

    if manual_cookie.search(text) and manual_cookie_access.search(text):
        if rel != 'app/admin/classes/PmdPlatformI18n.php':
            manual_locale.add(rel)

    refs = central_ref_re.findall(text)
    if refs:
        central_consumers.add(rel)
        central_refs += len(refs)

    if any(name in rel or name in text for name in legacy_names):
        legacy_related.add(rel)

    if rel.endswith('pmd_admin_i18n.blade.php'):
        for name in legacy_names:
            if name in text:
                legacy_loaders.add(name)

print('PAYMYDINE I18N AUTHORITY AUDIT V7')
print('==================================')
print(f'ROOT={root}')
print(f'FILES_SCANNED={len(files)}')
print(f'CENTRAL_PLATFORM_CONSUMER_FILES={len(central_consumers)}')
print(f'CENTRAL_PLATFORM_REFERENCES={central_refs}')
print(f'BILINGUAL_LOCAL_AUTHORITY_FILES={len(bilingual_local)}')
for item in sorted(bilingual_local):
    print(f'BILINGUAL_LOCAL={item}')
print(f'MANUAL_LOCALE_OWNER_FILES={len(manual_locale)}')
for item in sorted(manual_locale):
    print(f'MANUAL_LOCALE={item}')
print(f'LEGACY_TRANSLATOR_RELATED_FILES={len(legacy_related)}')
for item in sorted(legacy_related):
    print(f'LEGACY_TRANSLATOR={item}')
print(f'LEGACY_TRANSLATORS_STILL_LOADED={len(legacy_loaders)}')
for item in sorted(legacy_loaders):
    print(f'LEGACY_LOADED={item}')

menu_view = root / 'app/admin/views/pmdmenus/index.blade.php'
menu_smart = root / 'app/admin/assets/js/pmd-menu-smart-categories-v1.js'
menu_view_text = menu_view.read_text(encoding='utf-8', errors='replace') if menu_view.is_file() else ''
menu_smart_text = menu_smart.read_text(encoding='utf-8', errors='replace') if menu_smart.is_file() else ''

print('MENU_MANAGER_GLOBAL_I18N=' + ('1' if 'PMD_MENU_MANAGER_PLATFORM_I18N_GLOBAL_V1' in menu_view_text else '0'))
print('MENU_SMART_GLOBAL_I18N=' + ('1' if 'PMD_MENU_SMART_PLATFORM_I18N_GLOBAL_V1' in menu_smart_text else '0'))
print('MENU_SMART_MANUAL_COOKIE=' + ('1' if 'document.cookie' in menu_smart_text and 'pmd_admin_locale' in menu_smart_text else '0'))
print('MENU_SMART_LOCAL_COPY=' + ('1' if 'var copy = {' in menu_smart_text else '0'))

print('READ_ONLY_OK=1')
