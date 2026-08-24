<?php

namespace Admin\Classes;

use Admin\Models\Payments_model;
use App\Services\Payments\VrPaymentApiClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_VR_PAYMENT_ONLINE_R1
 *
 * VR Payment online authority for PayMyDine.
 * Uses the official REST API v2.0 contract through VrPaymentApiClient.
 * Payment Page is the first-class guest flow; provider method availability is
 * discovered from the tenant's VR Payment Space and never guessed from marketing
 * capability alone.
 */
class VRPaymentGatewayService
{
    protected const SUPPORTED_METHODS = ['card', 'apple_pay', 'google_pay', 'paypal', 'wero'];

    public function getConfig(): array
    {
        $row = Payments_model::query()->where('code', 'vr_payment')->first();
        $raw = $row && method_exists($row, 'getConfigData')
            ? (array)$row->getConfigData()
            : (is_array(optional($row)->data) ? (array)$row->data : []);

        return [
            'enabled' => $row ? (bool)$row->status : false,
            'mode' => in_array(strtolower((string)($raw['mode'] ?? 'test')), ['test', 'live'], true)
                ? strtolower((string)($raw['mode'] ?? 'test'))
                : 'test',
            'api_base_url' => rtrim((string)($raw['api_base_url'] ?? 'https://gateway.vr-payment.de'), '/'),
            'space_id' => trim((string)($raw['space_id'] ?? '')),
            'user_id' => trim((string)($raw['user_id'] ?? $raw['application_user_id'] ?? '')),
            'auth_key' => trim((string)($raw['auth_key'] ?? $raw['authentication_key'] ?? '')),
            'preferred_integration_mode' => 'payment_page',
            'currency' => strtoupper(trim((string)($raw['currency'] ?? 'EUR'))) ?: 'EUR',
            'terminal_id' => trim((string)($raw['terminal_id'] ?? '')),
            'language' => trim((string)($raw['language'] ?? 'de-DE')) ?: 'de-DE',
        ];
    }

    public function getConfigForDiagnostics(): array
    {
        $config = $this->getConfig();
        $base = [
            'provider_enabled' => (bool)$config['enabled'],
            'mode' => $config['mode'],
            'integration_mode_valid' => true,
            'credentials_present' => $this->requiredCredentialsPresent($config),
            'config_presence' => [
                'api_base_url' => $config['api_base_url'] !== '',
                'space_id' => $config['space_id'] !== '',
                'user_id' => $config['user_id'] !== '',
                'auth_key' => $config['auth_key'] !== '',
            ],
        ];

        if (!$base['provider_enabled'] || !$base['credentials_present']) {
            foreach (self::SUPPORTED_METHODS as $method) {
                $base[$method.'_ready'] = false;
                $base[$method.'_enabled'] = false;
            }
            $base['any_ready'] = false;
            $base['terminal_ready'] = false;
            $base['terminal_count'] = 0;
            return $base;
        }

        $audit = $this->readinessAudit($config);
        foreach (self::SUPPORTED_METHODS as $method) {
            $base[$method.'_ready'] = (bool)($audit[$method.'_ready'] ?? false);
            $base[$method.'_enabled'] = (bool)($audit[$method.'_ready'] ?? false);
        }
        $base['any_ready'] = (bool)($audit['card_ready'] ?? false)
            || (bool)($audit['apple_pay_ready'] ?? false)
            || (bool)($audit['google_pay_ready'] ?? false)
            || (bool)($audit['paypal_ready'] ?? false)
            || (bool)($audit['wero_ready'] ?? false);
        $base['connected'] = (bool)($audit['connected'] ?? false);
        $base['available_method_codes'] = $audit['available_method_codes'] ?? [];
        $base['terminal_ready'] = (bool)($audit['terminals_api_ok'] ?? false) && (int)($audit['terminal_count'] ?? 0) > 0;
        $base['terminal_count'] = (int)($audit['terminal_count'] ?? 0);
        $base['terminals_api_ok'] = (bool)($audit['terminals_api_ok'] ?? false);

        return $base;
    }

