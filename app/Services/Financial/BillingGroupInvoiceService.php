<?php

namespace App\Services\Financial;

use Illuminate\Support\Facades\DB;
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

        $available = (string)$group->mode === 'r36'
            && (string)$group->status === 'closed'
            && (string)$group->payment_status === 'paid'
            && trim((string)($group->invoice_number ?? '')) !== '';

        $summary['invoiceAvailable'] = $available;
        $summary['invoiceNumber'] = $group->invoice_number ?? null;
        $summary['invoicedAt'] = $group->invoiced_at ?? null;
        $summary['invoiceDownloadToken'] = $available ? $this->token($group) : null;
        $summary['invoiceDownloadUrl'] = $available ? $this->url($group) : null;

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

        $html = '<!doctype html><html><head><meta charset="utf-8"><title>'.$escape($group->invoice_number).'</title>'
            .'<style>body{font-family:Arial,sans-serif;max-width:820px;margin:32px auto;color:#17202a}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}.totals{margin-left:auto;max-width:390px}.muted{color:#667085}</style>'
            .'</head><body><h1>PayMyDine Final Bill</h1><p><strong>Invoice:</strong> '.$escape($group->invoice_number)
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
            .'<p class="muted">Canonical PayMyDine Billing Group: '.$escape($group->public_id).'</p></body></html>';

        return [
            'html' => $html,
            'filename' => preg_replace('/[^A-Za-z0-9._-]+/', '-', (string)$group->invoice_number).'.html',
        ];
    }
}
