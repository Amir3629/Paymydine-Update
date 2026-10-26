#!/usr/bin/env python3
"""Surgical R17 Add-Floor card patch for the R16+R45B dirty VPS.

Does NOT replace the large Floor partial or modify create/delete APIs,
permissions, table statuses, other modal controls or translations.
"""
from pathlib import Path
import sys

ADD_START = '<div class="pmd-floor-registry-manager" data-pmd-floor-add-panel'
SUBTITLE = "                        <p>{{ $pmdFloorRegistryText['subtitle'] }}</p>\n"
CLOSE = (
    'class="pmd-floor-registry-manager__close" data-pmd-floor-add-close '
    'aria-label="{{ $pmdFloorRegistryText[\'cancel\'] }}"'
)
CANCEL = (
    'class="pmd-floor-registry-manager__cancel" data-pmd-floor-add-close>'
    "{{ $pmdFloorRegistryText['cancel'] }}</button>"
)
NEUTRAL = (
    'style="background:#fff!important;background-color:#fff!important;'
    'background-image:none!important;border:1px solid #cbdde8!important;'
    'color:#244c45!important;-webkit-text-fill-color:#244c45!important;'
    'box-shadow:none!important;text-shadow:none!important;"'
)
CLOSE_MARKER = 'data-pmd-r17-close-neutral="1"'
CANCEL_MARKER = 'data-pmd-r17-cancel-neutral="1"'


def patch(src: str) -> str:
    if src.count(ADD_START) != 1:
        raise RuntimeError('STOP: Add Floor panel is absent or duplicated')
    if src.count('data-pmd-floor-add-save') != 1:
        raise RuntimeError('STOP: Add Floor Save action is missing or duplicated')
    start = src.index(ADD_START)
    end = src.find('</section>', start)
    if end < 0:
        raise RuntimeError('STOP: could not isolate Add Floor dialog')
    end += len('</section>')
    block = src[start:end]

    # Idempotence, but fail closed when only some markers are installed.
    markers = [CLOSE_MARKER in block, CANCEL_MARKER in block]
    if any(markers):
        if not all(markers) or any(block.count(m) != 1 for m in (CLOSE_MARKER, CANCEL_MARKER)):
            raise RuntimeError('STOP: incomplete/duplicated R17 neutral controls')
        if SUBTITLE in block:
            raise RuntimeError('STOP: R17 neutral buttons exist, but Add Floor subtitle remains')
        return src

    if block.count(SUBTITLE) != 1 or block.count(CLOSE) != 1 or block.count(CANCEL) != 1:
        raise RuntimeError('STOP: Add Floor card markup changed; preserve local changes')

    result = block.replace(SUBTITLE, '', 1)
    result = result.replace(CLOSE, CLOSE + ' ' + CLOSE_MARKER + ' ' + NEUTRAL, 1)
    result = result.replace(CANCEL,
        'class="pmd-floor-registry-manager__cancel" data-pmd-floor-add-close '
        + CANCEL_MARKER + ' ' + NEUTRAL
        + ">{{ $pmdFloorRegistryText['cancel'] }}</button>", 1)

    if result.count('data-pmd-floor-add-close') != block.count('data-pmd-floor-add-close'):
        raise RuntimeError('STOP: Close/Cancel handlers were changed')
    if result.count('data-pmd-floor-add-save') != 1:
        raise RuntimeError('STOP: Save Floor button changed')
    return src[:start] + result + src[end:]


def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage: pmd-r17-create-floor-card-patch.py INPUT OUTPUT')
    before = Path(sys.argv[1]).read_text(encoding='utf-8')
    after = patch(before)
    out = Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(after, encoding='utf-8')
    print('PASS R17: Add Floor subtitle removed, neutral white X/Cancel; Create floor stays unchanged')


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        sys.exit(3)
