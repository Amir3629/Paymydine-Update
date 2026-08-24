#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.')


def read(rel):
    p = ROOT / rel
    if not p.is_file():
        raise SystemExit(f'missing R2.7 patch target: {rel}')
    return p, p.read_text()


def remove_marked_block(text, start, end, label):
    while start in text:
        before, rest = text.split(start, 1)
        if end not in rest:
            raise SystemExit(f'{label}: end marker missing')
        _, after = rest.split(end, 1)
        text = before + after
    return text


def patch_route_authorities():
    p, s = read('routes/api.php')
    s = s.replace(
        "// PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER\nrequire_once base_path('routes/pmd-pos-agent-r1.php');\n\n",
        '',
    )
    s = remove_marked_block(
        s,
        '// PMD_LOCAL_POS_AGENT_API_ROUTE_LOADER_R26\n',
        '// PMD_LOCAL_POS_AGENT_API_ROUTE_LOADER_R26_END\n',
        'API Agent loader',
    )
    p.write_text(s)

    p, s = read('app/admin/routes.php')
    s = remove_marked_block(
        s,
        '// PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24\n',
        '// PMD_LOCAL_POS_AGENT_ADMIN_ROUTE_LOADER_R24_END\n',
        'Admin Agent loader',
    )
    p.write_text(s)

    p, s = read('app/system/ServiceProvider.php')
    s = remove_marked_block(
        s,
        '        // PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25\n',
        '        // PMD_LOCAL_POS_AGENT_SYSTEM_ROUTE_LOADER_R25_END\n',
        'System Agent loader',
    )
    p.write_text(s)


def patch_cash_drawers():
    p, s = read('app/admin/controllers/CashDrawers.php')

    # The Windows installer must not depend on an authenticated browser/Admin
    # session. The generic Agent package is served by the direct tenant PHP
    # gateway and contains no pairing/device secret by itself.
    old_urls = [
        "$agentUrl = $adminBase.'/api/v1/pmd-pos-agent/agent.js';",
        "$agentUrl = $adminBase.'/api/pmd-pos-agent/agent.js';",
        "$agentUrl = $adminBase.'/cash_drawers/windows_connector_agent/'.$drawer->drawer_id;",
    ]
    replacement = "$agentUrl = $adminBase.'/pmd-pos-agent.php?action=agent'; // PMD_CASH_DRAWER_DIRECT_AGENT_DOWNLOAD_R27"
    if replacement not in s:
        matches = [old for old in old_urls if old in s]
        if len(matches) != 1:
            raise SystemExit(f'R2.7 agent download URL anchor count={len(matches)}')
        s = s.replace(matches[0], replacement, 1)

    # Retire the old route-authority marker: the public machine bridge is now
    # the direct root PHP gateway.
    s = s.replace(
        '    // PMD_CASH_DRAWER_AGENT_V1_NGINX_AUTHORITY_R23\n',
        '    // PMD_CASH_DRAWER_DIRECT_GATEWAY_R27\n',
        1,
    )

    # Keep the legacy authenticated action compatible for manual/debug use,
    # but make its served Agent use the same direct gateway transport.
    if 'PMD_CASH_DRAWER_AGENT_SOURCE_GATEWAY_R27' not in s:
        old = """        return response(file_get_contents($agentPath), 200, [
            'Content-Type' => 'application/javascript',
        ]);
"""
        new = r'''        // PMD_CASH_DRAWER_AGENT_SOURCE_GATEWAY_R27
        $agentSource = file_get_contents($agentPath);
        $agentSource = str_replace(
            "cfg.backendBase + '/api/pos-agent/pair'",
            "cfg.backendBase + '/pmd-pos-agent.php?action=pair'",
            $agentSource
        );
        $agentSource = str_replace(
            "cfg.backendBase + '/api/pos-agent/commands/pull?device_code='",
            "cfg.backendBase + '/pmd-pos-agent.php?action=pull&device_code='",
            $agentSource
        );
        $agentSource = str_replace(
            "cfg.backendBase + '/api/pos-agent/commands/' + encodeURIComponent(String(commandId)) + '/ack'",
            "cfg.backendBase + '/pmd-pos-agent.php?action=ack&id=' + encodeURIComponent(String(commandId))",
            $agentSource
        );
        $agentSource = str_replace(
            "if (token) headers.Authorization = 'Bearer ' + token;",
            "if (token) { headers.Authorization = 'Bearer ' + token; headers['X-PMD-Device-Token'] = token; }",
            $agentSource
        );

        return response($agentSource, 200, [
            'Content-Type' => 'application/javascript',
            'Cache-Control' => 'no-store, max-age=0',
            'X-PMD-Local-Agent' => 'R2.7-direct-gateway',
        ]);
'''
        if s.count(old) != 1:
            raise SystemExit(f'R2.7 Agent source response anchor count={s.count(old)}')
        s = s.replace(old, new, 1)

    # BACKEND_BASE_URL must be the tenant origin. R2 base normally does this,
    # but keep the patch tolerant of an older live controller.
    s = s.replace(
        "$adminBase = rtrim(url(admin_url('/')), '/');",
        "$adminBase = rtrim(request()->getSchemeAndHttpHost(), '/');",
        1,
    )

    # A re-download is an intentional clean re-pair. Stop only the old PMD
    # Node process (not unrelated Node apps) and remove stale state.json before
    # the new Agent starts. This avoids an old process keeping port 17877.
    marker = 'PMD_CASH_DRAWER_WINDOWS_CLEAN_REINSTALL_R27'
    if marker not in s:
        anchor = '        return "@echo off\\r\\n"\n'
        if anchor not in s:
            raise SystemExit('R2.7 Windows connector return anchor missing')
        block = r'''        return "@echo off\r\n"
            ."rem PMD_CASH_DRAWER_WINDOWS_CLEAN_REINSTALL_R27\r\n"
            ."schtasks /end /tn \"PayMyDineLocalPosAgent\" >nul 2>&1\r\n"
            ."powershell -NoProfile -Command \"Get-CimInstance Win32_Process -Filter \\\"Name='node.exe'\\\" | Where-Object { \$_.CommandLine -like '*PayMyDine*LocalPosAgent*agent.js*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }\" >nul 2>&1\r\n"
            ."if exist \"%ProgramData%\\PayMyDine\\LocalPosAgent\\state.json\" del /f /q \"%ProgramData%\\PayMyDine\\LocalPosAgent\\state.json\" >nul 2>&1\r\n"
'''
        s = s.replace(anchor, block, 1)

    p.write_text(s)


patch_route_authorities()
patch_cash_drawers()
print('PMD_CASH_DRAWER_R2_7_PATCH_OK')
