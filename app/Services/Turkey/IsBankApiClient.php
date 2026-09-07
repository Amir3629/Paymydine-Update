<?php

namespace App\Services\Turkey;

use App\Services\Integrations\SecretReferenceService;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Türkiye İş Bankası API client foundation.
 *
 * Publicly documented facts only:
 * - Sandbox portal is documentation/discovery only; real tests run in UAT.
 * - UAT base host: api.uat.isbank.com.tr
 * - Production base host: api.isbank.com.tr
 * - OAuth token endpoint: /api/isbank/v1/identity-provider/oauth2/token
 * - API security uses OAuth 2.0 + mutual TLS.
 * - App security uses client_credentials; S2S security uses password grant.
 *
 * Product-specific operation paths/scopes are intentionally NOT guessed. They
 * are supplied by the subscribed İş Bankası API product in the merchant's UAT
 * portal and can be called through request().
 */
final class IsBankApiClient
{
    private const UAT = 'https://api.uat.isbank.com.tr';
    private const LIVE = 'https://api.isbank.com.tr';
    private const TOKEN_PATH = '/api/isbank/v1/identity-provider/oauth2/token';

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
            'auth_mode' => $this->authMode($config),
            'scope' => trim((string)($config['scope'] ?? '')),
            'note' => 'Token success proves OAuth/mTLS connectivity only. Each payment API still requires the matching UAT subscription/scope.',
        ];
    }

    public function accessToken(array $config, bool $forceRefresh = false): string
    {
        $clientId = $this->required($config, 'client_id');
        $clientSecret = $this->secrets->resolve($this->required($config, 'client_secret_reference'));
        if ($clientSecret === '') {
            throw new \RuntimeException('İş Bankası client_secret_reference does not resolve to a secret value.');
        }

        $scope = trim((string)($config['scope'] ?? ''));
        $authMode = $this->authMode($config);
        $cacheKey = 'pmd:isbank:oauth:'.hash('sha256', $this->environment($config).'|'.$clientId.'|'.$authMode.'|'.$scope);

        if (!$forceRefresh) {
            $cached = (string)Cache::get($cacheKey, '');
            if ($cached !== '') return $cached;
        }

        $payload = [
            'grant_type' => $authMode === 's2s_password' ? 'password' : 'client_credentials',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
        ];
        if ($scope !== '') $payload['scope'] = $scope;

        if ($authMode === 's2s_password') {
            $username = trim((string)($config['s2s_username'] ?? ''));
            $password = $this->secrets->resolve((string)($config['s2s_password_reference'] ?? ''));
            if ($username === '' || $password === '') {
                throw new \RuntimeException('İş Bankası S2S password mode requires s2s_username and s2s_password_reference.');
            }
            $payload['username'] = $username;
            $payload['password'] = $password;
        }

        $response = $this->baseRequest($config)
            ->asForm()
            ->post($this->baseUrl($config).self::TOKEN_PATH, $payload);

        $json = $this->jsonOrThrow($response, 'İş Bankası OAuth');
        $token = trim((string)($json['access_token'] ?? ''));
        if ($token === '') {
            throw new \RuntimeException('İş Bankası OAuth response did not contain access_token.');
        }

        // İş Bankası documents a 20-minute access-token lifetime. Keep a safety margin.
        $expiresIn = (int)($json['expires_in'] ?? 1200);
        $ttl = max(60, min(1080, $expiresIn - 60));
        Cache::put($cacheKey, $token, now()->addSeconds($ttl));

        return $token;
    }

    /**
     * Call an operation path copied from the subscribed UAT/Production API spec.
     * This keeps PMD provider-complete without inventing private/undocumented
     * İş Bankası endpoint paths.
     */
    public function request(array $config, string $method, string $path, array $payload = [], array $headers = []): array
    {
        $path = '/'.ltrim(trim($path), '/');
        if ($path === '/') throw new \InvalidArgumentException('İş Bankası operation path is required.');

        $request = $this->baseRequest($config)
            ->withToken($this->accessToken($config))
            ->acceptJson()
            ->asJson();

        if ($headers) $request = $request->withHeaders($headers);

        $method = strtoupper(trim($method));
        $url = $this->baseUrl($config).$path;

        $response = match ($method) {
            'GET' => $request->get($url, $payload),
            'POST' => $request->post($url, $payload),
            'PUT' => $request->put($url, $payload),
            'PATCH' => $request->patch($url, $payload),
            'DELETE' => $request->delete($url, $payload),
            default => throw new \InvalidArgumentException('Unsupported İş Bankası HTTP method: '.$method),
        };

        return $this->jsonOrThrow($response, 'İş Bankası '.$method.' '.$path);
    }

    public function environment(array $config): string
    {
        return strtolower(trim((string)($config['environment'] ?? 'uat'))) === 'production'
            ? 'production'
            : 'uat';
    }

    public function baseUrl(array $config): string
    {
        return $this->environment($config) === 'production' ? self::LIVE : self::UAT;
    }

    private function authMode(array $config): string
    {
        return strtolower(trim((string)($config['auth_mode'] ?? 'client_credentials'))) === 's2s_password'
            ? 's2s_password'
            : 'client_credentials';
    }

    private function baseRequest(array $config): PendingRequest
    {
        $certificatePath = trim((string)($config['mtls_certificate_path'] ?? ''));
        $privateKeyPath = $this->secrets->resolve((string)($config['mtls_private_key_reference'] ?? ''));
        $privateKeyPassword = $this->secrets->resolve((string)($config['mtls_private_key_password_reference'] ?? ''));

        if ($certificatePath === '' || $privateKeyPath === '') {
            throw new \RuntimeException('İş Bankası UAT/Production requires mTLS certificate path and private-key reference.');
        }

        $sslKey = $privateKeyPassword !== '' ? [$privateKeyPath, $privateKeyPassword] : $privateKeyPath;

        return Http::withOptions([
                'cert' => $certificatePath,
                'ssl_key' => $sslKey,
            ])
            ->timeout(25)
            ->connectTimeout(10);
    }

    private function required(array $config, string $key): string
    {
        $value = trim((string)($config[$key] ?? ''));
        if ($value === '') throw new \InvalidArgumentException('Missing İş Bankası configuration: '.$key);
        return $value;
    }

    private function jsonOrThrow(Response $response, string $operation): array
    {
        $json = $response->json();
        if (!$response->successful()) {
            $message = is_array($json)
                ? json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : trim($response->body());
            throw new \RuntimeException($operation.' failed (HTTP '.$response->status().'): '.mb_substr((string)$message, 0, 1000));
        }

        return is_array($json) ? $json : [];
    }
}
