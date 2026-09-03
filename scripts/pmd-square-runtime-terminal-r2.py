#!/usr/bin/env python3
from pathlib import Path
import runpy

BASE = Path(__file__).resolve().parents[1]
runpy.run_path(str(BASE / 'scripts/pmd-square-runtime-terminal-r1.py'), run_name='__main__')

path = BASE / 'app/admin/controllers/TerminalDevices.php'
text = path.read_text()
marker = "$networkProbe = 'locations-api';"
if marker not in text:
    anchor = "        $terminalReady = $providerReady && trim($readerId) !== '';\n"
    if text.count(anchor) != 1:
        raise SystemExit(f'STOP: Square Terminal buildStatus anchor: expected 1, found {text.count(anchor)}')
    block = r'''        if ($providerCode === 'square') {
            try {
                $runtime = app(\App\Services\Payments\SquareRuntimeService::class);
                $config = $runtime->providerConfig(false);
                $config['device_id'] = $readerId;
                $config['pmd_country_code'] = strtoupper((string)(app(\App\Services\Platform\LocationPlatformContext::class)->countryCode() ?? ''));
                $providerReady = (bool)((new SquareTerminalProvider())->validateConfiguration($config)['ok'] ?? false);
                $networkProbe = 'locations-api';
            } catch (\Throwable $ignored) {
                $providerReady = false;
                $networkProbe = 'not-run';
            }
        }

'''
    text = text.replace(anchor, block + anchor, 1)
    path.write_text(text)
    print('PASS: Square Terminal readiness snapshot')
else:
    print('PASS: Square Terminal readiness snapshot already applied')

print('PASS: Square R2 patch sequence complete')
