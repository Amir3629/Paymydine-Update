<?php

namespace Admin\Classes;

use Admin\Models\Payments_model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class VRPaymentGatewayService
{
    protected function boolValue($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return ((int)$value) === 1;
        }
        $normalized = strtolower(trim((string)$value));
        if ($normalized === '' || in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }

        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }

    protected function sessionBaseDir(): string
    {
        $dir = storage_path('app/vr_payment_sessions');
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        return $dir;
    }

    protected function sessionFile(string $host, string $sessionId): string
    {
        $safeHost = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $host) ?: 'unknown';
        $tenantDir = $this->sessionBaseDir().'/'.$safeHost;
        if (!is_dir($tenantDir)) {
            @mkdir($tenantDir, 0775, true);
        }

        return $tenantDir.'/'.$sessionId.'.json';
    }

    public function getProviderRow(): ?Payments_model
    {
        return Payments_model::query()->where('code', 'vr_payment')->first();
    }

    public function getConfig(): array
    {
        $row = $this->getProviderRow();
        $data = is_array(optional($row)->data) ? (array)$row->data : [];

        return [
            'enabled' => (bool)optional($row)->status,
            'mode' => strtolower((string)($data['mode'] ?? $data['transaction_mode'] ?? 'test')),
            'api_base_url' => rtrim((string)($data['api_base_url'] ?? ''), '/'),
            'hosted_checkout_base_url' => rtrim((string)($data['hosted_checkout_base_url'] ?? ''), '/'),
            'account_id' => (string)($data['account_id'] ?? $data['space_id'] ?? ''),
            'application_user_id' => (string)($data['application_user_id'] ?? $data['api_user_id'] ?? ''),
            'auth_key' => (string)($data['auth_key'] ?? $data['signing_key'] ?? $data['secret'] ?? ''),
            'webhook_secret' => (string)($data['webhook_secret'] ?? $data['webhook_signing_key'] ?? ''),
            'preferred_integration_mode' => strtolower((string)($data['preferred_integration_mode'] ?? 'payment_page')),
            'card_enabled' => $this->boolValue($data['card_enabled'] ?? true),
            'apple_pay_enabled' => $this->boolValue($data['apple_pay_enabled'] ?? false),
            'google_pay_enabled' => $this->boolValue($data['google_pay_enabled'] ?? false),
            'paypal_enabled' => $this->boolValue($data['paypal_enabled'] ?? false),
            'wero_enabled' => $this->boolValue($data['wero_enabled'] ?? false),
            'simulate_success' => $this->boolValue($data['simulate_success'] ?? false),
        ];
    }

    public function getDiagnostics(): array
    {
        $cfg = $this->getConfig();

        return [
            'host' => request()->getHost(),
            'provider' => 'vr_payment',
            'enabled' => (bool)$cfg['enabled'],
            'mode' => $cfg['mode'],
            'api_base_url' => $cfg['api_base_url'],
            'hosted_checkout_base_url' => $cfg['hosted_checkout_base_url'],
            'preferred_integration_mode' => $cfg['preferred_integration_mode'],
            'account_id_present' => $cfg['account_id'] !== '',
            'application_user_id_present' => $cfg['application_user_id'] !== '',
            'auth_key_present' => $cfg['auth_key'] !== '',
            'webhook_secret_present' => $cfg['webhook_secret'] !== '',
            'methods' => [
                'card' => (bool)$cfg['card_enabled'],
                'apple_pay' => (bool)$cfg['apple_pay_enabled'],
                'google_pay' => (bool)$cfg['google_pay_enabled'],
                'paypal' => (bool)$cfg['paypal_enabled'],
                'wero' => (bool)$cfg['wero_enabled'],
            ],
        ];
    }

    public function readiness(?string $methodCode = null): array
    {
        $cfg = $this->getConfig();
        $modeOk = in_array($cfg['mode'], ['test', 'live'], true);
        $hostedMode = $cfg['preferred_integration_mode'] === 'payment_page';
        $hasHostedBase = $cfg['hosted_checkout_base_url'] !== '' || $cfg['api_base_url'] !== '';
        $hasCoreCredentials = $cfg['account_id'] !== '' && $cfg['application_user_id'] !== '' && $cfg['auth_key'] !== '';

        $methodFlags = [
            'card' => (bool)$cfg['card_enabled'],
            'apple_pay' => (bool)$cfg['apple_pay_enabled'],
            'google_pay' => (bool)$cfg['google_pay_enabled'],
            'paypal' => (bool)$cfg['paypal_enabled'],
            'wero' => (bool)$cfg['wero_enabled'],
        ];

        $methodReadiness = [];
        foreach ($methodFlags as $code => $enabled) {
            $methodReadiness[$code] = (bool)$cfg['enabled']
                && $modeOk
                && $hostedMode
                && $hasHostedBase
                && $hasCoreCredentials
                && $enabled;
        }

        $targetMethod = strtolower((string)$methodCode);

        return [
            'provider' => 'vr_payment',
            'enabled' => (bool)$cfg['enabled'],
            'mode_ok' => $modeOk,
            'hosted_mode' => $hostedMode,
            'has_hosted_base' => $hasHostedBase,
            'has_core_credentials' => $hasCoreCredentials,
            'methods' => $methodReadiness,
            'ready' => $targetMethod !== ''
                ? (bool)($methodReadiness[$targetMethod] ?? false)
                : (bool)$cfg['enabled'] && $modeOk && $hostedMode && $hasHostedBase && $hasCoreCredentials,
        ];
    }

    public function createHostedRedirectSession(string $methodCode, array $payload): array
    {
        $methodCode = strtolower(trim($methodCode));
        $readiness = $this->readiness($methodCode);
        $cfg = $this->getConfig();

        if (!($readiness['ready'] ?? false)) {
            return [
                'success' => false,
                'provider' => 'vr_payment',
                'method' => $methodCode,
                'error_code' => 'vr_payment_method_not_ready',
                'error' => 'VR Payment is not fully configured for this method.',
                'diagnostics' => Arr::except($readiness, ['methods']),
            ];
        }

        $sessionId = 'vrp_'.Str::lower(Str::random(24));
        $providerReference = 'vrp_ref_'.Str::lower(Str::random(16));
        $returnUrl = (string)($payload['return_url'] ?? url('/order-placed'));
        $cancelUrl = (string)($payload['cancel_url'] ?? $returnUrl);
        $currency = strtoupper((string)($payload['currency'] ?? 'EUR'));
        $amountMajor = number_format((float)($payload['amount'] ?? 0), 2, '.', '');

        $baseUrl = $cfg['hosted_checkout_base_url'] !== ''
            ? $cfg['hosted_checkout_base_url']
            : $cfg['api_base_url'];

        // Optional adapter call hook for real VR Payment onboarding.
        if ($cfg['simulate_success'] === false && $cfg['api_base_url'] !== '' && str_contains($cfg['api_base_url'], '/api/')) {
            try {
                Http::timeout(8)->acceptJson()->post($cfg['api_base_url'].'/health', []);
            } catch (\Throwable $e) {
                PaymentLogger::warning('VR Payment health probe failed', [
                    'provider' => 'vr_payment',
                    'payment_method' => $methodCode,
                    'request_meta' => ['message' => $e->getMessage()],
                ]);
            }
        }

        $query = http_build_query([
            'session_id' => $sessionId,
            'provider_reference' => $providerReference,
            'method' => $methodCode,
            'amount' => $amountMajor,
            'currency' => $currency,
            'return_url' => $returnUrl,
            'cancel_url' => $cancelUrl,
            'tenant' => request()->getHost(),
        ]);

        $redirectUrl = $baseUrl.(str_contains($baseUrl, '?') ? '&' : '?').$query;

        $record = [
            'provider' => 'vr_payment',
            'host' => request()->getHost(),
            'method' => $methodCode,
            'session_id' => $sessionId,
            'provider_reference' => $providerReference,
            'amount' => (float)$payload['amount'],
            'currency' => $currency,
            'return_url' => $returnUrl,
            'cancel_url' => $cancelUrl,
            'status' => 'pending',
            'created_at' => gmdate('c'),
            'updated_at' => gmdate('c'),
        ];

        @file_put_contents(
            $this->sessionFile(request()->getHost(), $sessionId),
            json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );

        PaymentLogger::info('VR Payment hosted session created', [
            'provider' => 'vr_payment',
            'payment_method' => $methodCode,
            'request_meta' => [
                'session_id' => $sessionId,
                'provider_reference' => $providerReference,
                'amount' => (float)$payload['amount'],
                'currency' => $currency,
            ],
        ]);

        return [
            'success' => true,
            'provider' => 'vr_payment',
            'method' => $methodCode,
            'redirect_url' => $redirectUrl,
            'session_id' => $sessionId,
            'provider_reference' => $providerReference,
        ];
    }

    public function lookupSessionStatus(string $sessionId): array
    {
        $sessionId = trim($sessionId);
        $file = $this->sessionFile(request()->getHost(), $sessionId);
        if (!is_file($file)) {
            return [
                'success' => false,
                'provider' => 'vr_payment',
                'error_code' => 'vr_payment_session_not_found',
                'error' => 'VR Payment session not found for this tenant.',
            ];
        }

        $raw = @file_get_contents($file);
        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            return [
                'success' => false,
                'provider' => 'vr_payment',
                'error_code' => 'vr_payment_session_corrupt',
                'error' => 'VR Payment session record is invalid.',
            ];
        }

        return [
            'success' => true,
            'provider' => 'vr_payment',
            'session_id' => $sessionId,
            'is_paid' => in_array(strtolower((string)($decoded['status'] ?? 'pending')), ['paid', 'captured', 'completed'], true),
            'status' => (string)($decoded['status'] ?? 'pending'),
            'provider_reference' => $decoded['provider_reference'] ?? null,
        ];
    }

    public function parseWebhook(array $payload, array $headers = []): array
    {
        $eventType = strtolower((string)($payload['event'] ?? $payload['type'] ?? 'unknown'));
        $sessionId = (string)($payload['session_id'] ?? $payload['checkout_id'] ?? '');
        $status = strtolower((string)($payload['status'] ?? ''));

        return [
            'provider' => 'vr_payment',
            'event_type' => $eventType,
            'session_id' => $sessionId,
            'status' => $status,
            'is_paid_event' => in_array($status, ['paid', 'captured', 'completed'], true),
            'signature' => (string)($headers['x-vr-signature'][0] ?? $headers['x-signature'][0] ?? ''),
        ];
    }
}
