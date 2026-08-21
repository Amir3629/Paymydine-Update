<?php

namespace App\Services\Financial;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

final class BillingGroupInvoiceService
{
    /** @var BillingGroupService */
    private $groups;

    public function __construct(BillingGroupService $groups)
    {
        $this->groups = $groups;
    }

    public function decorateSummary(array $summary): array
    {
        $publicId = trim((string)($summary['publicId'] ?? ''));
        if ($publicId === '') return $summary;

        $group = DB::table('pmd_billing_groups')->where('public_id', $publicId)->first();
        if (!$group) return $summary;

        $identity = $this->identity();
        // Fiskaly documents that a temporary missing TSS signature does not make
        // the receipt itself invalid. A remote `failed` state may therefore still
        // expose the canonical invoice with an explicit TSS-unavailable notice.
        // `blocked` is different: it represents unresolved merchant/tax policy.
        $fiscalReady = in_array((string)$group->fiscal_status, ['not_required', 'fiscalized', 'failed'], true);
        $available = (string)$group->mode === 'r36'
            && (string)$group->status === 'closed'
            && (string)$group->payment_status === 'paid'
            && trim((string)($group->invoice_number ?? '')) !== ''
            && $fiscalReady
            && $identity['confirmed'];

        $summary['fiscalStatus'] = (string)$group->fiscal_status;
        $summary['fiscalError'] = $group->fiscal_error ?? null;
        $summary['invoiceIdentityReady'] = $identity['confirmed'];
        $summary['invoiceAvailable'] = $available;
        $summary['invoiceNumber'] = $group->invoice_number ?? null;
        $summary['invoicedAt'] = $group->invoiced_at ?? null;
        $summary['invoiceDownloadToken'] = $available ? $this->token($group) : null;
        $summary['invoiceDownloadUrl'] = $available ? $this->url($group) : null;
        $summary['invoiceBlockedReason'] = $available ? null : $this->blockedReason($group, $identity);

        return $summary;
    }

    public function finalizeClosedPaidGroup(int $groupId): array
    {
        return DB::transaction(function () use ($groupId): array {
            $group = DB::table('pmd_billing_groups')->where('id', $groupId)->lockForUpdate()->first();
            if (!$group) throw new RuntimeException('Billing group not found.');

            $summary = $this->groups->summaryForPublicId((string)$group->public_id);
            if (!$summary) throw new RuntimeException('Billing group could not be refreshed.');
            $group = DB::table('pmd_billing_groups')->where('id', $groupId)->lockForUpdate()->first();

            if ((string)$group->mode !== 'r36') return $summary;
            if ((string)$group->payment_status === 'reconciliation_required') {
                throw new RuntimeException('Reconciliation must be resolved before final invoice creation.');
            }
            if ((string)$group->status !== 'closed' || (string)$group->payment_status !== 'paid') {
                throw new RuntimeException('Final invoice requires a closed, fully paid Billing Group.');
            }

            if (trim((string)($group->invoice_number ?? '')) === '') {
                $invoiceDate = now();
                $configured = function_exists('setting') ? trim((string)setting('invoice_prefix')) : '';
                $prefix = $configured !== '' && function_exists('parse_values')
                    ? parse_values([
                        'year' => $invoiceDate->year,
                        'month' => $invoiceDate->month,
                        'day' => $invoiceDate->day,
                        'hour' => $invoiceDate->hour,
                        'minute' => $invoiceDate->minute,
                        'second' => $invoiceDate->second,
                    ], $configured)
                    : 'INV-'.$invoiceDate->format('Y').'-00';
                $number = $prefix.'BG'.str_pad((string)$group->id, 6, '0', STR_PAD_LEFT);

                DB::table('pmd_billing_groups')->where('id', $group->id)->update([
                    'invoice_number' => $number,
                    'invoiced_at' => $invoiceDate,
                    'updated_at' => now(),
                ]);
            }

            $fresh = $this->groups->summaryForPublicId((string)$group->public_id) ?? $summary;
            return $this->decorateSummary($fresh);
        });
    }

    public function url($group): string
    {
        return '/api/v1/billing-groups/'.rawurlencode((string)$group->public_id)
            .'/invoice?token='.rawurlencode($this->token($group));
    }

    public function token($group): string
    {
        return hash_hmac('sha256', implode('|', [
            (string)$group->public_id,
            (string)$group->table_id,
            (string)$group->session_key,
            (string)$group->invoice_number,
        ]), (string)config('app.key', ''));
    }