    public function isMethodReady(string $methodCode, ?array $config = null): bool
    {
        $method = strtolower(trim($methodCode));
        if (!in_array($method, self::SUPPORTED_METHODS, true)) return false;

        $config = $config ?: $this->getConfig();
        if (!(bool)($config['enabled'] ?? false) || !$this->requiredCredentialsPresent($config)) return false;

        $audit = $this->readinessAudit($config);
        return (bool)($audit[$method.'_ready'] ?? false);
    }

    public function probeConnectivity(): array
    {
        $config = $this->getConfig();
        if (!(bool)($config['enabled'] ?? false)) {
            return [
                'ok' => false,
                'connected' => false,
                'error_category' => 'configuration',
                'error_code' => 'vr_payment_provider_disabled',
                'error' => 'VR Payment provider is disabled.',
            ];
        }

        $client = new VrPaymentApiClient($config);
        $audit = $client->connectionAudit();
        if (!($audit['ok'] ?? false)) {
            return [
                'ok' => false,
                'connected' => false,
                'error_category' => 'provider_api',
                'error_code' => 'vr_payment_connection_failed',
                'error' => $audit['message'] ?? 'VR Payment API connection failed.',
                'provider_http_status' => $audit['api']['status'] ?? null,
            ];
        }

        $sync = $this->syncTerminalDevices($audit['terminals'] ?? [], $config);
        $this->forgetReadinessCache($config);

        return [
            'ok' => true,
            'connected' => true,
            'message' => 'VR Payment Space connected. Payment methods and terminals were discovered.',
            'space_id' => $audit['space_id'] ?? null,
            'available_method_codes' => $audit['available_method_codes'] ?? [],
            'card_ready' => (bool)($audit['card_ready'] ?? false),
            'apple_pay_ready' => (bool)($audit['apple_pay_ready'] ?? false),
            'google_pay_ready' => (bool)($audit['google_pay_ready'] ?? false),
            'paypal_ready' => (bool)($audit['paypal_ready'] ?? false),
            'wero_ready' => (bool)($audit['wero_ready'] ?? false),
            'terminal_count' => (int)($audit['terminal_count'] ?? 0),
            'terminal_sync' => $sync,
        ];
    }

