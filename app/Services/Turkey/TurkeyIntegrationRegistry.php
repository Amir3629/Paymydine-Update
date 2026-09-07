<?php

namespace App\Services\Turkey;

/**
 * Türkiye integration catalogue.
 *
 * Product eligibility is separate from real-world activation. Regulated or
 * private integrations remain disabled until the restaurant has real partner
 * credentials, contracts/devices and any required approval/certification.
 */
final class TurkeyIntegrationRegistry
{
    public const VERSION = '1.2.0';

    public function integrations(): array
    {
        return [
            'yn_okc' => [
                'label' => 'YN ÖKC / GMP-3 fiscalization',
                'kind' => 'fiscal',
                'priority' => 1,
                'regulated' => true,
                'default_status' => 'partner_required',
                'required_config' => [
                    'manufacturer', 'device_model', 'device_serial',
                    'integration_topology', 'security_agreement_reference',
                    'certification_status',
                ],
            ],
            'gmoebys' => [
                'label' => 'GMÖEBYS secure mobile payment + e-document fiscal route',
                'kind' => 'fiscal',
                'priority' => 1,
                'regulated' => true,
                'default_status' => 'approved_provider_required',
                'required_config' => [
                    'provider', 'merchant_identifier', 'environment',
                    'credential_reference', 'activation_status', 'approval_reference',
                ],
            ],
            'e_document' => [
                'label' => 'GİB e-Fatura / e-Arşiv provider',
                'kind' => 'fiscal_document',
                'priority' => 1,
                'regulated' => true,
                'default_status' => 'partner_required',
                'required_config' => [
                    'provider', 'merchant_identifier', 'environment',
                    'credential_reference', 'activation_status',
                ],
            ],
            'isbank_api' => [
                'label' => 'Türkiye İş Bankası API connection',
                'kind' => 'payment_provider_connection',
                'priority' => 1,
                'regulated' => true,
                'default_status' => 'uat_subscription_required',
                'required_config' => [
                    'environment', 'client_id', 'client_secret_reference',
                    'auth_mode', 'scope', 'mtls_certificate_path',
                    'mtls_private_key_reference', 'subscription_status',
                ],
            ],
            'acquirer' => [
                'label' => 'Turkish acquirer / TCMB-authorized PSP',
                'kind' => 'payment',
                'priority' => 1,
                'regulated' => true,
                'default_status' => 'partner_required',
                'required_config' => [
                    'provider', 'merchant_id', 'environment',
                    'provider_connection_code', 'contract_status',
                ],
            ],
            'tr_qr_fast' => [
                'label' => 'FAST / TR Karekod merchant payment',
                'kind' => 'payment_method',
                'priority' => 1,
                'regulated' => true,
                'default_status' => 'partner_required',
                'required_config' => [
                    'provider', 'merchant_id', 'environment',
                    'provider_connection_code', 'activation_status',
                ],
            ],
            'fast_request' => [
                'label' => 'FAST Ödeme İste (Request to Pay)',
                'kind' => 'payment_method',
                'priority' => 1,
                'regulated' => true,
                'default_status' => 'partner_required',
                'required_config' => [
                    'provider', 'merchant_id', 'environment',
                    'provider_connection_code', 'activation_status',
                ],
            ],
            'ispay' => [
                'label' => 'İş\'le Öde',
                'kind' => 'payment_method',
                'priority' => 2,
                'regulated' => true,
                'default_status' => 'optional_api_subscription_required',
                'required_config' => [
                    'provider', 'merchant_id', 'environment',
                    'provider_connection_code', 'activation_status',
                ],
            ],
            'yemeksepeti' => [
                'label' => 'Yemeksepeti Partner API',
                'kind' => 'marketplace',
                'priority' => 1,
                'regulated' => false,
                'default_status' => 'commercial_access_required',
                'required_config' => [
                    'environment', 'client_id', 'client_secret_reference',
                    'merchant_or_partner_id', 'chain_id', 'vendor_id',
                ],
            ],
            'uber_trendyol_go' => [
                'label' => 'Uber / Trendyol Go restaurant integration',
                'kind' => 'marketplace',
                'priority' => 1,
                'regulated' => false,
                'default_status' => 'commercial_access_required',
                'required_config' => ['partner_contract_reference', 'merchant_or_partner_id'],
            ],
            'getiryemek' => [
                'label' => 'GetirYemek legacy connector',
                'kind' => 'marketplace',
                'priority' => 3,
                'regulated' => false,
                'default_status' => 'do_not_start_new_connector',
                'required_config' => [],
            ],
            'iys' => [
                'label' => 'İYS marketing-consent synchronization',
                'kind' => 'consent',
                'priority' => 2,
                'regulated' => true,
                'default_status' => 'authorized_integrator_required',
                'required_config' => [
                    'integrator', 'brand_or_legal_entity', 'environment',
                    'credential_reference', 'contract_status',
                ],
            ],
            'sms' => [
                'label' => 'Transactional SMS / OTP provider',
                'kind' => 'messaging',
                'priority' => 2,
                'regulated' => false,
                'default_status' => 'provider_required',
                'required_config' => ['provider', 'sender_id', 'credential_reference'],
            ],
            'whatsapp' => [
                'label' => 'WhatsApp Business messaging route',
                'kind' => 'messaging',
                'priority' => 2,
                'regulated' => false,
                'default_status' => 'provider_required',
                'required_config' => ['provider', 'business_account_reference', 'credential_reference'],
            ],
            'accounting' => [
                'label' => 'Accounting / supplier invoice adapter',
                'kind' => 'accounting',
                'priority' => 2,
                'regulated' => false,
                'default_status' => 'optional_partner',
                'required_config' => ['provider'],
            ],
        ];
    }

    public function definition(string $code): ?array
    {
        $code = strtolower(trim($code));
        return $this->integrations()[$code] ?? null;
    }

    public function publicSummary(): array
    {
        $out = [];
        foreach ($this->integrations() as $code => $definition) {
            $out[$code] = [
                'label' => $definition['label'],
                'kind' => $definition['kind'],
                'priority' => $definition['priority'],
                'regulated' => $definition['regulated'],
                'default_status' => $definition['default_status'],
            ];
        }
        return $out;
    }
}
