<?php

namespace App\Services\Payments;

/**
 * PMD_PAYMOB_OMAN_RUNTIME_R1
 *
 * Region-aware Paymob orchestration layer for PayMyDine.
 *
 * This class deliberately does not write orders/payment rows. It produces and
 * verifies provider state so PMD's existing shared settlement authority can remain
 * the only component allowed to mark an order paid.
 */
final class PaymobOmanRuntimeService
{
    private PaymobApiClient $client;
    private PaymentMarketRegistry $markets;
    private MoneyMinorUnitConverter $money;

    public function __construct(array $config = [])
    {
        $this->client = new PaymobApiClient($config);
        $this->markets = new PaymentMarketRegistry();
        $this->money = new MoneyMinorUnitConverter();
    }

    public function state(): array
    {
        $config = $this->client->config();
        $methods = [];

        foreach ($this->markets->methodsForCountry('OM') as $variantCode => $definition) {
            $integrationKey = (string)($definition['paymob_integration_key'] ?? '');
            $integrationId = trim((string)($config['integration_ids'][$integrationKey] ?? ''));

            $methods[$variantCode] = array_merge($definition, [
                'integration_configured' => $integrationId !== '',
                'integration_id' => $integrationId !== '' ? $integrationId : null,
                // Configuration is not merchant capability discovery. We only know
                // the method is usable after Paymob has enabled the Integration ID.
                'merchant_enablement_verified' => false,
            ]);
        }

        return [
            'provider' => 'paymob',
            'country_code' => 'OM',
            'provider_region_code' => 'OMN',
            'currency' => 'OMR',
            'currency_minor_exponent' => 3,
            'connection' => $this->client->safeConfig(),
            'methods' => $methods,
            'terminal' => $this->markets->terminalState('OM'),
            'checkout' => [
                'primary' => 'unified_checkout',
                'supported' => ['unified_checkout', 'pixel'],
                'raw_iframe_allowed' => false,
            ],
        ];
    }

    public function testConnection(): array
    {
        $result = $this->client->testConnection();

        return array_merge($result, [
            'market' => 'Oman',
            'country_code' => 'OM',
            'currency' => 'OMR',
        ]);
    }

    /**
     * Create an Oman checkout Intention using regional method variant codes.
     *
     * Example variants:
     * - om_card
     * - om_omannet
     * - om_apple_pay
     * - om_google_pay
     *
     * The caller must provide a stable special_reference that is persisted locally
     * before making the request. Do not generate a new reference on ambiguous retry.
     */
    public function createCheckout(
        int $orderId,
        string|int|float $amount,
        array $methodVariants,
        array $billingData,
        string $specialReference,
        string $notificationUrl,
        string $redirectionUrl,
        array $items = []
    ): array {
        $specialReference = trim($specialReference);
        if ($orderId <= 0) return ['ok' => false, 'message' => 'PMD order ID is required.'];
        if ($specialReference === '') return ['ok' => false, 'message' => 'A stable Paymob special_reference is required.'];
        if (!$this->validCallbackUrl($notificationUrl)) return ['ok' => false, 'message' => 'A valid Paymob notification URL is required.'];
        if (!$this->validCallbackUrl($redirectionUrl)) return ['ok' => false, 'message' => 'A valid Paymob redirection URL is required.'];

        $resolvedMethods = $this->resolveIntegrationIds($methodVariants);
        if (!($resolvedMethods['ok'] ?? false)) return $resolvedMethods;

        try {
            $amountMinor = $this->money->toMinor($amount, 'OMR');
        } catch (\Throwable $error) {
            return ['ok' => false, 'message' => $error->getMessage()];
        }

        if ($amountMinor <= 0) return ['ok' => false, 'message' => 'Order amount must be greater than zero.'];

        $billing = $this->normalizeBillingData($billingData);
        if (!($billing['ok'] ?? false)) return $billing;

        $payload = [
            'amount' => $amountMinor,
            'currency' => 'OMR',
            'payment_methods' => $resolvedMethods['integration_ids'],
            'items' => $this->normalizeItems($items, $amountMinor, $orderId),
            'billing_data' => $billing['billing_data'],
            'customer' => [
                'first_name' => $billing['billing_data']['first_name'],
                'last_name' => $billing['billing_data']['last_name'],
                'email' => $billing['billing_data']['email'],
            ],
            'special_reference' => $specialReference,
            'notification_url' => $notificationUrl,
            'redirection_url' => $redirectionUrl,
        ];

        $result = $this->client->createIntention($payload);
        if (!($result['ok'] ?? false)) return $result;

        return array_merge($result, [
            'order_id' => $orderId,
            'special_reference' => $specialReference,
            'currency' => 'OMR',
            'amount_minor' => $amountMinor,
            'selected_market_methods' => $resolvedMethods['variants'],
            'selected_canonical_methods' => $resolvedMethods['canonical_methods'],
        ]);
    }

