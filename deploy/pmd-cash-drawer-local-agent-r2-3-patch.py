#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.')


def read(rel):
    p = ROOT / rel
    if not p.is_file():
        raise SystemExit(f'missing R2.3 patch target: {rel}')
    return p, p.read_text()


def replace_once(text, old, new, label):
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


def patch_cash_drawers():
    p, s = read('app/admin/controllers/CashDrawers.php')

    # Tenant-safe Laravel API authority for the downloadable Windows Agent.
    s = s.replace('/api/pmd-pos-agent/agent.js', '/api/v1/pmd-pos-agent/agent.js')

    # Existing live controller extends AdminController. Accept both historic
    # signatures so this patch is safe across tenants/live snapshots.
    if 'PMD_CASH_DRAWER_AGENT_V1_NGINX_AUTHORITY_R23' not in s:
        marker = "    // PMD_CASH_DRAWER_AGENT_V1_NGINX_AUTHORITY_R23\n"
        for anchor in (
            "class CashDrawers extends AdminController\n{\n",
            "class CashDrawers extends Controller\n{\n",
        ):
            if anchor in s:
                s = s.replace(anchor, anchor + marker, 1)
                break
        else:
            raise SystemExit('CashDrawers class anchor missing')

    # TastyIgniter admin links currently call snake_case controller actions.
    # Keep camelCase implementations as the authority and expose aliases.
    if 'PMD_CASH_DRAWER_SNAKE_ACTION_ALIASES_R23' not in s:
        anchor = "    public function windowsConnector($recordId)\n"
        aliases = '''    // PMD_CASH_DRAWER_SNAKE_ACTION_ALIASES_R23
    public function windows_connector($recordId)
    {
        return $this->windowsConnector($recordId);
    }

    public function windows_connector_agent($recordId)
    {
        return $this->windowsConnectorAgent($recordId);
    }

'''
        s = replace_once(s, anchor, aliases + anchor, 'cash drawer snake_case aliases')

    p.write_text(s)


patch_cash_drawers()
print('PMD_CASH_DRAWER_R2_3_PATCH_OK')
