<?php


if (!function_exists('pmd_table_order_item_subtotal')) {
    function pmd_table_order_item_subtotal(array $items): float
    {
        return round(array_sum(array_map(function ($item) {
            if (is_object($item)) $item = (array)$item;
            return (float)($item['subtotal'] ?? (((float)($item['price'] ?? 0)) * ((float)($item['quantity'] ?? 0))));
        }, $items)), 4);
    }
}

if (!function_exists('pmd_table_order_tax_settings')) {
    function pmd_table_order_tax_settings(): array
    {
        $settings = [
            'tax_mode' => (string)setting('tax_mode', setting('tax_enabled', '0')),
            'tax_percentage' => (string)setting('tax_percentage', '0'),
            'tax_menu_price' => (string)setting('tax_menu_price', '1'),
        ];

        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('settings')) {
                $hasSerializedColumn = \Illuminate\Support\Facades\Schema::hasColumn('settings', 'serialized');
                $columns = $hasSerializedColumn ? ['item', 'value', 'serialized'] : ['item', 'value'];
                $rows = \Illuminate\Support\Facades\DB::table('settings')
                    ->whereIn('item', ['tax_mode', 'tax_enabled', 'tax_percentage', 'tax_menu_price'])
                    ->get($columns);

                $values = [];
                foreach ($rows as $row) {
                    $value = $row->value;
                    if ($hasSerializedColumn && (int)($row->serialized ?? 0) === 1 && is_string($value)) {
                        $decoded = @unserialize($value);
                        if ($decoded !== false || $value === 'b:0;') {
                            $value = $decoded;
                        }
                    }
                    if (is_bool($value)) {
                        $value = $value ? '1' : '0';
                    }
                    $values[(string)$row->item] = $value;
                }

                $settings['tax_mode'] = (string)($values['tax_mode'] ?? $values['tax_enabled'] ?? $settings['tax_mode']);
                $settings['tax_percentage'] = (string)($values['tax_percentage'] ?? $settings['tax_percentage']);
                $settings['tax_menu_price'] = (string)($values['tax_menu_price'] ?? $settings['tax_menu_price']);
            }
        } catch (\Throwable $ignored) {}

        return [
            'enabled' => $settings['tax_mode'] === '1',
            'percentage' => max(0.0, round((float)$settings['tax_percentage'], 4)),
            'menu_price' => $settings['tax_menu_price'], // 0=included, 1=add at checkout
        ];
    }
}

if (!function_exists('pmd_table_order_calculate_totals')) {
    function pmd_table_order_calculate_totals(array $items): array
    {
        $subtotal = pmd_table_order_item_subtotal($items);
        $tax = pmd_table_order_tax_settings();
        $taxAmount = 0.0;
        $total = $subtotal;
        $taxTitle = null;
        $taxSummable = 0;

        if (($tax['enabled'] ?? false) && (float)($tax['percentage'] ?? 0) > 0) {
            $rate = (float)$tax['percentage'];
            if ((string)($tax['menu_price'] ?? '1') === '1') {
                $taxAmount = round($subtotal * ($rate / 100), 4);
                $total = round($subtotal + $taxAmount, 4);
                $taxTitle = 'VAT ('.$rate.'%)';
                $taxSummable = 1;
            } else {
                $taxAmount = round($subtotal - ($subtotal / (1 + ($rate / 100))), 4);
                $total = round($subtotal, 4);
                $taxTitle = 'VAT included ('.$rate.'%)';
                $taxSummable = 0;
            }
        }

        $rows = [
            ['code' => 'subtotal', 'title' => 'Subtotal', 'value' => round($subtotal, 4), 'priority' => 1, 'is_summable' => 1],
        ];
        if ($taxTitle !== null) {
            $rows[] = ['code' => 'tax', 'title' => $taxTitle, 'value' => round($taxAmount, 4), 'priority' => 2, 'is_summable' => $taxSummable];
        }
        $rows[] = ['code' => 'total', 'title' => 'Total', 'value' => round($total, 4), 'priority' => 99, 'is_summable' => 0];

        return ['subtotal' => round($subtotal, 4), 'tax' => round($taxAmount, 4), 'total' => round($total, 4), 'rows' => $rows];
    }
}

if (!function_exists('pmd_table_order_totals_from_order')) {
    function pmd_table_order_totals_from_order(int $orderId, array $items, float $fallbackOrderTotal): array
    {
        $fallbackSubtotal = pmd_table_order_item_subtotal($items);
        $rows = [];
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('order_totals')) {
                $rows = \Illuminate\Support\Facades\DB::table('order_totals')
                    ->where('order_id', $orderId)
                    ->orderBy('priority')
                    ->orderBy('order_total_id')
                    ->get(['code', 'title', 'value', 'priority', 'is_summable'])
                    ->map(fn($row) => [
                        'code' => (string)($row->code ?? ''),
                        'title' => (string)($row->title ?? ''),
                        'value' => round((float)($row->value ?? 0), 4),
                        'priority' => (int)($row->priority ?? 0),
                        'is_summable' => (int)($row->is_summable ?? 0),
                    ])->values()->all();
            }
        } catch (\Throwable $ignored) {}

        $byCode = [];
        foreach ($rows as $row) {
            $code = strtolower((string)($row['code'] ?? ''));
            if ($code !== '' && !isset($byCode[$code])) $byCode[$code] = $row;
        }

        $subtotal = isset($byCode['subtotal']) ? (float)$byCode['subtotal']['value'] : $fallbackSubtotal;
        $tax = array_sum(array_map(fn($row) => strtolower((string)($row['code'] ?? '')) === 'tax' ? (float)($row['value'] ?? 0) : 0, $rows));
        $total = isset($byCode['total']) ? (float)$byCode['total']['value'] : (float)$fallbackOrderTotal;
        if ($total <= 0) $total = $fallbackSubtotal;

        return ['subtotal' => round($subtotal, 4), 'tax' => round($tax, 4), 'total' => round($total, 4), 'rows' => $rows];
    }
}
