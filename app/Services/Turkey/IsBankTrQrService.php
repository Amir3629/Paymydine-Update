<?php

namespace App\Services\Turkey;

/**
 * Typed façade for a future İş Bankası TR Karekod/FAST QR product.
 *
 * PMD intentionally refuses to guess endpoint paths. The product remains
 * unavailable until the bank supplies an approved scope/security profile and
 * exact UAT operation paths.
 */
final class IsBankTrQrService
{
    public function __construct(private ?IsBankApiClient $client = null)
    {
        $this->client = $client ?: new IsBankApiClient();
    }

    public function create(array $config, array $payload): array
    {
        $product = (array)($config['products']['tr_qr'] ?? []);
        $path = trim((string)($product['create_path'] ?? ''));
        if ($path === '') throw new \RuntimeException('TR Karekod create path is not configured from an approved İş Bankası specification.');
        $method = strtoupper(trim((string)($product['create_method'] ?? 'POST')));

        return $this->client->request($config, $method, $path, $payload, [], 'tr_qr');
    }

    public function status(array $config, string $paymentId, array $payload = []): array
    {
        $product = (array)($config['products']['tr_qr'] ?? []);
        $path = trim((string)($product['status_path'] ?? ''));
        if ($path === '') throw new \RuntimeException('TR Karekod status path is not configured from an approved İş Bankası specification.');
        $paymentId = trim($paymentId);
        if ($paymentId === '') throw new \InvalidArgumentException('TR Karekod payment ID is required.');
        $path = str_replace('{payment_id}', rawurlencode($paymentId), $path);
        $method = strtoupper(trim((string)($product['status_method'] ?? 'GET')));

        return $this->client->request($config, $method, $path, $payload, [], 'tr_qr');
    }

    public function readiness(array $config): array
    {
        $product = (array)($config['products']['tr_qr'] ?? []);
        $missing = [];
        foreach (['scope', 'auth_mode', 'create_path', 'status_path'] as $key) {
            if (trim((string)($product[$key] ?? '')) === '') $missing[] = $key;
        }
        return [
            'ready_for_uat_calls' => $missing === [],
            'missing' => $missing,
            'subscription_status' => trim((string)($product['subscription_status'] ?? 'not_subscribed')) ?: 'not_subscribed',
        ];
    }
}
