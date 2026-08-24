#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.')


def read(rel):
    p = ROOT / rel
    if not p.is_file():
        raise SystemExit(f'missing R2.5 patch target: {rel}')
    return p, p.read_text()


def replace_once(text, old, new, label):
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


def patch_system_provider():
    p, s = read('app/system/ServiceProvider.php')
    marker = 'PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25'
    if marker not in s:
        anchor = "        parent::boot('system');\n"
        block = """

        // PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25
        // System\\ServiceProvider is autoloaded from config/app.php for every
        // Laravel request. Register the hardware Agent route from this global
        // authority so /api/v1/pmd-pos-agent/* does not depend on Admin mode.
        if (file_exists(base_path('routes/pmd-pos-agent-r1.php'))) {
            require_once base_path('routes/pmd-pos-agent-r1.php');
        }
        // PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25_END
"""
        s = replace_once(s, anchor, anchor + block, 'system Agent route loader')
    p.write_text(s)


def retire_admin_loader():
    p, s = read('app/admin/routes.php')
    start = '// PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24\n'
    end = '// PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24_END\n'
    if start in s:
        before, rest = s.split(start, 1)
        if end not in rest:
            raise SystemExit('admin Agent route loader end marker missing')
        _, after = rest.split(end, 1)
        s = before + after
    p.write_text(s)


patch_system_provider()
retire_admin_loader()
print('PMD_CASH_DRAWER_R2_5_PATCH_OK')