    public function render(string $publicId, string $token): array
    {
        $group = DB::table('pmd_billing_groups')->where('public_id', trim($publicId))->first();
        if (!$group) throw new RuntimeException('Final Bill not found.');
        if ((string)$group->mode !== 'r36'
            || (string)$group->status !== 'closed'
            || (string)$group->payment_status !== 'paid'
            || trim((string)($group->invoice_number ?? '')) === '') {
            throw new RuntimeException('Final Bill invoice is not available yet.');
        }
        if (!in_array((string)$group->fiscal_status, ['not_required', 'fiscalized', 'failed'], true)) {
            throw new RuntimeException('Final Bill invoice is waiting for fiscal policy/fiscalization.');
        }

        $identity = $this->identity();
        if (!$identity['confirmed']) {
            throw new RuntimeException('Merchant invoice identity is not confirmed/configured.');
        }
        if (!hash_equals($this->token($group), trim($token))) {
            throw new RuntimeException('Invalid Final Bill invoice token.');
        }

        $links = DB::table('pmd_billing_group_orders')
            ->where('billing_group_id', $group->id)
            ->orderBy('order_id')
            ->get();
        $payments = DB::table('pmd_billing_group_payments')
            ->where('billing_group_id', $group->id)
            ->where('status', 'settled')
            ->orderBy('id')
            ->get();

        $escape = static fn ($value): string => htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $currency = strtoupper((string)$group->currency);
        $money = static fn (int $cents): string => number_format($cents / 100, 2, '.', '').' '.$currency;

        $itemRows = '';
        foreach ($links as $link) {
            $orderId = (int)$link->order_id;
            $items = DB::table('order_menus')->where('order_id', $orderId)->orderBy('order_menu_id')->get();
            foreach ($items as $item) {
                $itemRows .= '<tr><td>#'.$orderId.' · '.$escape($item->name).'</td>'
                    .'<td style="text-align:right">'.$escape($item->quantity).'</td>'
                    .'<td style="text-align:right">'.$money((int)round(((float)$item->subtotal) * 100)).'</td></tr>';
            }
        }

        $paymentRows = '';
        foreach ($payments as $payment) {
            $paymentRows .= '<tr><td>'.$escape(strtoupper((string)$payment->method)).'</td>'
                .'<td>'.$escape($payment->provider_reference ?: $payment->payment_id).'</td>'
                .'<td style="text-align:right">'.$money((int)$payment->payable_cents).'</td></tr>';
        }

        $vat = json_decode((string)($group->vat_snapshot ?? ''), true) ?: [];
        $serviceTax = (int)($vat['service_charge_tax_cents'] ?? 0);
        $childTax = (int)($vat['child_tax_cents'] ?? 0);
        $payable = max(0, (int)$group->total_cents + (int)$group->tip_cents - (int)$group->discount_cents);

        $merchant = '<section class="merchant"><strong>'.$escape($identity['legal_name']).'</strong><br>'
            .nl2br($escape($identity['legal_address']));
        if ($identity['tax_id'] !== '') $merchant .= '<br><strong>Tax ID / VAT ID:</strong> '.$escape($identity['tax_id']);
        $merchant .= '</section>';

        $fiscal = $this->fiscalHtml($group, $escape);
        $html = '<!doctype html><html><head><meta charset="utf-8"><title>'.$escape($group->invoice_number).'</title>'
            .'<style>body{font-family:Arial,sans-serif;max-width:820px;margin:32px auto;color:#17202a}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}.totals{margin-left:auto;max-width:390px}.muted{color:#667085}.merchant{margin-bottom:24px}.fiscal{margin-top:28px;padding:14px;border:1px solid #ddd;word-break:break-word}.fiscal-warning{border-color:#b54708;background:#fffaeb}</style>'
            .'</head><body>'.$merchant.'<h1>PayMyDine Final Bill</h1><p><strong>Invoice:</strong> '.$escape($group->invoice_number)
            .'<br><strong>Table:</strong> '.$escape($group->table_id)
            .'<br><strong>Visit:</strong> '.$escape($group->session_key)
            .'<br><strong>Date:</strong> '.$escape($group->invoiced_at).'</p>'
            .'<h2>Items</h2><table><thead><tr><th>Order / Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>'.$itemRows.'</tbody></table>'
            .'<table class="totals"><tr><td>Subtotal</td><td style="text-align:right">'.$money((int)$group->subtotal_cents).'</td></tr>'
            .'<tr><td>Service charge</td><td style="text-align:right">'.$money((int)$group->service_charge_cents).'</td></tr>'
            .($childTax > 0 ? '<tr><td>Recorded VAT on items</td><td style="text-align:right">'.$money($childTax).'</td></tr>' : '')
            .($serviceTax > 0 ? '<tr><td>Service charge VAT</td><td style="text-align:right">'.$money($serviceTax).'</td></tr>' : '')
            .((int)$group->discount_cents > 0 ? '<tr><td>Discount</td><td style="text-align:right">-'.$money((int)$group->discount_cents).'</td></tr>' : '')
            .((int)$group->tip_cents > 0 ? '<tr><td>Tip</td><td style="text-align:right">'.$money((int)$group->tip_cents).'</td></tr>' : '')
            .'<tr><td><strong>Total paid</strong></td><td style="text-align:right"><strong>'.$money($payable).'</strong></td></tr></table>'
            .'<h2>Payments</h2><table><thead><tr><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead><tbody>'.$paymentRows.'</tbody></table>'
            .$fiscal
            .'<p class="muted">Canonical PayMyDine Billing Group: '.$escape($group->public_id).'</p></body></html>';

        return [
            'html' => $html,
            'filename' => preg_replace('/[^A-Za-z0-9._-]+/', '-', (string)$group->invoice_number).'.html',
        ];
    }

