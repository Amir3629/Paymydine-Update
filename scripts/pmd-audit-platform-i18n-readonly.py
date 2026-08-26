#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

SKIP_FILE_PARTS = (
    '/vendor/', '/node_modules/', '/storage/', '/__MACOSX/',
    '/backups/', '/backup/', '/cache/',
)

# Dynamic restaurant/customer content is data, not platform copy. The scanner
# keeps these candidates separate so we do not accidentally translate names,
# descriptions, notes, reviews, customer details, etc.
CONTENT_CONTEXT = re.compile(
    r'(?i)\b('
    r'menu_name|menu_description|item_name|item_description|food_name|food_description|'
    r'dish_name|dish_description|product_name|product_description|category_name|'
    r'review(?:_text)?|comment(?:_text)?|order_note|customer_note|staff_note|'
    r'special_instructions|customer_name|first_name|last_name|restaurant_name|'
    r'location_name|address|email|phone'
    r')\b'
)

TRANSLATION_MARKER = re.compile(
    r'(?i)(\blang\s*\(|\b__\s*\(|@lang\s*\(|Pmd(?:Admin|Platform)I18n|'
    r'PMD(?:Admin|Platform)Messages\s*\.\s*t\s*\(|data-i18n|lang:)'
)

NON_UI = re.compile(
    r'(?i)(console\.(?:log|info|warn|error)|Log::|logger\(|traceLog\(|debug\(|'
    r'\.svg\b|\.png\b|\.jpg\b|\.css\b|\.js\b|https?://|^[/#.][\w./#:-]+$)'
)

WORDISH = re.compile(r'[A-Za-zÄÖÜäöüß]')
ATTR_RE = re.compile(
    r'(?i)\b(placeholder|title|aria-label|data-confirm|data-original-title)'
    r'\s*=\s*(["\'])(.*?)\2'
)
TEXT_RE = re.compile(r'>\s*([^<>{}\n][^<>{}\n]{1,180}?)\s*<')
SINK_RES = [
    re.compile(r'(?i)\b(?:alert|confirm|prompt)\s*\(\s*(["\'])(.*?)\1'),
    re.compile(
        r'(?i)\b(?:title|label|message|placeholder|emptyText|buttonText|text)'
        r'\s*:\s*(["\'])(.*?)\1'
    ),
    re.compile(r'(?i)\b(?:textContent|innerText)\s*=\s*(["\'])(.*?)\1'),
    re.compile(r'(?i)\.(?:text|html)\s*\(\s*(["\'])(.*?)\1'),
    re.compile(
        r'(?i)[\'\"](?:message|error|success|warning|title|label|placeholder)'
        r'[\'\"]\s*=>\s*([\"\'])(.*?)\1'
    ),
]

LEGACY_MARKERS = {
    'global_dom_translator': 'pmd-admin-i18n-v1.js',
    'page_authority_translator': 'pmd-admin-i18n-page-authority-v2.js',
}


def clean_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def plausible(text: str) -> bool:
    text = clean_text(text)
    if len(text) < 2 or len(text) > 180:
        return False
    if not WORDISH.search(text):
        return False
    if '{{' in text or '}}' in text or '<?' in text or '@php' in text:
        return False
    if '$' in text or '->' in text or '::' in text or '=>' in text:
        return False
    if re.search(
        r'(?i)@(foreach|endforeach|if|endif|php|endphp|include|extends|section|yield)\b',
        text,
    ):
        return False
    if re.search(
        r'(?i)\b(function|return|where[A-Z]?|query|select|insert|update|delete)\s*\(',
        text,
    ):
        return False
    if TRANSLATION_MARKER.search(text) or NON_UI.search(text):
        return False
    if re.fullmatch(r'[A-Za-z0-9_.:/#-]+', text) and ' ' not in text and len(text) > 18:
        return False
    if re.fullmatch(r'[A-Z0-9_:-]+', text) and '_' in text:
        return False
    return True


def line_no(content: str, position: int) -> int:
    return content.count('\n', 0, position) + 1


def add_candidate(output, seen, relative, content, position, kind, text):
    text = clean_text(text)
    if not plausible(text):
        return

    number = line_no(content, position)
    lines = content.splitlines()
    source_line = lines[number - 1].strip() if 0 < number <= len(lines) else ''

    if TRANSLATION_MARKER.search(source_line) or NON_UI.search(source_line):
        return

    classification = (
        'excluded_dynamic_content_context'
        if CONTENT_CONTEXT.search(source_line)
        else 'platform_candidate'
    )

    signature = (relative, number, kind, text)
    if signature in seen:
        return
    seen.add(signature)

    output.append({
        'file': relative,
        'line': number,
        'kind': kind,
        'confidence': (
            'high'
            if kind in {'attribute', 'dialog', 'ui_property', 'php_message'}
            else 'medium'
        ),
        'classification': classification,
        'text': text,
        'source': source_line[:320],
    })