    /**
     * Verify Paymob's backend callback and return settlement-safe normalized data.
     * This does not mark the PMD order paid.
     */
    public function verifyTransactionCallback(
        array $payload,
        ?string $receivedHmac,
        ?int $expectedAmountMinor = null,
        string $expectedCurrency = 'OMR',
        ?string $expectedSpecialReference = null
    ): array {
        $obj = is_array($payload['obj'] ?? null) ? $payload['obj'] : $payload;
        $verification = $this->client->verifyTransactionPostHmac($obj, $receivedHmac);
        if (!($verification['ok'] ?? false)) {
            return ['ok' => false, 'verified' => false, 'message' => $verification['message'] ?? 'Paymob HMAC failed.'];
        }

        $state = $this->client->normalizeTransactionState($obj);
        $expectedCurrency = strtoupper(trim($expectedCurrency));

        if ($expectedCurrency !== '' && strtoupper((string)$state['currency']) !== $expectedCurrency) {
            return [
                'ok' => false,
                'verified' => true,
                'message' => 'Paymob callback currency does not match the PMD payment attempt.',
                'transaction' => $state,
            ];
        }

        if ($expectedAmountMinor !== null && (int)$state['amount_minor'] !== $expectedAmountMinor) {
            return [
                'ok' => false,
                'verified' => true,
                'message' => 'Paymob callback amount does not match the PMD payment attempt.',
                'transaction' => $state,
            ];
        }

        $expectedSpecialReference = trim((string)$expectedSpecialReference);
        if ($expectedSpecialReference !== '') {
            $merchantOrderId = trim((string)($state['merchant_order_id'] ?? ''));
            if ($merchantOrderId !== '' && !hash_equals($expectedSpecialReference, $merchantOrderId)) {
                return [
                    'ok' => false,
                    'verified' => true,
                    'message' => 'Paymob callback merchant reference does not match the PMD payment attempt.',
                    'transaction' => $state,
                ];
            }
        }

        return [
            'ok' => true,
            'verified' => true,
            'settlement_candidate' => ($state['status'] ?? '') === 'paid',
            'transaction' => $state,
            'message' => 'Paymob callback verified and normalized.',
        ];
    }

    public function reconcileTransaction(int|string $transactionId): array
    {
        $result = $this->client->retrieveTransaction($transactionId);
        if (!($result['ok'] ?? false)) return $result;

        $response = (array)($result['response'] ?? []);

        return array_merge($result, [
            'transaction' => $this->client->normalizeTransactionState($response),
        ]);
    }

    public function reconcilePaymobOrder(int|string $paymobOrderId): array
    {
        return $this->client->retrieveOrder($paymobOrderId);
    }

    public function refund(int|string $transactionId, string|int|float $amount): array
    {
        $amountMinor = $this->money->toMinor($amount, 'OMR');

        return $this->client->refundTransaction($transactionId, $amountMinor);
    }

    public function void(int|string $transactionId): array
    {
        return $this->client->voidTransaction($transactionId);
    }

    public function capture(int|string $transactionId, string|int|float $amount): array
    {
        $amountMinor = $this->money->toMinor($amount, 'OMR');

        return $this->client->captureTransaction($transactionId, $amountMinor);
    }

