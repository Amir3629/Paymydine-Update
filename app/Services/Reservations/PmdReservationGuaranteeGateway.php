<?php

namespace App\Services\Reservations;

use Admin\Models\Locations_model;
use Admin\Models\Payments_model;
use Admin\Models\Reservations_model;
use App\Services\Payments\VrPaymentApiClient;
use App\Services\Payments\WorldlineConnectRuntimeService;
use App\Services\TerminalPayments\SumupTenantConnectionService;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Provider adapters for reservation guarantees other than Stripe.
 *
 * Raw PAN/CVC never passes through PayMyDine:
 * - SumUp uses its Payment Widget.
 * - Worldline uses Hosted Tokenization.
 * - VR Payment uses its provider-hosted token update transaction.
 * - PayPal uses the Vault / Payment Method Tokens APIs.
 */
final class PmdReservationGuaranteeGateway
{
    public function begin(
        string $provider,
        string $method,
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        $this->assertMethod($provider, $method);

        return match ($provider) {
            'sumup' => $this->beginSumup(
                $method,
                $location,
                $booking,
                $policy
            ),
            'paypal' => $this->beginPaypal(
                $method,
                $location,
                $booking,
                $policy
            ),
            'vr_payment' => $this->beginVr(
                $method,
                $location,
                $booking,
                $policy
            ),
            'worldline' => $this->beginWorldline(
                $method,
                $location,
                $booking,
                $policy
            ),
            default => throw new RuntimeException(
                'Unsupported reservation guarantee provider.'
            ),
        };
    }

    public function status(
        string $provider,
        string $method,
        string $setupReference,
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        $payload = $this->unpackReference(
            $setupReference,
            $provider,
            $method,
            $location,
            $booking,
            $policy
        );

        return match ($provider) {
            'sumup' => $this->sumupStatus($payload),
            'paypal' => $this->paypalStatus($payload),
            'vr_payment' => $this->vrStatus($payload),
            'worldline' => $this->worldlineStatus($payload),
            default => throw new RuntimeException(
                'Unsupported reservation guarantee provider.'
            ),
        };
    }

    public function verify(
        string $provider,
        string $method,
        string $setupReference,
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        $payload = $this->unpackReference(
            $setupReference,
            $provider,
            $method,
            $location,
            $booking,
            $policy
        );

        return match ($provider) {
            'sumup' => $this->verifySumup($payload, $policy),
            'paypal' => $this->verifyPaypal($payload, $policy),
            'vr_payment' => $this->verifyVr($payload, $policy),
            'worldline' => $this->verifyWorldline($payload, $policy),
            default => throw new RuntimeException(
                'Unsupported reservation guarantee provider.'
            ),
        };
    }

    public function charge(
        object $guarantee,
        Reservations_model $reservation,
        int $amountCents
    ): array {
        $provider = strtolower(trim((string)($guarantee->provider ?? '')));
        $reference = 'R'.str_pad(
            (string)$reservation->getKey(),
            6,
            '0',
            STR_PAD_LEFT
        );

        return match ($provider) {
            'sumup' => $this->chargeSumup(
                $guarantee,
                $amountCents,
                $reference
            ),
            'paypal' => $this->chargePaypal(
                $guarantee,
                $amountCents,
                $reference
            ),
            'vr_payment' => $this->chargeVr(
                $guarantee,
                $amountCents,
                $reference
            ),
            'worldline' => $this->chargeWorldline(
                $guarantee,
                $amountCents,
                $reference
            ),
            default => throw new RuntimeException(
                'Unsupported reservation guarantee provider.'
            ),
        };
    }

    public function release(object $guarantee): void
    {
        $provider = strtolower(trim((string)($guarantee->provider ?? '')));

        try {
            match ($provider) {
                'sumup' => $this->releaseSumup($guarantee),
                'paypal' => $this->releasePaypal($guarantee),
                'vr_payment' => $this->releaseVr($guarantee),
                'worldline' => $this->releaseWorldline($guarantee),
                default => null,
            };
        } catch (Throwable $error) {
            Log::warning('PMD reservation guarantee provider release failed', [
                'provider' => $provider,
                'guarantee_id' => (int)($guarantee->guarantee_id ?? 0),
                'message' => $error->getMessage(),
            ]);
        }
    }

