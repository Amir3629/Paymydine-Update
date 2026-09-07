<?php

namespace App\Services\Turkey;

use App\Services\Integrations\SecretReferenceService;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Official Yemeksepeti / Delivery Hero Partner API v2 client.
 *
 * Publicly documented hosts/endpoints only. No private API is guessed.
 * Credentials stay outside the database and are resolved from env:/config:
 * references at runtime.
 */
final class YemeksepetiPartnerClient
{
    private const SANDBOX = 'https://sandbox.partner.deliveryhero.io';
    private const LIVE = 'https://yemeksepeti.partner.deliveryhero.io';

    public function __construct(private ?SecretReferenceService $secrets = null)
    {
        $this->secrets = $secrets ?: new SecretReferenceService();
    }

    public function testConnection(array $config): array
    {
        $token = $this->accessToken($config, true);
        return [
            'ok' => $token !== '',
            'environment' => $this->environment($config),
            'host' => $this->baseUrl($config),
            'token_received' => $token !== '',
        ];
    }

    public function vendorOrders(array $config, array $query = []): array
    {
        $chainId = $this->required($config, 'chain_id');
        $vendorId = $this->required($config, 'vendor_id');
        $response = $this->authorized($config)->get(
            $this->baseUrl($config).'/v2/chains/'.rawurlencode($chainId).'/vendors/'.rawurlencode($vendorId).'/orders',
            array_filter($query, static fn ($value) => $value !== null && $value !== '')
        );
        return $this->jsonOrThrow($response, 'Yemeksepeti vendor orders');
    }

    public function order(array $config, string $orderId): array
    {
        $chainId = $this->required($config, 'chain_id');
        $response = $this->authorized($config)->get(
            $this->baseUrl($config).'/v2/chains/'.rawurlencode($chainId).'/orders/'.rawurlencode($orderId)
        );
        return $this->jsonOrThrow($response, 'Yemeksepeti order');
    }

    public function updateOrder(array $config, string $orderId, array $payload): array
    {
        $chainId = $this->required($config, 'chain_id');
        $status = strtoupper(trim((string)($payload['status'] ?? '')));
        if (!in_array($status, ['CANCELLED', 'READY_FOR_PICKUP', 'UPDATE_CART'], true)) {
            throw new \InvalidArgumentException('Unsupported Yemeksepeti order update status.');
        }
        $payload['status'] = $status;

        $response = $this->authorized($config)->put(
            $this->baseUrl($config).'/v2/chains/'.rawurlencode($chainId).'/orders/'.rawurlencode($orderId),
            $payload
        );
        return $this->jsonOrThrow($response, 'Yemeksepeti order update');
    }

    public function catalog(array $config, array $query = []): array
    {
        $chainId = $this->required($config, 'chain_id');
        $vendorId = $this->required($config, 'vendor_id');
        $response = $this->authorized($config)->get(
            $this->baseUrl($config).'/v2/chains/'.rawurlencode($chainId).'/vendors/'.rawurlencode($vendorId).'/catalog',
            $query
        );
        return $this->jsonOrThrow($response, 'Yemeksepeti catalog');
    }

    public function updateCatalog(array $config, array $products): array
    {
        $chainId = $this->required($config, 'chain_id');
        $vendorId = $this->required($config, 'vendor_id');
        $response = $this->authorized($config)->put(
            $this->baseUrl($config).'/v2/chains/'.rawurlencode($chainId).'/vendors/'.rawurlencode($vendorId).'/catalog',
            ['products' => array_values($products)]
        );
        return $this->jsonOrThrow($response, 'Yemeksepeti catalog update');
    }

    public function outletStatus(array $config): array
    {
        $chainId = $this->required($config, 'chain_id');
        $vendorId = $this->required($config, 'vendor_id');
        $response = $this->authorized($config)->get(
            $this->baseUrl($config).'/v2/chains/'.rawurlencode($chainId).'/vendors/'.rawurlencode($vendorId).'/status'
        );
        return $this->jsonOrThrow($response, 'Yemeksepeti outlet status');
    }

    public function updateOutletStatus(array $config, array $payload): array
    {
        $chainId = $this->required($config, 'chain_id');
        $vendorId = $this->required($config, 'vendor_id');
        $status = strtoupper(trim((string)($payload['status'] ?? '')));
        if (!in_array($status, ['CLOSED_TODAY', 'CLOSED_UNTIL', 'OPEN', 'CHECKIN'], true)) {
            throw new \InvalidArgumentException('Unsupported Yemeksepeti outlet status.');
        }
        $payload['status'] = $status;
        $response = $this->authorized($config)->put(
            $this->baseUrl($config).'/v2/chains/'.rawurlencode($chainId).'/vendors/'.rawurlencode($vendorId).'/status',
            $payload
        );
        return $this->jsonOrThrow($response, 'Yemeksepeti outlet status update');
    }

    public function accessToken(array $config, bool $forceRefresh = false): string
    {
        $clientId = $this->required($config, 'client_id');
        $secretReference = $this->required($config, 'client_secret_reference');
        $secret = $this->secrets->resolve($secretReference);
        if ($secret === '') {
            throw new \RuntimeException('Yemeksepeti client_secret_reference does not resolve to a secret value.');
        }

        $cacheKey = 'pmd:yemeksepeti:oauth:'.hash('sha256', $this->environment($config).'|'.$clientId);
        if (!$forceRefresh) {
            $cached = (string)Cache::get($cacheKey, '');
            if ($cached !== '') return $cached;
        }

        $response = Http::asForm()
            ->acceptJson()
            ->timeout(15)
            ->post($this->baseUrl($config).'/v2/oauth/token', [
                'grant_type' => 'client_credentials',
                'client_id' => $clientId,
                'client_secret' => $secret,
            ]);

        $json = $this->jsonOrThrow($response, 'Yemeksepeti OAuth');
        $token = trim((string)($json['access_token'] ?? ''));
        if ($token === '') throw new \RuntimeException('Yemeksepeti OAuth response did not contain access_token.');

        $ttl = max(60, min(7000, (int)($json['expires_in'] ?? 7200) - 60));
        Cache::put($cacheKey, $token, now()->addSeconds($ttl));
        return $token;
    }

    private function authorized(array $config)
    {
        return Http::withToken($this->accessToken($config))
            ->acceptJson()
            ->asJson()
            ->timeout(20);
    }

    private function baseUrl(array $config): string
    {
        return $this->environment($config) === 'production' ? self::LIVE : self::SANDBOX;
    }

    private function environment(array $config): string
    {
        return strtolower(trim((string)($config['environment'] ?? 'sandbox'))) === 'production'
            ? 'production'
            : 'sandbox';
    }

    private function required(array $config, string $key): string
    {
        $value = trim((string)($config[$key] ?? ''));
        if ($value === '') throw new \InvalidArgumentException('Missing Yemeksepeti configuration: '.$key);
        return $value;
    }

    private function jsonOrThrow(Response $response, string $operation): array
    {
        $json = $response->json();
        if (!$response->successful()) {
            $message = is_array($json)
                ? json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : trim($response->body());
            throw new \RuntimeException($operation.' failed (HTTP '.$response->status().'): '.mb_substr((string)$message, 0, 800));
        }
        return is_array($json) ? $json : [];
    }
}
