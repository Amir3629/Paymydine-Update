<?php

namespace App\Services\Inventory;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

/**
 * PMD_INVENTORY_CONTROL_SERVICE_R1
 *
 * One restaurant inventory authority for purchases, recipes, expected usage,
 * physical counts, waste and variance. It intentionally reports unexplained
 * variance rather than making accusations about staff intent.
 */
final class PmdInventoryControlService
{
    private const TABLES = [
        'pmd_inventory_items',
        'pmd_inventory_receipts',
        'pmd_inventory_movements',
        'pmd_inventory_recipes',
        'pmd_inventory_counts',
        'pmd_inventory_count_lines',
    ];

    public function ready(): bool
    {
        foreach (self::TABLES as $table) {
            if (!Schema::hasTable($table)) {
                return false;
            }
        }
        return true;
    }

    public function snapshot(int $locationId): array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $now = now();

        $items = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderBy('name')
            ->get();

        $lastCount = DB::table('pmd_inventory_counts')
            ->where('location_id', $locationId)
            ->where('status', 'completed')
            ->orderByDesc('counted_at')
            ->orderByDesc('id')
            ->first();

        $baselineAt = $lastCount
            ? (string)$lastCount->counted_at
            : null;

        $countLines = [];
        if ($lastCount) {
            $countLines = DB::table('pmd_inventory_count_lines')
                ->where('count_id', (int)$lastCount->id)
                ->get()
                ->keyBy('item_id')
                ->all();
        }

        $movementRows = DB::table('pmd_inventory_movements')
            ->where('location_id', $locationId)
            ->when($baselineAt, fn ($q) => $q->where('occurred_at', '>', $baselineAt))
            ->selectRaw('item_id, SUM(qty_delta) as qty_delta')
            ->groupBy('item_id')
            ->get()
            ->keyBy('item_id');

        $usageSinceCount = $this->soldUsageByItem(
            $locationId,
            $baselineAt ?: $this->earliestItemDate($items),
            $now->toDateTimeString()
        );

        $usage14 = $this->soldUsageByItem(
            $locationId,
            $now->copy()->subDays(14)->toDateTimeString(),
            $now->toDateTimeString()
        );

        $latestVariance = [];
        if ($lastCount) {
            foreach ($countLines as $itemId => $line) {
                $latestVariance[(int)$itemId] = [
                    'qty' => round((float)($line->variance_qty ?? 0), 4),
                    'cost' => round(
                        (float)($line->variance_qty ?? 0) *
                        (float)($line->unit_cost_snapshot ?? 0),
                        2
                    ),
                ];
            }
        }

        $rows = [];
        $summary = [
            'estimated_stock_value' => 0.0,
            'waste_cost_30d' => $this->movementCost($locationId, 'WASTE', 30),
            'purchases_cost_30d' => $this->movementCost($locationId, 'PURCHASE', 30),
            'unexplained_loss_value' => 0.0,
            'critical_items' => 0,
            'low_items' => 0,
            'tracked_items' => count($items),
            'recipe_coverage_pct' => $this->recipeCoverage($locationId),
        ];

