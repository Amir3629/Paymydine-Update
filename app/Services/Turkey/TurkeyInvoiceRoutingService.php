<?php

namespace App\Services\Turkey;

/**
 * Türkiye customer-facing invoice/receipt routing.
 *
 * PMD must never ask a normal guest to understand e-Fatura vs e-Arşiv.
 * The UI asks whether a formal invoice is needed and collects recipient data;
 * the e-document provider/GİB registration lookup determines the document type.
 */
final class TurkeyInvoiceRoutingService
{
    public function documentTypes(): array
    {
        return [
            'yn_okc_fis' => [
                'label' => 'YN ÖKC Fiş',
                'meaning' => 'Ordinary restaurant fiscal receipt when the merchant uses the YN ÖKC fiscal route.',
                'formal_invoice' => false,
            ],
            'e_fatura' => [
                'label' => 'e-Fatura',
                'meaning' => 'Official electronic invoice sent to a recipient registered in the GİB e-Fatura system.',
                'formal_invoice' => true,
            ],
            'e_arsiv' => [
                'label' => 'e-Arşiv Fatura',
                'meaning' => 'Official electronic invoice for a recipient who is not registered in the e-Fatura system, subject to the applicable rules.',
                'formal_invoice' => true,
            ],
        ];
    }

    /**
     * Decide the PMD document intent after the provider has resolved whether
     * the recipient is registered in e-Fatura.
     *
     * $recipientIsEFaturaRegistered must come from an authoritative provider/
     * registry lookup; PMD must not guess it from company name or tax number.
     */
    public function route(
        bool $formalInvoiceRequested,
        string $fiscalMode,
        ?bool $recipientIsEFaturaRegistered = null
    ): string {
        $fiscalMode = strtolower(trim($fiscalMode));

        if (!$formalInvoiceRequested) {
            if ($fiscalMode === 'yn_okc') return 'yn_okc_fis';

            // In an approved GMÖEBYS route the provider owns the exact legal
            // e-document output. PMD records a provider-routed document intent
            // rather than fabricating an ÖKC receipt.
            if ($fiscalMode === 'gmoebys') return 'provider_e_document';

            throw new \InvalidArgumentException('Unsupported Türkiye fiscal mode.');
        }

        if ($recipientIsEFaturaRegistered === null) {
            throw new \InvalidArgumentException('Formal invoice routing requires an authoritative e-Fatura registration result.');
        }

        return $recipientIsEFaturaRegistered ? 'e_fatura' : 'e_arsiv';
    }

    public function requiredRecipientFields(bool $company = true): array
    {
        return $company
            ? ['legal_name', 'tax_number', 'email']
            : ['full_name', 'tckn_or_tax_number_when_required', 'email'];
    }
}
