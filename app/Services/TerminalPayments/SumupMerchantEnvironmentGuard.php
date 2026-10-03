<?php

namespace App\Services\TerminalPayments;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

/**
 * Enforces the PayMyDine environment contract against the merchant type that
 * SumUp itself reports. Test must use a sandbox merchant; Production must use
 * a live merchant. This prevents a valid API key from producing a misleading
 * green connection state that can never pair Virtual Solo.
 */
class SumupMerchantEnvironmentGuard
{
    private const PROVIDER = 'sumup';
    private const API_URL = 'https://api.sumup.com';

    public function assertEnvironment(string $environment): array
    {
        $environment = strtolower(trim($environment));
        if (!in_array($environment, ['test', 'production'], true)) {
            throw new \InvalidArgumentException('Invalid SumUp environment.');
        }

        if (!Schema::hasTable('terminal_provider_configs')) {
            throw new \RuntimeException('SumUp provider configuration is not installed.');
        }

        $row = DB::table('terminal_provider_configs')
            ->where('provider_code', self::PROVIDER)
            ->where('environment', $environment)
            ->first();

        if (!$row) {
            throw new \RuntimeException('Configure this SumUp environment first.');
        }

        $merchantCode = strtoupper(trim((string)($row->merchant_code ?? '')));
        $token = $this->decrypt((string)($row->access_token_encrypted ?? ''));
        if ($merchantCode === '' || $token === '') {
            $this->markError((int)$row->terminal_provider_config_id, 'SumUp API key or Merchant Code is missing.');
            throw new \RuntimeException('SumUp API key or Merchant Code is missing.');
        }

        $baseUrl = rtrim((string)($row->api_base_url ?: self::API_URL), '/');
        $response = Http::withToken($token)
            ->acceptJson()
            ->withHeaders(['User-Agent' => 'PayMyDine/1.0'])
            ->timeout(20)
            ->get($baseUrl.'/v1/merchants/'.rawurlencode($merchantCode));

        if (!$response->successful()) {
            $message = $this->providerMessage($response);
            $error = 'PayMyDine could not verify the SumUp merchant type.'
                .($message !== '' ? ' SumUp: '.$message : '');
            $this->markError((int)$row->terminal_provider_config_id, $error);
            throw new \RuntimeException($error);
        }

        $merchant = (array)$response->json();
        if (!array_key_exists('sandbox', $merchant) || $merchant['sandbox'] === null) {
            $error = 'SumUp did not return whether this merchant is Sandbox or Live. The environment cannot be activated safely.';
            $this->markError((int)$row->terminal_provider_config_id, $error);
            throw new \RuntimeException($error);
        }

        $sandbox = (bool)$merchant['sandbox'];

        if ($environment === 'test' && !$sandbox) {
            $error = 'PayMyDine Test is connected to a LIVE SumUp merchant ('.$merchantCode.'). Virtual Solo requires a Sandbox Merchant Account. Select/create a SumUp Sandbox Merchant, create its API key, use its different Merchant Code in PayMyDine Test, then test the connection again.';
            $this->markError((int)$row->terminal_provider_config_id, $error);
            throw new \RuntimeException($error);
        }

        if ($environment === 'production' && $sandbox) {
            $error = 'PayMyDine Production is connected to a SumUp Sandbox Merchant ('.$merchantCode.'). Production requires the restaurant\'s live SumUp merchant credentials.';
            $this->markError((int)$row->terminal_provider_config_id, $error);
            throw new \RuntimeException($error);
        }

        $this->markVerified((int)$row->terminal_provider_config_id, $row->metadata ?? null, $sandbox);

        return [
            'environment' => $environment,
            'merchant_code' => $merchantCode,
            'sandbox' => $sandbox,
            'merchant_name' => trim((string)($merchant['business_profile']['name'] ?? '')),
        ];
    }

    private function markError(int $id, string $message): void
    {
        DB::table('terminal_provider_configs')
            ->where('terminal_provider_config_id', $id)
            ->update([
                'connection_status' => 'error',
                'is_active' => 0,
                'last_error' => $message,
                'updated_at' => now(),
            ]);
    }

    private function markVerified(int $id, $metadataValue, bool $sandbox): void
    {
        $metadata = [];
        if (is_string($metadataValue) && trim($metadataValue) !== '') {
            $decoded = json_decode($metadataValue, true);
            if (is_array($decoded)) {
                $metadata = $decoded;
            }
        } elseif (is_array($metadataValue)) {
            $metadata = $metadataValue;
        }

        $metadata['merchant_sandbox'] = $sandbox;
        $metadata['merchant_type_verified_at'] = now()->toIso8601String();

        DB::table('terminal_provider_configs')
            ->where('terminal_provider_config_id', $id)
            ->update([
                'metadata' => json_encode($metadata, JSON_UNESCAPED_SLASHES),
                'last_error' => null,
                'updated_at' => now(),
            ]);
    }

    private function providerMessage($response): string
    {
        $json = $response->json();
        if (is_array($json)) {
            foreach (['detail', 'title', 'message', 'error_description'] as $key) {
                if (isset($json[$key]) && is_scalar($json[$key]) && trim((string)$json[$key]) !== '') {
                    return trim((string)$json[$key]);
                }
            }
        }

        $body = trim((string)$response->body());
        if ($body === '') {
            return '';
        }

        return mb_substr(trim(preg_replace('/\s+/', ' ', strip_tags($body)) ?: ''), 0, 400);
    }

    private function decrypt(string $value): string
    {
        if ($value === '') {
            return '';
        }

        try {
            return (string)Crypt::decryptString($value);
        } catch (\Throwable $e) {
            return '';
        }
    }
}
