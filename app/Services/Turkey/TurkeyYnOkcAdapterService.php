<?php

namespace App\Services\Turkey;

use App\Services\Integrations\SecretReferenceService;
use Illuminate\Support\Facades\Http;

/**
 * PMD-side boundary for a certified YN ÖKC vendor adapter/local agent.
 *
 * Vendor GMP-3 SDK details remain outside PMD core. A certified adapter can
 * expose a small local HTTPS bridge that PMD calls for fiscal operations.
 * This keeps PMD device-agnostic while remaining fail-closed until the selected
 * device/vendor topology is actually certified.
 */
final class TurkeyYnOkcAdapterService
{
    public function __construct(private ?SecretReferenceService $secrets = null)
    {
        $this->secrets = $secrets ?: new SecretReferenceService();
    }

    public function execute(array $config, string $operation, array $payload, ?string $idempotencyKey = null): array
    {
        $this->assertReady($config);
        $baseUrl = rtrim(trim((string)$config['local_agent_url']), '/');
        $operation = strtolower(trim($operation));
        if (!in_array($operation, ['fiscalize', 'payment_and_fiscalize', 'status', 'cancel'], true)) {
            throw new \InvalidArgumentException('Unsupported YN ÖKC adapter operation.');
        }

        $token = $this->secrets->resolve((string)($config['credential_reference'] ?? ''));
        if ($token === '') throw new \RuntimeException('YN ÖKC adapter credential reference does not resolve.');

        $request = Http::acceptJson()
            ->asJson()
            ->withToken($token)
            ->timeout(20)
            ->connectTimeout(5);
        if ($idempotencyKey !== null && trim($idempotencyKey) !== '') {
            $request = $request->withHeaders(['Idempotency-Key' => trim($idempotencyKey)]);
        }

        $response = $request->post($baseUrl.'/v1/'.$operation, $payload);
        $json = $response->json();
        if (!$response->successful()) {
            $message = is_array($json)
                ? json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : trim($response->body());
            throw new \RuntimeException('YN ÖKC adapter call failed (HTTP '.$response->status().'): '.mb_substr((string)$message, 0, 1000));
        }

        return is_array($json) ? $json : [];
    }

    public function readiness(array $config): array
    {
        $required = ['manufacturer', 'device_model', 'device_serial', 'certification_status', 'vendor_driver', 'local_agent_url', 'credential_reference'];
        $missing = [];
        foreach ($required as $key) {
            if (trim((string)($config[$key] ?? '')) === '') $missing[] = $key;
        }

        $certified = in_array(strtolower(trim((string)($config['certification_status'] ?? ''))), ['approved', 'active', 'certified'], true);
        $secretOk = trim((string)($config['credential_reference'] ?? '')) !== '' && $this->secrets->exists((string)$config['credential_reference']);

        return [
            'configured' => $missing === [],
            'certified' => $certified,
            'credential_resolves' => $secretOk,
            'runtime_ready' => $missing === [] && $certified && $secretOk,
            'missing' => $missing,
            'note' => 'The local agent must be supplied/certified against the selected vendor GMP-3/device SDK. PMD does not emulate fiscal hardware.',
        ];
    }

    private function assertReady(array $config): void
    {
        $state = $this->readiness($config);
        if (!$state['runtime_ready']) {
            throw new \RuntimeException('YN ÖKC adapter is not runtime-ready.');
        }
    }
}