    private function resolveIntegrationIds(array $variants): array
    {
        $variants = array_values(array_unique(array_filter(array_map(
            static fn ($value) => strtolower(trim((string)$value)),
            $variants
        ))));

        if (!$variants) return ['ok' => false, 'message' => 'Select at least one Paymob Oman payment method.'];

        $config = $this->client->config();
        $ids = [];
        $canonical = [];

        foreach ($variants as $variantCode) {
            $definition = $this->markets->method($variantCode);
            if (!$definition || (string)($definition['country_code'] ?? '') !== 'OM') {
                return ['ok' => false, 'message' => "Payment method '{$variantCode}' is not an Oman market method."];
            }
            if ((string)($definition['provider_code'] ?? '') !== 'paymob') {
                return ['ok' => false, 'message' => "Payment method '{$variantCode}' is not provided by Paymob Oman."];
            }

            $integrationKey = (string)($definition['paymob_integration_key'] ?? '');
            $integrationId = trim((string)($config['integration_ids'][$integrationKey] ?? ''));
            if ($integrationId === '' || !ctype_digit($integrationId)) {
                return [
                    'ok' => false,
                    'message' => "Paymob Integration ID for {$definition['label']} is not configured for the selected environment.",
                    'missing_method' => $variantCode,
                ];
            }

            $ids[] = (int)$integrationId;
            $canonical[] = (string)$definition['canonical_method'];
        }

        return [
            'ok' => true,
            'variants' => $variants,
            'canonical_methods' => array_values(array_unique($canonical)),
            'integration_ids' => array_values(array_unique($ids)),
        ];
    }

    private function normalizeBillingData(array $input): array
    {
        $phone = trim((string)($input['phone_number'] ?? $input['phone'] ?? ''));
        if ($phone === '') {
            return ['ok' => false, 'message' => 'Paymob requires a real customer phone number in billing_data.'];
        }

        $field = static fn (string $key, string $fallback = 'NA') => trim((string)($input[$key] ?? '')) ?: $fallback;

        return [
            'ok' => true,
            'billing_data' => [
                'first_name' => $field('first_name'),
                'last_name' => $field('last_name'),
                'email' => $field('email'),
                'phone_number' => $phone,
                'apartment' => $field('apartment'),
                'floor' => $field('floor'),
                'street' => $field('street'),
                'building' => $field('building'),
                'shipping_method' => $field('shipping_method'),
                'postal_code' => $field('postal_code'),
                'city' => $field('city'),
                'country' => $field('country', 'OM'),
                'state' => $field('state'),
            ],
        ];
    }

    private function normalizeItems(array $items, int $orderAmountMinor, int $orderId): array
    {
        if (!$items) {
            return [[
                'name' => 'PayMyDine Order #'.$orderId,
                'amount' => $orderAmountMinor,
                'description' => 'Restaurant order',
                'quantity' => 1,
            ]];
        }

        $normalized = [];
        foreach ($items as $index => $item) {
            if (!is_array($item)) continue;
            $amount = isset($item['amount_minor'])
                ? (int)$item['amount_minor']
                : $this->money->toMinor($item['amount'] ?? 0, 'OMR');
            $quantity = max(1, (int)($item['quantity'] ?? 1));
            if ($amount <= 0) continue;

            $normalized[] = [
                'name' => trim((string)($item['name'] ?? '')) ?: 'Order item '.($index + 1),
                'amount' => $amount,
                'description' => trim((string)($item['description'] ?? '')) ?: 'NA',
                'quantity' => $quantity,
            ];
        }

        return $normalized ?: [[
            'name' => 'PayMyDine Order #'.$orderId,
            'amount' => $orderAmountMinor,
            'description' => 'Restaurant order',
            'quantity' => 1,
        ]];
    }

    private function validCallbackUrl(string $url): bool
    {
        $url = trim($url);
        if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) return false;

        return in_array(strtolower((string)parse_url($url, PHP_URL_SCHEME)), ['http', 'https'], true);
    }
}
