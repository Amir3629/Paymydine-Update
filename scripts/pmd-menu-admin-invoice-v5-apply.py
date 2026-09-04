from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OLD_JS = ROOT / 'app/admin/assets/js/pmd-menu-gallery-options-v1.js'
OLD_CSS = ROOT / 'app/admin/assets/css/pmd-menu-gallery-options-v1.css'
NEW_JS = ROOT / 'app/admin/assets/js/pmd-menu-gallery-options-v5.js'
NEW_CSS = ROOT / 'app/admin/assets/css/pmd-menu-gallery-options-v5.css'
ASSETS = ROOT / 'app/admin/views/_meta/assets.json'
INVOICE = ROOT / 'app/admin/views/orders/customer_invoice.blade.php'

for path in [OLD_JS, OLD_CSS, ASSETS, INVOICE]:
    if not path.exists():
        raise SystemExit(f'missing required file: {path}')

# Hard cache bust: same V4 behavior, brand-new filenames in Admin asset manifest.
js = OLD_JS.read_text()
css = OLD_CSS.read_text()
NEW_JS.write_text('// PMD_MENU_GALLERY_OPTIONS_V5_CACHE_BUST\n' + js)
NEW_CSS.write_text('/* PMD_MENU_GALLERY_OPTIONS_V5_CACHE_BUST */\n' + css)

assets = json.loads(ASSETS.read_text())
style_hits = 0
script_hits = 0
for entry in assets.get('style', []):
    if entry.get('path') == 'css/pmd-menu-gallery-options-v1.css':
        entry['path'] = 'css/pmd-menu-gallery-options-v5.css'
        entry['name'] = 'pmd-menu-gallery-options-v5-css'
        style_hits += 1
for entry in assets.get('script', []):
    if entry.get('path') == 'js/pmd-menu-gallery-options-v1.js':
        entry['path'] = 'js/pmd-menu-gallery-options-v5.js'
        entry['name'] = 'pmd-menu-gallery-options-v5-js'
        script_hits += 1
if style_hits != 1 or script_hits != 1:
    raise SystemExit(f'unexpected asset manifest matches: style={style_hits} script={script_hits}')
ASSETS.write_text(json.dumps(assets, indent=4, ensure_ascii=False) + '\n')

invoice = INVOICE.read_text()

