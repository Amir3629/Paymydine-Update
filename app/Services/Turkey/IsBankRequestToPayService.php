<?php

namespace App\Services\Turkey;

/**
 * Typed façade for İş Bankası Request To Pay Institutional.
 *
 * The public portal confirms the product and its purpose, but UAT operation
 * paths and payload contracts are supplied after approval. PMD therefore keeps
 * those exact paths in configuration instead of inventing endpoint names.
 */
final class IsBankRequestToPayService
{
    public function __construct(private ?IsBankApiClient $client = null)
    {
        $this->client = $client ?: new IsBankApiClient();
    }

    public function send(array $config, array $payload): array
    {
        $product = $this->product($config);
        $path = $this->required($product, 'send_path');
        $method = strtoupper(trim((string)($product['send_method'] ?? 'POST')));

        return $this->client->request($config, $method, $path, $payload, [], 'request_to_pay');
    }

    public function status(array $config, string $requestId, array $payload = []): array
    {
        $product = $this->product($config);
        $path = $this->required($product, 'status_path');
        $requestId = trim($requestId);
        if ($requestId === '') throw new \InvalidArgumentException('Request-to-Pay request ID is required.');

        $path = str_replace('{request_id}', rawurlencode($requestId), $path);
        $method = strtoupper(trim((string)($product['status_method'] ?? 'GET')));

        return $this->client->request($config, $method, $path, $payload, [], 'request_to_pay');
    }

    public function readiness(array $config): array
    {
        $product = $this->product($config);
        $missing = [];
        foreach (['scope', 'auth_mode', 'send_path', 'status_path'] as $key) {
            if (trim((string)($product[$key] ?? '')) === '') $missing[] = $key;
        }

        return [
            'ready_for_uat_calls' => $missing === [],
            'missing' => $missing,
            'subscription_status' => trim((string)($product['subscription_status'] ?? 'pending')) ?: 'pending',
            'approval_reference' => trim((string)($product['approval_reference'] ?? '')),
        ];
    }

    private function product(array $config): array
    {
        return (array)($config['products']['request_to_pay'] ?? []);
    }

    private function required(array $values, string $key): string
    {
        $value = trim((string)($values[$key] ?? ''));
        if ($value === '') throw new \RuntimeException('İş Bankası Request To Pay UAT configuration is missing '.$key.'.');
        return $value;
    }
}