def scan_file(path: Path, relative: str):
    try:
        content = path.read_text(encoding='utf-8', errors='replace')
    except Exception as exception:
        return [], {'file': relative, 'error': str(exception)}

    output = []
    seen = set()
    suffix = '.blade.php' if path.name.endswith('.blade.php') else path.suffix.lower()

    if suffix in {'.blade.php', '.php', '.html'}:
        for match in ATTR_RE.finditer(content):
            add_candidate(
                output, seen, relative, content, match.start(),
                'attribute', match.group(3),
            )
        for match in TEXT_RE.finditer(content):
            add_candidate(
                output, seen, relative, content, match.start(),
                'text_node', match.group(1),
            )

    for index, expression in enumerate(SINK_RES):
        for match in expression.finditer(content):
            kind = (
                'dialog' if index == 0
                else ('php_message' if index == 4 else 'ui_property')
            )
            add_candidate(
                output, seen, relative, content, match.start(),
                kind, match.group(2),
            )

    legacy = [
        name for name, marker in LEGACY_MARKERS.items()
        if marker in content or marker in relative
    ]
    page_dictionary = bool(re.search(
        r'(?i)(translations|dictionary|i18n|localeMessages|messages)\s*=\s*\{',
        content,
    )) and 'pmd-platform-i18n' not in relative
    keyed_refs = len(re.findall(
        r'(?i)(Pmd(?:Admin|Platform)I18n::translate|'
        r'PMD(?:Admin|Platform)Messages\.t)\s*\(',
        content,
    ))

    return output, {
        'file': relative,
        'legacy': legacy,
        'page_local_dictionary': page_dictionary,
        'keyed_refs': keyed_refs,
    }


def roots_for(root: Path):
    candidates = [
        root / 'app/admin/views',
        root / 'app/admin/assets/js',
        root / 'app/admin/controllers',
        root / 'app/Http',
        root / 'routes',
        # Also support the Admin-only project snapshot layout used during audits.
        root / 'admin/views',
        root / 'admin/assets/js',
        root / 'admin/controllers',
        root / 'Http',
        root / 'system/views',
    ]
    result = []
    for candidate in candidates:
        if candidate.is_dir() and candidate not in result:
            result.append(candidate)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Read-only PayMyDine platform i18n inventory'
    )
    parser.add_argument(
        'root', nargs='?', default=os.environ.get('PMD_ROOT', '/var/www/paymydine')
    )
    parser.add_argument('--json-out', default='')
    parser.add_argument('--tsv-out', default='')
    arguments = parser.parse_args()

    root = Path(arguments.root).resolve()
    scan_roots = roots_for(root)
    if not scan_roots:
        print(f'ERROR=no supported source roots under {root}', file=sys.stderr)
        return 2

    candidates = []
    metadata = []
    unreadable = []
    files_scanned = 0

    for base in scan_roots:
        for path in base.rglob('*'):
            if not path.is_file():
                continue
            relative = '/' + str(path.relative_to(root)).replace('\\', '/')
            if any(part in relative for part in SKIP_FILE_PARTS):
                continue
            if path.name.endswith('.min.js') or path.name.endswith('.map'):
                continue
            if not (
                path.name.endswith('.blade.php')
                or path.suffix.lower() in {'.php', '.js', '.html'}
            ):
                continue

            files_scanned += 1
            found, info = scan_file(path, relative.lstrip('/'))
            if 'error' in info:
                unreadable.append(info)
                continue
            candidates.extend(found)
            metadata.append(info)

    platform = [
        row for row in candidates
        if row['classification'] == 'platform_candidate'
    ]
    high = [row for row in platform if row['confidence'] == 'high']
    excluded = [
        row for row in candidates
        if row['classification'] != 'platform_candidate'
    ]
    by_file = Counter(row['file'] for row in platform)
    by_kind = Counter(row['kind'] for row in platform)
    legacy_files = [row for row in metadata if row['legacy']]
    local_dictionaries = sorted(set(
        row['file'] for row in metadata if row['page_local_dictionary']
    ))
    keyed_refs = sum(row['keyed_refs'] for row in metadata)

    report = {
        'root': str(root),
        'scan_roots': [str(path) for path in scan_roots],
        'files_scanned': files_scanned,
        'platform_candidates': len(platform),
        'high_confidence_platform_candidates': len(high),
        'excluded_dynamic_content_context': len(excluded),
        'keyed_translation_references': keyed_refs,
        'legacy_authority_files': legacy_files,
        'page_local_dictionary_files': local_dictionaries,
        'unreadable_files': unreadable,
        'by_kind': dict(by_kind),
        'top_files': by_file.most_common(80),
        'candidates': platform,
        'excluded_examples': excluded[:200],
    }

    print('PAYMYDINE PLATFORM I18N READ-ONLY AUDIT')
    print('========================================')
    print(f'ROOT={root}')
    print(f'FILES_SCANNED={files_scanned}')
    print(f'PLATFORM_CANDIDATES={len(platform)}')
    print(f'HIGH_CONFIDENCE_PLATFORM_CANDIDATES={len(high)}')
    print(f'EXCLUDED_DYNAMIC_CONTENT_CONTEXT={len(excluded)}')
    print(f'KEYED_TRANSLATION_REFERENCES={keyed_refs}')
    print(f'LEGACY_AUTHORITY_FILES={len(legacy_files)}')
    print(f'PAGE_LOCAL_DICTIONARY_FILES={len(local_dictionaries)}')
    print(f'UNREADABLE_FILES={len(unreadable)}')

    print('\nTOP_FILES_BY_PLATFORM_CANDIDATES')
    for file_name, count in by_file.most_common(40):
        print(f'{count}\t{file_name}')

    print('\nSAMPLE_PLATFORM_CANDIDATES')
    for row in platform[:120]:
        print(f"{row['file']}:{row['line']}\t{row['kind']}\t{row['text']}")

    if arguments.json_out:
        Path(arguments.json_out).write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )
        print(f'JSON_OUT={arguments.json_out}')

    if arguments.tsv_out:
        with Path(arguments.tsv_out).open('w', encoding='utf-8') as handle:
            handle.write('file\tline\tkind\tconfidence\ttext\n')
            for row in platform:
                text = row['text'].replace('\t', ' ')
                handle.write(
                    f"{row['file']}\t{row['line']}\t{row['kind']}\t"
                    f"{row['confidence']}\t{text}\n"
                )
        print(f'TSV_OUT={arguments.tsv_out}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
