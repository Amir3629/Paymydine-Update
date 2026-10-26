#!/usr/bin/env python3
"""R16's narrow, fail-closed Add Floor visibility adapter.

R45B changed the surrounding Floor toolbar markup independently of R15.
Do not three-way merge a large R15/R45B Blade section: insert only these three
authorized visibility attributes into the exact current VPS Floor switcher.
No Floor registry, permission, edit-floor or safety logic is replaced.
"""
import pathlib
import sys

MARKERS = (
    'R16_FLOOR_TOOLBAR_VISIBLE_SWITCHER',
    'R16_FLOOR_TOOLBAR_VISIBLE_ADD',
    'R16_FLOOR_TOOLBAR_VISIBLE_DIVIDER',
)
REPLACEMENTS = (
    (
        '                aria-label="Floors"\n'
        '                @if(!$pmdShowFloorTabs && !$pmdFloorCanManageTables) hidden @endif',
        '                aria-label="Floors"\n'
        '                {{-- R16_FLOOR_TOOLBAR_VISIBLE_SWITCHER: only Owner/Manager permitted by server. --}}\n'
        '                @if($pmdFloorCanManageTables)\n'
        '                    style="display:flex!important;visibility:visible!important;pointer-events:auto!important;"\n'
        '                @endif\n'
        '                @if(!$pmdShowFloorTabs && !$pmdFloorCanManageTables) hidden @endif',
    ),
    (
        '                        title="{{ $pmdFloorRegistryText[\'add_floor\'] }}"',
        '                        title="{{ $pmdFloorRegistryText[\'add_floor\'] }}"\n'
        '                        {{-- R16_FLOOR_TOOLBAR_VISIBLE_ADD: override legacy R31 display:none. --}}\n'
        '                        style="display:inline-flex!important;visibility:visible!important;pointer-events:auto!important;"',
    ),
    (
        '                data-pmd-floor-switcher-divider\n'
        '                aria-hidden="true"',
        '                data-pmd-floor-switcher-divider\n'
        '                aria-hidden="true"\n'
        '                {{-- R16_FLOOR_TOOLBAR_VISIBLE_DIVIDER --}}\n'
        '                @if($pmdFloorCanManageTables)\n'
        '                    style="display:block!important;visibility:visible!important;"\n'
        '                @endif',
    ),
)


def apply(source: str) -> str:
    if not all(token in source for token in (
        '@if($pmdFloorCanManageTables)',
        'data-pmd-floor-add',
        'data-pmd-floor-switcher-divider',
        'data-pmd-floor-manage',
    )):
        raise RuntimeError('STOP: Floor capability or toolbar authority missing')

    found = [marker in source for marker in MARKERS]
    if any(found):
        if not all(found):
            raise RuntimeError('STOP: partial R16 toolbar markers; no overwrite')
        for marker in MARKERS:
            if source.count(marker) != 1:
                raise RuntimeError('STOP: duplicated R16 toolbar marker')
        return source

    result = source
    for old, new in REPLACEMENTS:
        if result.count(old) != 1:
            raise RuntimeError('STOP: Floor button context absent/ambiguous; preserve VPS Floor')
        result = result.replace(old, new, 1)

    if any(result.count(marker) != 1 for marker in MARKERS):
        raise RuntimeError('STOP: adapted Floor toolbar malformed')
    if source.count('data-pmd-floor-manage') != result.count('data-pmd-floor-manage'):
        raise RuntimeError('STOP: Edit floor control unexpectedly modified')
    if source.count('data-pmd-floor-add') != result.count('data-pmd-floor-add'):
        raise RuntimeError('STOP: floor create control unexpectedly modified')
    if source.count('PMD_R45_') != result.count('PMD_R45_'):
        raise RuntimeError('STOP: R45B safety markers unexpectedly modified')
    return result


def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage: pmd-r16-floor-live-adapter.py CURRENT_BLADE STAGED_BLADE')
    src, dest = [pathlib.Path(p) for p in sys.argv[1:3]]
    old = src.read_text(encoding='utf-8')
    updated = apply(old)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(updated, encoding='utf-8')
    print('PASS R16: Add Floor visibility adapted onto live Floor, existing R45B markup preserved')


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(3)
