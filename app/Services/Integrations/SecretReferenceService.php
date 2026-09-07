<?php

namespace App\Services\Integrations;

use Illuminate\Support\Facades\Config;

/**
 * PMD-wide secret-reference authority.
 *
 * Product/integration configuration may persist ONLY a reference to a secret,
 * never the secret itself. Supported runtime references are deliberately small
 * and auditable:
 *
 *   env:PMD_TR_YEMEKSEPETI_CLIENT_SECRET
 *   config:services.payments.worldline.secret
 *
 * Non-secret references such as contract_reference, certification_reference or
 * business_account_reference are ordinary identifiers and are not interpreted
 * as secret-manager pointers.
 *
 * Existing encrypted provider storage remains a backwards-compatible legacy
 * path until each integration is migrated. New integration work should use
 * this service from day one.
 */
final class SecretReferenceService
{
    private const SECRET_KEY_NAMES = [
        'password',
        'secret',
        'client_secret',
        'api_secret',
        'api_key',
        'private_key',
        'token',
        'access_token',
        'refresh_token',
        'affiliate_key',
        'webhook_secret',
        'signing_key',
        'auth_key',
        'pin',
        'credential',
    ];

    public function normalize(?string $reference): ?string
    {
        $reference = trim((string)$reference);
        if ($reference === '') return null;

        if (!preg_match('/^(env|config):[A-Za-z0-9_.:\/-]+$/', $reference)) {
            throw new \InvalidArgumentException(
                'Secret reference must use env:VARIABLE or config:path.to.value. Raw secrets are not accepted.'
            );
        }

        return $reference;
    }

    public function resolve(?string $reference): string
    {
        $reference = $this->normalize($reference);
        if ($reference === null) return '';

        [$scheme, $target] = explode(':', $reference, 2);
        $target = trim($target);

        if ($scheme === 'config') {
            $value = Config::get($target);
            return is_scalar($value) ? (string)$value : '';
        }

        $value = getenv($target);
        if ($value === false && array_key_exists($target, $_ENV)) $value = $_ENV[$target];
        if ($value === false && array_key_exists($target, $_SERVER)) $value = $_SERVER[$target];

        return is_scalar($value) ? (string)$value : '';
    }

    public function exists(?string $reference): bool
    {
        try {
            return $this->resolve($reference) !== '';
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Reject raw secret-shaped keys recursively. Secret reference keys are
     * validated as env:/config: pointers. Non-secret business/document
     * references remain ordinary safe configuration values.
     */
    public function sanitizeConfig(array $config): array
    {
        $walk = function (array $values, string $prefix = '') use (&$walk): array {
            $safe = [];
            foreach ($values as $key => $value) {
                $keyString = strtolower(trim((string)$key));
                $path = $prefix === '' ? $keyString : $prefix.'.'.$keyString;

                if (is_array($value)) {
                    $safe[$key] = $walk($value, $path);
                    continue;
                }

                if ($this->isSecretReferenceKey($keyString)) {
                    $safe[$key] = $this->normalize((string)$value);
                    continue;
                }

                if ($this->isSecretKey($keyString)) {
                    throw new \InvalidArgumentException(
                        'Raw secret field '.$path.' is not allowed. Store a *_reference value instead.'
                    );
                }

                $safe[$key] = $value;
            }
            return $safe;
        };

        return $walk($config);
    }

    public function isSecretReferenceKey(string $key): bool
    {
        $key = strtolower(trim($key));
        if (!str_ends_with($key, '_reference')) return false;

        $base = substr($key, 0, -strlen('_reference'));
        return $this->isSecretKey($base);
    }

    public function isSecretKey(string $key): bool
    {
        $key = strtolower(trim($key));
        if ($key === '' || str_ends_with($key, '_reference')) return false;

        foreach (self::SECRET_KEY_NAMES as $name) {
            if ($key === $name || str_ends_with($key, '_'.$name)) return true;
        }

        return false;
    }
}