    public function createRedirectSession(array $payload): array
    {
        $method = strtolower(trim((string)($payload['method'] ?? 'card')));
        if (!in_array($method, self::SUPPORTED_METHODS, true)) {
            return $this->businessError('vr_payment_method_not_supported', 'This payment method is not supported by the VR Payment integration.');
        }

        $config = $this->getConfig();
        if (!(bool)($config['enabled'] ?? false)) {
            return $this->businessError('vr_payment_provider_not_ready', 'VR Payment provider is not enabled.');
        }
        if (!$this->requiredCredentialsPresent($config)) {
            return $this->businessError('vr_payment_configuration_invalid', 'VR Payment Space ID, Application User ID or Authentication Key is missing.');
        }

        $audit = $this->readinessAudit($config);
        if (!($audit[$method.'_ready'] ?? false)) {
            return $this->businessError(
                'vr_payment_method_not_available',
                strtoupper(str_replace('_', ' ', $method)).' is not active in this VR Payment Space.'
            );
        }

        $amount = round((float)($payload['amount'] ?? 0), 2);
        if ($amount <= 0) {
            return $this->businessError('vr_payment_invalid_amount', 'Payment amount must be greater than zero.');
        }

        $currency = strtoupper(trim((string)($payload['currency'] ?? $config['currency'] ?? 'EUR'))) ?: 'EUR';
        $merchantReference = $this->resolveMerchantReference((string)($payload['merchant_reference'] ?? ''), $method);
        $returnUrl = trim((string)($payload['return_url'] ?? ''));
        $cancelUrl = trim((string)($payload['cancel_url'] ?? $returnUrl));

        $allowedIds = [];
        foreach ((array)($audit['payment_methods'] ?? []) as $row) {
            if (($row['pmd_method_code'] ?? null) === $method && !empty($row['id']) && ($row['active'] ?? true)) {
                $allowedIds[] = (int)$row['id'];
            }
        }
        $allowedIds = array_values(array_unique(array_filter($allowedIds)));

        $transactionPayload = [
            'currency' => $currency,
            'language' => $this->normalizeLanguage((string)($payload['language'] ?? $config['language'] ?? 'de-DE')),
            'lineItems' => [[
                'amountIncludingTax' => number_format($amount, 2, '.', ''),
                'name' => trim((string)($payload['description'] ?? 'PayMyDine order')) ?: 'PayMyDine order',
                'quantity' => '1',
                'shippingRequired' => false,
                'sku' => 'pmd-order',
                'type' => 'PRODUCT',
                'uniqueId' => $merchantReference,
            ]],
            'merchantReference' => $merchantReference,
            'autoConfirmationEnabled' => true,
            'metaData' => [
                'pmd_method' => $method,
                'pmd_order_id' => isset($payload['order_id']) ? (string)(int)$payload['order_id'] : '',
            ],
        ];
        if ($returnUrl !== '') $transactionPayload['successUrl'] = $returnUrl;
        if ($cancelUrl !== '') $transactionPayload['failedUrl'] = $cancelUrl;
        if ($allowedIds) $transactionPayload['allowedPaymentMethodConfigurations'] = $allowedIds;

        $client = new VrPaymentApiClient($config);
        $created = $client->createTransaction($transactionPayload);
        if (!($created['ok'] ?? false) || !is_array($created['data'] ?? null)) {
            return $this->businessError(
                'vr_payment_transaction_create_failed',
                $created['message'] ?? 'VR Payment transaction creation failed.',
                ['provider_http_status' => $created['status'] ?? null]
            );
        }

        $transaction = (array)$created['data'];
        $transactionId = (int)($transaction['id'] ?? 0);
        if ($transactionId <= 0) {
            return $this->businessError('vr_payment_transaction_create_failed', 'VR Payment did not return a transaction ID.');
        }

        $page = $client->paymentPageUrl($transactionId);
        if (!($page['ok'] ?? false)) {
            return $this->businessError(
                'vr_payment_redirect_missing',
                $page['message'] ?? 'VR Payment did not return a Payment Page URL.',
                ['provider_http_status' => $page['status'] ?? null, 'transaction_id' => $transactionId]
            );
        }

        $redirectUrl = $this->extractStringResult($page['data'] ?? null);
        if ($redirectUrl === '') {
            return $this->businessError('vr_payment_redirect_missing', 'VR Payment Payment Page URL is empty.');
        }

        $status = $client->normalizeTransactionStatus($transaction);
        PaymentLogger::info('VR_PAYMENT_SESSION_CREATED', [
            'provider' => 'vr_payment',
            'payment_method' => $method,
            'transaction_id' => $transactionId,
            'merchant_reference' => $merchantReference,
            'amount' => $amount,
            'currency' => $currency,
            'allowed_payment_method_configurations' => $allowedIds,
        ]);

        return [
            'success' => true,
            'provider' => 'vr_payment',
            'method' => $method,
            'redirect_url' => $redirectUrl,
            'merchant_reference' => $merchantReference,
            'session_id' => (string)$transactionId,
            'transaction_id' => (string)$transactionId,
            'provider_reference' => (string)$transactionId,
            'status' => $status,
            'raw_status' => $transaction['state'] ?? null,
        ];
    }

