#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.')


def read(rel):
    p = ROOT / rel
    if not p.is_file():
        raise SystemExit(f'missing R2.6 patch target: {rel}')
    return p, p.read_text()


def remove_marked_block(text, start, end, label):
    if start not in text:
        return text
    before, rest = text.split(start, 1)
    if end not in rest:
        raise SystemExit(f'{label}: end marker missing')
    _, after = rest.split(end, 1)
    return before + after


def patch_api_routes():
    p, s = read('routes/api.php')
    marker = 'PMD_LOCAL_POS_AGENT_API_ROUTE_LOADER_R26'
    if marker not in s:
        anchor = "require_once base_path('app/main/routes/pmd-tenant-media-owner-r3.php');\n"
        if anchor not in s:
            raise SystemExit('routes/api.php canonical top anchor missing')
        block = """

// PMD_LOCAL_POS_AGENT_API_ROUTE_LOADER_R26
// routes/api.php is Laravel's canonical API authority and already receives
// the public /api prefix. The included file therefore registers only
// v1/pmd-pos-agent, yielding /api/v1/pmd-pos-agent/* exactly once.
if (file_exists(base_path('routes/pmd-pos-agent-r1.php'))) {
    require_once base_path('routes/pmd-pos-agent-r1.php');
}
// PMD_LOCAL_POS_AGENT_API_ROUTE_LOADER_R26_END
"""
        s = s.replace(anchor, anchor + block, 1)
    p.write_text(s)


def retire_system_loader():
    p, s = read('app/system/ServiceProvider.php')
    s = remove_marked_block(
        s,
        '        // PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25\n',
        '        // PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25_END\n',
        'System Agent loader',
    )
    p.write_text(s)


def retire_admin_loader():
    p, s = read('app/admin/routes.php')
    s = remove_marked_block(
        s,
        '// PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24\n',
        '// PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24_END\n',
        'Admin Agent loader',
    )
    p.write_text(s)


patch_api_routes()
retire_system_loader()
retire_admin_loader()
print('PMD_CASH_DRAWER_R2_6_PATCH_OK')