    private function fiscalHtml($group, callable $escape): string
    {
        if ((string)$group->fiscal_status === 'not_required') {
            return '<section class="fiscal"><strong>Fiscal status:</strong> not required by the configured location integration.</section>';
        }
        if ((string)$group->fiscal_status === 'failed') {
            return '<section class="fiscal fiscal-warning"><h2>Fiscal / TSE evidence</h2>'
                .'<strong>TSS not available / signing failed.</strong> The sale and payment remain recorded. '
                .'The fiscal transaction must be retried/reconciled and included in the required fiscal export workflow.'
                .'<br><strong>TSS transaction ID:</strong> '.$escape($group->fiskaly_transaction_id ?? '')
                .'<br><strong>Error:</strong> '.$escape($group->fiscal_error ?? 'Unknown signing error').'</section>';
        }

        $receipt = json_decode((string)($group->fiskaly_receipt ?? ''), true) ?: [];
        $response = is_array($receipt['response'] ?? null) ? $receipt['response'] : [];
        $signature = is_array($response['signature'] ?? null) ? $response['signature'] : [];
        $rows = [
            'Fiscal provider' => $receipt['provider'] ?? 'fiskaly_sign_de_v2',
            'TSS transaction ID' => $receipt['transaction_id'] ?? $group->fiskaly_transaction_id,
            'Transaction number' => $response['number'] ?? null,
            'Start' => $response['time_start'] ?? null,
            'End' => $response['time_end'] ?? null,
            'TSS serial' => $response['tss_serial_number'] ?? ($signature['serial_number'] ?? null),
            'Client serial' => $response['client_serial_number'] ?? null,
            'Signature counter' => $signature['counter'] ?? null,
            'Signature timestamp' => $signature['timestamp'] ?? null,
            'Signature algorithm' => $signature['algorithm'] ?? null,
            'Signature public key' => $signature['public_key'] ?? null,
            'Signature' => $signature['value'] ?? null,
            'QR code data' => $response['qr_code_data'] ?? null,
        ];
        $html = '<section class="fiscal"><h2>Fiscal / TSE evidence</h2>';
        foreach ($rows as $label => $value) {
            if ($value === null || trim((string)$value) === '') continue;
            $html .= '<div><strong>'.$escape($label).':</strong> '.$escape($value).'</div>';
        }
        return $html.'</section>';
    }

    private function blockedReason($group, array $identity): ?string
    {
        if ((string)$group->status !== 'closed') return 'Final Bill is not closed yet.';
        if ((string)$group->payment_status !== 'paid') return 'Final Bill is not fully paid.';
        if (trim((string)($group->invoice_number ?? '')) === '') return 'Invoice number is not finalized.';
        if (!in_array((string)$group->fiscal_status, ['not_required', 'fiscalized', 'failed'], true)) {
            return 'Fiscal state is '.(string)$group->fiscal_status.'.';
        }
        if (!$identity['confirmed']) return 'Merchant invoice identity is not confirmed/configured.';
        return null;
    }

    private function identity(): array
    {
        $value = function (string $key, string $env = '', string $default = ''): string {
            try {
                if (function_exists('setting')) {
                    $candidate = setting($key, null);
                    if ($candidate !== null && trim((string)$candidate) !== '') return trim((string)$candidate);
                }
                if (Schema::hasTable('settings')) {
                    $candidate = DB::table('settings')->where('item', $key)->orderByDesc('setting_id')->value('value');
                    if ($candidate !== null && trim((string)$candidate) !== '') return trim((string)$candidate);
                }
            } catch (\Throwable $ignored) {
            }
            if ($env !== '') {
                try {
                    $candidate = env($env, '');
                    if (trim((string)$candidate) !== '') return trim((string)$candidate);
                } catch (\Throwable $ignored) {
                }
            }
            return $default;
        };

        $confirmed = in_array(strtolower($value('pmd_invoice_identity_confirmed', 'PMD_R36_INVOICE_IDENTITY_CONFIRMED', '0')), ['1', 'true', 'yes', 'on'], true);
        $legalName = $value('pmd_invoice_legal_name', 'PMD_R36_INVOICE_LEGAL_NAME');
        $legalAddress = $value('pmd_invoice_legal_address', 'PMD_R36_INVOICE_LEGAL_ADDRESS');
        $taxId = $value('pmd_invoice_tax_id', 'PMD_R36_INVOICE_TAX_ID');

        return [
            'confirmed' => $confirmed && $legalName !== '' && $legalAddress !== '' && $taxId !== '',
            'legal_name' => $legalName,
            'legal_address' => $legalAddress,
            'tax_id' => $taxId,
        ];
    }
}