    public function fetchPaymentStatus(array $context): array
    {
        $config = $this->getConfig();
        if (!(bool)($config['enabled'] ?? false) || !$this->requiredCredentialsPresent($config)) {
            return $this->businessError('vr_payment_provider_not_ready', 'VR Payment provider is not ready.');
        }

        $reference = trim((string)(
            $context['transaction_id']
            ?? $context['provider_reference']
            ?? $context['session_id']
            ?? ''
        ));
        if ($reference === '' || !ctype_digit($reference)) {
            return $this->businessError('vr_payment_status_lookup_failed', 'A valid VR Payment transaction ID is required.');
        }

        $client = new VrPaymentApiClient($config);
        $response = $client->readTransaction((int)$reference);
        if (!($response['ok'] ?? false) || !is_array($response['data'] ?? null)) {
            return $this->businessError(
                'vr_payment_status_lookup_failed',
                $response['message'] ?? 'Unable to read VR Payment transaction status.',
                ['provider_http_status' => $response['status'] ?? null]
            );
        }

        $transaction = (array)$response['data'];
        $status = $client->normalizeTransactionStatus($transaction);
        $id = (string)($transaction['id'] ?? $reference);
        $rawState = strtoupper((string)($transaction['state'] ?? ''));

        return [
            'success' => true,
            'provider' => 'vr_payment',
            'status' => $status,
            'is_paid' => $status === 'paid',
            'session_id' => $id,
            'transaction_id' => $id,
            'provider_reference' => $id,
            'merchant_reference' => $transaction['merchantReference'] ?? null,
            'raw_status' => $rawState,
            'amount' => $transaction['authorizationAmount'] ?? null,
            'currency' => $transaction['currency'] ?? null,
        ];
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader, ?string $timestampHeader = null): bool
    {
        $client = new VrPaymentApiClient($this->getConfig());
        $result = $client->verifyWebhookSignature($rawBody, $signatureHeader);
        if (!($result['ok'] ?? false)) {
            Log::warning('VR_PAYMENT_WEBHOOK_SIGNATURE_INVALID', [
                'message' => $result['message'] ?? 'Unknown signature failure',
                'key_id' => $result['key_id'] ?? null,
            ]);
            return false;
        }
        return true;
    }

    public function verifyWebhookSignatureDetailed(string $rawBody, ?string $signatureHeader): array
    {
        return (new VrPaymentApiClient($this->getConfig()))->verifyWebhookSignature($rawBody, $signatureHeader);
    }

    public function syncTerminalDevices(?array $terminals = null, ?array $config = null): array
    {
        if (!Schema::hasTable('terminal_devices')) {
            return ['ok' => false, 'message' => 'terminal_devices table is missing.', 'synced' => 0];
        }

        $config = $config ?: $this->getConfig();
        if ($terminals === null) {
            $api = new VrPaymentApiClient($config);
            $response = $api->terminals();
            if (!($response['ok'] ?? false)) {
                return ['ok' => false, 'message' => $response['message'] ?? 'Unable to list VR Payment terminals.', 'synced' => 0];
            }
            $terminals = $api->normalizeTerminals((array)($response['data'] ?? []));
        }

        $columns = Schema::getColumnListing('terminal_devices');
        $synced = 0;
        $seenReaderIds = [];

        foreach ($terminals as $terminal) {
            if (!is_array($terminal)) continue;
            $providerId = (int)($terminal['id'] ?? 0);
            if ($providerId <= 0) continue;
            $readerId = trim((string)($terminal['identifier'] ?? '')) ?: (string)$providerId;
            $seenReaderIds[] = $readerId;

            $payload = [
                'provider_code' => 'vr_payment',
                'reader_id' => $readerId,
                'reader_label' => (string)($terminal['name'] ?? 'VR Payment terminal'),
                'terminal_status' => ($terminal['online'] ?? false) ? 'online' : (string)($terminal['state'] ?? 'unknown'),
                'pairing_state' => (string)($terminal['state'] ?? 'unknown'),
                'environment' => (string)($config['mode'] ?? 'test'),
                'is_active' => 1,
                'serial_number' => $terminal['serial_number'] ?? null,
                'provider_terminal_id' => $providerId,
                'updated_at' => now(),
            ];
            $payload = array_intersect_key($payload, array_flip($columns));

            $query = DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?', ['vr_payment']);
            if (in_array('provider_terminal_id', $columns, true)) {
                $query->where('provider_terminal_id', $providerId);
            } else {
                $query->where('reader_id', $readerId);
            }
            $existing = $query->first();

            if ($existing) {
                DB::table('terminal_devices')
                    ->where('terminal_device_id', (int)$existing->terminal_device_id)
                    ->update($payload);
            } else {
                if (in_array('created_at', $columns, true)) $payload['created_at'] = now();
                DB::table('terminal_devices')->insert($payload);
            }
            $synced++;
        }

        if ($seenReaderIds && in_array('reader_id', $columns, true) && in_array('is_active', $columns, true)) {
            DB::table('terminal_devices')
                ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
                ->whereNotIn('reader_id', $seenReaderIds)
                ->update(array_intersect_key([
                    'is_active' => 0,
                    'terminal_status' => 'unavailable',
                    'updated_at' => now(),
                ], array_flip($columns)));
        }

        return ['ok' => true, 'synced' => $synced];
    }

