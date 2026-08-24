#!/usr/bin/env python3
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: patch-pmd-sumup-payment-method-discovery-r4.py <stage-root>')

root = Path(sys.argv[1])
rel = 'app/Services/Payments/SumupOnlineCheckoutService.php'
path = root / rel
if not path.exists():
    raise SystemExit(f'ERROR: missing target: {rel}')
text = path.read_text()

old_call = '$methods = $this->availablePaymentMethods($config, $checkoutId);'
new_call = '$methods = $this->availablePaymentMethods($config, $amount, $currency);'
if old_call in text:
    text = text.replace(old_call, new_call, 1)
    print('SUMUP_METHOD_DISCOVERY_CALL=PATCHED')
elif new_call in text:
    print('SUMUP_METHOD_DISCOVERY_CALL=ALREADY_PATCHED')
else:
    raise SystemExit('ERROR: SumUp method discovery call anchor missing')

method_re = re.compile(
    r"    protected function availablePaymentMethods\(array \$config, string \$checkoutId\): array\n"
    r"    \{.*?\n    \}\n\n    protected function transactionReference",
    re.DOTALL,
)

replacement = '''    // PMD_SUMUP_OFFICIAL_METHOD_DISCOVERY_R4
    // SumUp's current public API exposes checkout-eligible methods at the
    // merchant endpoint. Query it with the actual amount/currency and fail
    // closed for standalone wallets; Card / Wallet may still fall back to card.
    protected function availablePaymentMethods(array $config, float $amount, string $currency): array
    {
        try {
            $merchantCode = trim((string)($config['merchant_code'] ?? ''));
            if ($merchantCode === '') {
                return [];
            }

            $response = Http::withToken($config['access_token'])
                ->acceptJson()
                ->timeout(15)
                ->get(
                    rtrim((string)$config['url'], '/').'/v0.1/merchants/'.rawurlencode($merchantCode).'/payment-methods',
                    [
                        'amount' => round($amount, 2),
                        'currency' => strtoupper($currency),
                    ]
                );

            if (!$response->successful()) {
                Log::channel('sumup')->warning('SUMUP_WIDGET_PAYMENT_METHOD_DISCOVERY_FAILED', [
                    'merchant_code' => $merchantCode,
                    'amount' => $amount,
                    'currency' => $currency,
                    'status' => $response->status(),
                ]);
                return [];
            }

            $body = (array)$response->json();
            $items = (array)($body['available_payment_methods'] ?? $body['items'] ?? []);
            $ids = [];
            foreach ($items as $item) {
                $id = is_array($item)
                    ? strtolower(trim((string)($item['id'] ?? '')))
                    : strtolower(trim((string)$item));
                if ($id !== '' && in_array($id, self::PMD_WIDGET_METHODS, true)) {
                    $ids[] = $id;
                }
            }

            $ids = array_values(array_unique($ids));
            Log::channel('sumup')->info('SUMUP_WIDGET_PAYMENT_METHODS_DISCOVERED', [
                'merchant_code' => $merchantCode,
                'amount' => $amount,
                'currency' => $currency,
                'methods' => $ids,
            ]);
            return $ids;
        } catch (\\Throwable $e) {
            report($e);
            return [];
        }
    }

    protected function transactionReference'''

if 'PMD_SUMUP_OFFICIAL_METHOD_DISCOVERY_R4' not in text:
    matches = list(method_re.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f'ERROR: expected one legacy SumUp method discovery function, found {len(matches)}')
    text = text[:matches[0].start()] + replacement + text[matches[0].end():]
    print('SUMUP_METHOD_DISCOVERY_ENDPOINT=PATCHED')
else:
    print('SUMUP_METHOD_DISCOVERY_ENDPOINT=ALREADY_PATCHED')

for stale in [
    "/v0.1/checkouts/'.rawurlencode($checkoutId).'/payment-methods",
    'availablePaymentMethods(array $config, string $checkoutId)',
]:
    if stale in text:
        raise SystemExit(f'ERROR: stale SumUp discovery contract remains: {stale}')

for required in [
    'PMD_SUMUP_OFFICIAL_METHOD_DISCOVERY_R4',
    "/v0.1/merchants/'.rawurlencode($merchantCode).'/payment-methods",
    "'amount' => round($amount, 2)",
    "'currency' => strtoupper($currency)",
    "available_payment_methods",
]:
    if required not in text:
        raise SystemExit(f'ERROR: official SumUp discovery contract missing: {required}')

path.write_text(text)
print('PMD_SUMUP_OFFICIAL_METHOD_DISCOVERY_R4=OK')
