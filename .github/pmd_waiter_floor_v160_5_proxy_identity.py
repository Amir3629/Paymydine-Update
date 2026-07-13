from pathlib import Path

path = Path('app/admin/assets/js/pmd-waiter-floor-edit-v160.js')
text = path.read_text()

old = """    var proxy = table.cloneNode(true);
    stripProxyIdentity(proxy);
    proxy.classList.remove('pmd-v160-drag-source', 'pmd-v160-settling-table', 'pmd-v160-collision-blocked');
"""
new = """    var proxy = table.cloneNode(true);
    stripProxyIdentity(proxy);
    proxy.setAttribute('data-pmd-v160-proxy-table', table.getAttribute('data-table') || '');
    proxy.removeAttribute('data-table');
    proxy.classList.remove('pmd-v160-drag-source', 'pmd-v160-settling-table', 'pmd-v160-collision-blocked');
"""
if text.count(old) != 1:
    raise SystemExit(f'Expected one proxy identity block, found {text.count(old)}')
text = text.replace(old, new, 1)

old_styles = """    setImportant(proxy, 'pointer-events', 'none');
    setImportant(proxy, 'position', 'absolute');
"""
new_styles = """    setImportant(proxy, 'pointer-events', 'none');
    setImportant(proxy, 'display', 'flex');
    setImportant(proxy, 'align-items', 'center');
    setImportant(proxy, 'justify-content', 'center');
    setImportant(proxy, 'box-sizing', 'border-box');
    setImportant(proxy, 'position', 'absolute');
"""
if text.count(old_styles) != 1:
    raise SystemExit(f'Expected one proxy style block, found {text.count(old_styles)}')
text = text.replace(old_styles, new_styles, 1)

required = [
    "proxy.removeAttribute('data-table')",
    "data-pmd-v160-proxy-table",
    "setImportant(proxy, 'display', 'flex')",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'Missing proxy identity marker: {marker}')

path.write_text(text)
print('PMD_V160_5_PROXY_IDENTITY_OK')