old_rows = """    $rows = $model->getOrderMenusWithOptions();\n\n    $taxRow = $orderTotals->firstWhere('code', 'tax');"""
new_rows = r"""    $rows = $model->getOrderMenusWithOptions();

    // PMD_CUSTOMER_INVOICE_OPTION_LINES_V5
    // QR table orders store the configured unit price in order_menus.price and
    // decorate the item name (e.g. "Chicken — Ketchab"). The standard order
    // relation may expose menu_options directly. Build one display model that
    // supports both without changing historical order totals.
    $orderMenuOptionPayloads = collect();
    try {
        $orderMenuOptionPayloads = \Illuminate\Support\Facades\DB::table('order_menus')
            ->where('order_id', (int)$model->order_id)
            ->pluck('option_values', 'order_menu_id');
    } catch (\Throwable $e) {
        $orderMenuOptionPayloads = collect();
    }

    $invoiceItemLines = collect();
    $normalizeOptionName = function ($value) {
        $value = trim((string)$value);
        return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    };

    foreach ($rows as $row) {
        $qty = max(1, (float)($row->quantity ?? 1));
        $rawName = trim((string)($row->name ?? 'Item'));
        $nameParts = preg_split('/\s+—\s+/u', $rawName, 2);
        $baseName = trim((string)($nameParts[0] ?? $rawName));
        $decoratedNames = [];
        if (isset($nameParts[1]) && trim((string)$nameParts[1]) !== '') {
            $decoratedNames = array_values(array_filter(array_map('trim', explode(',', (string)$nameParts[1]))));
        }
        $isConfiguredQrLine = count($decoratedNames) > 0;

        $optionLines = [];
        $seen = [];

        // Standard TastyIgniter orders: preserve historical order option rows.
        foreach (collect($row->menu_options ?? []) as $option) {
            $name = trim((string)($option->order_option_name ?? ''));
            if ($name === '') continue;
            $unitPrice = (float)($option->order_option_price ?? $option->price ?? 0);
            $optionQty = max(1, (float)($option->quantity ?? 1));
            $key = $normalizeOptionName($name);
            if (isset($seen[$key])) continue;
            $seen[$key] = true;
            $optionLines[] = [
                'name' => $name,
                'unit_price' => $unitPrice,
                'line_total' => $optionQty * $unitPrice,
            ];
        }

        // QR orders currently keep selected value IDs in order_menus.option_values
        // while the human-readable names remain in the decorated order item name.
        // Resolve both against the canonical option tables so existing paid orders
        // can print a base food line plus separate modifier lines.
        if ($isConfiguredQrLine && empty($optionLines)) {
            $stored = $orderMenuOptionPayloads->get((int)($row->order_menu_id ?? 0));
            $selectedIds = [];
            if (is_string($stored) && trim($stored) !== '') {
                $decoded = json_decode($stored, true);
                if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                    $decoded = @unserialize($stored);
                }
                if (is_array($decoded)) {
                    $walkIds = function ($value) use (&$walkIds, &$selectedIds) {
                        if (is_array($value)) {
                            foreach ($value as $child) $walkIds($child);
                            return;
                        }
                        if (is_numeric($value) && (int)$value > 0) $selectedIds[] = (int)$value;
                    };
                    $walkIds($decoded);
                }
            }
            $selectedIds = array_values(array_unique($selectedIds));

            $available = collect();
            try {
                $available = \Illuminate\Support\Facades\DB::table('menu_option_values as mov')
                    ->join('menu_item_option_values as miov', 'mov.option_value_id', '=', 'miov.option_value_id')
                    ->join('menu_item_options as mio', 'miov.menu_option_id', '=', 'mio.menu_option_id')
                    ->leftJoin('menu_options as mo', 'mio.option_id', '=', 'mo.option_id')
                    ->where('mio.menu_id', (int)($row->menu_id ?? 0))
                    ->get([
                        'mov.option_value_id',
                        'mov.value',
                        'mov.price as base_option_price',
                        'miov.new_price as menu_option_price',
                        'mo.option_name as option_group_name',
                    ]);
            } catch (\Throwable $e) {
                $available = collect();
            }

            $byName = [];
            $byId = [];
            foreach ($available as $candidate) {
                $candidateName = trim((string)($candidate->value ?? ''));
                $candidatePrice = $candidate->menu_option_price !== null
                    ? (float)$candidate->menu_option_price
                    : (float)($candidate->base_option_price ?? 0);
                $record = [
                    'name' => $candidateName,
                    'unit_price' => $candidatePrice,
                    'line_total' => $qty * $candidatePrice,
                ];
                if ($candidateName !== '') $byName[$normalizeOptionName($candidateName)] = $record;
                $byId[(int)($candidate->option_value_id ?? 0)] = $record;
            }

            // Decorated names preserve the customer's original display order and
            // also recover multi-select values even though the legacy QR ID map can
            // collapse duplicate group keys.
            foreach ($decoratedNames as $decoratedName) {
                $key = $normalizeOptionName($decoratedName);
                if (isset($seen[$key])) continue;
                $record = $byName[$key] ?? [
                    'name' => $decoratedName,
                    'unit_price' => null,
                    'line_total' => null,
                ];
                $optionLines[] = $record;
                $seen[$key] = true;
            }

            foreach ($selectedIds as $selectedId) {
                if (!isset($byId[$selectedId])) continue;
                $record = $byId[$selectedId];
                $key = $normalizeOptionName($record['name']);
                if (isset($seen[$key])) continue;
                $optionLines[] = $record;
                $seen[$key] = true;
            }
        }

        $fullUnitPrice = (float)($row->price ?? 0);
        $baseUnitPrice = $fullUnitPrice;

        if ($isConfiguredQrLine) {
            $knownOptionUnit = 0.0;
            $unpricedIndexes = [];
            foreach ($optionLines as $index => $optionLine) {
                if ($optionLine['unit_price'] === null) {
                    $unpricedIndexes[] = $index;
                } else {
                    $knownOptionUnit += (float)$optionLine['unit_price'];
                }
            }

            // Current canonical base price gives a safe fallback for historical QR
            // rows whose old option definition has since disappeared.
            $currentBasePrice = null;
            try {
                $currentBasePrice = \Illuminate\Support\Facades\DB::table('menus')
                    ->where('menu_id', (int)($row->menu_id ?? 0))
                    ->value('menu_price');
                $currentBasePrice = is_numeric($currentBasePrice) ? (float)$currentBasePrice : null;
            } catch (\Throwable $e) {
                $currentBasePrice = null;
            }

            if ($currentBasePrice !== null && $currentBasePrice >= 0 && $currentBasePrice <= $fullUnitPrice + 0.0001) {
                $baseUnitPrice = $currentBasePrice;
                $availableOptionUnit = max(0, $fullUnitPrice - $baseUnitPrice);
                $remainingOptionUnit = max(0, $availableOptionUnit - $knownOptionUnit);
                if (count($unpricedIndexes) === 1) {
                    $idx = $unpricedIndexes[0];
                    $optionLines[$idx]['unit_price'] = $remainingOptionUnit;
                    $optionLines[$idx]['line_total'] = $qty * $remainingOptionUnit;
                    $knownOptionUnit += $remainingOptionUnit;
                    $unpricedIndexes = [];
                }
                if (empty($unpricedIndexes) && abs(($baseUnitPrice + $knownOptionUnit) - $fullUnitPrice) > 0.01) {
                    $baseUnitPrice = max(0, $fullUnitPrice - $knownOptionUnit);
                }
            } else {
                $baseUnitPrice = max(0, $fullUnitPrice - $knownOptionUnit);
            }

            foreach ($optionLines as $index => $optionLine) {
                if ($optionLine['unit_price'] !== null) {
                    $optionLines[$index]['line_total'] = $qty * (float)$optionLine['unit_price'];
                }
            }
        }

        $invoiceItemLines->push((object)[
            'quantity' => $qty,
            'name' => $baseName !== '' ? $baseName : $rawName,
            'base_line_total' => $qty * $baseUnitPrice,
            'options' => $optionLines,
        ]);
    }

    $taxRow = $orderTotals->firstWhere('code', 'tax');"""
