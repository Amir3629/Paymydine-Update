#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / 'app/admin/models/Menus_model.php'
ASSETS = ROOT / 'app/admin/views/_meta/assets.json'
MARKER = 'PMD_MENU_GALLERY_OPTIONS_V1'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: expected anchor not found')
    return text.replace(old, new, 1)


def patch_model() -> None:
    text = MODEL.read_text()
    text = replace_once(
        text,
        'use Admin\\Traits\\Stockable;\n',
        'use Admin\\Traits\\Stockable;\nuse Admin\\Traits\\PmdMenuGalleryOptionsV1;\n',
        'Menus_model import',
    )
    text = replace_once(
        text,
        '    use Stockable;\n',
        '    use Stockable;\n    use PmdMenuGalleryOptionsV1;\n',
        'Menus_model trait',
    )
    call = '        // PMD_MENU_GALLERY_OPTIONS_V1\n        $this->syncPmdMenuGalleryOptionsV1();\n'
    if call not in text:
        anchor = '        // PMD: sync compact inline additional menu images after normal menu save.\n        $this->syncMenuImagesInline();\n'
        if anchor not in text:
            raise SystemExit('Menus_model afterSave anchor not found')
        text = text.replace(anchor, anchor + '\n' + call, 1)
    MODEL.write_text(text)


def patch_assets() -> None:
    data = json.loads(ASSETS.read_text())
    style = data.setdefault('style', [])
    script = data.setdefault('script', [])
    if not any(row.get('name') == 'pmd-menu-gallery-options-v1-css' for row in style):
        style.append({'path': 'css/pmd-menu-gallery-options-v1.css', 'name': 'pmd-menu-gallery-options-v1-css'})
    if not any(row.get('name') == 'pmd-menu-gallery-options-v1-js' for row in script):
        script.append({'path': 'js/pmd-menu-gallery-options-v1.js', 'name': 'pmd-menu-gallery-options-v1-js'})
    ASSETS.write_text(json.dumps(data, indent=4, ensure_ascii=False) + '\n')


def main() -> None:
    patch_model()
    patch_assets()
    print('PMD Menu Gallery & Options V1 integration applied')


if __name__ == '__main__':
    main()
