<?php

namespace App\Services\Turkey;

use App\Services\Integrations\SecretReferenceService;

/**
 * İş Bankası Sanal POS boundary.
 *
 * Sanal POS is the actual online-card acceptance product. It is deliberately
 * separate from the API Portal Payment Facilitator API. PMD stores merchant
 * configuration safely now, but will not fabricate 3DS/NestPay request fields
 * until İş Bankası supplies the merchant's current technical integration pack.
 */
final class IsBankSanalPosService
{
    public function __construct(private ?SecretReferenceService $secrets = null)
    {
        $this->secrets = $secrets ?: new SecretReferenceService();
    }

    public function readiness(array $config): array
    {
        $required = [
            'environment',
            'merchant_id',
            'store_code',
            'api_username',
            'api_password_reference',
            'store_key_reference',
            'technical_spec_reference',
        ];
        $missing = [];
        foreach ($required as $key) {
            if (trim((string)($config[$key] ?? '')) === '') $missing[] = $key;
        }

        $secretErrors = [];
        foreach (['api_password_reference', 'store_key_reference'] as $key) {
            $reference = trim((string)($config[$key] ?? ''));
            if ($reference !== '' && !$this->secrets->exists($reference)) $secretErrors[] = $key;
        }

        return [
            'configured' => $missing === [],
            'runtime_ready' => $missing === [] && $secretErrors === [] && trim((string)($config['activation_status'] ?? '')) === 'active',
            'missing' => $missing,
            'unresolved_secret_references' => $secretErrors,
            'note' => 'Actual 3DS/card-charge runtime stays fail-closed until the bank merchant technical pack is recorded and implemented. Payment Facilitator is not a substitute for Sanal POS.',
        ];
    }

    public function assertRuntimeReady(array $config): void
    {
        $state = $this->readiness($config);
        if (!$state['runtime_ready']) {
            throw new \RuntimeException('İş Bankası Sanal POS is not runtime-ready. Missing/blocked: '.implode(', ', array_merge($state['missing'], $state['unresolved_secret_references'])));
        }
    }
}
