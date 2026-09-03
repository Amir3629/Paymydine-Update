<?php

namespace App\Services\Payments;

use Admin\Models\Payments_model;
use Illuminate\Support\Facades\Http;

/**
 * Canonical Square online runtime.
 *
 * Browser-side Square Web Payments SDK may receive only public Application ID
 * and Location ID. Access tokens stay server-side. PMD never receives PAN/CVV;
 * it receives a one-time Square source token and creates the Payment itself.
 */
final class SquareRuntimeService
{
    public const API_VERSION = '2026-08-19';
    public const SUPPORTED_SELLER_COUNTRIES = ['AU', 'CA', 'FR', 'IE', 'JP', 'ES', 'GB', 'US'];

    public function providerConfig(bool $requireEnabled = true): array
    {
        $query = Payments_model::query()->where('code', 'square');
        if ($requireEnabled) $query->where('status', 1);
        $provider = $query->first();
        if (!$provider) {
            throw new \RuntimeException($requireEnabled
                ? 'Square provider is not enabled for this restaurant.'
                : 'Square provider record was not found.');
        }

        $data = method_exists($provider, 'getConfigData')
            ? (array)$provider->getConfigData()
            : (array)$provider->data;
        $mode = strtolower(trim((string)($data['transaction_mode'] ?? 'test')));
        if (!in_array($mode, ['test', 'live'], true)) $mode = 'test';

        $prefix = $mode === 'live' ? 'live_' : 'test_';
        return [
            'mode' => $mode,
            'application_id' => trim((string)($data[$prefix.'application_id'] ?? '')),
            'access_token' => trim((string)($data[$prefix.'access_token'] ?? '')),
            'location_id' => trim((string)($data[$prefix.'location_id'] ?? '')),
            'webhook_signature_key' => trim((string)($data[$prefix.'webhook_signature_key'] ?? '')),
            'webhook_notification_url' => trim((string)($data[$prefix.'webhook_notification_url'] ?? '')),
            'configured_currency' => strtoupper(trim((string)($data['currency'] ?? ''))),
            'raw' => $data,
        ];
    }

    public function baseUrl(array $config): string
    {
        return ($config['mode'] ?? 'test') === 'live'
            ? 'https://connect.squareup.com'
            : 'https://connect.squareupsandbox.com';
    }

    public function scriptUrl(array $config): string
    {
        return ($config['mode'] ?? 'test') === 'live'
            ? 'https://web.squarecdn.com/v1/square.js'
            : 'https://sandbox.web.squarecdn.com/v1/square.js';
    }

    public function location(array $config): array
    {
        foreach (['access_token', 'location_id'] as $field) {
            if (trim((string)($config[$field] ?? '')) === '') {
                throw new \RuntimeException('Missing Square '.str_replace('_', ' ', $field).'.');
            }
        }

        $response = Http::withToken((string)$config['access_token'])
            ->withHeaders(['Square-Version' => self::API_VERSION])
            ->acceptJson()
            ->timeout(20)
            ->get($this->baseUrl($config).'/v2/locations/'.rawurlencode((string)$config['location_id']));

        $json = (array)$response->json();
        if (!$response->successful()) {
            throw new \RuntimeException((string)($json['errors'][0]['detail'] ?? 'Square Location API request failed.'));
        }

        $location = (array)($json['location'] ?? []);
        if (trim((string)($location['id'] ?? '')) === '') {
            throw new \RuntimeException('Square did not return the configured location.');
        }

        return $location;
    }

    public function publicConfiguration(?string $pmdCountry = null, ?string $pmdCurrency = null): array
    {
        $config = $this->providerConfig(true);
        foreach (['application_id', 'access_token', 'location_id'] as $field) {
            if (trim((string)($config[$field] ?? '')) === '') {
                throw new \RuntimeException('Square is missing '.str_replace('_', ' ', $field).' for the selected environment.');
            }
        }

        $location = $this->location($config);
        $country = strtoupper(trim((string)($location['country'] ?? '')));
        $currency = strtoupper(trim((string)($location['currency'] ?? $config['configured_currency'] ?? '')));
        $status = strtoupper(trim((string)($location['status'] ?? 'ACTIVE')));
        $pmdCountry = strtoupper(trim((string)$pmdCountry));
        $pmdCurrency = strtoupper(trim((string)$pmdCurrency));

        if ($status !== '' && $status !== 'ACTIVE') {
            throw new \RuntimeException('The configured Square location is not active.');
        }
        if (!in_array($country, self::SUPPORTED_SELLER_COUNTRIES, true)) {
            throw new \RuntimeException('The configured Square seller location is not in a Square payment-processing country.');
        }
        if ($pmdCurrency !== '' && $currency !== '' && !hash_equals($pmdCurrency, $currency)) {
            throw new \RuntimeException("Square location currency {$currency} does not match PayMyDine order currency {$pmdCurrency}.");
        }
        if (($config['mode'] ?? 'test') === 'live') {
            if ($pmdCountry === '' || !in_array($pmdCountry, self::SUPPORTED_SELLER_COUNTRIES, true)) {
                throw new \RuntimeException('Square live payment processing is not available for this PayMyDine restaurant country.');
            }
            if ($country !== '' && !hash_equals($pmdCountry, $country)) {
                throw new \RuntimeException("Square live seller country {$country} does not match the restaurant country {$pmdCountry}.");
            }
        }

        return [
            'success' => true,
            'provider' => 'square',
            'mode' => $config['mode'],
            'sandbox' => $config['mode'] !== 'live',
            'application_id' => $config['application_id'],
            'location_id' => $config['location_id'],
            'script_url' => $this->scriptUrl($config),
            'country_code' => $country,
            'currency' => $currency,
            'location_name' => (string)($location['name'] ?? ''),
            'methods' => [
                'card' => true,
                'apple_pay' => true,
                'google_pay' => true,
            ],
        ];
    }

