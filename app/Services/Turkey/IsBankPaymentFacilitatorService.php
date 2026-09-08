<?php

namespace App\Services\Turkey;

/**
 * Typed façade for İş Bankası Payment Facilitator API.
 *
 * PMD models the API as merchant/terminal management, not as a guest payment
 * method. Exact UAT operation paths are stored under products.payment_facilitator.operations.
 */
final class IsBankPaymentFacilitatorService
{
    public function __construct(private ?IsBankApiClient $client = null)
    {
        $this->client = $client ?: new IsBankApiClient();
    }

    public function call(array $config, string $operation, array $payload = [], array $pathParameters = []): array
    {
        $operation = strtolower(trim($operation));
        if ($operation === '') throw new \InvalidArgumentException('Payment Facilitator operation name is required.');

        $product = (array)($config['products']['payment_facilitator'] ?? []);
        $operations = (array)($product['operations'] ?? []);
        $definition = (array)($operations[$operation] ?? []);
        $method = strtoupper(trim((string)($definition['method'] ?? '')));
        $path = trim((string)($definition['path'] ?? ''));
        if ($method === '' || $path === '') {
            throw new \RuntimeException('Payment Facilitator operation '.$operation.' is not configured from the UAT specification.');
        }

        foreach ($pathParameters as $key => $value) {
            $path = str_replace('{'.trim((string)$key).'}', rawurlencode((string)$value), $path);
        }

        return $this->client->request($config, $method, $path, $payload, [], 'payment_facilitator');
    }

    public function readiness(array $config): array
    {
        $product = (array)($config['products']['payment_facilitator'] ?? []);
        $operations = (array)($product['operations'] ?? []);
        $configured = [];
        foreach ($operations as $name => $definition) {
            if (trim((string)($definition['method'] ?? '')) !== '' && trim((string)($definition['path'] ?? '')) !== '') {
                $configured[] = (string)$name;
            }
        }

        return [
            'scope_configured' => trim((string)($product['scope'] ?? '')) !== '',
            'auth_mode_configured' => trim((string)($product['auth_mode'] ?? '')) !== '',
            'configured_operations' => $configured,
            'subscription_status' => trim((string)($product['subscription_status'] ?? 'pending')) ?: 'pending',
            'approval_reference' => trim((string)($product['approval_reference'] ?? '')),
        ];
    }
}