    private function beginSumup(
        string $method,
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        if ($method !== 'card') {
            throw new RuntimeException(
                'SumUp reservation guarantee currently supports saved cards only.'
            );
        }

        $config = app(SumupTenantConnectionService::class)->activeConfig();
        if (empty($config['ready'])) {
            throw new RuntimeException(
                'SumUp is not connected for this restaurant.'
            );
        }

        $base = rtrim((string)$config['url'], '/');
        $token = (string)$config['access_token'];
        $customerId = 'pmdg-'.substr(
            hash(
                'sha256',
                (string)$location->getKey().'|'
                    .strtolower(trim((string)($booking['email'] ?? ''))).'|'
                    .bin2hex(random_bytes(12))
            ),
            0,
            32
        );

        $customer = Http::withToken($token)
            ->acceptJson()
            ->asJson()
            ->timeout(25)
            ->post($base.'/v0.1/customers', [
                'customer_id' => $customerId,
                'personal_details' => [
                    'first_name' => trim((string)($booking['first_name'] ?? '')),
                    'last_name' => trim((string)($booking['last_name'] ?? '')),
                    'email' => strtolower(trim((string)($booking['email'] ?? ''))),
                ],
            ]);

        if (!$customer->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    (array)$customer->json(),
                    'SumUp could not create the guarantee customer.'
                )
            );
        }

        // SumUp requires a positive amount for SETUP_RECURRING_PAYMENT.
        // Their documented setup flow immediately reimburses this transaction.
        $setupAmount = 1.00;
        $currency = strtoupper((string)($policy['currency'] ?? 'EUR'));
        $checkoutReference = 'PMDG-'.substr(
            hash('sha256', $customerId.'|'.microtime(true)),
            0,
            24
        );

        $checkout = Http::withToken($token)
            ->acceptJson()
            ->asJson()
            ->timeout(25)
            ->post($base.'/v0.1/checkouts', [
                'checkout_reference' => $checkoutReference,
                'amount' => $setupAmount,
                'currency' => $currency,
                'merchant_code' => (string)$config['merchant_code'],
                'description' => 'PayMyDine reservation card guarantee',
                'customer_id' => $customerId,
                'purpose' => 'SETUP_RECURRING_PAYMENT',
            ]);

        $body = (array)$checkout->json();
        if (!$checkout->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    $body,
                    'SumUp could not create the card-guarantee setup.'
                )
            );
        }

        $checkoutId = trim((string)($body['id'] ?? ''));
        if ($checkoutId === '') {
            throw new RuntimeException(
                'SumUp did not return a guarantee checkout ID.'
            );
        }

        $reference = $this->packReference(
            'sumup',
            $method,
            $location,
            $booking,
            $policy,
            [
                'checkout_id' => $checkoutId,
                'customer_id' => $customerId,
            ]
        );

        return [
            'success' => true,
            'provider' => 'sumup',
            'method' => $method,
            'integration_mode' => 'sumup_widget',
            'setup_reference' => $reference,
            'checkout_id' => $checkoutId,
            'sdk_url' => 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js',
            'setup_notice' => 'SumUp may show a temporary €1 card verification which it reimburses immediately.',
        ];
    }

    private function sumupStatus(array $payload): array
    {
        $body = $this->sumupCheckout(
            (string)($payload['data']['checkout_id'] ?? '')
        );
        $instrument = (array)($body['payment_instrument'] ?? []);
        $savedToken = trim((string)($instrument['token'] ?? ''));

        return [
            'success' => true,
            'ready' => $savedToken !== '',
            'status' => strtolower((string)($body['status'] ?? 'pending')),
        ];
    }

    private function verifySumup(array $payload, array $policy): array
    {
        $checkoutId = (string)($payload['data']['checkout_id'] ?? '');
        $customerId = (string)($payload['data']['customer_id'] ?? '');
        $body = $this->sumupCheckout($checkoutId);
        $instrument = (array)($body['payment_instrument'] ?? []);
        $savedToken = trim((string)($instrument['token'] ?? ''));

        if ($savedToken === '' || $customerId === '') {
            throw new RuntimeException(
                'Please complete the SumUp card verification before confirming the reservation.'
            );
        }

        return [
            'required' => true,
            'policy' => $policy,
            'payment_method_code' => 'card',
            'customer_reference' => $customerId,
            'payment_method_reference' => $savedToken,
            'setup_intent_reference' => $checkoutId,
        ];
    }

    private function chargeSumup(
        object $guarantee,
        int $amountCents,
        string $reference
    ): array {
        $config = app(SumupTenantConnectionService::class)->activeConfig();
        if (empty($config['ready'])) {
            throw new RuntimeException('SumUp is not connected.');
        }

        $base = rtrim((string)$config['url'], '/');
        $token = (string)$config['access_token'];
        $customerId = trim((string)$guarantee->customer_reference);
        $instrument = trim((string)$guarantee->payment_method_reference);
        $currency = strtoupper((string)$guarantee->currency);

        $create = Http::withToken($token)
            ->acceptJson()
            ->asJson()
            ->timeout(25)
            ->post($base.'/v0.1/checkouts', [
                'checkout_reference' => 'PMD-NS-'.$reference.'-'.substr(
                    hash('sha256', $amountCents.'|'.$guarantee->guarantee_id),
                    0,
                    12
                ),
                'amount' => round($amountCents / 100, 2),
                'currency' => $currency,
                'merchant_code' => (string)$config['merchant_code'],
                'description' => 'No-show compensation '.$reference,
                'customer_id' => $customerId,
            ]);

        $created = (array)$create->json();
        if (!$create->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    $created,
                    'SumUp could not create the no-show checkout.'
                )
            );
        }

        $checkoutId = trim((string)($created['id'] ?? ''));
        if ($checkoutId === '') {
            throw new RuntimeException('SumUp checkout ID is missing.');
        }

        $process = Http::withToken($token)
            ->acceptJson()
            ->asJson()
            ->timeout(30)
            ->put($base.'/v0.1/checkouts/'.rawurlencode($checkoutId), [
                'payment_type' => 'card',
                'token' => $instrument,
                'customer_id' => $customerId,
            ]);

        $body = (array)$process->json();
        if (!$process->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    $body,
                    'SumUp declined the no-show charge.'
                )
            );
        }

        $status = strtoupper(trim((string)($body['status'] ?? '')));
        $paid = in_array($status, ['PAID', 'SUCCESSFUL', 'SUCCESS'], true);

        return [
            'success' => $paid,
            'status' => $status !== '' ? $status : 'UNKNOWN',
            'payment_id' => $this->sumupTransactionReference($body)
                ?: $checkoutId,
        ];
    }

    private function releaseSumup(object $guarantee): void
    {
        $config = app(SumupTenantConnectionService::class)->activeConfig();
        if (empty($config['ready'])) {
            return;
        }

        $customer = trim((string)$guarantee->customer_reference);
        $token = trim((string)$guarantee->payment_method_reference);
        if ($customer === '' || $token === '') {
            return;
        }

        Http::withToken((string)$config['access_token'])
            ->acceptJson()
            ->timeout(20)
            ->delete(
                rtrim((string)$config['url'], '/')
                    .'/v0.1/customers/'.rawurlencode($customer)
                    .'/payment-instruments/'.rawurlencode($token)
            );
    }

    private function beginPaypal(
        string $method,
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        if ($method !== 'paypal') {
            throw new RuntimeException(
                'PayPal guarantee requires the PayPal payment method.'
            );
        }

        $cfg = $this->paypalConfig();
        $access = $this->paypalAccessToken($cfg);
        $locale = $this->paypalLocale((string)($policy['locale'] ?? 'en'));
        $return = url('/book/guarantee/return').'?provider=paypal&result=approved';
        $cancel = url('/book/guarantee/return').'?provider=paypal&result=cancelled';
        $merchantCustomer = substr(
            'PMDG'.hash(
                'sha256',
                (string)$location->getKey().'|'
                    .strtolower((string)($booking['email'] ?? ''))
            ),
            0,
            64
        );

        $response = Http::withToken($access)
            ->acceptJson()
            ->asJson()
            ->withHeaders([
                'PayPal-Request-Id' => 'pmd-gsetup-'.substr(
                    hash('sha256', $merchantCustomer.'|'.microtime(true)),
                    0,
                    32
                ),
            ])
            ->timeout(30)
            ->post($cfg['base_url'].'/v3/vault/setup-tokens', [
                'customer' => [
                    'merchant_customer_id' => $merchantCustomer,
                ],
                'payment_source' => [
                    'paypal' => [
                        'description' => 'PayMyDine reservation guarantee',
                        'usage_pattern' => 'UNSCHEDULED_POSTPAID',
                        'usage_type' => 'MERCHANT',
                        'customer_type' => 'CONSUMER',
                        'permit_multiple_payment_tokens' => true,
                        'experience_context' => [
                            'brand_name' => 'PayMyDine',
                            'locale' => $locale,
                            'return_url' => $return,
                            'cancel_url' => $cancel,
                            'shipping_preference' => 'NO_SHIPPING',
                            'user_action' => 'SETUP_NOW',
                        ],
                    ],
                ],
            ]);

        $body = (array)$response->json();
        if (!$response->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    $body,
                    'PayPal Vault could not start the guarantee approval.'
                )
            );
        }

        $setupId = trim((string)($body['id'] ?? ''));
        $approval = $this->linkByRel(
            (array)($body['links'] ?? []),
            ['approve', 'payer-action']
        );
        if ($setupId === '' || $approval === '') {
            throw new RuntimeException(
                'PayPal did not return a complete Vault approval session.'
            );
        }

        $reference = $this->packReference(
            'paypal',
            $method,
            $location,
            $booking,
            $policy,
            ['setup_token' => $setupId]
        );

        return [
            'success' => true,
            'provider' => 'paypal',
            'method' => 'paypal',
            'integration_mode' => 'paypal_vault_redirect',
            'setup_reference' => $reference,
            'approval_url' => $approval,
        ];
    }

    private function paypalStatus(array $payload): array
    {
        $setupId = (string)($payload['data']['setup_token'] ?? '');
        $body = $this->paypalSetupToken($setupId);
        $status = strtoupper(trim((string)($body['status'] ?? '')));
        $ready = in_array(
            $status,
            ['APPROVED', 'VAULTED', 'COMPLETED'],
            true
        );

        return [
            'success' => true,
            'ready' => $ready,
            'status' => $status !== '' ? $status : 'PENDING',
        ];
    }

    private function verifyPaypal(array $payload, array $policy): array
    {
        $setupId = (string)($payload['data']['setup_token'] ?? '');
        $setup = $this->paypalSetupToken($setupId);
        $status = strtoupper(trim((string)($setup['status'] ?? '')));

        if (!in_array($status, ['APPROVED', 'VAULTED', 'COMPLETED'], true)) {
            throw new RuntimeException(
                'Please approve the PayPal guarantee before confirming the reservation.'
            );
        }

        $cfg = $this->paypalConfig();
        $access = $this->paypalAccessToken($cfg);
        $response = Http::withToken($access)
            ->acceptJson()
            ->asJson()
            ->withHeaders([
                'PayPal-Request-Id' => 'pmd-gvault-'.substr(
                    hash('sha256', $setupId),
                    0,
                    32
                ),
            ])
            ->timeout(30)
            ->post($cfg['base_url'].'/v3/vault/payment-tokens', [
                'payment_source' => [
                    'token' => [
                        'id' => $setupId,
                        'type' => 'SETUP_TOKEN',
                    ],
                ],
            ]);

        $body = (array)$response->json();
        if (!$response->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    $body,
                    'PayPal could not store the approved guarantee.'
                )
            );
        }

        $vaultId = trim((string)($body['id'] ?? ''));
        $customer = (array)($body['customer'] ?? []);
        if ($vaultId === '') {
            throw new RuntimeException(
                'PayPal did not return a reusable Vault payment token.'
            );
        }

        return [
            'required' => true,
            'policy' => $policy,
            'payment_method_code' => 'paypal',
            'customer_reference' => trim((string)($customer['id'] ?? '')),
            'payment_method_reference' => $vaultId,
            'setup_intent_reference' => $setupId,
        ];
    }

    private function chargePaypal(
        object $guarantee,
        int $amountCents,
        string $reference
    ): array {
        $cfg = $this->paypalConfig();
        $access = $this->paypalAccessToken($cfg);
        $vaultId = trim((string)$guarantee->payment_method_reference);
        if ($vaultId === '') {
            throw new RuntimeException('PayPal Vault token is missing.');
        }

        $response = Http::withToken($access)
            ->acceptJson()
            ->asJson()
            ->withHeaders([
                'PayPal-Request-Id' => 'pmd-noshow-'.substr(
                    hash(
                        'sha256',
                        $reference.'|'.$amountCents.'|'
                            .$guarantee->guarantee_id
                    ),
                    0,
                    40
                ),
            ])
            ->timeout(35)
            ->post($cfg['base_url'].'/v2/checkout/orders', [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => $reference,
                    'description' => 'No-show compensation '.$reference,
                    'custom_id' => $reference,
                    'amount' => [
                        'currency_code' => strtoupper(
                            (string)$guarantee->currency
                        ),
                        'value' => number_format(
                            $amountCents / 100,
                            2,
                            '.',
                            ''
                        ),
                    ],
                ]],
                'payment_source' => [
                    'paypal' => [
                        'vault_id' => $vaultId,
                        'stored_credential' => [
                            'payment_initiator' => 'MERCHANT',
                            'usage_pattern' => 'UNSCHEDULED_POSTPAID',
                        ],
                    ],
                ],
            ]);

        $body = (array)$response->json();
        if (!$response->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    $body,
                    'PayPal declined the no-show charge.'
                )
            );
        }

        $status = strtoupper(trim((string)($body['status'] ?? '')));
        return [
            'success' => $status === 'COMPLETED',
            'status' => $status !== '' ? $status : 'UNKNOWN',
            'payment_id' => trim((string)($body['id'] ?? '')),
        ];
    }

    private function releasePaypal(object $guarantee): void
    {
        $vaultId = trim((string)$guarantee->payment_method_reference);
        if ($vaultId === '') {
            return;
        }
        $cfg = $this->paypalConfig(false);
        $access = $this->paypalAccessToken($cfg);

        Http::withToken($access)
            ->acceptJson()
            ->timeout(20)
            ->delete(
                $cfg['base_url'].'/v3/vault/payment-tokens/'
                    .rawurlencode($vaultId)
            );
    }

    private function beginVr(
        string $method,
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        if ($method !== 'card') {
            throw new RuntimeException(
                'VR Payment reservation guarantee currently supports saved cards only.'
            );
        }

        $client = $this->vrClient();
        $externalId = 'pmdg-'.substr(
            hash(
                'sha256',
                (string)$location->getKey().'|'
                    .strtolower((string)($booking['email'] ?? '')).'|'
                    .microtime(true)
            ),
            0,
            32
        );

        $created = $client->createToken([
            'externalId' => $externalId,
            'customerEmailAddress' => strtolower(
                trim((string)($booking['email'] ?? ''))
            ),
            'customerId' => substr(
                hash(
                    'sha256',
                    (string)$location->getKey().'|'
                        .strtolower((string)($booking['email'] ?? ''))
                ),
                0,
                48
            ),
            'enabledForOneClickPayment' => true,
            'language' => $this->vrLocale(
                (string)($policy['locale'] ?? 'en')
            ),
            'timeZone' => 'Europe/Berlin',
            'tokenReference' => substr($externalId, 0, 100),
        ]);

        if (!($created['ok'] ?? false) || !is_array($created['data'] ?? null)) {
            throw new RuntimeException(
                (string)($created['message']
                    ?? 'VR Payment could not create a guarantee token.')
            );
        }

        $tokenId = (int)($created['data']['id'] ?? 0);
        if ($tokenId < 1) {
            throw new RuntimeException(
                'VR Payment did not return a guarantee token ID.'
            );
        }

        $transactionResponse = $client->createTokenUpdateTransaction($tokenId);
        if (
            !($transactionResponse['ok'] ?? false)
            || !is_array($transactionResponse['data'] ?? null)
        ) {
            $client->deleteToken($tokenId);
            throw new RuntimeException(
                (string)($transactionResponse['message']
                    ?? 'VR Payment could not prepare card verification.')
            );
        }

        $transaction = (array)$transactionResponse['data'];
        $transactionId = (int)($transaction['id'] ?? 0);
        if ($transactionId < 1) {
            $client->deleteToken($tokenId);
            throw new RuntimeException(
                'VR Payment did not return a token-update transaction.'
            );
        }

        $version = (int)($transaction['version'] ?? 0);
        if ($version >= 0) {
            $client->updateTransaction($transactionId, [
                'id' => $transactionId,
                'version' => $version,
                'successUrl' => url('/book/guarantee/return')
                    .'?provider=vr_payment&result=approved',
                'failedUrl' => url('/book/guarantee/return')
                    .'?provider=vr_payment&result=cancelled',
                'language' => $this->vrLocale(
                    (string)($policy['locale'] ?? 'en')
                ),
            ]);
        }

        $page = $client->paymentPageUrl($transactionId);
        $approval = $this->extractString($page['data'] ?? null);
        if (!($page['ok'] ?? false) || $approval === '') {
            $client->deleteToken($tokenId);
            throw new RuntimeException(
                (string)($page['message']
                    ?? 'VR Payment did not return its secure card page.')
            );
        }

        $reference = $this->packReference(
            'vr_payment',
            $method,
            $location,
            $booking,
            $policy,
            [
                'token_id' => $tokenId,
                'transaction_id' => $transactionId,
            ]
        );

        return [
            'success' => true,
            'provider' => 'vr_payment',
            'method' => 'card',
            'integration_mode' => 'provider_redirect',
            'setup_reference' => $reference,
            'approval_url' => $approval,
        ];
    }

    private function vrStatus(array $payload): array
    {
        $tokenId = (int)($payload['data']['token_id'] ?? 0);
        $token = $this->vrClient()->token($tokenId);
        $data = is_array($token['data'] ?? null)
            ? (array)$token['data']
            : [];
        $state = strtoupper(trim((string)($data['state'] ?? '')));

        return [
            'success' => true,
            'ready' => ($token['ok'] ?? false) && $state === 'ACTIVE',
            'status' => $state !== '' ? $state : 'PENDING',
        ];
    }

    private function verifyVr(array $payload, array $policy): array
    {
        $tokenId = (int)($payload['data']['token_id'] ?? 0);
        $transactionId = (int)($payload['data']['transaction_id'] ?? 0);
        $status = $this->vrStatus($payload);
        if (empty($status['ready'])) {
            throw new RuntimeException(
                'Please complete the VR Payment card verification before confirming the reservation.'
            );
        }

        return [
            'required' => true,
            'policy' => $policy,
            'payment_method_code' => 'card',
            'customer_reference' => '',
            'payment_method_reference' => (string)$tokenId,
            'setup_intent_reference' => (string)$transactionId,
        ];
    }

    private function chargeVr(
        object $guarantee,
        int $amountCents,
        string $reference
    ): array {
        $tokenId = (int)$guarantee->payment_method_reference;
        if ($tokenId < 1) {
            throw new RuntimeException('VR Payment token is missing.');
        }

        $client = $this->vrClient();
        $created = $client->createTransaction([
            'currency' => strtoupper((string)$guarantee->currency),
            'language' => 'de-DE',
            'customersPresence' => 'NOT_PRESENT',
            'lineItems' => [[
                'amountIncludingTax' => number_format(
                    $amountCents / 100,
                    2,
                    '.',
                    ''
                ),
                'name' => 'No-show compensation '.$reference,
                'quantity' => '1',
                'shippingRequired' => false,
                'sku' => 'pmd-noshow',
                'type' => 'PRODUCT',
                'uniqueId' => $reference,
            ]],
            'merchantReference' => $reference,
            'autoConfirmationEnabled' => true,
            'token' => $tokenId,
            'metaData' => [
                'pmd_surface' => 'reservation_no_show',
                'pmd_reference' => $reference,
            ],
        ]);

        if (!($created['ok'] ?? false) || !is_array($created['data'] ?? null)) {
            throw new RuntimeException(
                (string)($created['message']
                    ?? 'VR Payment could not create the no-show transaction.')
            );
        }

        $transactionId = (int)($created['data']['id'] ?? 0);
        if ($transactionId < 1) {
            throw new RuntimeException(
                'VR Payment transaction ID is missing.'
            );
        }

        $processed = $client->processWithoutInteraction($transactionId);
        if (!($processed['ok'] ?? false)) {
            throw new RuntimeException(
                (string)($processed['message']
                    ?? 'VR Payment declined the no-show charge.')
            );
        }

        $transaction = is_array($processed['data'] ?? null)
            ? (array)$processed['data']
            : (array)$created['data'];
        $status = $client->normalizeTransactionStatus($transaction);

        return [
            'success' => $status === 'paid',
            'status' => strtoupper(
                (string)($transaction['state'] ?? $status)
            ),
            'payment_id' => (string)$transactionId,
        ];
    }

    private function releaseVr(object $guarantee): void
    {
        $tokenId = (int)$guarantee->payment_method_reference;
        if ($tokenId > 0) {
            $this->vrClient()->deleteToken($tokenId);
        }
    }

    private function beginWorldline(
        string $method,
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        if ($method !== 'card') {
            throw new RuntimeException(
                'Worldline reservation guarantee currently supports saved cards only.'
            );
        }

        $merchantCustomerId = substr(
            'PMDG'.strtoupper(substr(hash(
                'sha256',
                (string)$location->getKey().'|'
                    .strtolower(trim((string)($booking['email'] ?? '')))
            ), 0, 11)),
            0,
            15
        );

        $service = app(WorldlineConnectRuntimeService::class);
        $setup = $service->createGuaranteeCardOnFileCheckout(
            $this->worldlineLocale(
                (string)($policy['locale'] ?? 'en')
            ),
            strtoupper((string)($policy['currency'] ?? 'EUR')),
            $merchantCustomerId,
            url('/book/guarantee/return')
                .'?provider=worldline&result=approved'
        );

        $reference = $this->packReference(
            'worldline',
            $method,
            $location,
            $booking,
            $policy,
            [
                'hosted_checkout_id' => (string)$setup[
                    'hosted_checkout_id'
                ],
                'merchant_customer_id' => $merchantCustomerId,
            ]
        );

        return array_merge($setup, [
            'method' => 'card',
            'integration_mode' => 'worldline_ucof_redirect',
            'setup_reference' => $reference,
            'approval_url' => (string)$setup['redirect_url'],
        ]);
    }

    private function worldlineStatus(array $payload): array
    {
        return app(WorldlineConnectRuntimeService::class)
            ->guaranteeCardOnFileStatus(
                (string)($payload['data']['hosted_checkout_id'] ?? '')
            );
    }

    private function verifyWorldline(
        array $payload,
        array $policy
    ): array {
        $hostedId = (string)(
            $payload['data']['hosted_checkout_id']
            ?? ''
        );
        $merchantCustomerId = (string)(
            $payload['data']['merchant_customer_id']
            ?? ''
        );

        $status = app(WorldlineConnectRuntimeService::class)
            ->guaranteeCardOnFileStatus($hostedId);

        if (!empty($status['failed'])) {
            throw new RuntimeException(
                'Worldline did not approve the card verification.'
            );
        }

        if (
            empty($status['ready'])
            || empty($status['token_id'])
            || empty($status['scheme_transaction_id'])
            || $merchantCustomerId === ''
        ) {
            throw new RuntimeException(
                'Please complete the Worldline card verification before confirming the reservation.'
            );
        }

        $customerReference = json_encode([
            'merchant_customer_id' => $merchantCustomerId,
            'scheme_transaction_id' => (string)$status[
                'scheme_transaction_id'
            ],
        ], JSON_UNESCAPED_SLASHES);

        if (
            !is_string($customerReference)
            || strlen($customerReference) > 191
        ) {
            throw new RuntimeException(
                'Worldline card-on-file reference is invalid.'
            );
        }

        return [
            'required' => true,
            'policy' => $policy,
            'payment_method_code' => 'card',
            'customer_reference' => $customerReference,
            'payment_method_reference' => (string)$status['token_id'],
            'setup_intent_reference' => $hostedId,
        ];
    }

    private function chargeWorldline(
        object $guarantee,
        int $amountCents,
        string $reference
    ): array {
        $customer = json_decode(
            (string)$guarantee->customer_reference,
            true
        );
        if (!is_array($customer)) {
            throw new RuntimeException(
                'Worldline stored-credential reference is missing.'
            );
        }

        $merchantCustomerId = trim((string)(
            $customer['merchant_customer_id']
            ?? ''
        ));
        $schemeTransactionId = trim((string)(
            $customer['scheme_transaction_id']
            ?? ''
        ));

        if (
            $merchantCustomerId === ''
            || $schemeTransactionId === ''
        ) {
            throw new RuntimeException(
                'Worldline initial card-on-file transaction reference is incomplete.'
            );
        }

        return app(WorldlineConnectRuntimeService::class)
            ->chargeGuaranteeToken(
                (string)$guarantee->payment_method_reference,
                $merchantCustomerId,
                $schemeTransactionId,
                $amountCents,
                (string)$guarantee->currency,
                $reference
            );
    }

    private function releaseWorldline(object $guarantee): void
    {
        app(WorldlineConnectRuntimeService::class)
            ->deleteGuaranteeToken(
                (string)$guarantee->payment_method_reference
            );
    }

    private function packReference(
        string $provider,
        string $method,
        Locations_model $location,
        array $booking,
        array $policy,
        array $data
    ): string {
        return Crypt::encryptString(json_encode([
            'v' => 1,
            'provider' => $provider,
            'method' => $method,
            'contract' => $this->contractHash(
                $provider,
                $method,
                $location,
                $booking,
                $policy
            ),
            'data' => $data,
        ], JSON_UNESCAPED_SLASHES));
    }

    private function unpackReference(
        string $reference,
        string $provider,
        string $method,
        Locations_model $location,
        array $booking,
        array $policy
    ): array {
        try {
            $decoded = json_decode(
                Crypt::decryptString($reference),
                true
            );
        } catch (Throwable $error) {
            throw new RuntimeException(
                'The payment-method guarantee reference is invalid. Please verify again.'
            );
        }

        if (!is_array($decoded)) {
            throw new RuntimeException(
                'The payment-method guarantee reference is invalid.'
            );
        }

        $expected = $this->contractHash(
            $provider,
            $method,
            $location,
            $booking,
            $policy
        );

        if (
            !hash_equals(
                $provider,
                strtolower((string)($decoded['provider'] ?? ''))
            )
            || !hash_equals(
                $method,
                strtolower((string)($decoded['method'] ?? ''))
            )
            || !hash_equals(
                $expected,
                (string)($decoded['contract'] ?? '')
            )
        ) {
            throw new RuntimeException(
                'The payment-method guarantee no longer matches this reservation. Please verify again.'
            );
        }

        return $decoded;
    }

    private function contractHash(
        string $provider,
        string $method,
        Locations_model $location,
        array $booking,
        array $policy
    ): string {
        $parts = [
            (string)$location->getKey(),
            (string)($booking['reserve_date'] ?? ''),
            substr((string)($booking['reserve_time'] ?? ''), 0, 5),
            (string)(int)($booking['guest_num'] ?? 0),
            (string)(int)($policy['amount_cents'] ?? 0),
            strtoupper((string)($policy['currency'] ?? 'EUR')),
            (string)($policy['terms_version'] ?? ''),
            $provider,
            $method,
        ];

        return hash_hmac(
            'sha256',
            implode('|', $parts),
            (string)config('app.key')
        );
    }

    private function assertMethod(string $provider, string $method): void
    {
        $allowed = app(PmdReservationGuaranteeProviderRegistry::class)
            ->enabledMethodsForProvider($provider);

        if (!in_array($method, $allowed, true)) {
            throw new RuntimeException(
                'This guarantee payment method is not enabled for the selected provider.'
            );
        }
    }

    private function sumupCheckout(string $checkoutId): array
    {
        $checkoutId = trim($checkoutId);
        $config = app(SumupTenantConnectionService::class)->activeConfig();
        if (empty($config['ready']) || $checkoutId === '') {
            throw new RuntimeException('SumUp guarantee setup is unavailable.');
        }

        $response = Http::withToken((string)$config['access_token'])
            ->acceptJson()
            ->timeout(20)
            ->get(
                rtrim((string)$config['url'], '/')
                    .'/v0.1/checkouts/'.rawurlencode($checkoutId)
            );

        $body = (array)$response->json();
        if (!$response->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    $body,
                    'SumUp could not verify the saved card.'
                )
            );
        }

        return $body;
    }

    private function sumupTransactionReference(array $body): string
    {
        $transactions = (array)($body['transactions'] ?? []);
        $last = $transactions ? end($transactions) : null;
        if (!is_array($last)) {
            return '';
        }

        return trim((string)(
            $last['transaction_code']
            ?? $last['id']
            ?? ''
        ));
    }

    private function paypalSetupToken(string $setupId): array
    {
        $setupId = trim($setupId);
        if ($setupId === '') {
            throw new RuntimeException('PayPal setup token is missing.');
        }

        $cfg = $this->paypalConfig();
        $access = $this->paypalAccessToken($cfg);
        $response = Http::withToken($access)
            ->acceptJson()
            ->timeout(25)
            ->get(
                $cfg['base_url'].'/v3/vault/setup-tokens/'
                    .rawurlencode($setupId)
            );
        $body = (array)$response->json();

        if (!$response->successful()) {
            throw new RuntimeException(
                $this->httpMessage(
                    $body,
                    'PayPal could not verify the Vault approval.'
                )
            );
        }

        return $body;
    }

    private function paypalConfig(bool $requireEnabled = true): array
    {
        $query = Payments_model::query()->where('code', 'paypal');
        if ($requireEnabled) {
            $query->where('status', 1);
        }
        $payment = $query->first();
        if (!$payment) {
            throw new RuntimeException(
                'PayPal is not configured or enabled.'
            );
        }

        $data = method_exists($payment, 'getConfigData')
            ? (array)$payment->getConfigData()
            : (array)$payment->data;
        $live = strtolower(
            trim((string)($data['transaction_mode'] ?? 'test'))
        ) === 'live';
        $clientId = trim((string)(
            $live
                ? ($data['live_client_id'] ?? '')
                : ($data['test_client_id'] ?? '')
        ));
        $secret = trim((string)(
            $live
                ? ($data['live_client_secret'] ?? '')
                : ($data['test_client_secret'] ?? '')
        ));

        if ($clientId === '' || $secret === '') {
            throw new RuntimeException(
                'PayPal Vault credentials are incomplete.'
            );
        }

        return [
            'live' => $live,
            'client_id' => $clientId,
            'secret' => $secret,
            'base_url' => $live
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com',
        ];
    }

    private function paypalAccessToken(array $cfg): string
    {
        $response = Http::withBasicAuth(
                (string)$cfg['client_id'],
                (string)$cfg['secret']
            )
            ->asForm()
            ->acceptJson()
            ->timeout(25)
            ->post($cfg['base_url'].'/v1/oauth2/token', [
                'grant_type' => 'client_credentials',
            ]);

        $body = (array)$response->json();
        $token = trim((string)($body['access_token'] ?? ''));
        if (!$response->successful() || $token === '') {
            throw new RuntimeException(
                $this->httpMessage(
                    $body,
                    'PayPal authentication failed.'
                )
            );
        }

        return $token;
    }

    private function vrClient(): VrPaymentApiClient
    {
        $payment = Payments_model::query()
            ->where('code', 'vr_payment')
            ->where('status', 1)
            ->first();
        if (!$payment) {
            throw new RuntimeException(
                'VR Payment is not configured or enabled.'
            );
        }

        $config = method_exists($payment, 'getConfigData')
            ? (array)$payment->getConfigData()
            : (array)$payment->data;

        $client = new VrPaymentApiClient($config);
        $validation = $client->validateConfiguration();
        if (!($validation['ok'] ?? false)) {
            throw new RuntimeException(
                (string)($validation['message']
                    ?? 'VR Payment configuration is invalid.')
            );
        }

        return $client;
    }

    private function linkByRel(array $links, array $rels): string
    {
        foreach ($links as $link) {
            if (!is_array($link)) {
                continue;
            }
            $rel = strtolower(trim((string)($link['rel'] ?? '')));
            if (
                in_array($rel, $rels, true)
                && trim((string)($link['href'] ?? '')) !== ''
            ) {
                return trim((string)$link['href']);
            }
        }

        return '';
    }

    private function extractString($value): string
    {
        if (is_string($value)) {
            return trim($value, " \t\n\r\0\x0B\"");
        }
        if (is_array($value)) {
            foreach (
                ['url', 'paymentPageUrl', 'redirect_url', 'value']
                as $key
            ) {
                if (isset($value[$key]) && is_scalar($value[$key])) {
                    return trim((string)$value[$key]);
                }
            }
        }

        return '';
    }

    private function httpMessage(array $body, string $fallback): string
    {
        foreach (['message', 'error_description', 'error', 'detail'] as $key) {
            if (!empty($body[$key]) && is_scalar($body[$key])) {
                return substr((string)$body[$key], 0, 500);
            }
        }

        $details = (array)($body['details'] ?? []);
        if ($details && is_array($details[0] ?? null)) {
            $detail = (array)$details[0];
            foreach (['description', 'issue'] as $key) {
                if (!empty($detail[$key])) {
                    return substr((string)$detail[$key], 0, 500);
                }
            }
        }

        return $fallback;
    }

    private function paypalLocale(string $locale): string
    {
        return match (strtolower(substr($locale, 0, 2))) {
            'de' => 'de-DE',
            'tr' => 'tr-TR',
            'ar' => 'ar-SA',
            default => 'en-DE',
        };
    }

    private function vrLocale(string $locale): string
    {
        return match (strtolower(substr($locale, 0, 2))) {
            'de' => 'de-DE',
            'tr' => 'tr-TR',
            'ar' => 'ar-SA',
            default => 'en-US',
        };
    }

    private function worldlineLocale(string $locale): string
    {
        return match (strtolower(substr($locale, 0, 2))) {
            'de' => 'de_DE',
            'tr' => 'tr_TR',
            'ar' => 'ar_SA',
            default => 'en_GB',
        };
    }
}
