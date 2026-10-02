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

        // PMD_INVENTORY_READY_R2
        // Table existence is the provisioning gate. Some tenant/schema
        // drivers can return a stale hasColumn() result immediately after
        // igniter:up even though the additive recipe-version migration ran.
        // Snapshot queries remain the authoritative schema validation.
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

        $lastCount = DB::table('pmd_inventory_counts as c')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'c.staff_id')
            ->where('c.location_id', $locationId)
            ->where('c.status', 'completed')
            ->orderByDesc('c.counted_at')
            ->orderByDesc('c.id')
            ->first([
                'c.*',
                's.staff_name as staff_name',
            ]);

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

        $recipeStarts = DB::table('pmd_inventory_recipes')
            ->where('location_id', $locationId)
            ->selectRaw('item_id, MIN(effective_from) as tracking_started_at')
            ->groupBy('item_id')
            ->get()
            ->keyBy('item_id');

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
            'waste_cost_today' => round(abs((float)DB::table('pmd_inventory_movements')
                ->where('location_id', $locationId)
                ->where('movement_type', 'WASTE')
                ->whereDate('occurred_at', $now->toDateString())
                ->selectRaw('COALESCE(SUM(ABS(qty_delta) * unit_cost), 0) as total')
                ->value('total')), 2),
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

            $trackingDays = 14.0;
            $trackingStartedAt = (string)($recipeStarts[$id]->tracking_started_at ?? '');
            if ($trackingStartedAt !== '') {
                try {
                    $trackedHours = max(
                        1,
                        \Carbon\Carbon::parse($trackingStartedAt)
                            ->diffInHours($now)
                    );
                    $trackingDays = max(
                        1,
                        min(14, $trackedHours / 24)
                    );
                } catch (\Throwable $ignored) {
                    $trackingDays = 14.0;
                }
            }

            $dailyUsage = round(
                ((float)($usage14[$id] ?? 0)) / $trackingDays,
                4
            );
            $daysLeft = $dailyUsage > 0
                ? max(0, round(max(0, $expected) / $dailyUsage, 1))
                : null;

            $par = max(0, (float)$item->par_level);
            $reorder = max(0, (float)$item->reorder_point);
            $percent = $par > 0
                ? max(0, min(100, round(($expected / $par) * 100)))
                : null;
            $suggestedOrderQty = $par > 0
                ? max(0, round($par - max(0, $expected), 4))
                : (
                    $reorder > 0
                        ? max(0, round($reorder - max(0, $expected), 4))
                        : 0
                );

            $status = 'healthy';
            $needsSetup = $expected <= 0
                && $par <= 0
                && $reorder <= 0
                && $dailyUsage <= 0;

            // PMD_INVENTORY_SETUP_STATUS_R7
            // A newly-created zero-stock item is not a shortage alert until
            // PayMyDine has either a target/reorder level or real sales usage.
            if ($needsSetup) {
                $status = 'setup';
            } elseif (
                $expected <= 0
                || ($reorder > 0 && $expected <= $reorder)
                || ($daysLeft !== null && $daysLeft <= 1.5)
            ) {
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
                'purchase_unit' => (string)($item->purchase_unit ?? $item->base_unit),
                'purchase_to_base' => round(max(0.0001, (float)($item->purchase_to_base ?? 1)), 4),
                'unit_cost' => round((float)$item->unit_cost, 4),
                'purchase_unit_cost' => round(
                    (float)$item->unit_cost * max(0.0001, (float)($item->purchase_to_base ?? 1)),
                    4
                ),
                'reorder_point' => round((float)$item->reorder_point, 4),
                'par_level' => round((float)$item->par_level, 4),
                'supplier_name' => (string)($item->supplier_name ?? ''),
                'estimated_on_hand' => $expected,
                'stock_value' => round($value, 2),
                'avg_daily_usage' => $dailyUsage,
                'used_since_count' => round($usage, 4),
                'tracking_days' => round($trackingDays, 2),
                'days_left' => $daysLeft,
                'stock_percent' => $percent,
                'suggested_order_qty' => $suggestedOrderQty,
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
            ->leftJoin('staffs as s', 's.staff_id', '=', 'r.created_by')
            ->where('r.location_id', $locationId)
            ->whereNotNull('r.confirmed_at')
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
                's.staff_name as staff_name',
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
                    'i.purchase_unit',
                    'i.purchase_to_base',
                    'm.qty_delta',
                    'm.unit_cost',
                ])
                ->groupBy('reference_id')
            : collect();

        foreach ($recentPurchases as &$purchase) {
            $receiptId = (int)($purchase['id'] ?? 0);
            $purchase['lines'] = collect($purchaseLines->get($receiptId, []))
                ->map(static function ($row) {
                    $baseUnit = (string)($row->unit ?? '');
                    $purchaseUnit = (string)($row->purchase_unit ?? $baseUnit);
                    $factor = max(0.0001, (float)($row->purchase_to_base ?? 1));
                    $showPackage = $purchaseUnit !== '' && strtolower($purchaseUnit) !== strtolower($baseUnit);

                    return [
                        'item_id' => (int)$row->item_id,
                        'item_name' => (string)($row->item_name ?? ''),
                        'unit' => $showPackage ? $purchaseUnit : $baseUnit,
                        'quantity' => round(
                            (float)$row->qty_delta / ($showPackage ? $factor : 1),
                            4
                        ),
                        'unit_cost' => round(
                            (float)$row->unit_cost * ($showPackage ? $factor : 1),
                            4
                        ),
                    ];
                })
                ->values()
                ->all();
        }
        unset($purchase);

        $recentWaste = DB::table('pmd_inventory_movements as m')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'm.item_id')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'm.staff_id')
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
                's.staff_name as staff_name',
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
                ->get(['menu_id', 'menu_name', 'menu_price'])
                ->map(fn ($row) => [
                    'id' => (int)$row->menu_id,
                    'name' => (string)$row->menu_name,
                    'price' => round((float)($row->menu_price ?? 0), 2),
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
                'staff_name' => (string)($lastCount->staff_name ?? ''),
                'age_hours' => max(0, round(
                    now()->diffInMinutes(\Carbon\Carbon::parse($lastCount->counted_at)) / 60,
                    1
                )),
            ] : null,
        ];
    }

    /**
     * PMD_MENU_INVENTORY_BRIDGE_R19
     *
     * Lightweight Menu-page data. Do not call the full inventory snapshot from
     * Menu: it calculates stock baselines, sales usage, shopping metrics and
     * history that the Menu stock-usage editor does not need.
     */
    public function menuStockUsageSnapshot(int $locationId): array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        $items = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'base_unit',
            ])
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'name' => (string)$row->name,
                'unit' => (string)$row->base_unit,
            ])
            ->all();

        $recipes = DB::table('pmd_inventory_recipes as r')
            ->leftJoin('menus as m', 'm.menu_id', '=', 'r.menu_id')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'r.item_id')
            ->where('r.location_id', $locationId)
            ->where('r.active', 1)
            ->orderBy('m.menu_name')
            ->orderBy('i.name')
            ->get([
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
                    'lines' => $group->map(static fn ($row) => [
                        'item_id' => (int)$row->item_id,
                        'item_name' => (string)$row->item_name,
                        'unit' => (string)$row->unit,
                        'qty_per_sale' => round((float)$row->qty_per_sale, 4),
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        return [
            'ready' => true,
            'items' => $items,
            'recipes' => $recipes,
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

        // PMD_INVENTORY_EASY_MAPPING_R5
        // Base/tracking unit stays immutable after creation. Supplier package
        // metadata may change safely because all movements are stored in base
        // units. Example: track in ml, buy by bottle, 1 bottle = 750 ml.
        $purchaseUnit = $this->unit(
            $data['purchase_unit'] ?? ($item->purchase_unit ?? $item->base_unit)
        );
        $purchaseToBaseRaw = $data['purchase_to_base'] ?? ($item->purchase_to_base ?? 1);
        $purchaseToBase = max(0.0001, $this->number($purchaseToBaseRaw, 1));

        if (
            strtolower($purchaseUnit) !== strtolower((string)$item->base_unit)
            && (!isset($data['purchase_to_base']) || trim((string)$data['purchase_to_base']) === '')
        ) {
            throw new InvalidArgumentException('Enter how much one purchase unit contains.');
        }

        $purchaseCost = max(
            0,
            $this->number(
                $data['purchase_cost']
                    ?? ((float)$item->unit_cost * $purchaseToBase),
                (float)$item->unit_cost * $purchaseToBase
            )
        );
        $baseUnitCost = $purchaseCost / $purchaseToBase;

        DB::table('pmd_inventory_items')
            ->where('id', $itemId)
            ->where('location_id', $locationId)
            ->update([
                'name' => mb_substr($name, 0, 190),
                'sku' => $this->nullableText($data['sku'] ?? null, 120),
                'category' => $this->nullableText($data['category'] ?? null, 100),
                'purchase_unit' => $purchaseUnit,
                'purchase_to_base' => $purchaseToBase,
                'unit_cost' => round($baseUnitCost, 6),
                'reorder_point' => round(
                    max(0, $this->number(
                        $data['reorder_point'] ?? ((float)$item->reorder_point / $purchaseToBase),
                        (float)$item->reorder_point / $purchaseToBase
                    )) * $purchaseToBase,
                    4
                ),
                'par_level' => round(
                    max(0, $this->number(
                        $data['par_level'] ?? ((float)$item->par_level / $purchaseToBase),
                        (float)$item->par_level / $purchaseToBase
                    )) * $purchaseToBase,
                    4
                ),
                'supplier_name' => $this->nullableText($data['supplier_name'] ?? $item->supplier_name, 190),
                'updated_at' => now(),
            ]);

        return $itemId;
    }

    public function archiveItem(int $locationId, ?int $staffId, int $itemId): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, $itemId);

        if ($itemId < 1) {
            throw new InvalidArgumentException('Stock item was not found.');
        }

        DB::transaction(function () use ($locationId, $itemId) {
            $item = DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', $itemId)
                ->where('active', 1)
                ->first();

            if (!$item) {
                throw new InvalidArgumentException('Stock item was not found.');
            }

            // PMD_INVENTORY_ARCHIVE_R7
            // Keep all historical movements/counts, but remove the item from
            // future operations and stop active menu recipes from consuming it.
            DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', $itemId)
                ->update([
                    'active' => 0,
                    'updated_at' => now(),
                ]);

            DB::table('pmd_inventory_recipes')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->where('active', 1)
                ->update([
                    'active' => 0,
                    'effective_to' => now(),
                    'updated_at' => now(),
                ]);
        });
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
        $purchaseUnit = $this->unit($data['purchase_unit'] ?? $unit);
        $purchaseToBaseRaw = $data['purchase_to_base'] ?? null;
        if (
            strtolower($purchaseUnit) !== strtolower($unit)
            && ($purchaseToBaseRaw === null || trim((string)$purchaseToBaseRaw) === '')
        ) {
            throw new InvalidArgumentException('Enter how much one purchase unit contains.');
        }
        $purchaseToBase = max(0.0001, $this->number($purchaseToBaseRaw ?? 1, 1));
        $openingPurchaseQty = max(0, $this->number($data['opening_qty'] ?? 0, 0));
        $openingQty = $openingPurchaseQty * $purchaseToBase;
        $purchaseCost = max(
            0,
            $this->number($data['purchase_cost'] ?? $data['unit_cost'] ?? 0, 0)
        );
        $cost = $purchaseCost / $purchaseToBase;

        $id = (int)DB::table('pmd_inventory_items')->insertGetId([
            'location_id' => $locationId,
            'name' => mb_substr($name, 0, 190),
            'sku' => $this->nullableText($data['sku'] ?? null, 120),
            'category' => $this->nullableText($data['category'] ?? null, 100),
            'base_unit' => $unit,
            'purchase_unit' => $purchaseUnit,
            'purchase_to_base' => $purchaseToBase,
            'unit_cost' => round($cost, 6),
            'reorder_point' => round(
                max(0, $this->number($data['reorder_point'] ?? 0, 0)) * $purchaseToBase,
                4
            ),
            'par_level' => round(
                max(0, $this->number($data['par_level'] ?? 0, 0)) * $purchaseToBase,
                4
            ),
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
                if (!empty($receipt->confirmed_at)) {
                    throw new InvalidArgumentException('This supplier bill has already been added to stock.');
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
                $unitCost = max(0, $this->number($line['unit_cost'] ?? 0, 0));

                if ($itemId < 1) {
                    if ($name === '') {
                        throw new InvalidArgumentException('Each purchase line needs an item.');
                    }

                    $existing = DB::table('pmd_inventory_items')
                        ->where('location_id', $locationId)
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                        ->where('active', 1)
                        ->first();

                    if ($existing) {
                        $baseUnit = strtolower((string)$existing->base_unit);
                        $purchaseUnit = strtolower((string)($existing->purchase_unit ?? $existing->base_unit));
                        $lineUnit = strtolower($unit);

                        if ($lineUnit !== $baseUnit && $lineUnit !== $purchaseUnit) {
                            throw new InvalidArgumentException(
                                'Purchase unit for '.$name.' must be '.$existing->base_unit.
                                ($purchaseUnit !== $baseUnit ? ' or '.($existing->purchase_unit ?? $existing->base_unit) : '').
                                '.'
                            );
                        }
                    }

                    if ($existing) {
                        $itemId = (int)$existing->id;
                    } else {
                        // PMD_INVENTORY_PURCHASE_CATALOG_R7
                        // When a first supplier purchase matches the global
                        // catalogue, preserve useful recipe units automatically.
                        // Example: 5 kg tomatoes becomes a stock item tracked in
                        // grams and purchased in kg (1 kg = 1000 g).
                        $catalog = PmdInventoryStockCatalog::bestMatch($name);
                        $catalogBaseUnit = $catalog
                            ? $this->unit($catalog['unit'] ?? $unit)
                            : $unit;
                        $catalogPurchaseUnit = $catalog
                            ? $this->unit($catalog['purchase_unit'] ?? $catalogBaseUnit)
                            : $unit;
                        $catalogFactorRaw = $catalog['purchase_to_base'] ?? null;
                        $catalogFactor = $catalogFactorRaw !== null
                            ? max(0.0001, (float)$catalogFactorRaw)
                            : null;
                        $lineUnit = strtolower($unit);

                        $useCatalogUnits = $catalog
                            && (
                                (
                                    strtolower($catalogBaseUnit) === strtolower($catalogPurchaseUnit)
                                    && $lineUnit === strtolower($catalogBaseUnit)
                                )
                                || (
                                    $catalogFactor !== null
                                    && (
                                        $lineUnit === strtolower($catalogBaseUnit)
                                        || $lineUnit === strtolower($catalogPurchaseUnit)
                                    )
                                )
                            );

                        $newBaseUnit = $useCatalogUnits ? $catalogBaseUnit : $unit;
                        $newPurchaseUnit = $useCatalogUnits ? $catalogPurchaseUnit : $unit;
                        $newFactor = $useCatalogUnits ? ($catalogFactor ?? 1.0) : 1.0;
                        $newBaseCost = $unitCost;

                        if (
                            $useCatalogUnits
                            && strtolower($unit) === strtolower($newPurchaseUnit)
                            && $newFactor > 0
                        ) {
                            $newBaseCost = $unitCost / $newFactor;
                        }

                        $itemId = (int)DB::table('pmd_inventory_items')->insertGetId([
                            'location_id' => $locationId,
                            'name' => mb_substr($name, 0, 190),
                            'sku' => null,
                            // PMD_INVENTORY_INLINE_PURCHASE_R19
                            // A custom item created directly from the Purchases
                            // workspace may provide a reviewed category. Global
                            // catalogue metadata still wins when available.
                            'category' => $catalog['category']
                                ?? $this->nullableText($line['category'] ?? null, 100),
                            'base_unit' => $newBaseUnit,
                            'purchase_unit' => $newPurchaseUnit,
                            'purchase_to_base' => $newFactor,
                            'unit_cost' => round($newBaseCost, 6),
                            'reorder_point' => 0,
                            'par_level' => 0,
                            'supplier_name' => $supplier ?: null,
                            'active' => 1,
                            'created_by' => $staffId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }

                $item = DB::table('pmd_inventory_items')
                    ->where('location_id', $locationId)
                    ->where('id', $itemId)
                    ->first();
                if (!$item) {
                    throw new InvalidArgumentException('A purchase line references an unavailable stock item.');
                }

                $baseUnit = strtolower((string)$item->base_unit);
                $purchaseUnit = strtolower((string)($item->purchase_unit ?? $item->base_unit));
                $purchaseToBase = max(0.0001, (float)($item->purchase_to_base ?? 1));
                $lineUnit = strtolower($unit);

                if ($lineUnit === $baseUnit) {
                    $factor = 1.0;
                } elseif ($lineUnit === $purchaseUnit) {
                    $factor = $purchaseToBase;
                } else {
                    throw new InvalidArgumentException(
                        'Purchase unit for '.$item->name.' must be '.$item->base_unit.
                        ($purchaseUnit !== $baseUnit ? ' or '.($item->purchase_unit ?? $item->base_unit) : '').
                        '.'
                    );
                }

                $baseQty = $qty * $factor;
                $effectiveCost = $unitCost > 0
                    ? ($unitCost / $factor)
                    : max(0, (float)$item->unit_cost);

                DB::table('pmd_inventory_items')
                    ->where('id', $itemId)
                    ->update([
                        'unit_cost' => round($effectiveCost, 6),
                        'supplier_name' => $supplier ?: $item->supplier_name,
                        'updated_at' => now(),
                    ]);

                $this->movement(
                    $locationId,
                    $itemId,
                    'PURCHASE',
                    $baseQty,
                    $effectiveCost,
                    $staffId,
                    null,
                    null,
                    'purchase_receipt',
                    $receiptId,
                    $purchasedAt.' '.now()->format('H:i:s')
                );

                $total += $qty * ($unitCost > 0 ? $unitCost : ($effectiveCost * $factor));
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
            $now = now();
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

                $current = DB::table('pmd_inventory_recipes')
                    ->where('location_id', $locationId)
                    ->where('menu_id', $menuId)
                    ->where('item_id', $itemId)
                    ->where('active', 1)
                    ->orderByDesc('effective_from')
                    ->orderByDesc('id')
                    ->first();

                if (
                    $current
                    && abs((float)$current->qty_per_sale - $qty) < 0.00005
                ) {
                    DB::table('pmd_inventory_recipes')
                        ->where('id', (int)$current->id)
                        ->update([
                            'updated_by' => $staffId,
                            'updated_at' => $now,
                        ]);
                    continue;
                }

                if ($current) {
                    DB::table('pmd_inventory_recipes')
                        ->where('id', (int)$current->id)
                        ->update([
                            'active' => 0,
                            'effective_to' => $now,
                            'updated_by' => $staffId,
                            'updated_at' => $now,
                        ]);
                }

                DB::table('pmd_inventory_recipes')->insert([
                    'location_id' => $locationId,
                    'menu_id' => $menuId,
                    'item_id' => $itemId,
                    'qty_per_sale' => $qty,
                    'active' => 1,
                    'effective_from' => $now,
                    'effective_to' => null,
                    'updated_by' => $staffId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $remove = DB::table('pmd_inventory_recipes')
                ->where('location_id', $locationId)
                ->where('menu_id', $menuId)
                ->where('active', 1);

            if ($keptItemIds) {
                $remove->whereNotIn(
                    'item_id',
                    array_values(array_unique($keptItemIds))
                );
            }

            $remove->update([
                'active' => 0,
                'effective_to' => $now,
                'updated_by' => $staffId,
                'updated_at' => $now,
            ]);
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

                $counted = max(0, $this->number($line['counted_qty'] ?? 0, 0));
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
                    ->where('r.location_id', '=', $locationId);
            })
            ->whereBetween('o.created_at', [$start, $end])
            // Every historical order is multiplied by the recipe quantity
            // that was effective when that order was created.
            ->whereColumn('o.created_at', '>=', 'r.effective_from')
            ->where(function ($recipeWindow) {
                $recipeWindow
                    ->whereNull('r.effective_to')
                    ->orWhereColumn('o.created_at', '<', 'r.effective_to');
            });

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

        // PMD_INVENTORY_PAID_SALES_USAGE_R21
        // Stock consumption follows the financial authority. A recipe is
        // deducted as soon as its order is fully paid, even if the kitchen
        // lifecycle is still Received / Preparing / Ready. This also prevents
        // unpaid preparation orders from reducing theoretical on-hand stock.
        $hasFinancialPaidSignal =
            in_array('settlement_status', $orderCols, true)
            || in_array('settled_at', $orderCols, true)
            || (
                in_array('settled_amount', $orderCols, true)
                && in_array('order_total', $orderCols, true)
            );

        if ($hasFinancialPaidSignal) {
            $q->where(function ($paid) use ($orderCols) {
                $hasBranch = false;

                if (in_array('settlement_status', $orderCols, true)) {
                    $paid->whereIn('o.settlement_status', ['paid', 'settled']);
                    $hasBranch = true;
                }

                if (in_array('settled_at', $orderCols, true)) {
                    if ($hasBranch) {
                        $paid->orWhereNotNull('o.settled_at');
                    } else {
                        $paid->whereNotNull('o.settled_at');
                    }
                    $hasBranch = true;
                }

                if (
                    in_array('settled_amount', $orderCols, true)
                    && in_array('order_total', $orderCols, true)
                ) {
                    $amountScope = function ($amount) {
                        $amount
                            ->where('o.order_total', '>', 0)
                            ->whereColumn('o.settled_amount', '>=', 'o.order_total');
                    };

                    if ($hasBranch) {
                        $paid->orWhere($amountScope);
                    } else {
                        $paid->where($amountScope);
                    }
                }
            });
        } elseif (in_array('status_id', $orderCols, true)) {
            // Legacy tenants without settlement columns keep the historical
            // operational fallback until their order schema is upgraded.
            $consuming = array_values(array_unique(array_merge(
                $this->settingIds('processing_order_status'),
                $this->settingIds('completed_order_status')
            )));
            if ($consuming) {
                $q->whereIn('o.status_id', $consuming);
            }
        }

        // PMD_INVENTORY_USAGE_ALIAS_R4
        // TastyIgniter prefixes query-builder aliases too. For example
        // "order_menus as om" becomes "ti_order_menus as ti_om".
        // Raw SQL does not rewrite "om.quantity" / "r.item_id", which caused
        // the production error "Unknown column r.item_id". Build the raw
        // aggregate with the physical prefixed alias names instead.
        $prefix = (string)DB::connection()->getTablePrefix();
        $omAlias = str_replace('`', '``', $prefix.'om');
        $recipeAlias = str_replace('`', '``', $prefix.'r');

        return $q
            ->selectRaw(
                sprintf(
                    '`%s`.`item_id` as item_id, SUM(`%s`.`quantity` * `%s`.`qty_per_sale`) as used_qty',
                    $recipeAlias,
                    $omAlias,
                    $recipeAlias
                )
            )
            ->groupByRaw(sprintf('`%s`.`item_id`', $recipeAlias))
            ->get()
            ->mapWithKeys(static fn ($row) => [
                (int)$row->item_id => round((float)$row->used_qty, 4),
            ])
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
                    $menuQuery = DB::table('menus')->whereIn('menu_id', $ids);
                    if (Schema::hasColumn('menus', 'menu_status')) {
                        $menuQuery->where('menu_status', 1);
                    }

                    return $menuQuery
                        ->pluck('menu_id')
                        ->map(static fn ($id) => (int)$id)
                        ->filter()
                        ->unique()
                        ->values()
                        ->all();
                }
            }
        } catch (\Throwable $error) {
            // Legacy tenants without locationable menu rows safely fall back
            // to the tenant's menu catalogue below.
        }

        $menuQuery = DB::table('menus');
        if (Schema::hasColumn('menus', 'menu_status')) {
            $menuQuery->where('menu_status', 1);
        }

        return $menuQuery
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