if old_rows not in invoice:
    raise SystemExit('customer invoice rows anchor not found')
invoice = invoice.replace(old_rows, new_rows, 1)

old_css_anchor = ".items td:last-child { width:24%; text-align:right; white-space:nowrap; }"
new_css_anchor = old_css_anchor + "\n        .items tr.option-row td { padding-top:0; color:#444; font-size:10px; }\n        .items tr.option-row td:first-child { padding-left:12px; }\n        .items tr.option-row td:last-child { font-weight:600; }"
if old_css_anchor not in invoice:
    raise SystemExit('customer invoice css anchor not found')
invoice = invoice.replace(old_css_anchor, new_css_anchor, 1)

pattern = re.compile(r'''    <table class="items" width="100%" cellspacing="0" cellpadding="0">\n        @foreach\(\$rows as \$row\).*?    </table>''', re.S)
new_table = r'''    <table class="items" width="100%" cellspacing="0" cellpadding="0">
        @foreach($invoiceItemLines as $itemLine)
            @php
                $qtyLabel = rtrim(rtrim(number_format((float)$itemLine->quantity, 2, '.', ''), '0'), '.');
            @endphp
            <tr class="item-row">
                <td>{{ $qtyLabel }} x {{ $itemLine->name }}</td>
                <td>{{ number_format((float)$itemLine->base_line_total, 2) }}</td>
            </tr>
            @foreach($itemLine->options as $optionLine)
                <tr class="option-row">
                    <td>+ {{ $optionLine['name'] }}</td>
                    <td>
                        @if($optionLine['line_total'] !== null)
                            +{{ number_format((float)$optionLine['line_total'], 2) }}
                        @else
                            —
                        @endif
                    </td>
                </tr>
            @endforeach
        @endforeach
    </table>'''
invoice, count = pattern.subn(new_table, invoice, count=1)
if count != 1:
    raise SystemExit(f'customer invoice table replacement count={count}')

INVOICE.write_text(invoice)

# Source-level safety assertions.
checks = {
    NEW_JS: ['PMD_MENU_GALLERY_OPTIONS_V5_CACHE_BUST', 'Must choose', 'data-pmd-gallery-remove-new'],
    NEW_CSS: ['PMD_MENU_GALLERY_OPTIONS_V5_CACHE_BUST', 'height:46px', 'pmd-menu-option-value__default'],
    ASSETS: ['pmd-menu-gallery-options-v5.css', 'pmd-menu-gallery-options-v5.js'],
    INVOICE: ['PMD_CUSTOMER_INVOICE_OPTION_LINES_V5', 'base_line_total', "<tr class=\"option-row\">"],
}
for path, needles in checks.items():
    text = path.read_text()
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'missing {needle!r} in {path}')

print('PMD V5 admin cache bust + invoice option lines applied.')
