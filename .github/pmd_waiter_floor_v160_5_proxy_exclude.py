from pathlib import Path

path = Path('app/admin/assets/js/pmd-waiter-floor-edit-v160.js')
text = path.read_text()
old = "return map ? Array.prototype.slice.call(map.querySelectorAll('.pmd-w5-table[data-table]')) : [];"
new = "return map ? Array.prototype.slice.call(map.querySelectorAll('.pmd-w5-table[data-table]:not(.pmd-v160-drag-proxy)')) : [];"
if text.count(old) != 1:
    raise SystemExit(f'Expected exactly one real-table query, found {text.count(old)}')
text = text.replace(old, new, 1)
if text.count(":not(.pmd-v160-drag-proxy)") < 2:
    raise SystemExit('Proxy exclusion validation failed')
path.write_text(text)
print('PMD_V160_5_PROXY_EXCLUSION_OK')
