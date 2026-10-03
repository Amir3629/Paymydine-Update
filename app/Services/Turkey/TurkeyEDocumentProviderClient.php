<?php

namespace App\Services\Turkey;

use App\Services\Integrations\SecretReferenceService;

/**
 * Provider-neutral e-Fatura/e-Arşiv SOAP boundary.
 *
 * The exact WSDL and operation names belong to the selected GİB-authorized
 * provider. PMD can execute those configured operations without embedding a
 * provider's private contract into the core product.
 */
final class TurkeyEDocumentProviderClient
{
    public function __construct(private ?SecretReferenceService $secrets = null)
    {
        $this->secrets = $secrets ?: new SecretReferenceService();
    }

    public function lookupRecipient(array $config, string $taxIdentifier): array
    {
        $operation = $this->required($config, 'lookup_operation');
        $field = trim((string)($config['lookup_tax_id_field'] ?? 'taxIdentifier')) ?: 'taxIdentifier';
        $taxIdentifier = trim($taxIdentifier);
        if ($taxIdentifier === '') throw new \InvalidArgumentException('Recipient tax identifier is required.');

        $raw = $this->call($config, $operation, [$field => $taxIdentifier]);
        $path = trim((string)($config['registration_result_path'] ?? ''));
        $registered = $path === '' ? null : $this->booleanAtPath($raw, $path);

        return [
            'registered' => $registered,
            'raw' => $raw,
            'authoritative' => $registered !== null,
        ];
    }

    public function createInvoice(array $config, array $payload): array
    {
        return $this->call($config, $this->required($config, 'create_operation'), $payload);
    }

    public function invoiceStatus(array $config, array $payload): array
    {
        return $this->call($config, $this->required($config, 'status_operation'), $payload);
    }

    public function call(array $config, string $operation, array $payload): array
    {
        if (!class_exists('SoapClient')) {
            throw new \RuntimeException('PHP SOAP extension is required for the configured e-document provider.');
        }

        $wsdl = $this->required($config, 'service_reference');
        $operation = trim($operation);
        if ($operation === '') throw new \InvalidArgumentException('e-document SOAP operation is required.');

        $options = [
            'exceptions' => true,
            'trace' => false,
            'cache_wsdl' => WSDL_CACHE_BOTH,
            'connection_timeout' => 20,
        ];

        $username = trim((string)($config['username'] ?? ''));
        $passwordReference = trim((string)($config['password_reference'] ?? ''));
        if ($username !== '') $options['login'] = $username;
        if ($passwordReference !== '') {
            $password = $this->secrets->resolve($passwordReference);
            if ($password === '') throw new \RuntimeException('e-document password reference does not resolve.');
            $options['password'] = $password;
        }

        try {
            $client = new \SoapClient($wsdl, $options);
            $response = $client->__soapCall($operation, [$payload]);
        } catch (\Throwable $error) {
            throw new \RuntimeException('e-document provider call failed: '.$error->getMessage(), 0, $error);
        }

        return json_decode(json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), true) ?: [];
    }

    private function booleanAtPath(array $payload, string $path): ?bool
    {
        $value = $payload;
        foreach (array_filter(explode('.', $path), static fn ($part) => $part !== '') as $part) {
            if (!is_array($value) || !array_key_exists($part, $value)) return null;
            $value = $value[$part];
        }

        if (is_bool($value)) return $value;
        $normalized = strtolower(trim((string)$value));
        if (in_array($normalized, ['1', 'true', 'yes', 'registered', 'active'], true)) return true;
        if (in_array($normalized, ['0', 'false', 'no', 'not_registered', 'inactive'], true)) return false;
        return null;
    }

    private function required(array $config, string $key): string
    {
        $value = trim((string)($config[$key] ?? ''));
        if ($value === '') throw new \RuntimeException('e-document configuration is missing '.$key.'.');
        return $value;
    }
}
