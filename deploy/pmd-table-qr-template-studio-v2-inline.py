#!/usr/bin/env python3
from pathlib import Path
import sys

CSS_HREF = '/app/admin/assets/css/pmd-table-qr-template-studio-v1.css?v=20260825_1'
JS_SRC = '/app/admin/assets/js/pmd-table-qr-template-studio-v1.js?v=20260825_1'
INLINE_MARKER = 'PMD_TABLE_QR_TEMPLATE_STUDIO_V2_INLINE'

if len(sys.argv) != 4:
    raise SystemExit('usage: pmd-table-qr-template-studio-v2-inline.py <view> <css> <js>')

view_path = Path(sys.argv[1])
css_path = Path(sys.argv[2])
js_path = Path(sys.argv[3])

text = view_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')
js = js_path.read_text(encoding='utf-8')

if INLINE_MARKER in text:
    print('PMD_TABLE_QR_TEMPLATE_STUDIO_V2_INLINE_ALREADY_PRESENT')
    raise SystemExit(0)

css_tag = f'<link rel="stylesheet" href="{CSS_HREF}">'
js_tag = f'<script src="{JS_SRC}" defer></script>'

if css_tag not in text:
    raise SystemExit('REFUSED: QR studio stylesheet tag missing before inline conversion')
if js_tag not in text:
    raise SystemExit('REFUSED: QR studio script tag missing before inline conversion')
if '</style>' in css.lower():
    raise SystemExit('REFUSED: unsafe closing style tag found in QR studio CSS')
if '</script>' in js.lower():
    raise SystemExit('REFUSED: unsafe closing script tag found in QR studio JS')

inline_css = (
    f'<!-- {INLINE_MARKER} -->\n'
    '<style id="pmd-table-qr-template-studio-v2-inline-css">\n'
    + css.rstrip() + '\n</style>'
)
inline_js = (
    f'<script id="pmd-table-qr-template-studio-v2-inline-js">\n'
    + js.rstrip() + '\n</script>'
)

text = text.replace(css_tag, inline_css, 1)
text = text.replace(js_tag, inline_js, 1)

contracts = [
    INLINE_MARKER,
    'PMD_TABLE_QR_TEMPLATE_STUDIO_V1',
    'PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1',
    'api.qrserver.com/v1/create-qr-code/?size=150x150&data=',
    'data-pmd-qr-template-open-v1',
    "id: 'classic'",
    "id: 'midnight'",
    "id: 'emerald'",
    "id: 'bistro'",
    "id: 'ocean'",
    "id: 'mono'",
    "id: 'gold'",
    "id: 'coral'",
    "id: 'tent'",
    "id: 'botanical'",
    'Powered by',
    'PayMyDine',
]
for needle in contracts:
    if needle not in text:
        raise SystemExit(f'REFUSED: inline contract missing: {needle}')

if CSS_HREF in text or JS_SRC in text:
    raise SystemExit('REFUSED: external QR studio asset reference remains after inline conversion')

view_path.write_text(text, encoding='utf-8')
print('PMD_TABLE_QR_TEMPLATE_STUDIO_V2_INLINE_OK')