    public function createPayment(array $input): array
    {
        $config = $this->providerConfig(true);
        $sourceId = trim((string)($input['source_id'] ?? ''));
        $amountMinor = (int)($input['amount_minor'] ?? 0);
        $currency = strtoupper(trim((string)($input['currency'] ?? '')));
        $referenceId = substr(trim((string)($input['reference_id'] ?? '')), 0, 40);
        $idempotencyKey = substr(trim((string)($input['idempotency_key'] ?? '')), 0, 45);
        if ($sourceId === '' || $amountMinor <= 0 || $currency === '' || $referenceId === '' || $idempotencyKey === '') {
            throw new \InvalidArgumentException('Square payment request is incomplete.');
        }

        $payload = [
            'source_id' => $sourceId,
            'idempotency_key' => $idempotencyKey,
            'amount_money' => ['amount' => $amountMinor, 'currency' => $currency],
            'location_id' => (string)$config['location_id'],
            'reference_id' => $referenceId,
            'note' => substr((string)($input['note'] ?? 'PayMyDine payment'), 0, 500),
            'autocomplete' => true,
        ];
        if (!empty($input['buyer_email_address'])) {
            $payload['buyer_email_address'] = substr(trim((string)$input['buyer_email_address']), 0, 255);
        }

        $response = Http::withToken((string)$config['access_token'])
            ->withHeaders(['Square-Version' => self::API_VERSION])
            ->acceptJson()->asJson()->timeout(30)
            ->post($this->baseUrl($config).'/v2/payments', $payload);
        $json = (array)$response->json();
        if (!$response->successful()) {
            throw new \RuntimeException((string)($json['errors'][0]['detail'] ?? 'Square rejected the payment.'));
        }

        $payment = (array)($json['payment'] ?? []);
        $paymentId = trim((string)($payment['id'] ?? ''));
        if ($paymentId === '') {
            throw new \RuntimeException('Square accepted the request without returning a payment ID.');
        }

        return $this->verifyPayment(
            $paymentId,
            $amountMinor,
            $currency,
            $referenceId,
            (string)$config['location_id']
        );
    }

    public function getPayment(string $paymentId): array
    {
        $config = $this->providerConfig(true);
        $paymentId = trim($paymentId);
        if ($paymentId === '') throw new \InvalidArgumentException('Square payment ID is required.');

        $response = Http::withToken((string)$config['access_token'])
            ->withHeaders(['Square-Version' => self::API_VERSION])
            ->acceptJson()->timeout(20)
            ->get($this->baseUrl($config).'/v2/payments/'.rawurlencode($paymentId));
        $json = (array)$response->json();
        if (!$response->successful()) {
            throw new \RuntimeException((string)($json['errors'][0]['detail'] ?? 'Unable to retrieve Square payment.'));
        }
        $payment = (array)($json['payment'] ?? []);
        if (trim((string)($payment['id'] ?? '')) === '') {
            throw new \RuntimeException('Square payment response is missing the payment object.');
        }
        return $payment;
    }

    public function verifyPayment(
        string $paymentId,
        int $expectedAmountMinor,
        string $expectedCurrency,
        string $expectedReferenceId,
        ?string $expectedLocationId = null
    ): array {
        $payment = $this->getPayment($paymentId);
        $status = strtoupper(trim((string)($payment['status'] ?? '')));
        $amountMinor = (int)($payment['amount_money']['amount'] ?? -1);
        $currency = strtoupper(trim((string)($payment['amount_money']['currency'] ?? '')));
        $referenceId = trim((string)($payment['reference_id'] ?? ''));
        $locationId = trim((string)($payment['location_id'] ?? ''));

        $amountOk = $amountMinor === $expectedAmountMinor;
        $currencyOk = hash_equals(strtoupper($expectedCurrency), $currency);
        $referenceOk = hash_equals($expectedReferenceId, $referenceId);
        $locationOk = $expectedLocationId === null || $expectedLocationId === '' || hash_equals($expectedLocationId, $locationId);
        $paid = $status === 'COMPLETED' && $amountOk && $currencyOk && $referenceOk && $locationOk;

        return [
            'success' => true,
            'provider' => 'square',
            'payment_id' => (string)$payment['id'],
            'status' => $status,
            'is_paid' => $paid,
            'verification_ok' => $amountOk && $currencyOk && $referenceOk && $locationOk,
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'reference_id' => $referenceId,
            'location_id' => $locationId,
            'card_details' => [
                'brand' => $payment['card_details']['card']['card_brand'] ?? null,
                'last_4' => $payment['card_details']['card']['last_4'] ?? null,
                'entry_method' => $payment['card_details']['entry_method'] ?? null,
            ],
        ];
    }

    public function minorExponent(string $currency): int
    {
        return strtoupper(trim($currency)) === 'JPY' ? 0 : 2;
    }

    public function toMinor(float $amount, string $currency): int
    {
        return (int)round($amount * (10 ** $this->minorExponent($currency)));
    }
}
