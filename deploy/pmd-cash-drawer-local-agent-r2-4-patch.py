#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.')


def read(rel):
    p = ROOT / rel
    if not p.is_file():
        raise SystemExit(f'missing R2.4 patch target: {rel}')
    return p, p.read_text()


def replace_once(text, old, new, label):
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


def patch_admin_routes():
    p, s = read('app/admin/routes.php')
    marker = 'PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24'
    if marker not in s:
        anchor = "require_once base_path('routes/terminal-payments.php');\n"
        block = """

// PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24
// Admin\\ServiceProvider explicitly loads this route authority for tenant
// requests. The route file registers the complete /api/v1/pmd-pos-agent URI.
if (file_exists(base_path('routes/pmd-pos-agent-r1.php'))) {
    require_once base_path('routes/pmd-pos-agent-r1.php');
}
// PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24_END
"""
        s = replace_once(s, anchor, anchor + block, 'admin agent route loader')
    p.write_text(s)


def retire_api_loader():
    p, s = read('routes/api.php')
    # R2 base patcher historically injected the Agent file into routes/api.php.
    # R2.4 has one route owner: app/admin/routes.php. Remove that older loader
    # from the staged copy so we never double-register the hardware routes.
    block = "// PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER\nrequire_once base_path('routes/pmd-pos-agent-r1.php');\n\n"
    s = s.replace(block, '')
    p.write_text(s)


patch_admin_routes()
retire_api_loader()
print('PMD_CASH_DRAWER_R2_4_PATCH_OK')