        foreach ($items as $item) {
            $id = (int)$item->id;
            $createdAt = (string)($item->created_at ?? $now->toDateTimeString());

            if (isset($countLines[$id])) {
                $baselineQty = (float)$countLines[$id]->counted_qty;
                $movements = (float)($movementRows[$id]->qty_delta ?? 0);
                $usage = (float)($usageSinceCount[$id] ?? 0);
            } else {
                // Item added after the latest count: start from its own creation.
                $baselineQty = 0.0;
                $movements = (float)DB::table('pmd_inventory_movements')
                    ->where('location_id', $locationId)
                    ->where('item_id', $id)
                    ->where('occurred_at', '>=', $createdAt)
                    ->sum('qty_delta');
                $usage = (float)($this->soldUsageByItem(
                    $locationId,
                    $createdAt,
                    $now->toDateTimeString(),
                    [$id]
                )[$id] ?? 0);
            }

            $expected = round($baselineQty + $movements - $usage, 4);
            $dailyUsage = round(((float)($usage14[$id] ?? 0)) / 14, 4);
            $daysLeft = $dailyUsage > 0
                ? max(0, round(max(0, $expected) / $dailyUsage, 1))
                : null;

            $par = max(0, (float)$item->par_level);
            $reorder = max(0, (float)$item->reorder_point);
            $percent = $par > 0
                ? max(0, min(100, round(($expected / $par) * 100)))
                : null;

            $status = 'healthy';
            if ($expected <= 0 || ($reorder > 0 && $expected <= $reorder) || ($daysLeft !== null && $daysLeft <= 1.5)) {
                $status = 'critical';
                $summary['critical_items']++;
            } elseif (
                ($par > 0 && $expected <= ($par * .4))
                || ($daysLeft !== null && $daysLeft <= 3)
            ) {
                $status = 'low';
                $summary['low_items']++;
            }

            $variance = $latestVariance[$id] ?? ['qty' => 0.0, 'cost' => 0.0];
            if ($variance['cost'] < 0) {
                $summary['unexplained_loss_value'] += abs($variance['cost']);
            }

            $value = max(0, $expected) * max(0, (float)$item->unit_cost);
            $summary['estimated_stock_value'] += $value;

            $rows[] = [
                'id' => $id,
                'name' => (string)$item->name,
                'sku' => (string)($item->sku ?? ''),
                'category' => (string)($item->category ?? ''),
                'unit' => (string)$item->base_unit,
                'unit_cost' => round((float)$item->unit_cost, 4),
                'reorder_point' => round((float)$item->reorder_point, 4),
                'par_level' => round((float)$item->par_level, 4),
                'supplier_name' => (string)($item->supplier_name ?? ''),
                'estimated_on_hand' => $expected,
                'stock_value' => round($value, 2),
                'avg_daily_usage' => $dailyUsage,
                'days_left' => $daysLeft,
                'stock_percent' => $percent,
                'status' => $status,
                'last_variance_qty' => (float)$variance['qty'],
                'last_variance_cost' => round((float)$variance['cost'], 2),
            ];
        }

        foreach ([
            'estimated_stock_value',
            'waste_cost_30d',
            'purchases_cost_30d',
            'unexplained_loss_value',
        ] as $key) {
            $summary[$key] = round((float)$summary[$key], 2);
        }

        $recentPurchases = DB::table('pmd_inventory_receipts as r')
            ->where('r.location_id', $locationId)
            ->orderByDesc('r.purchased_at')
            ->orderByDesc('r.id')
            ->limit(15)
            ->get([
                'r.id',
                'r.supplier_name',
                'r.purchased_at',
                'r.source',
                'r.ai_status',
                'r.total_amount',
                'r.confirmed_at',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $purchaseIds = array_values(array_filter(array_map(
            static fn ($row) => (int)($row['id'] ?? 0),
            $recentPurchases
        )));
        $purchaseLines = $purchaseIds
            ? DB::table('pmd_inventory_movements as m')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'm.item_id')
                ->where('m.location_id', $locationId)
                ->where('m.movement_type', 'PURCHASE')
                ->where('m.reference_type', 'purchase_receipt')
                ->whereIn('m.reference_id', $purchaseIds)
                ->orderBy('m.id')
                ->get([
                    'm.reference_id',
                    'm.item_id',
                    'i.name as item_name',
                    'i.base_unit as unit',
                    'm.qty_delta',
                    'm.unit_cost',
                ])
                ->groupBy('reference_id')
            : collect();

        foreach ($recentPurchases as &$purchase) {
            $receiptId = (int)($purchase['id'] ?? 0);
            $purchase['lines'] = collect($purchaseLines->get($receiptId, []))
                ->map(static fn ($row) => [
                    'item_id' => (int)$row->item_id,
                    'item_name' => (string)($row->item_name ?? ''),
                    'unit' => (string)($row->unit ?? ''),
                    'quantity' => round((float)$row->qty_delta, 4),
                    'unit_cost' => round((float)$row->unit_cost, 4),
                ])
                ->values()
                ->all();
        }
        unset($purchase);

        $recentWaste = DB::table('pmd_inventory_movements as m')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'm.item_id')
            ->where('m.location_id', $locationId)
            ->where('m.movement_type', 'WASTE')
            ->orderByDesc('m.occurred_at')
            ->limit(15)
            ->get([
                'm.id',
                'm.item_id',
                'i.name as item_name',
                'm.qty_delta',
                'm.unit_cost',
                'm.reason',
                'm.note',
                'm.occurred_at',
            ])
            ->map(function ($row) {
                $data = (array)$row;
                $data['qty'] = abs((float)$data['qty_delta']);
                $data['cost'] = round($data['qty'] * (float)$data['unit_cost'], 2);
                return $data;
            })
            ->all();

