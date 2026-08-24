#!/usr/bin/env python3
from pathlib import Path
import sys

TARGET = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('routes/admin-app-before.php')
text = TARGET.read_text()

old_create = """            if ($providerCode === 'sumup') {
                $token = (string)($paymentData['access_token'] ?? '');
                $baseUrl = rtrim((string)($paymentData['url'] ?? 'https://api.sumup.com'), '/');
                $merchantCode = trim((string)($paymentData['id_application'] ?? ''));
                $merchantCodeSource = 'configured';
                if ($token === '') {
                    return response()->json(['success' => false, 'error' => 'SumUp credentials are incomplete'], 503);
                }
"""

new_create = """            if ($providerCode === 'sumup') {
                // PMD_SUMUP_CANONICAL_RUNTIME_R1: legacy clients may still hit
                // the generic card route, but SumUp secrets now live encrypted
                // in terminal_provider_configs. Merge them into the legacy
                // runtime shape without persisting a second copy.
                $paymentData = app(\\App\\Services\\Payments\\SumupPaymentRuntimeBridge::class)->runtimeData($paymentData);
                $token = (string)($paymentData['access_token'] ?? '');
                $baseUrl = rtrim((string)($paymentData['url'] ?? 'https://api.sumup.com'), '/');
                $merchantCode = trim((string)($paymentData['id_application'] ?? $paymentData['merchant_code'] ?? ''));
                $merchantCodeSource = (string)($paymentData['pmd_secret_source'] ?? 'configured');
                if ($token === '') {
                    return response()->json([
                        'success' => false,
                        'provider' => 'sumup',
                        'error' => 'sumup_not_connected',
                        'message' => 'Connect and activate SumUp in Payments & finance first.',
                    ], 422);
                }
"""

old_status = """        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        $token = (string)($data['access_token'] ?? '');
        $baseUrl = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');

        if ($token === '') {
            return response()->json(['success' => false, 'provider' => 'sumup', 'error' => 'SumUp credentials are incomplete'], 503);
        }
"""

new_status = """        $data = is_array(optional($payment)->data) ? (array)$payment->data : [];
        // PMD_SUMUP_CANONICAL_STATUS_RUNTIME_R1: status/verification must use
        // the same canonical encrypted tenant connection as checkout creation.
        $data = app(\\App\\Services\\Payments\\SumupPaymentRuntimeBridge::class)->runtimeData($data);
        $token = (string)($data['access_token'] ?? '');
        $baseUrl = rtrim((string)($data['url'] ?? 'https://api.sumup.com'), '/');

        if ($token === '') {
            return response()->json([
                'success' => false,
                'provider' => 'sumup',
                'error' => 'sumup_not_connected',
                'message' => 'Connect and activate SumUp in Payments & finance first.',
            ], 422);
        }
"""

create_count = text.count(old_create)
status_count = text.count(old_status)

if create_count:
    text = text.replace(old_create, new_create)
elif 'PMD_SUMUP_CANONICAL_RUNTIME_R1' not in text:
    raise SystemExit('PATCH ERROR: legacy SumUp create-session credential block not found')

if status_count:
    text = text.replace(old_status, new_status)
elif 'PMD_SUMUP_CANONICAL_STATUS_RUNTIME_R1' not in text:
    raise SystemExit('PATCH ERROR: legacy SumUp status credential block not found')

remaining = text.count('SumUp credentials are incomplete')
if remaining:
    raise SystemExit(f'PATCH ERROR: {remaining} stale SumUp credential error block(s) remain')

TARGET.write_text(text)
print(f'PATCHED={TARGET}')
print(f'LEGACY_SUMUP_CREATE_BLOCKS_PATCHED={create_count}')
print(f'LEGACY_SUMUP_STATUS_BLOCKS_PATCHED={status_count}')
print('LEGACY_SUMUP_STALE_ERRORS_REMAINING=0')
print('SUMUP_SECRET_SOURCE=terminal_provider_configs_runtime_bridge')
