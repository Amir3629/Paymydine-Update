#!/usr/bin/env python3
from pathlib import Path
import sys

TARGET = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('routes/admin-app-before.php')
text = TARGET.read_text()

old = """            if ($providerCode === 'sumup') {
                $token = (string)($paymentData['access_token'] ?? '');
                $baseUrl = rtrim((string)($paymentData['url'] ?? 'https://api.sumup.com'), '/');
                $merchantCode = trim((string)($paymentData['id_application'] ?? ''));
                $merchantCodeSource = 'configured';
                if ($token === '') {
                    return response()->json(['success' => false, 'error' => 'SumUp credentials are incomplete'], 503);
                }
"""

new = """            if ($providerCode === 'sumup') {
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

count = text.count(old)
if count == 0:
    if 'PMD_SUMUP_CANONICAL_RUNTIME_R1' in text:
        print(f'ALREADY_PATCHED={TARGET}')
        raise SystemExit(0)
    raise SystemExit('PATCH ERROR: legacy SumUp credential block not found')

text = text.replace(old, new)
TARGET.write_text(text)
print(f'PATCHED={TARGET}')
print(f'LEGACY_SUMUP_BLOCKS_PATCHED={count}')
print('SUMUP_SECRET_SOURCE=terminal_provider_configs_runtime_bridge')
