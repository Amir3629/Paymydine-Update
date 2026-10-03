<?php

namespace App\Services\Turkey;

use App\Services\Integrations\SecretReferenceService;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Türkiye İş Bankası API client.
 *
 * PMD keeps three things separate:
 *  - environment credentials (UAT and Production never share Client IDs),
 *  - API-product security (scope/auth mode can differ per subscribed API),
 *  - transport security (shared mTLS certificate/private key).
 *
 * Product operation paths are never guessed. They must be copied from the
 * approved UAT/Production İş Bankası specification for that product.
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

    public function testConnection(array $config, ?string $productCode = null): array
    {
        $token = $this->accessToken($config, $productCode, true);
        $profile = $this->securityProfile($config, $productCode);

        return [
            'ok' => $token !== '',
            'environment' => $this->environment($config),
            'host' => $this->baseUrl($config),
            'token_received' => $token !== '',
            'product' => $productCode,
            'auth_mode' => $profile['auth_mode'],
            'scope' => $profile['scope'],
            'note' => 'OAuth/mTLS success proves connectivity only. Product subscription, merchant activation and regulatory approval remain separate.',
        ];
    }

    public function accessToken(array $config, ?string $productCode = null, bool $forceRefresh = false): string
    {
        $credentials = $this->environmentCredentials($config);
        $profile = $this->securityProfile($config, $productCode);

        $clientId = $this->required($credentials, 'client_id');
        $clientSecret = $this->secrets->resolve($this->required($credentials, 'client_secret_reference'));
        if ($clientSecret === '') {
            throw new \RuntimeException('İş Bankası client-secret reference does not resolve to a secret value.');
        }

        $scope = $profile['scope'];
        $authMode = $profile['auth_mode'];
        $cacheKey = 'pmd:isbank:oauth:'.hash('sha256', implode('|', [
            $this->environment($config),
            $clientId,
            (string)$productCode,
            $authMode,
            $scope,
        ]));

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
            $username = trim((string)($profile['s2s_username'] ?? ''));
            $password = $this->secrets->resolve((string)($profile['s2s_password_reference'] ?? ''));
            if ($username === '' || $password === '') {
                throw new \RuntimeException('İş Bankası S2S mode requires product-specific username and password reference.');
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

        $expiresIn = (int)($json['expires_in'] ?? 1200);
        $ttl = max(60, min(1080, $expiresIn - 60));
        Cache::put($cacheKey, $token, now()->addSeconds($ttl));

        return $token;
    }

    /** Exchange an authorization code only for an API explicitly documented as customer-login Security. */
    public function exchangeAuthorizationCode(
        array $config,
        string $code,
        string $redirectUri,
        string $codeVerifier,
        ?string $scope = null
    ): array {
        $credentials = $this->environmentCredentials($config);
        $clientId = $this->required($credentials, 'client_id');
        $clientSecret = $this->secrets->resolve($this->required($credentials, 'client_secret_reference'));
        if ($clientSecret === '') throw new \RuntimeException('İş Bankası client secret could not be resolved.');

        $payload = [
            'grant_type' => 'authorization_code',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => trim($redirectUri),
            'code' => trim($code),
            'code_verifier' => trim($codeVerifier),
        ];
        $scope = trim((string)$scope);
        if ($scope !== '') $payload['scope'] = $scope;

        if ($payload['redirect_uri'] === '' || $payload['code'] === '' || $payload['code_verifier'] === '') {
            throw new \InvalidArgumentException('İş Bankası authorization-code exchange requires redirect_uri, code and code_verifier.');
        }

        $response = $this->baseRequest($config)
            ->asForm()
            ->post($this->baseUrl($config).self::TOKEN_PATH, $payload);

        return $this->jsonOrThrow($response, 'İş Bankası authorization-code exchange');
    }

    public function request(
        array $config,
        string $method,
        string $path,
        array $payload = [],
        array $headers = [],
        ?string $productCode = null
    ): array {
        $path = '/'.ltrim(trim($path), '/');
        if ($path === '/') throw new \InvalidArgumentException('İş Bankası operation path is required.');
        if (!str_starts_with($path, '/api/isbank/')) {
            throw new \InvalidArgumentException('Only official /api/isbank/... operation paths are allowed.');
        }

        $request = $this->baseRequest($config)
            ->withToken($this->accessToken($config, $productCode))
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

    public function environmentCredentials(array $config): array
    {
        $environment = $this->environment($config);
        $clientIdKey = $environment === 'production' ? 'production_client_id' : 'uat_client_id';
        $secretKey = $environment === 'production' ? 'production_client_secret_reference' : 'uat_client_secret_reference';

        // Backwards compatibility with the R2 flat fields while tenants migrate.
        return [
            'client_id' => trim((string)($config[$clientIdKey] ?? $config['client_id'] ?? '')),
            'client_secret_reference' => trim((string)($config[$secretKey] ?? $config['client_secret_reference'] ?? '')),
        ];
    }

    public function productConfig(array $config, ?string $productCode): array
    {
        if ($productCode === null || trim($productCode) === '') return [];
        $products = (array)($config['products'] ?? []);
        return (array)($products[strtolower(trim($productCode))] ?? []);
    }

    public function securityProfile(array $config, ?string $productCode): array
    {
        $product = $this->productConfig($config, $productCode);
        $mode = strtolower(trim((string)($product['auth_mode'] ?? $config['auth_mode'] ?? 'client_credentials')));
        if (!in_array($mode, ['client_credentials', 's2s_password'], true)) {
            throw new \InvalidArgumentException('Unsupported İş Bankası machine-to-machine auth mode: '.$mode);
        }

        return [
            'auth_mode' => $mode,
            'scope' => trim((string)($product['scope'] ?? $config['scope'] ?? '')),
            's2s_username' => trim((string)($product['s2s_username'] ?? $config['s2s_username'] ?? '')),
            's2s_password_reference' => trim((string)($product['s2s_password_reference'] ?? $config['s2s_password_reference'] ?? '')),
        ];
    }

    private function baseRequest(array $config): PendingRequest
    {
        $certificatePath = trim((string)($config['mtls_certificate_path'] ?? ''));
        $privateKeyPath = $this->secrets->resolve((string)($config['mtls_private_key_reference'] ?? ''));
        $privateKeyPassword = $this->secrets->resolve((string)($config['mtls_private_key_password_reference'] ?? ''));

        if ($certificatePath === '' || $privateKeyPath === '') {
            throw new \RuntimeException('İş Bankası UAT/Production requires mTLS certificate path and private-key reference.');
        }
        if (!is_file($certificatePath) || !is_readable($certificatePath)) {
            throw new \RuntimeException('İş Bankası mTLS certificate file is not readable: '.$certificatePath);
        }
        if (!is_file($privateKeyPath) || !is_readable($privateKeyPath)) {
            throw new \RuntimeException('İş Bankası mTLS private-key file is not readable.');
        }

        $certificatePem = (string)file_get_contents($certificatePath);
        $certificateHeader = preg_replace('/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/', '', $certificatePem);
        $certificateHeader = trim((string)$certificateHeader);
        if ($certificateHeader === '') {
            throw new \RuntimeException('İş Bankası certificate could not be converted to X-Client-Certificate format.');
        }

        $sslKey = $privateKeyPassword !== '' ? [$privateKeyPath, $privateKeyPassword] : $privateKeyPath;

        return Http::withOptions([
                'cert' => $certificatePath,
                'ssl_key' => $sslKey,
            ])
            ->withHeaders(['X-Client-Certificate' => $certificateHeader])
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