    public function normalizeProviderException(\Throwable $e): array
    {
        $message = (string)$e->getMessage();
        $lower = strtolower($message);
        $category = 'provider_exception';
        if (str_contains($lower, 'timeout') || str_contains($lower, 'timed out')) $category = 'connectivity_timeout';
        elseif (str_contains($lower, 'resolve host') || str_contains($lower, 'getaddrinfo')) $category = 'connectivity_dns';
        elseif (str_contains($lower, 'ssl') || str_contains($lower, 'tls') || str_contains($lower, 'certificate')) $category = 'connectivity_tls';

        return [
            'class' => get_class($e),
            'message' => $message,
            'code' => $e->getCode(),
            'error_category' => $category,
            'error_code' => 'vr_payment_provider_exception',
            'error' => 'VR Payment request failed.',
        ];
    }

    protected function readinessAudit(array $config): array
    {
        $key = 'pmd:vr:readiness:'.sha1(
            (string)DB::connection()->getDatabaseName().'|'.
            (string)($config['mode'] ?? '').'|'.
            (string)($config['space_id'] ?? '').'|'.
            (string)($config['user_id'] ?? '')
        );

        return Cache::remember($key, now()->addSeconds(45), function () use ($config) {
            return (new VrPaymentApiClient($config))->connectionAudit();
        });
    }

    protected function forgetReadinessCache(array $config): void
    {
        $key = 'pmd:vr:readiness:'.sha1(
            (string)DB::connection()->getDatabaseName().'|'.
            (string)($config['mode'] ?? '').'|'.
            (string)($config['space_id'] ?? '').'|'.
            (string)($config['user_id'] ?? '')
        );
        Cache::forget($key);
    }

    protected function requiredCredentialsPresent(array $config): bool
    {
        return trim((string)($config['space_id'] ?? '')) !== ''
            && trim((string)($config['user_id'] ?? '')) !== ''
            && trim((string)($config['auth_key'] ?? '')) !== '';
    }

    protected function resolveMerchantReference(string $requested, string $method): string
    {
        $requested = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($requested)) ?: '';
        if ($requested !== '') return substr($requested, 0, 100);
        return substr('PMD-'.strtoupper($method).'-'.date('YmdHis').'-'.bin2hex(random_bytes(4)), 0, 100);
    }

    protected function businessError(string $code, string $message, array $extra = []): array
    {
        return array_merge([
            'success' => false,
            'provider' => 'vr_payment',
            'error_code' => $code,
            'error' => $message,
            'message' => $message,
            'allow_fallback' => false,
        ], $extra);
    }

    protected function extractStringResult($data): string
    {
        if (is_string($data)) return trim($data, " \t\n\r\0\x0B\"");
        if (is_array($data)) {
            foreach (['url', 'paymentPageUrl', 'redirect_url', 'value'] as $key) {
                if (isset($data[$key]) && is_scalar($data[$key])) return trim((string)$data[$key]);
            }
        }
        return '';
    }

    protected function normalizeLanguage(string $language): string
    {
        $language = trim($language);
        if ($language === '') return 'de-DE';
        return str_replace('_', '-', $language);
    }
}