        $recipes = DB::table('pmd_inventory_recipes as r')
            ->leftJoin('menus as m', 'm.menu_id', '=', 'r.menu_id')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'r.item_id')
            ->where('r.location_id', $locationId)
            ->where('r.active', 1)
            ->orderBy('m.menu_name')
            ->orderBy('i.name')
            ->get([
                'r.id',
                'r.menu_id',
                'm.menu_name',
                'r.item_id',
                'i.name as item_name',
                'i.base_unit as unit',
                'r.qty_per_sale',
            ])
            ->groupBy('menu_id')
            ->map(function ($group) {
                $first = $group->first();
                return [
                    'menu_id' => (int)$first->menu_id,
                    'menu_name' => (string)($first->menu_name ?: ('Menu #'.$first->menu_id)),
                    'lines' => $group->map(fn ($row) => [
                        'item_id' => (int)$row->item_id,
                        'item_name' => (string)$row->item_name,
                        'unit' => (string)$row->unit,
                        'qty_per_sale' => round((float)$row->qty_per_sale, 4),
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        $locationMenuIds = $this->locationMenuIds($locationId);
        $menus = Schema::hasTable('menus')
            ? DB::table('menus')
                ->when(
                    $locationMenuIds,
                    fn ($query) => $query->whereIn('menu_id', $locationMenuIds)
                )
                ->orderBy('menu_name')
                ->get(['menu_id', 'menu_name'])
                ->map(fn ($row) => [
                    'id' => (int)$row->menu_id,
                    'name' => (string)$row->menu_name,
                ])
                ->all()
            : [];

        return [
            'ready' => true,
            'generated_at' => $now->toIso8601String(),
            'summary' => $summary,
            'items' => $rows,
            'menus' => $menus,
            'recipes' => $recipes,
            'recent_purchases' => $recentPurchases,
            'recent_waste' => $recentWaste,
            'last_count' => $lastCount ? [
                'id' => (int)$lastCount->id,
                'counted_at' => (string)$lastCount->counted_at,
                'note' => (string)($lastCount->note ?? ''),
                'age_hours' => max(0, round(
                    now()->diffInMinutes(\Carbon\Carbon::parse($lastCount->counted_at)) / 60,
                    1
                )),
            ] : null,
        ];
    }

    public function saveItem(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));

        if ($itemId < 1) {
            return $this->addItem($locationId, $staffId, $data);
        }

        $item = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $itemId)
            ->where('active', 1)
            ->first();

        if (!$item) {
            throw new InvalidArgumentException('Stock item was not found.');
        }

        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Item name is required.');
        }

        $duplicate = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', '<>', $itemId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->where('active', 1)
            ->exists();
        if ($duplicate) {
            throw new InvalidArgumentException('Another stock item already uses this name.');
        }

        // Unit is intentionally immutable after creation. Historical
        // movements and recipe quantities use this base unit and must never
        // silently change meaning because somebody edited a label.
        DB::table('pmd_inventory_items')
            ->where('id', $itemId)
            ->where('location_id', $locationId)
            ->update([
                'name' => mb_substr($name, 0, 190),
                'sku' => $this->nullableText($data['sku'] ?? null, 120),
                'category' => $this->nullableText($data['category'] ?? null, 100),
                'unit_cost' => $this->number($data['unit_cost'] ?? $item->unit_cost, (float)$item->unit_cost),
                'reorder_point' => $this->number($data['reorder_point'] ?? $item->reorder_point, (float)$item->reorder_point),
                'par_level' => $this->number($data['par_level'] ?? $item->par_level, (float)$item->par_level),
                'supplier_name' => $this->nullableText($data['supplier_name'] ?? $item->supplier_name, 190),
                'updated_at' => now(),
            ]);

        return $itemId;
    }

    public function addItem(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Item name is required.');
        }

        $duplicate = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->where('active', 1)
            ->exists();
        if ($duplicate) {
            throw new InvalidArgumentException('A stock item with this name already exists.');
        }

        $unit = $this->unit($data['unit'] ?? 'piece');
        $openingQty = $this->number($data['opening_qty'] ?? 0, 0);
        $cost = $this->number($data['unit_cost'] ?? 0, 0);

        $id = (int)DB::table('pmd_inventory_items')->insertGetId([
            'location_id' => $locationId,
            'name' => mb_substr($name, 0, 190),
            'sku' => $this->nullableText($data['sku'] ?? null, 120),
            'category' => $this->nullableText($data['category'] ?? null, 100),
            'base_unit' => $unit,
            'unit_cost' => $cost,
            'reorder_point' => $this->number($data['reorder_point'] ?? 0, 0),
            'par_level' => $this->number($data['par_level'] ?? 0, 0),
            'supplier_name' => $this->nullableText($data['supplier_name'] ?? null, 190),
            'active' => 1,
            'created_by' => $staffId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($openingQty > 0) {
            $this->movement(
                $locationId,
                $id,
                'OPENING',
                $openingQty,
                $cost,
                $staffId,
                'Opening stock',
                null,
                null,
                null
            );
        }

        return $id;
    }

    public function savePurchase(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        $lines = $this->arrayValue($data['lines'] ?? []);
        if (!$lines) {
            throw new InvalidArgumentException('Add at least one purchase line.');
        }

        $supplier = trim((string)($data['supplier_name'] ?? ''));
        $purchasedAt = $this->date((string)($data['purchased_at'] ?? now()->toDateString()));
        $receiptId = max(0, (int)($data['receipt_id'] ?? 0));

        return DB::transaction(function () use (
            $locationId,
            $staffId,
            $data,
            $lines,
            $supplier,
            $purchasedAt,
            $receiptId
        ) {
            $source = $receiptId > 0 ? 'ai_receipt' : 'manual';

            if ($receiptId > 0) {
                $receipt = DB::table('pmd_inventory_receipts')
                    ->where('location_id', $locationId)
                    ->where('id', $receiptId)
                    ->first();
                if (!$receipt) {
                    throw new InvalidArgumentException('Receipt review was not found.');
                }
            } else {
                $receiptId = (int)DB::table('pmd_inventory_receipts')->insertGetId([
                    'location_id' => $locationId,
                    'supplier_name' => $supplier ?: null,
                    'purchased_at' => $purchasedAt,
                    'source' => 'manual',
                    'ai_status' => 'not_requested',
                    'total_amount' => 0,
                    'created_by' => $staffId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $total = 0.0;
            foreach ($lines as $line) {
                if (!is_array($line)) {
                    continue;
                }

                $qty = $this->number($line['quantity'] ?? 0, 0);
                if ($qty <= 0) {
                    continue;
                }

                $itemId = max(0, (int)($line['item_id'] ?? 0));
                $name = trim((string)($line['item_name'] ?? ''));
                $unit = $this->unit($line['unit'] ?? 'piece');
                $unitCost = $this->number($line['unit_cost'] ?? 0, 0);

                if ($itemId < 1) {
                    if ($name === '') {
                        throw new InvalidArgumentException('Each purchase line needs an item.');
                    }

                    $existing = DB::table('pmd_inventory_items')
                        ->where('location_id', $locationId)
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                        ->where('active', 1)
                        ->first();

                    if (
                        $existing
                        && strtolower((string)$existing->base_unit) !== strtolower($unit)
                    ) {
                        throw new InvalidArgumentException(
                            'Purchase unit for '.$name.' must match its stock unit ('.$existing->base_unit.').'
                        );
                    }

                    $itemId = $existing
                        ? (int)$existing->id
                        : (int)DB::table('pmd_inventory_items')->insertGetId([
                            'location_id' => $locationId,
                            'name' => mb_substr($name, 0, 190),
                            'base_unit' => $unit,
                            'unit_cost' => $unitCost,
                            'reorder_point' => 0,
                            'par_level' => 0,
                            'supplier_name' => $supplier ?: null,
                            'active' => 1,
                            'created_by' => $staffId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                }

                $item = DB::table('pmd_inventory_items')
                    ->where('location_id', $locationId)
                    ->where('id', $itemId)
                    ->first();
                if (!$item) {
                    throw new InvalidArgumentException('A purchase line references an unavailable stock item.');
                }

                DB::table('pmd_inventory_items')
                    ->where('id', $itemId)
                    ->update([
                        'unit_cost' => $unitCost > 0 ? $unitCost : (float)$item->unit_cost,
                        'supplier_name' => $supplier ?: $item->supplier_name,
                        'updated_at' => now(),
                    ]);

                $this->movement(
                    $locationId,
                    $itemId,
                    'PURCHASE',
                    $qty,
                    $unitCost,
                    $staffId,
                    null,
                    null,
                    'purchase_receipt',
                    $receiptId,
                    $purchasedAt.' '.now()->format('H:i:s')
                );

                $total += $qty * $unitCost;
            }

            DB::table('pmd_inventory_receipts')
                ->where('id', $receiptId)
                ->where('location_id', $locationId)
                ->update([
                    'supplier_name' => $supplier ?: null,
                    'purchased_at' => $purchasedAt,
                    'source' => $source,
                    'total_amount' => round($total, 4),
                    'ai_status' => $receiptId > 0 && $source === 'ai_receipt' ? 'confirmed' : 'not_requested',
                    'confirmed_at' => now(),
                    'updated_at' => now(),
                ]);

            return $receiptId;
        });
    }

    public function recordWaste(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $qty = $this->number($data['quantity'] ?? 0, 0);

        if ($itemId < 1 || $qty <= 0) {
            throw new InvalidArgumentException('Choose an item and enter the wasted quantity.');
        }

        $item = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $itemId)
            ->where('active', 1)
            ->first();
        if (!$item) {
            throw new InvalidArgumentException('Stock item was not found.');
        }

        return $this->movement(
            $locationId,
            $itemId,
            'WASTE',
            -abs($qty),
            (float)$item->unit_cost,
            $staffId,
            $this->nullableText($data['reason'] ?? null, 160),
            $this->nullableText($data['note'] ?? null, 2000),
            'waste',
            null,
            now()->toDateTimeString()
        );
    }

    public function saveRecipe(int $locationId, ?int $staffId, array $data): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $menuId = max(0, (int)($data['menu_id'] ?? 0));
        $lines = $this->arrayValue($data['lines'] ?? []);

        if ($menuId < 1) {
            throw new InvalidArgumentException('Choose a menu item.');
        }

        if (!Schema::hasTable('menus') || !DB::table('menus')->where('menu_id', $menuId)->exists()) {
            throw new InvalidArgumentException('Menu item was not found.');
        }

        $locationMenus = $this->locationMenuIds($locationId);
        if ($locationMenus && !in_array($menuId, $locationMenus, true)) {
            throw new InvalidArgumentException('Menu item does not belong to this restaurant location.');
        }

        DB::transaction(function () use ($locationId, $staffId, $menuId, $lines) {
            $keptItemIds = [];

            foreach ($lines as $line) {
                if (!is_array($line)) {
                    continue;
                }

                $itemId = max(0, (int)($line['item_id'] ?? 0));
                $qty = $this->number($line['qty_per_sale'] ?? 0, 0);
                if ($itemId < 1 || $qty <= 0) {
                    continue;
                }

                $exists = DB::table('pmd_inventory_items')
                    ->where('location_id', $locationId)
                    ->where('id', $itemId)
                    ->where('active', 1)
                    ->exists();
                if (!$exists) {
                    continue;
                }

                $keptItemIds[] = $itemId;
                $existing = DB::table('pmd_inventory_recipes')
                    ->where('location_id', $locationId)
                    ->where('menu_id', $menuId)
                    ->where('item_id', $itemId)
                    ->first();

                if ($existing) {
                    // Preserve created_at: it is the point from which this
                    // menu-to-stock relationship is allowed to explain sales.
                    DB::table('pmd_inventory_recipes')
                        ->where('id', (int)$existing->id)
                        ->update([
                            'qty_per_sale' => $qty,
                            'active' => 1,
                            'updated_by' => $staffId,
                            'updated_at' => now(),
                        ]);
                } else {
                    DB::table('pmd_inventory_recipes')->insert([
                        'location_id' => $locationId,
                        'menu_id' => $menuId,
                        'item_id' => $itemId,
                        'qty_per_sale' => $qty,
                        'active' => 1,
                        'updated_by' => $staffId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            $remove = DB::table('pmd_inventory_recipes')
                ->where('location_id', $locationId)
                ->where('menu_id', $menuId);

            if ($keptItemIds) {
                $remove->whereNotIn('item_id', array_values(array_unique($keptItemIds)));
            }

            $remove->delete();
        });
    }

    public function completeCount(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $lines = $this->arrayValue($data['lines'] ?? []);
        if (!$lines) {
            throw new InvalidArgumentException('Enter the physical stock count.');
        }

        $activeItemIds = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->pluck('id')
            ->map(static fn ($id) => (int)$id)
            ->values()
            ->all();

        $submittedItemIds = array_values(array_unique(array_filter(array_map(
            static fn ($line) => is_array($line) ? (int)($line['item_id'] ?? 0) : 0,
            $lines
        ))));

        if (
            count($activeItemIds) !== count($submittedItemIds)
            || array_diff($activeItemIds, $submittedItemIds)
        ) {
            throw new InvalidArgumentException(
                'Count every active stock item so the new inventory baseline is complete.'
            );
        }

        $snapshot = $this->snapshot($locationId);
        $expected = [];
        $costs = [];
        foreach ((array)$snapshot['items'] as $item) {
            $expected[(int)$item['id']] = (float)$item['estimated_on_hand'];
            $costs[(int)$item['id']] = (float)$item['unit_cost'];
        }

        return DB::transaction(function () use (
            $locationId,
            $staffId,
            $data,
            $lines,
            $expected,
            $costs
        ) {
            $countId = (int)DB::table('pmd_inventory_counts')->insertGetId([
                'location_id' => $locationId,
                'status' => 'completed',
                'staff_id' => $staffId,
                'counted_at' => now(),
                'note' => $this->nullableText($data['note'] ?? null, 2000),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $seen = [];
            foreach ($lines as $line) {
                if (!is_array($line)) {
                    continue;
                }

                $itemId = max(0, (int)($line['item_id'] ?? 0));
                if ($itemId < 1 || isset($seen[$itemId]) || !array_key_exists($itemId, $expected)) {
                    continue;
                }
                $seen[$itemId] = true;

                $counted = $this->number($line['counted_qty'] ?? 0, 0);
                $expectedQty = (float)$expected[$itemId];

                DB::table('pmd_inventory_count_lines')->insert([
                    'count_id' => $countId,
                    'item_id' => $itemId,
                    'expected_qty' => $expectedQty,
                    'counted_qty' => $counted,
                    'variance_qty' => round($counted - $expectedQty, 4),
                    'unit_cost_snapshot' => (float)($costs[$itemId] ?? 0),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $countId;
        });
    }

    public function createReceiptReview(
        int $locationId,
        ?int $staffId,
        array $fileMeta,
        ?array $aiPayload,
        ?string $aiError = null
    ): int {
        $this->assertReady();
        $locationId = $this->location($locationId);

        return (int)DB::table('pmd_inventory_receipts')->insertGetId([
            'location_id' => $locationId,
            'supplier_name' => $aiPayload['supplier_name'] ?? null,
            'purchased_at' => $aiPayload['purchase_date'] ?? now()->toDateString(),
            'source' => 'ai_receipt',
            'file_path' => (string)($fileMeta['path'] ?? ''),
            'original_name' => (string)($fileMeta['original_name'] ?? ''),
            'mime_type' => (string)($fileMeta['mime_type'] ?? ''),
            'ai_status' => $aiPayload ? 'review' : 'manual_review',
            'ai_payload_json' => json_encode(
                $aiPayload ?: ['error' => $aiError],
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'total_amount' => (float)($aiPayload['total_amount'] ?? 0),
            'created_by' => $staffId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function soldUsageByItem(
        int $locationId,
        ?string $start,
        string $end,
        array $onlyItemIds = []
    ): array {
        if (!$start || !Schema::hasTable('orders') || !Schema::hasTable('order_menus')) {
            return [];
        }

        $orderCols = Schema::getColumnListing('orders');
        $menuCols = Schema::getColumnListing('order_menus');
        if (
            !in_array('order_id', $orderCols, true)
            || !in_array('order_id', $menuCols, true)
            || !in_array('menu_id', $menuCols, true)
            || !in_array('quantity', $menuCols, true)
        ) {
            return [];
        }

        $q = DB::table('order_menus as om')
            ->join('orders as o', 'o.order_id', '=', 'om.order_id')
            ->join('pmd_inventory_recipes as r', function ($join) use ($locationId) {
                $join->on('r.menu_id', '=', 'om.menu_id')
                    ->where('r.location_id', '=', $locationId)
                    ->where('r.active', '=', 1);
            })
            ->whereBetween('o.created_at', [$start, $end])
            // A recipe cannot explain consumption that happened before the
            // restaurant linked that stock item to the menu item.
            ->whereColumn('o.created_at', '>=', 'r.created_at');

        if (in_array('location_id', $orderCols, true)) {
            $q->where('o.location_id', $locationId);
        }

        if ($onlyItemIds) {
            $q->whereIn('r.item_id', array_values(array_unique(array_map('intval', $onlyItemIds))));
        }

        $canceled = $this->settingIds('canceled_order_status');
        if ($canceled && in_array('status_id', $orderCols, true)) {
            $q->whereNotIn('o.status_id', $canceled);
        }

        // Mirror the restaurant's existing stock-consumption lifecycle where
        // possible: preparation/processing and completed orders represent
        // actual kitchen/bar consumption better than a merely-created order.
        if (in_array('status_id', $orderCols, true)) {
            $consuming = array_values(array_unique(array_merge(
                $this->settingIds('processing_order_status'),
                $this->settingIds('completed_order_status')
            )));
            if ($consuming) {
                $q->whereIn('o.status_id', $consuming);
            }
        }

        return $q
            ->selectRaw('r.item_id, SUM(om.quantity * r.qty_per_sale) as used_qty')
            ->groupBy('r.item_id')
            ->pluck('used_qty', 'r.item_id')
            ->map(fn ($qty) => round((float)$qty, 4))
            ->all();
    }

    private function movementCost(int $locationId, string $type, int $days): float
    {
        $row = DB::table('pmd_inventory_movements')
            ->where('location_id', $locationId)
            ->where('movement_type', $type)
            ->where('occurred_at', '>=', now()->subDays($days))
            ->selectRaw('SUM(ABS(qty_delta) * unit_cost) as total')
            ->first();

        return round((float)($row->total ?? 0), 2);
    }

    private function recipeCoverage(int $locationId): int
    {
        if (!Schema::hasTable('menus')) {
            return 0;
        }

        $menuIds = $this->locationMenuIds($locationId);
        $menus = $menuIds
            ? count($menuIds)
            : max(0, (int)DB::table('menus')->count());

        if ($menus < 1) {
            return 0;
        }

        $coveredQuery = DB::table('pmd_inventory_recipes')
            ->where('location_id', $locationId)
            ->where('active', 1);

        if ($menuIds) {
            $coveredQuery->whereIn('menu_id', $menuIds);
        }

        $covered = (int)$coveredQuery
            ->distinct()
            ->count('menu_id');

        return (int)round(min(100, ($covered / $menus) * 100));
    }

    private function locationMenuIds(int $locationId): array
    {
        if (!Schema::hasTable('menus')) {
            return [];
        }

        try {
            if (
                Schema::hasTable('locationables')
                && Schema::hasColumn('locationables', 'location_id')
                && Schema::hasColumn('locationables', 'locationable_id')
                && Schema::hasColumn('locationables', 'locationable_type')
            ) {
                $ids = DB::table('locationables')
                    ->where('location_id', $locationId)
                    ->where('locationable_type', 'menus')
                    ->pluck('locationable_id')
                    ->map(static fn ($id) => (int)$id)
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                if ($ids) {
                    return $ids;
                }
            }
        } catch (\Throwable $error) {
            // Legacy tenants without locationable menu rows safely fall back
            // to the tenant's menu catalogue below.
        }

        return DB::table('menus')
            ->pluck('menu_id')
            ->map(static fn ($id) => (int)$id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function movement(
        int $locationId,
        int $itemId,
        string $type,
        float $qtyDelta,
        float $unitCost,
        ?int $staffId,
        ?string $reason,
        ?string $note,
        ?string $referenceType,
        ?int $referenceId,
        ?string $occurredAt
    ): int {
        return (int)DB::table('pmd_inventory_movements')->insertGetId([
            'location_id' => $locationId,
            'item_id' => $itemId,
            'movement_type' => $type,
            'qty_delta' => round($qtyDelta, 4),
            'unit_cost' => round(max(0, $unitCost), 4),
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'reason' => $reason,
            'note' => $note,
            'staff_id' => $staffId,
            'occurred_at' => $occurredAt ?: now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function earliestItemDate($items): ?string
    {
        $earliest = null;
        foreach ($items as $item) {
            $value = (string)($item->created_at ?? '');
            if ($value !== '' && ($earliest === null || $value < $earliest)) {
                $earliest = $value;
            }
        }
        return $earliest ?: now()->toDateTimeString();
    }

    private function settingIds(string $key): array
    {
        try {
            $value = setting($key, []);
            if (is_string($value)) {
                $decoded = @unserialize($value);
                if (is_array($decoded)) {
                    $value = $decoded;
                } elseif (str_contains($value, ',')) {
                    $value = explode(',', $value);
                } else {
                    $value = [$value];
                }
            }

            return array_values(array_unique(array_filter(array_map(
                'intval',
                (array)$value
            ))));
        } catch (\Throwable $error) {
            return [];
        }
    }

    private function assertReady(): void
    {
        if (!$this->ready()) {
            throw new RuntimeException(
                'Inventory Control is not provisioned yet. Run the PayMyDine inventory migration first.'
            );
        }
    }

    private function location(int $locationId): int
    {
        $locationId = max(0, $locationId);
        if ($locationId < 1) {
            throw new InvalidArgumentException('No restaurant location is selected.');
        }
        return $locationId;
    }

    private function number($value, float $fallback = 0): float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return $fallback;
        }
        return round((float)$value, 4);
    }

    private function unit($value): string
    {
        $value = strtolower(trim((string)$value));
        return mb_substr($value !== '' ? $value : 'piece', 0, 30);
    }

    private function date(string $value): string
    {
        $value = trim($value);
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)
            ? $value
            : now()->toDateString();
    }

    private function nullableText($value, int $limit): ?string
    {
        $value = trim((string)($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $limit);
    }

    private function arrayValue($value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }
}
