<?php

namespace App\Support\Billing;

class BillSnapshotBuilder
{
    protected function r($value): float
    {
        return round((float) $value, (int) config('billing.round_scale', 2));
    }

    public function resolveTaxMode(?string $taxMode = null): string
    {
        if (in_array($taxMode, ['included', 'add_at_end'], true)) {
            return $taxMode;
        }

        $envMode = env('PMD_TAX_MODE');
        if (in_array($envMode, ['included', 'add_at_end'], true)) {
            return $envMode;
        }

        return ((string) setting('tax_menu_price', '1')) === '1'
            ? 'included'
            : 'add_at_end';
    }

    /**
     * IMPORTANT:
     * Stored order_menus.subtotal / order_option_price are treated as NET values.
     * We derive gross display/fiscal values from them.
     */
    public function buildFromStoredOrder(array $items, float $tipAmount, ?string $taxMode = null): array
    {
        $taxMode = $this->resolveTaxMode($taxMode);

        $lines = [];
        $netSubtotal = 0.0;
        $grossSubtotal = 0.0;
        $vatTotal = 0.0;

        foreach ($items as $item) {
            $name = (string) ($item['name'] ?? '');
            $qty = max(1.0, (float) ($item['qty'] ?? 1));
            $storedNetLine = (float) ($item['line_total'] ?? 0);
            $taxRate = (float) ($item['tax_rate'] ?? 0);

            $netLine = $storedNetLine;
            $vatLine = $netLine * ($taxRate / 100);
            $grossLine = $netLine + $vatLine;

            $netUnit = $qty > 0 ? ($netLine / $qty) : $netLine;
            $grossUnit = $qty > 0 ? ($grossLine / $qty) : $grossLine;

            $netSubtotal += $netLine;
            $grossSubtotal += $grossLine;
            $vatTotal += $vatLine;

            $lines[] = [
                'name' => $name,
                'qty' => $this->r($qty),
                'tax_rate' => $this->r($taxRate),
                'stored_net_line_total' => $this->r($storedNetLine),
                'net_unit_price' => $this->r($netUnit),
                'gross_unit_price' => $this->r($grossUnit),
                'net_amount' => $this->r($netLine),
                'vat_amount' => $this->r($vatLine),
                'gross_amount' => $this->r($grossLine),
            ];
        }

        $tipAmount = $this->r($tipAmount);
        $netSubtotal = $this->r($netSubtotal);
        $grossSubtotal = $this->r($grossSubtotal);
        $vatTotal = $this->r($vatTotal);

        $displaySubtotal = $taxMode === 'included'
            ? $grossSubtotal
            : $netSubtotal;

        $displayTaxTitle = $taxMode === 'included'
            ? ('VAT included' . $this->formatRateLabelSuffix($lines))
            : ('VAT' . $this->formatRateLabelSuffix($lines));

        $displayTotal = $this->r($grossSubtotal + $tipAmount);

        return [
            'tax_mode' => $taxMode,
            'currency' => 'EUR',
            'lines' => $lines,

            'display' => [
                'subtotal' => $displaySubtotal,
                'tax_title' => $displayTaxTitle,
                'tax_value' => $vatTotal,
                'tip_title' => (string) config('billing.tip_label', 'Tip'),
                'tip_value' => $tipAmount,
                'total' => $displayTotal,
                'tax_is_included' => $taxMode === 'included',
            ],

            'fiscal' => [
                'subtotal_net' => $netSubtotal,
                'subtotal_gross' => $grossSubtotal,
                'vat_total' => $vatTotal,
                'tip_total' => $tipAmount,
                'total_amount' => $displayTotal,
                'items' => array_map(function (array $line): array {
                    return [
                        'name' => (string) $line['name'],
                        'quantity' => number_format((float) $line['qty'], 2, '.', ''),
                        'unit_price' => number_format((float) $line['gross_unit_price'], 2, '.', ''),
                        'total_price' => number_format((float) $line['gross_amount'], 2, '.', ''),
                        'vat_rate' => number_format((float) $line['tax_rate'], 2, '.', ''),
                    ];
                }, $lines),
            ],
        ];
    }

    protected function formatRateLabelSuffix(array $lines): string
    {
        $rates = [];

        foreach ($lines as $line) {
            $r = (float) ($line['tax_rate'] ?? 0);
            $rates[number_format($r, 2, '.', '')] = true;
        }

        $keys = array_keys($rates);
        if (!$keys) {
            return '';
        }

        $labels = array_map(function ($v) {
            return rtrim(rtrim($v, '0'), '.') . '%';
        }, $keys);

        return ' (' . implode(', ', $labels) . ')';
    }
}
