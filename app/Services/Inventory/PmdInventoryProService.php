<?php

namespace App\Services\Inventory;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

/**
 * PMD_INVENTORY_PRO_R24
 *
 * Additive professional inventory operations on top of the stable R22/R23
 * inventory ledger. Existing inventory movements remain the quantity authority.
 */
final class PmdInventoryProService
{
    private const TABLES = [
        'pmd_inventory_suppliers',
        'pmd_inventory_supplier_items',
        'pmd_inventory_item_identifiers',
        'pmd_inventory_storage_locations',
        'pmd_inventory_storage_movements',
        'pmd_inventory_lots',
        'pmd_inventory_purchase_orders',
        'pmd_inventory_purchase_order_lines',
        'pmd_inventory_preparations',
        'pmd_inventory_preparation_lines',
        'pmd_inventory_production_batches',
        'pmd_inventory_price_history',
        'pmd_inventory_alert_states',
        'pmd_inventory_settings',
    ];

    public function ready(): bool
    {
        foreach (self::TABLES as $table) {
            if (!Schema::hasTable($table)) {
                return false;
            }
        }

        return Schema::hasTable('pmd_inventory_items')
            && Schema::hasTable('pmd_inventory_movements');
    }

    public function snapshot(int $locationId): array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $this->ensureDefaults($locationId);

        $core = app(PmdInventoryControlService::class)->snapshot($locationId);
        $items = collect((array)($core['items'] ?? []))->keyBy('id');

        $suppliers = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => (array)$row)
            ->all();

        $supplierItems = DB::table('pmd_inventory_supplier_items as si')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'si.supplier_id')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'si.item_id')
            ->where('si.location_id', $locationId)
            ->where('si.active', 1)
            ->orderByDesc('si.is_preferred')
            ->orderBy('i.name')
            ->get([
                'si.*',
                's.name as supplier_name',
                'i.name as item_name',
                'i.base_unit as base_unit',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $identifiers = DB::table('pmd_inventory_item_identifiers as x')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'x.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'x.supplier_id')
            ->where('x.location_id', $locationId)
            ->where('x.active', 1)
            ->orderByDesc('x.is_primary')
            ->orderBy('i.name')
            ->get([
                'x.*',
                'i.name as item_name',
                'i.base_unit as base_unit',
                's.name as supplier_name',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $storageLocations = DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => (array)$row)
            ->all();

        $storageBalances = DB::table('pmd_inventory_storage_movements as sm')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'sm.item_id')
            ->leftJoin('pmd_inventory_storage_locations as sl', 'sl.id', '=', 'sm.storage_location_id')
            ->where('sm.location_id', $locationId)
            ->groupBy('sm.storage_location_id', 'sm.item_id', 'i.name', 'i.base_unit', 'sl.name')
            ->get([
                'sm.storage_location_id',
                'sm.item_id',
                'i.name as item_name',
                'i.base_unit as unit',
                'sl.name as storage_name',
                DB::raw('SUM(sm.qty_delta) as qty'),
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $allocatedByItem = [];
        foreach ($storageBalances as $row) {
            $itemId = (int)($row['item_id'] ?? 0);
            $allocatedByItem[$itemId] = ($allocatedByItem[$itemId] ?? 0.0) + (float)($row['qty'] ?? 0);
        }

        $unallocated = [];
        foreach ($items as $itemId => $item) {
            $onHand = (float)($item['estimated_on_hand'] ?? 0);
            $allocated = (float)($allocatedByItem[(int)$itemId] ?? 0);
            $difference = round($onHand - $allocated, 4);
            if (abs($difference) > 0.00005) {
                $unallocated[] = [
                    'item_id' => (int)$itemId,
                    'item_name' => (string)($item['name'] ?? ''),
                    'unit' => (string)($item['unit'] ?? ''),
                    'qty' => $difference,
                ];
            }
        }

        $lots = DB::table('pmd_inventory_lots as l')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'l.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'l.supplier_id')
            ->leftJoin('pmd_inventory_storage_locations as sl', 'sl.id', '=', 'l.storage_location_id')
            ->where('l.location_id', $locationId)
            ->where('l.active', 1)
            ->orderByRaw('CASE WHEN l.expires_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('l.expires_at')
            ->orderBy('l.received_at')
            ->get([
                'l.*',
                'i.name as item_name',
                'i.base_unit as unit',
                's.name as supplier_name',
                'sl.name as storage_name',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $lots = $this->applyTheoreticalFefo($lots, $items);

        $orders = DB::table('pmd_inventory_purchase_orders as po')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'po.supplier_id')
            ->where('po.location_id', $locationId)
            ->orderByDesc('po.id')
            ->limit(60)
            ->get([
                'po.*',
                's.name as supplier_name',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $orderIds = array_values(array_filter(array_map(
            static fn ($row) => (int)($row['id'] ?? 0),
            $orders
        )));

        $orderLines = $orderIds
            ? DB::table('pmd_inventory_purchase_order_lines as pol')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'pol.item_id')
                ->whereIn('pol.purchase_order_id', $orderIds)
                ->orderBy('pol.id')
                ->get([
                    'pol.*',
                    'i.name as item_name',
                    'i.base_unit as base_unit',
                ])
                ->groupBy('purchase_order_id')
            : collect();

        foreach ($orders as &$order) {
            $order['lines'] = collect($orderLines->get((int)$order['id'], []))
                ->map(fn ($row) => (array)$row)
                ->values()
                ->all();
        }
        unset($order);

        $preparations = DB::table('pmd_inventory_preparations as p')
            ->leftJoin('pmd_inventory_items as o', 'o.id', '=', 'p.output_item_id')
            ->where('p.location_id', $locationId)
            ->where('p.active', 1)
            ->orderBy('p.name')
            ->get([
                'p.*',
                'o.name as output_item_name',
                'o.base_unit as output_unit',
                'o.unit_cost as output_unit_cost',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $preparationIds = array_values(array_filter(array_map(
            static fn ($row) => (int)($row['id'] ?? 0),
            $preparations
        )));

        $preparationLines = $preparationIds
            ? DB::table('pmd_inventory_preparation_lines as pl')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'pl.item_id')
                ->whereIn('pl.preparation_id', $preparationIds)
                ->orderBy('i.name')
                ->get([
                    'pl.*',
                    'i.name as item_name',
                    'i.base_unit as unit',
                    'i.unit_cost as item_unit_cost',
                ])
                ->groupBy('preparation_id')
            : collect();

        foreach ($preparations as &$preparation) {
            $cost = 0.0;
            $lines = collect($preparationLines->get((int)$preparation['id'], []))
                ->map(function ($row) use (&$cost) {
                    $line = (array)$row;
                    $lineCost = (float)$row->qty_per_batch * (float)$row->item_unit_cost;
                    $line['line_cost'] = round($lineCost, 4);
                    $cost += $lineCost;
                    return $line;
                })
                ->values()
                ->all();

            $preparation['lines'] = $lines;
            $preparation['estimated_batch_cost'] = round($cost, 4);
            $preparation['estimated_output_unit_cost'] = (float)$preparation['yield_qty'] > 0
                ? round($cost / (float)$preparation['yield_qty'], 6)
                : 0.0;
        }
        unset($preparation);

        $productionBatches = DB::table('pmd_inventory_production_batches as b')
            ->leftJoin('pmd_inventory_preparations as p', 'p.id', '=', 'b.preparation_id')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'b.output_item_id')
            ->leftJoin('pmd_inventory_storage_locations as sl', 'sl.id', '=', 'b.output_storage_location_id')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'b.staff_id')
            ->where('b.location_id', $locationId)
            ->orderByDesc('b.produced_at')
            ->orderByDesc('b.id')
            ->limit(40)
            ->get([
                'b.*',
                'p.name as preparation_name',
                'i.name as output_item_name',
                'i.base_unit as output_unit',
                'sl.name as output_storage_name',
                's.staff_name as staff_name',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $purchaseReceipts = DB::table('pmd_inventory_receipts as r')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'r.created_by')
            ->where('r.location_id', $locationId)
            ->whereNotNull('r.confirmed_at')
            ->orderByDesc('r.confirmed_at')
            ->orderByDesc('r.id')
            ->limit(30)
            ->get([
                'r.id',
                'r.supplier_name',
                'r.invoice_number',
                'r.purchased_at',
                'r.source',
                'r.total_amount',
                'r.confirmed_at',
                'r.reversed_at',
                'r.reversed_by',
                's.staff_name as staff_name',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $priceHistory = DB::table('pmd_inventory_price_history as ph')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'ph.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'ph.supplier_id')
            ->where('ph.location_id', $locationId)
            ->orderByDesc('ph.recorded_at')
            ->limit(120)
            ->get([
                'ph.*',
                'i.name as item_name',
                's.name as supplier_name',
            ])
            ->map(fn ($row) => (array)$row)
            ->all();

        $ledger = DB::table('pmd_inventory_movements as m')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'm.item_id')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'm.staff_id')
            ->where('m.location_id', $locationId)
            ->orderByDesc('m.occurred_at')
            ->orderByDesc('m.id')
            ->limit(160)
            ->get([
                'm.id',
                'm.item_id',
                'i.name as item_name',
                'i.base_unit as unit',
                'm.movement_type',
                'm.qty_delta',
                'm.unit_cost',
                'm.reference_type',
                'm.reference_id',
                'm.reason',
                'm.note',
                'm.occurred_at',
                's.staff_name as staff_name',
            ])
            ->map(function ($row) {
                $data = (array)$row;
                $data['value'] = round(abs((float)$data['qty_delta']) * (float)$data['unit_cost'], 2);
                return $data;
            })
            ->all();

        $settings = (array)DB::table('pmd_inventory_settings')
            ->where('location_id', $locationId)
            ->first();

        $expiryDays = max(1, (int)($settings['expiry_alert_days'] ?? 5));
        $today = now()->startOfDay();
        $expiryCutoff = now()->addDays($expiryDays)->endOfDay();

        $expiring = array_values(array_filter($lots, static function ($lot) use ($today, $expiryCutoff) {
            if (empty($lot['expires_at']) || (float)($lot['estimated_remaining'] ?? 0) <= 0) {
                return false;
            }
            try {
                $date = \Carbon\Carbon::parse($lot['expires_at']);
                return $date->lte($expiryCutoff);
            } catch (\Throwable $error) {
                return false;
            }
        }));

        $openOrders = count(array_filter($orders, static fn ($row) => in_array(
            (string)($row['status'] ?? ''),
            ['draft', 'sent', 'partial'],
            true
        )));

        // Low-stock and expiry alerts are transition-based, never emitted on
        // every page load. Alert state keeps the global notification bell calm.
        $this->syncNotifications(
            $locationId,
            (array)($core['items'] ?? []),
            $lots
        );

        return [
            'ready' => true,
            'generated_at' => now()->toIso8601String(),
            'suppliers' => $suppliers,
            'supplier_items' => $supplierItems,
            'identifiers' => $identifiers,
            'storage_locations' => $storageLocations,
            'storage_balances' => $storageBalances,
            'unallocated_stock' => $unallocated,
            'lots' => $lots,
            'purchase_orders' => $orders,
            'preparations' => $preparations,
            'production_batches' => $productionBatches,
            'purchase_receipts' => $purchaseReceipts,
            'price_history' => $priceHistory,
            'ledger' => $ledger,
            'settings' => $settings,
            'alerts' => [
                'expiring_count' => count($expiring),
                'expired_count' => count(array_filter($expiring, static function ($lot) use ($today) {
                    try {
                        return \Carbon\Carbon::parse($lot['expires_at'])->lt($today);
                    } catch (\Throwable $error) {
                        return false;
                    }
                })),
                'open_purchase_orders' => $openOrders,
                'unallocated_items' => count($unallocated),
            ],
        ];
    }

    public function saveSupplier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['supplier_id'] ?? 0));
        $name = trim((string)($data['name'] ?? ''));

        if ($name === '') {
            throw new InvalidArgumentException('Supplier name is required.');
        }

        $row = [
            'location_id' => $locationId,
            'name' => mb_substr($name, 0, 190),
            'supplier_code' => $this->nullableText($data['supplier_code'] ?? null, 100),
            'email' => $this->nullableText($data['email'] ?? null, 190),
            'phone' => $this->nullableText($data['phone'] ?? null, 80),
            'order_email' => $this->nullableText($data['order_email'] ?? null, 190),
            'lead_time_days' => min(365, max(0, (int)($data['lead_time_days'] ?? 1))),
            'min_order_value' => round(max(0, $this->number($data['min_order_value'] ?? 0)), 4),
            'currency' => $this->currency($data['currency'] ?? 'EUR'),
            'active' => 1,
            'updated_at' => now(),
        ];

        $duplicate = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($id > 0, fn ($query) => $query->where('id', '<>', $id))
            ->exists();
        if ($duplicate) {
            throw new InvalidArgumentException('A supplier with this name already exists.');
        }

        if ($id > 0) {
            $updated = DB::table('pmd_inventory_suppliers')
                ->where('location_id', $locationId)
                ->where('id', $id)
                ->update($row);
            if (!$updated && !DB::table('pmd_inventory_suppliers')->where('location_id', $locationId)->where('id', $id)->exists()) {
                throw new InvalidArgumentException('Supplier was not found.');
            }
            return $id;
        }

        $row['created_by'] = $staffId;
        $row['created_at'] = now();

        return (int)DB::table('pmd_inventory_suppliers')->insertGetId($row);
    }

    public function saveSupplierItem(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['supplier_item_id'] ?? 0));
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $supplier = $this->supplier($locationId, $supplierId);
        $item = $this->item($locationId, $itemId);

        $packageUnit = $this->unit($data['package_unit'] ?? $item->purchase_unit ?? $item->base_unit);
        $packageQuantity = max(0.0001, $this->number($data['package_quantity'] ?? 1, 1));
        $baseQuantity = max(0.0001, $this->number($data['base_quantity'] ?? $item->purchase_to_base ?? 1, 1));
        $unitPrice = round(max(0, $this->number($data['unit_price'] ?? 0)), 4);
        $minOrderQty = max(0.0001, $this->number($data['min_order_qty'] ?? 1, 1));
        $orderMultiple = max(0.0001, $this->number($data['order_multiple'] ?? 1, 1));
        $currency = $this->currency($data['currency'] ?? $supplier->currency ?? 'EUR');
        $supplierSku = $this->nullableText($data['supplier_sku'] ?? null, 120);
        $gtin = $this->nullableText($data['gtin'] ?? null, 190);
        $isPreferred = !empty($data['is_preferred']);

        if ($isPreferred) {
            DB::table('pmd_inventory_supplier_items')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->update(['is_preferred' => 0, 'updated_at' => now()]);
        }

        $row = [
            'location_id' => $locationId,
            'supplier_id' => $supplierId,
            'item_id' => $itemId,
            'supplier_sku' => $supplierSku,
            'gtin' => $gtin,
            'package_unit' => $packageUnit,
            'package_quantity' => round($packageQuantity, 4),
            'base_quantity' => round($baseQuantity, 4),
            'unit_price' => $unitPrice,
            'min_order_qty' => round($minOrderQty, 4),
            'order_multiple' => round($orderMultiple, 4),
            'currency' => $currency,
            'is_preferred' => $isPreferred ? 1 : 0,
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            DB::table('pmd_inventory_supplier_items')
                ->where('location_id', $locationId)
                ->where('id', $id)
                ->update($row);
        } else {
            $row['created_at'] = now();
            $id = (int)DB::table('pmd_inventory_supplier_items')->insertGetId($row);
        }

        if ($gtin) {
            $identifierId = $this->saveIdentifier($locationId, $staffId, [
                'item_id' => $itemId,
                'supplier_id' => $supplierId,
                'code' => $gtin,
                'code_type' => 'AUTO',
                'package_unit' => $packageUnit,
                'package_quantity' => $packageQuantity,
                'base_quantity' => $baseQuantity,
                'unit_price' => $unitPrice,
                'currency' => $currency,
                'source' => 'supplier',
                'is_primary' => $isPreferred,
            ]);

            DB::table('pmd_inventory_item_identifiers')
                ->where('location_id', $locationId)
                ->where('id', $identifierId)
                ->update([
                    'supplier_item_id' => $id,
                    'updated_at' => now(),
                ]);
        }

        if ($isPreferred) {
            DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', $itemId)
                ->update([
                    'supplier_name' => (string)$supplier->name,
                    'purchase_unit' => $packageUnit,
                    'purchase_to_base' => round($baseQuantity, 4),
                    'unit_cost' => $baseQuantity > 0 ? round($unitPrice / $baseQuantity, 6) : (float)$item->unit_cost,
                    'updated_at' => now(),
                ]);
        }

        return $id;
    }

    public function archiveSupplierItem(int $locationId, int $supplierItemId): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        DB::table('pmd_inventory_supplier_items')
            ->where('location_id', $locationId)
            ->where('id', $supplierItemId)
            ->update([
                'active' => 0,
                'is_preferred' => 0,
                'updated_at' => now(),
            ]);

        DB::table('pmd_inventory_item_identifiers')
            ->where('location_id', $locationId)
            ->where('supplier_item_id', $supplierItemId)
            ->update([
                'active' => 0,
                'updated_at' => now(),
            ]);
    }

    public function archiveSupplier(int $locationId, int $supplierId): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->where('id', $supplierId)
            ->update(['active' => 0, 'updated_at' => now()]);

        DB::table('pmd_inventory_supplier_items')
            ->where('location_id', $locationId)
            ->where('supplier_id', $supplierId)
            ->update(['active' => 0, 'updated_at' => now()]);
    }

    public function saveIdentifier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['identifier_id'] ?? 0));
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0)) ?: null;
        $code = $this->normalizeCode($data['code'] ?? '');

        $item = $this->item($locationId, $itemId);
        if ($code === '') {
            throw new InvalidArgumentException('Barcode / product code is required.');
        }

        $type = strtoupper(trim((string)($data['code_type'] ?? '')));
        if ($type === '' || $type === 'AUTO') {
            $type = $this->inferCodeType($code);
        }

        if (in_array($type, ['EAN8', 'UPC_A', 'EAN13', 'GTIN14'], true) && !$this->validGtin($code)) {
            throw new InvalidArgumentException('This GTIN/EAN/UPC check digit is not valid. Scan the code again.');
        }

        if ($supplierId !== null) {
            $this->supplier($locationId, $supplierId);
        }

        $packageUnit = $this->unit($data['package_unit'] ?? ($item->purchase_unit ?? $item->base_unit));
        $packageQuantity = max(0.0001, $this->number($data['package_quantity'] ?? 1, 1));
        $baseQuantity = max(0.0001, $this->number($data['base_quantity'] ?? 1, 1));
        $unitPrice = round(max(0, $this->number($data['unit_price'] ?? 0)), 4);
        $isPrimary = !empty($data['is_primary']);

        $conflict = DB::table('pmd_inventory_item_identifiers')
            ->where('location_id', $locationId)
            ->where('code', $code)
            ->where('active', 1)
            ->when($id > 0, fn ($query) => $query->where('id', '<>', $id))
            ->first();

        if ($conflict) {
            throw new InvalidArgumentException('This code is already linked to another stock package.');
        }

        if ($isPrimary) {
            DB::table('pmd_inventory_item_identifiers')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->update(['is_primary' => 0, 'updated_at' => now()]);
        }

        $row = [
            'location_id' => $locationId,
            'item_id' => $itemId,
            'supplier_id' => $supplierId,
            'code' => mb_substr($code, 0, 190),
            'code_type' => mb_substr($type, 0, 30),
            'package_unit' => $packageUnit,
            'package_quantity' => round($packageQuantity, 4),
            'base_quantity' => round($baseQuantity, 4),
            'unit_price' => $unitPrice,
            'currency' => $this->currency($data['currency'] ?? 'EUR'),
            'source' => mb_substr(trim((string)($data['source'] ?? 'manual')) ?: 'manual', 0, 30),
            'is_primary' => $isPrimary ? 1 : 0,
            'active' => 1,
            'verified_at' => now(),
            'updated_at' => now(),
        ];

        if ($id > 0) {
            DB::table('pmd_inventory_item_identifiers')
                ->where('location_id', $locationId)
                ->where('id', $id)
                ->update($row);
            return $id;
        }

        $row['created_by'] = $staffId;
        $row['created_at'] = now();

        $id = (int)DB::table('pmd_inventory_item_identifiers')->insertGetId($row);

        // Keep the old SKU/code field useful for older clients while the
        // normalized identifier table remains the R24 authority.
        if (trim((string)($item->sku ?? '')) === '') {
            DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', $itemId)
                ->update(['sku' => mb_substr($code, 0, 120), 'updated_at' => now()]);
        }

        return $id;
    }

    public function archiveIdentifier(int $locationId, int $identifierId): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        DB::table('pmd_inventory_item_identifiers')
            ->where('location_id', $locationId)
            ->where('id', $identifierId)
            ->update([
                'active' => 0,
                'is_primary' => 0,
                'updated_at' => now(),
            ]);
    }

    public function resolveIdentifier(int $locationId, string $code): ?array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $code = $this->normalizeCode($code);

        if ($code === '') {
            return null;
        }

        $row = DB::table('pmd_inventory_item_identifiers as x')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'x.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'x.supplier_id')
            ->where('x.location_id', $locationId)
            ->where('x.code', $code)
            ->where('x.active', 1)
            ->where('i.active', 1)
            ->first([
                'x.*',
                'i.name as item_name',
                'i.base_unit as base_unit',
                's.name as supplier_name',
            ]);

        return $row ? (array)$row : null;
    }

    public function saveStorageLocation(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['storage_location_id'] ?? 0));
        $name = trim((string)($data['name'] ?? ''));

        if ($name === '') {
            throw new InvalidArgumentException('Storage location name is required.');
        }

        $isDefault = !empty($data['is_default']);
        if ($isDefault) {
            DB::table('pmd_inventory_storage_locations')
                ->where('location_id', $locationId)
                ->update(['is_default' => 0, 'updated_at' => now()]);
        }

        $row = [
            'location_id' => $locationId,
            'name' => mb_substr($name, 0, 140),
            'kind' => mb_substr(trim((string)($data['kind'] ?? 'storage')) ?: 'storage', 0, 40),
            'is_default' => $isDefault ? 1 : 0,
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            DB::table('pmd_inventory_storage_locations')
                ->where('location_id', $locationId)
                ->where('id', $id)
                ->update($row);
            return $id;
        }

        $row['created_by'] = $staffId;
        $row['created_at'] = now();

        return (int)DB::table('pmd_inventory_storage_locations')->insertGetId($row);
    }

    public function saveSettings(int $locationId, array $data): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $event = strtolower(trim((string)($data['consumption_event'] ?? 'paid')));

        if (!in_array($event, ['paid', 'accepted', 'completed'], true)) {
            throw new InvalidArgumentException('Choose a supported stock-consumption event.');
        }

        $costingMethod = strtolower(trim((string)($data['costing_method'] ?? 'last_purchase')));
        if (!in_array($costingMethod, ['last_purchase', 'weighted_average'], true)) {
            throw new InvalidArgumentException('Choose a supported inventory costing method.');
        }

        DB::table('pmd_inventory_settings')->updateOrInsert(
            ['location_id' => $locationId],
            [
                'consumption_event' => $event,
                'expiry_alert_days' => min(90, max(1, (int)($data['expiry_alert_days'] ?? 5))),
                'safety_stock_days' => round(min(30, max(0, $this->number($data['safety_stock_days'] ?? 1.5, 1.5))), 2),
                'costing_method' => $costingMethod,
                'blind_counts' => !empty($data['blind_counts']) ? 1 : 0,
                'allow_negative_stock' => !empty($data['allow_negative_stock']) ? 1 : 0,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public function savePreparation(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['preparation_id'] ?? 0));
        $outputItemId = max(0, (int)($data['output_item_id'] ?? 0));
        $outputItem = $this->item($locationId, $outputItemId);
        $name = trim((string)($data['name'] ?? $outputItem->name));
        $yieldQty = max(0.0001, $this->number($data['yield_qty'] ?? 1, 1));
        $lines = array_values(array_filter((array)($data['lines'] ?? []), 'is_array'));

        if ($name === '') {
            throw new InvalidArgumentException('Preparation name is required.');
        }
        if (!$lines) {
            throw new InvalidArgumentException('Add at least one ingredient to the preparation.');
        }

        $normalizedLines = [];
        foreach ($lines as $line) {
            $itemId = max(0, (int)($line['item_id'] ?? 0));
            $qty = max(0, $this->number($line['qty_per_batch'] ?? 0));
            if ($itemId < 1 || $qty <= 0) continue;
            if ($itemId === $outputItemId) {
                throw new InvalidArgumentException('A prepared item cannot consume itself.');
            }
            $this->item($locationId, $itemId);
            $normalizedLines[$itemId] = ($normalizedLines[$itemId] ?? 0) + $qty;
        }

        if (!$normalizedLines) {
            throw new InvalidArgumentException('Add at least one valid preparation ingredient.');
        }

        return DB::transaction(function () use (
            $locationId,
            $staffId,
            $id,
            $outputItemId,
            $name,
            $yieldQty,
            $normalizedLines
        ) {
            $row = [
                'location_id' => $locationId,
                'output_item_id' => $outputItemId,
                'name' => mb_substr($name, 0, 190),
                'yield_qty' => round($yieldQty, 4),
                'active' => 1,
                'updated_by' => $staffId,
                'updated_at' => now(),
            ];

            if ($id > 0) {
                $exists = DB::table('pmd_inventory_preparations')
                    ->where('location_id', $locationId)
                    ->where('id', $id)
                    ->exists();
                if (!$exists) {
                    throw new InvalidArgumentException('Preparation recipe was not found.');
                }
                DB::table('pmd_inventory_preparations')
                    ->where('location_id', $locationId)
                    ->where('id', $id)
                    ->update($row);
                $preparationId = $id;
            } else {
                $existing = DB::table('pmd_inventory_preparations')
                    ->where('location_id', $locationId)
                    ->where('output_item_id', $outputItemId)
                    ->first();
                if ($existing) {
                    throw new InvalidArgumentException('This prepared stock item already has a preparation recipe.');
                }

                $row['created_at'] = now();
                $preparationId = (int)DB::table('pmd_inventory_preparations')
                    ->insertGetId($row);
            }

            DB::table('pmd_inventory_preparation_lines')
                ->where('preparation_id', $preparationId)
                ->delete();

            foreach ($normalizedLines as $itemId => $qty) {
                DB::table('pmd_inventory_preparation_lines')->insert([
                    'preparation_id' => $preparationId,
                    'item_id' => (int)$itemId,
                    'qty_per_batch' => round($qty, 4),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $preparationId;
        });
    }

    public function archivePreparation(int $locationId, int $preparationId): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        DB::table('pmd_inventory_preparations')
            ->where('location_id', $locationId)
            ->where('id', $preparationId)
            ->update([
                'active' => 0,
                'updated_at' => now(),
            ]);
    }

    public function producePreparation(
        int $locationId,
        ?int $staffId,
        array $data
    ): int {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $preparationId = max(0, (int)($data['preparation_id'] ?? 0));
        $batchCount = max(0, $this->number($data['batch_count'] ?? 1, 1));
        if ($batchCount <= 0) {
            throw new InvalidArgumentException('Batch count must be greater than zero.');
        }

        $preparation = DB::table('pmd_inventory_preparations')
            ->where('location_id', $locationId)
            ->where('id', $preparationId)
            ->where('active', 1)
            ->first();

        if (!$preparation) {
            throw new InvalidArgumentException('Preparation recipe was not found.');
        }

        $outputItem = $this->item($locationId, (int)$preparation->output_item_id);
        $lines = DB::table('pmd_inventory_preparation_lines')
            ->where('preparation_id', $preparationId)
            ->get();

        if ($lines->isEmpty()) {
            throw new InvalidArgumentException('Preparation recipe has no ingredients.');
        }

        $sourceStorageId = max(0, (int)($data['source_storage_location_id'] ?? 0))
            ?: $this->defaultStorageLocationId($locationId);
        $outputStorageId = max(0, (int)($data['output_storage_location_id'] ?? 0))
            ?: $sourceStorageId;
        $this->storageLocation($locationId, $sourceStorageId);
        $this->storageLocation($locationId, $outputStorageId);

        $plannedOutput = (float)$preparation->yield_qty * $batchCount;
        $actualOutput = max(
            0.0001,
            $this->number($data['output_qty'] ?? $plannedOutput, $plannedOutput)
        );

        $settings = (array)DB::table('pmd_inventory_settings')
            ->where('location_id', $locationId)
            ->first();
        $allowNegative = !empty($settings['allow_negative_stock']);

        $ingredientPlan = [];
        $inputCost = 0.0;
        foreach ($lines as $line) {
            $ingredient = $this->item($locationId, (int)$line->item_id);
            $qty = max(0, (float)$line->qty_per_batch * $batchCount);
            if ($qty <= 0) continue;

            $available = $this->storageBalance(
                $locationId,
                $sourceStorageId,
                (int)$ingredient->id
            );

            if (!$allowNegative && $available + 0.00005 < $qty) {
                throw new InvalidArgumentException(
                    'Not enough '.$ingredient->name.' is allocated in the selected source storage.'
                );
            }

            $cost = max(0, (float)$ingredient->unit_cost);
            $ingredientPlan[] = [
                'item' => $ingredient,
                'qty' => $qty,
                'unit_cost' => $cost,
            ];
            $inputCost += $qty * $cost;
        }

        if (!$ingredientPlan) {
            throw new InvalidArgumentException('Preparation has no consumable ingredient quantity.');
        }

        $outputUnitCost = $actualOutput > 0
            ? max(0, $inputCost / $actualOutput)
            : 0.0;

        return DB::transaction(function () use (
            $locationId,
            $staffId,
            $preparation,
            $preparationId,
            $outputItem,
            $batchCount,
            $actualOutput,
            $outputUnitCost,
            $sourceStorageId,
            $outputStorageId,
            $ingredientPlan,
            $settings,
            $data
        ) {
            $batchId = (int)DB::table('pmd_inventory_production_batches')
                ->insertGetId([
                    'location_id' => $locationId,
                    'preparation_id' => $preparationId,
                    'output_item_id' => (int)$outputItem->id,
                    'source_storage_location_id' => $sourceStorageId,
                    'output_storage_location_id' => $outputStorageId,
                    'batch_count' => round($batchCount, 4),
                    'output_qty' => round($actualOutput, 4),
                    'unit_cost' => round($outputUnitCost, 6),
                    'lot_code' => $this->nullableText($data['lot_code'] ?? null, 120),
                    'expires_at' => $this->nullableDate($data['expires_at'] ?? null),
                    'staff_id' => $staffId,
                    'produced_at' => now(),
                    'note' => $this->nullableText($data['note'] ?? null, 5000),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            foreach ($ingredientPlan as $entry) {
                $ingredient = $entry['item'];
                $qty = (float)$entry['qty'];
                $cost = (float)$entry['unit_cost'];

                DB::table('pmd_inventory_movements')->insert([
                    'location_id' => $locationId,
                    'item_id' => (int)$ingredient->id,
                    'movement_type' => 'PRODUCTION_INPUT',
                    'qty_delta' => round(-$qty, 4),
                    'unit_cost' => round($cost, 6),
                    'reference_type' => 'production_batch',
                    'reference_id' => $batchId,
                    'reason' => 'Prep production',
                    'note' => (string)$preparation->name,
                    'staff_id' => $staffId,
                    'occurred_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $this->storageMovement(
                    $locationId,
                    $sourceStorageId,
                    (int)$ingredient->id,
                    -$qty,
                    'PRODUCTION_INPUT',
                    $staffId,
                    'production_batch',
                    $batchId,
                    (string)$preparation->name
                );
            }

            DB::table('pmd_inventory_movements')->insert([
                'location_id' => $locationId,
                'item_id' => (int)$outputItem->id,
                'movement_type' => 'PRODUCTION_OUTPUT',
                'qty_delta' => round($actualOutput, 4),
                'unit_cost' => round($outputUnitCost, 6),
                'reference_type' => 'production_batch',
                'reference_id' => $batchId,
                'reason' => 'Prep production',
                'note' => (string)$preparation->name,
                'staff_id' => $staffId,
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->storageMovement(
                $locationId,
                $outputStorageId,
                (int)$outputItem->id,
                $actualOutput,
                'PRODUCTION_OUTPUT',
                $staffId,
                'production_batch',
                $batchId,
                (string)$preparation->name
            );

            $storedCost = $outputUnitCost;
            if (($settings['costing_method'] ?? 'last_purchase') === 'weighted_average') {
                try {
                    $core = app(PmdInventoryControlService::class)->snapshot($locationId);
                    $current = collect((array)($core['items'] ?? []))->first(
                        fn ($row) => (int)($row['id'] ?? 0) === (int)$outputItem->id
                    );
                    if (is_array($current)) {
                        // Snapshot already includes this production movement, so
                        // remove the just-produced quantity to recover the prior
                        // on-hand for weighted-average costing.
                        $afterQty = max(0, (float)($current['estimated_on_hand'] ?? 0));
                        $oldQty = max(0, $afterQty - $actualOutput);
                        if (($oldQty + $actualOutput) > 0.00005) {
                            $storedCost = (
                                ($oldQty * max(0, (float)$outputItem->unit_cost))
                                + ($actualOutput * $outputUnitCost)
                            ) / ($oldQty + $actualOutput);
                        }
                    }
                } catch (\Throwable $ignored) {
                    $storedCost = $outputUnitCost;
                }
            }

            DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', (int)$outputItem->id)
                ->update([
                    'unit_cost' => round($storedCost, 6),
                    'updated_at' => now(),
                ]);

            DB::table('pmd_inventory_lots')->insert([
                'location_id' => $locationId,
                'item_id' => (int)$outputItem->id,
                'supplier_id' => null,
                'identifier_id' => null,
                'storage_location_id' => $outputStorageId,
                'receipt_id' => null,
                'purchase_order_id' => null,
                'purchase_order_line_id' => null,
                'lot_code' => $this->nullableText($data['lot_code'] ?? null, 120),
                'expires_at' => $this->nullableDate($data['expires_at'] ?? null),
                'received_at' => now()->toDateString(),
                'qty_received' => round($actualOutput, 4),
                'qty_remaining' => round($actualOutput, 4),
                'unit_cost' => round($outputUnitCost, 6),
                'active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $batchId;
        });
    }

    public function savePurchaseOrder(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0)) ?: null;
        if ($supplierId !== null) {
            $this->supplier($locationId, $supplierId);
        }

        $lines = array_values(array_filter((array)($data['lines'] ?? []), 'is_array'));
        if (!$lines) {
            throw new InvalidArgumentException('Add at least one purchase-order line.');
        }

        $currency = $this->currency($data['currency'] ?? 'EUR');
        $orderNumber = trim((string)($data['order_number'] ?? ''));
        if ($orderNumber === '') {
            $orderNumber = 'PO-'.now()->format('Ymd-His').'-'.str_pad((string)random_int(0, 999), 3, '0', STR_PAD_LEFT);
        }

        return DB::transaction(function () use (
            $locationId,
            $staffId,
            $supplierId,
            $lines,
            $currency,
            $orderNumber,
            $data
        ) {
            $poId = (int)DB::table('pmd_inventory_purchase_orders')->insertGetId([
                'location_id' => $locationId,
                'supplier_id' => $supplierId,
                'order_number' => mb_substr($orderNumber, 0, 80),
                'status' => 'draft',
                'expected_at' => $this->nullableDateTime($data['expected_at'] ?? null),
                'currency' => $currency,
                'estimated_total' => 0,
                'note' => $this->nullableText($data['note'] ?? null, 5000),
                'created_by' => $staffId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $total = 0.0;
            foreach ($lines as $line) {
                $itemId = max(0, (int)($line['item_id'] ?? 0));
                $item = $this->item($locationId, $itemId);
                $identifierId = max(0, (int)($line['identifier_id'] ?? 0)) ?: null;
                $identifier = $identifierId ? $this->identifier($locationId, $identifierId, $itemId) : null;

                if (
                    $identifier
                    && !empty($identifier->supplier_id)
                    && $supplierId !== null
                    && (int)$identifier->supplier_id !== (int)$supplierId
                ) {
                    throw new InvalidArgumentException(
                        'A selected package code belongs to a different supplier.'
                    );
                }

                $qty = max(0, $this->number($line['quantity'] ?? 0));
                if ($qty <= 0) {
                    continue;
                }

                $packageUnit = $this->unit(
                    $identifier->package_unit
                        ?? $line['package_unit']
                        ?? $item->purchase_unit
                        ?? $item->base_unit
                );
                $baseQty = max(
                    0.0001,
                    $this->number(
                        $identifier->base_quantity
                            ?? $line['base_quantity_per_package']
                            ?? $item->purchase_to_base
                            ?? 1,
                        1
                    )
                );
                $cost = max(
                    0,
                    $this->number(
                        $line['unit_cost']
                            ?? $identifier->unit_price
                            ?? ((float)$item->unit_cost * $baseQty)
                    )
                );

                DB::table('pmd_inventory_purchase_order_lines')->insert([
                    'purchase_order_id' => $poId,
                    'item_id' => $itemId,
                    'identifier_id' => $identifierId,
                    'description' => mb_substr((string)($line['description'] ?? $item->name), 0, 190),
                    'quantity_ordered' => round($qty, 4),
                    'quantity_received' => 0,
                    'package_unit' => $packageUnit,
                    'base_quantity_per_package' => round($baseQty, 4),
                    'unit_cost' => round($cost, 4),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $total += $qty * $cost;
            }

            DB::table('pmd_inventory_purchase_orders')
                ->where('id', $poId)
                ->update([
                    'estimated_total' => round($total, 4),
                    'updated_at' => now(),
                ]);

            return $poId;
        });
    }

    public function setPurchaseOrderStatus(
        int $locationId,
        ?int $staffId,
        int $purchaseOrderId,
        string $status
    ): void {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $status = strtolower(trim($status));

        if (!in_array($status, ['draft', 'sent', 'cancelled', 'closed'], true)) {
            throw new InvalidArgumentException('Unsupported purchase-order status.');
        }

        $order = $this->purchaseOrder($locationId, $purchaseOrderId);
        if (in_array((string)$order->status, ['received', 'cancelled'], true) && $status !== 'closed') {
            throw new InvalidArgumentException('This purchase order can no longer be changed.');
        }

        $updates = [
            'status' => $status,
            'updated_at' => now(),
        ];
        if ($status === 'sent') {
            $updates['ordered_at'] = now();
            $updates['approved_by'] = $staffId;
        }

        DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->where('id', $purchaseOrderId)
            ->update($updates);
    }

    public function receivePurchaseOrder(
        int $locationId,
        ?int $staffId,
        array $data
    ): array {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $poId = max(0, (int)($data['purchase_order_id'] ?? 0));
        $order = $this->purchaseOrder($locationId, $poId);

        if (in_array((string)$order->status, ['received', 'cancelled', 'closed'], true)) {
            throw new InvalidArgumentException('This purchase order is already closed.');
        }

        $supplier = $order->supplier_id
            ? $this->supplier($locationId, (int)$order->supplier_id)
            : null;

        $storageLocationId = max(0, (int)($data['storage_location_id'] ?? 0)) ?: $this->defaultStorageLocationId($locationId);
        $this->storageLocation($locationId, $storageLocationId);

        $requestLines = collect((array)($data['lines'] ?? []))
            ->filter('is_array')
            ->keyBy(fn ($line) => (int)($line['line_id'] ?? 0));

        $lines = DB::table('pmd_inventory_purchase_order_lines')
            ->where('purchase_order_id', $poId)
            ->orderBy('id')
            ->get();

        $coreLines = [];
        $receivePlan = [];

        foreach ($lines as $line) {
            $remaining = max(0, (float)$line->quantity_ordered - (float)$line->quantity_received);
            if ($remaining <= 0) {
                continue;
            }

            $requested = $requestLines->get((int)$line->id);
            $qty = $requested
                ? max(0, min($remaining, $this->number($requested['quantity'] ?? $remaining, $remaining)))
                : $remaining;

            if ($qty <= 0) {
                continue;
            }

            $item = $this->item($locationId, (int)$line->item_id);
            $coreLines[] = [
                'item_id' => (int)$line->item_id,
                'item_name' => (string)$item->name,
                'quantity' => round($qty, 4),
                'unit' => (string)$line->package_unit,
                'unit_cost' => round((float)$line->unit_cost, 4),
                'identifier_id' => (int)($line->identifier_id ?? 0),
            ];

            $receivePlan[] = [
                'line' => $line,
                'qty' => $qty,
                'lot_code' => $this->nullableText($requested['lot_code'] ?? $data['lot_code'] ?? null, 120),
                'expires_at' => $this->nullableDate($requested['expires_at'] ?? $data['expires_at'] ?? null),
            ];
        }

        if (!$coreLines) {
            throw new InvalidArgumentException('There is nothing left to receive on this order.');
        }

        $receiptId = app(PmdInventoryControlService::class)->savePurchase(
            $locationId,
            $staffId,
            [
                'supplier_name' => $supplier ? (string)$supplier->name : '',
                'purchased_at' => now()->toDateString(),
                'pro_receiving_managed' => true,
                'lines' => $coreLines,
            ]
        );

        DB::transaction(function () use (
            $locationId,
            $staffId,
            $poId,
            $order,
            $storageLocationId,
            $receiptId,
            $receivePlan
        ) {
            foreach ($receivePlan as $entry) {
                $line = $entry['line'];
                $qty = (float)$entry['qty'];
                $baseQty = $qty * max(0.0001, (float)$line->base_quantity_per_package);
                $baseUnitCost = (float)$line->unit_cost / max(0.0001, (float)$line->base_quantity_per_package);

                DB::table('pmd_inventory_purchase_order_lines')
                    ->where('id', (int)$line->id)
                    ->update([
                        'quantity_received' => round((float)$line->quantity_received + $qty, 4),
                        'updated_at' => now(),
                    ]);

                $this->storageMovement(
                    $locationId,
                    $storageLocationId,
                    (int)$line->item_id,
                    $baseQty,
                    'RECEIVE',
                    $staffId,
                    'purchase_order',
                    $poId,
                    'PO '.$order->order_number
                );

                DB::table('pmd_inventory_lots')->insert([
                    'location_id' => $locationId,
                    'item_id' => (int)$line->item_id,
                    'supplier_id' => $order->supplier_id ?: null,
                    'identifier_id' => $line->identifier_id ?: null,
                    'storage_location_id' => $storageLocationId,
                    'receipt_id' => $receiptId,
                    'purchase_order_id' => $poId,
                    'purchase_order_line_id' => (int)$line->id,
                    'lot_code' => $entry['lot_code'],
                    'expires_at' => $entry['expires_at'],
                    'received_at' => now()->toDateString(),
                    'qty_received' => round($baseQty, 4),
                    'qty_remaining' => round($baseQty, 4),
                    'unit_cost' => round($baseUnitCost, 6),
                    'active' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('pmd_inventory_price_history')->insert([
                    'location_id' => $locationId,
                    'item_id' => (int)$line->item_id,
                    'supplier_id' => $order->supplier_id ?: null,
                    'identifier_id' => $line->identifier_id ?: null,
                    'purchase_unit' => (string)$line->package_unit,
                    'base_quantity' => round((float)$line->base_quantity_per_package, 4),
                    'unit_cost' => round((float)$line->unit_cost, 4),
                    'currency' => (string)$order->currency,
                    'source' => 'purchase_order',
                    'recorded_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $remaining = (float)DB::table('pmd_inventory_purchase_order_lines')
                ->where('purchase_order_id', $poId)
                ->selectRaw('COALESCE(SUM(GREATEST(quantity_ordered - quantity_received, 0)), 0) as remaining')
                ->value('remaining');

            $status = $remaining <= 0.00005 ? 'received' : 'partial';
            DB::table('pmd_inventory_purchase_orders')
                ->where('location_id', $locationId)
                ->where('id', $poId)
                ->update([
                    'status' => $status,
                    'received_at' => $status === 'received' ? now() : null,
                    'updated_at' => now(),
                ]);
        });

        return [
            'receipt_id' => $receiptId,
            'purchase_order_id' => $poId,
        ];
    }

    public function allocateExistingStock(int $locationId, ?int $staffId, array $data): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $storageId = max(0, (int)($data['storage_location_id'] ?? 0));
        $qty = max(0, $this->number($data['quantity'] ?? 0));

        $this->item($locationId, $itemId);
        $this->storageLocation($locationId, $storageId);
        if ($qty <= 0) {
            throw new InvalidArgumentException('Allocation quantity must be greater than zero.');
        }

        $core = app(PmdInventoryControlService::class)->snapshot($locationId);
        $item = collect((array)($core['items'] ?? []))->first(
            fn ($row) => (int)($row['id'] ?? 0) === $itemId
        );
        if (!is_array($item)) {
            throw new InvalidArgumentException('Stock item was not found in the current inventory snapshot.');
        }

        $onHand = (float)($item['estimated_on_hand'] ?? 0);
        $allocated = (float)DB::table('pmd_inventory_storage_movements')
            ->where('location_id', $locationId)
            ->where('item_id', $itemId)
            ->sum('qty_delta');
        $unallocated = max(0, $onHand - $allocated);

        if ($qty > $unallocated + 0.00005) {
            throw new InvalidArgumentException(
                'Only '.round($unallocated, 4).' base units are currently unallocated.'
            );
        }

        $this->storageMovement(
            $locationId,
            $storageId,
            $itemId,
            $qty,
            'OPENING_ALLOCATION',
            $staffId,
            'inventory_allocation',
            null,
            $this->nullableText($data['note'] ?? 'Allocate existing stock to storage', 5000)
        );
    }

    public function transferStock(int $locationId, ?int $staffId, array $data): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $fromId = max(0, (int)($data['from_storage_location_id'] ?? 0));
        $toId = max(0, (int)($data['to_storage_location_id'] ?? 0));
        $qty = max(0, $this->number($data['quantity'] ?? 0));

        $this->item($locationId, $itemId);
        $this->storageLocation($locationId, $fromId);
        $this->storageLocation($locationId, $toId);

        if ($fromId === $toId) {
            throw new InvalidArgumentException('Choose two different storage locations.');
        }
        if ($qty <= 0) {
            throw new InvalidArgumentException('Transfer quantity must be greater than zero.');
        }

        $available = $this->storageBalance($locationId, $fromId, $itemId);
        $settings = (array)DB::table('pmd_inventory_settings')
            ->where('location_id', $locationId)
            ->first();

        if (empty($settings['allow_negative_stock']) && $available + 0.00005 < $qty) {
            throw new InvalidArgumentException('Not enough allocated stock exists in the source location.');
        }

        DB::transaction(function () use ($locationId, $staffId, $itemId, $fromId, $toId, $qty, $data) {
            $note = $this->nullableText($data['note'] ?? 'Internal stock transfer', 5000);
            $this->storageMovement($locationId, $fromId, $itemId, -$qty, 'TRANSFER_OUT', $staffId, 'transfer', null, $note);
            $this->storageMovement($locationId, $toId, $itemId, $qty, 'TRANSFER_IN', $staffId, 'transfer', null, $note);
        });
    }

    public function reversePurchaseReceipt(
        int $locationId,
        ?int $staffId,
        int $receiptId,
        ?string $reason = null
    ): void {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $receiptId = max(0, $receiptId);

        $receipt = DB::table('pmd_inventory_receipts')
            ->where('location_id', $locationId)
            ->where('id', $receiptId)
            ->whereNotNull('confirmed_at')
            ->first();

        if (!$receipt) {
            throw new InvalidArgumentException('Confirmed purchase receipt was not found.');
        }
        if (!empty($receipt->reversed_at)) {
            throw new InvalidArgumentException('This purchase receipt was already reversed.');
        }

        $movements = DB::table('pmd_inventory_movements')
            ->where('location_id', $locationId)
            ->where('movement_type', 'PURCHASE')
            ->where('reference_type', 'purchase_receipt')
            ->where('reference_id', $receiptId)
            ->orderBy('id')
            ->get();

        if ($movements->isEmpty()) {
            throw new InvalidArgumentException('This receipt has no purchase movements to reverse.');
        }

        DB::transaction(function () use (
            $locationId,
            $staffId,
            $receiptId,
            $receipt,
            $movements,
            $reason
        ): void {
            $note = $this->nullableText(
                $reason ?: 'Purchase receipt reversed',
                5000
            );

            foreach ($movements as $movement) {
                DB::table('pmd_inventory_movements')->insert([
                    'location_id' => $locationId,
                    'item_id' => (int)$movement->item_id,
                    'movement_type' => 'PURCHASE_REVERSAL',
                    'qty_delta' => round(-1 * (float)$movement->qty_delta, 4),
                    'unit_cost' => round((float)$movement->unit_cost, 6),
                    'reference_type' => 'purchase_reversal',
                    'reference_id' => $receiptId,
                    'reason' => 'Purchase reversal',
                    'note' => $note,
                    'staff_id' => $staffId,
                    'occurred_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $lots = DB::table('pmd_inventory_lots')
                ->where('location_id', $locationId)
                ->where('receipt_id', $receiptId)
                ->get();

            $poIds = [];
            foreach ($lots as $lot) {
                $qty = max(0, (float)$lot->qty_received);
                if ($qty > 0 && !empty($lot->storage_location_id)) {
                    $this->storageMovement(
                        $locationId,
                        (int)$lot->storage_location_id,
                        (int)$lot->item_id,
                        -$qty,
                        'PURCHASE_REVERSAL',
                        $staffId,
                        'purchase_reversal',
                        $receiptId,
                        $note
                    );
                }

                if (!empty($lot->purchase_order_line_id)) {
                    $poLine = DB::table('pmd_inventory_purchase_order_lines')
                        ->where('id', (int)$lot->purchase_order_line_id)
                        ->first();

                    if ($poLine) {
                        $factor = max(0.0001, (float)$poLine->base_quantity_per_package);
                        $packages = $qty / $factor;
                        DB::table('pmd_inventory_purchase_order_lines')
                            ->where('id', (int)$poLine->id)
                            ->update([
                                'quantity_received' => max(
                                    0,
                                    round((float)$poLine->quantity_received - $packages, 4)
                                ),
                                'updated_at' => now(),
                            ]);
                        $poIds[(int)$poLine->purchase_order_id] = true;
                    }
                } elseif (!empty($lot->purchase_order_id)) {
                    $poIds[(int)$lot->purchase_order_id] = true;
                }

                DB::table('pmd_inventory_lots')
                    ->where('id', (int)$lot->id)
                    ->update([
                        'qty_remaining' => 0,
                        'active' => 0,
                        'updated_at' => now(),
                    ]);
            }

            DB::table('pmd_inventory_receipts')
                ->where('location_id', $locationId)
                ->where('id', $receiptId)
                ->update([
                    'reversed_at' => now(),
                    'reversed_by' => $staffId,
                    'updated_at' => now(),
                ]);

            foreach (array_keys($poIds) as $poId) {
                $ordered = (float)DB::table('pmd_inventory_purchase_order_lines')
                    ->where('purchase_order_id', $poId)
                    ->sum('quantity_ordered');
                $received = (float)DB::table('pmd_inventory_purchase_order_lines')
                    ->where('purchase_order_id', $poId)
                    ->sum('quantity_received');

                $status = $received <= 0.00005
                    ? 'sent'
                    : ($received + 0.00005 >= $ordered ? 'received' : 'partial');

                DB::table('pmd_inventory_purchase_orders')
                    ->where('location_id', $locationId)
                    ->where('id', $poId)
                    ->whereNotIn('status', ['cancelled', 'closed'])
                    ->update([
                        'status' => $status,
                        'received_at' => $status === 'received' ? now() : null,
                        'updated_at' => now(),
                    ]);
            }
        });
    }

    public function recordAdjustment(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $item = $this->item($locationId, $itemId);
        $kind = strtolower(trim((string)($data['kind'] ?? 'adjustment')));
        $qty = $this->number($data['quantity'] ?? 0);

        if (!in_array($kind, ['adjustment', 'return_supplier'], true)) {
            throw new InvalidArgumentException('Unsupported adjustment type.');
        }

        if ($kind === 'return_supplier') {
            $qty = -abs($qty);
        }

        if (abs($qty) <= 0.00005) {
            throw new InvalidArgumentException('Adjustment quantity cannot be zero.');
        }

        $movementType = $kind === 'return_supplier' ? 'RETURN_SUPPLIER' : 'ADJUSTMENT';
        $id = (int)DB::table('pmd_inventory_movements')->insertGetId([
            'location_id' => $locationId,
            'item_id' => $itemId,
            'movement_type' => $movementType,
            'qty_delta' => round($qty, 4),
            'unit_cost' => round((float)$item->unit_cost, 6),
            'reference_type' => 'inventory_r24',
            'reference_id' => null,
            'reason' => $this->nullableText($data['reason'] ?? ucfirst(str_replace('_', ' ', $kind)), 160),
            'note' => $this->nullableText($data['note'] ?? null, 5000),
            'staff_id' => $staffId,
            'occurred_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $storageId = max(0, (int)($data['storage_location_id'] ?? 0));
        if ($storageId > 0) {
            $this->storageLocation($locationId, $storageId);
            $this->storageMovement(
                $locationId,
                $storageId,
                $itemId,
                $qty,
                $movementType,
                $staffId,
                'inventory_movement',
                $id,
                $this->nullableText($data['note'] ?? null, 5000)
            );
        }

        return $id;
    }

    private function syncNotifications(int $locationId, array $items, array $lots): void
    {
        if (
            !Schema::hasTable('notifications')
            || !Schema::hasTable('pmd_inventory_alert_states')
        ) {
            return;
        }

        try {
            foreach ($items as $item) {
                if (!is_array($item)) continue;

                $itemId = (int)($item['id'] ?? 0);
                if ($itemId < 1) continue;

                $status = strtolower((string)($item['status'] ?? 'healthy'));
                $newStatus = in_array($status, ['critical', 'low'], true)
                    ? $status
                    : 'clear';

                $this->syncNotificationState(
                    $locationId,
                    'stock:'.$itemId,
                    $newStatus,
                    function (string $previous) use ($item, $newStatus): void {
                        $name = (string)($item['name'] ?? 'Stock item');
                        if ($newStatus === 'critical') {
                            $this->insertInventoryNotification(
                                'inventory_stock',
                                $name.' needs stock now',
                                [
                                    'item_id' => (int)($item['id'] ?? 0),
                                    'item_name' => $name,
                                    'status' => 'critical',
                                    'estimated_on_hand' => (float)($item['estimated_on_hand'] ?? 0),
                                    'unit' => (string)($item['unit'] ?? ''),
                                    'days_left' => $item['days_left'] ?? null,
                                ]
                            );
                        } elseif ($newStatus === 'low') {
                            $this->insertInventoryNotification(
                                'inventory_stock',
                                $name.' is running low',
                                [
                                    'item_id' => (int)($item['id'] ?? 0),
                                    'item_name' => $name,
                                    'status' => 'low',
                                    'estimated_on_hand' => (float)($item['estimated_on_hand'] ?? 0),
                                    'unit' => (string)($item['unit'] ?? ''),
                                    'days_left' => $item['days_left'] ?? null,
                                ]
                            );
                        } elseif (in_array($previous, ['critical', 'low'], true)) {
                            $this->insertInventoryNotification(
                                'inventory_stock',
                                $name.' stock is healthy again',
                                [
                                    'item_id' => (int)($item['id'] ?? 0),
                                    'item_name' => $name,
                                    'status' => 'recovered',
                                ]
                            );
                        }
                    }
                );
            }

            foreach ($lots as $lot) {
                if (!is_array($lot)) continue;

                $lotId = (int)($lot['id'] ?? 0);
                if ($lotId < 1) continue;

                $status = strtolower((string)($lot['expiry_status'] ?? 'none'));
                $hasStock = (float)($lot['estimated_remaining'] ?? 0) > 0.00005;
                $newStatus = $hasStock && in_array($status, ['soon', 'expired'], true)
                    ? $status
                    : 'clear';

                $this->syncNotificationState(
                    $locationId,
                    'expiry:'.$lotId,
                    $newStatus,
                    function (string $previous) use ($lot, $newStatus): void {
                        if (!in_array($newStatus, ['soon', 'expired'], true)) {
                            return;
                        }

                        $name = (string)($lot['item_name'] ?? 'Stock item');
                        $this->insertInventoryNotification(
                            'inventory_expiry',
                            $newStatus === 'expired'
                                ? $name.' has expired stock'
                                : $name.' expires soon',
                            [
                                'lot_id' => (int)($lot['id'] ?? 0),
                                'item_id' => (int)($lot['item_id'] ?? 0),
                                'item_name' => $name,
                                'status' => $newStatus,
                                'lot_code' => $lot['lot_code'] ?? null,
                                'expires_at' => $lot['expires_at'] ?? null,
                                'estimated_remaining' => (float)($lot['estimated_remaining'] ?? 0),
                                'unit' => (string)($lot['unit'] ?? ''),
                                'storage_name' => $lot['storage_name'] ?? null,
                            ]
                        );
                    }
                );
            }
        } catch (\Throwable $error) {
            logger()->warning('Inventory R24 notification sync skipped', [
                'location_id' => $locationId,
                'message' => $error->getMessage(),
            ]);
        }
    }

    private function syncNotificationState(
        int $locationId,
        string $key,
        string $newStatus,
        callable $onTransition
    ): void {
        $existing = DB::table('pmd_inventory_alert_states')
            ->where('location_id', $locationId)
            ->where('alert_key', $key)
            ->first();

        $previous = $existing ? (string)$existing->status : 'clear';
        if ($previous === $newStatus) {
            return;
        }

        $onTransition($previous);

        DB::table('pmd_inventory_alert_states')->updateOrInsert(
            [
                'location_id' => $locationId,
                'alert_key' => mb_substr($key, 0, 190),
            ],
            [
                'status' => mb_substr($newStatus, 0, 40),
                'last_notified_at' => $newStatus === 'clear'
                    ? ($existing->last_notified_at ?? null)
                    : now(),
                'resolved_at' => $newStatus === 'clear' ? now() : null,
                'updated_at' => now(),
                'created_at' => $existing->created_at ?? now(),
            ]
        );
    }

    private function insertInventoryNotification(
        string $type,
        string $title,
        array $payload
    ): void {
        DB::table('notifications')->insert([
            'type' => mb_substr($type, 0, 80),
            'title' => mb_substr($title, 0, 255),
            'table_id' => null,
            'table_name' => null,
            'payload' => json_encode(
                $payload + ['timestamp' => now()->toIso8601String()],
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'status' => 'new',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function ensureDefaults(int $locationId): void
    {
        if (!DB::table('pmd_inventory_settings')->where('location_id', $locationId)->exists()) {
            DB::table('pmd_inventory_settings')->insert([
                'location_id' => $locationId,
                'consumption_event' => 'paid',
                'expiry_alert_days' => 5,
                'safety_stock_days' => 1.5,
                'costing_method' => 'last_purchase',
                'blind_counts' => 0,
                'allow_negative_stock' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (!DB::table('pmd_inventory_storage_locations')->where('location_id', $locationId)->where('active', 1)->exists()) {
            DB::table('pmd_inventory_storage_locations')->insert([
                'location_id' => $locationId,
                'name' => 'Main storage',
                'kind' => 'storage',
                'is_default' => 1,
                'active' => 1,
                'created_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function applyTheoreticalFefo(array $lots, $items): array
    {
        $byItem = [];
        foreach ($lots as $index => $lot) {
            $lot['estimated_remaining'] = 0.0;
            $lots[$index] = $lot;
            $byItem[(int)($lot['item_id'] ?? 0)][] = $index;
        }

        foreach ($byItem as $itemId => $indexes) {
            $item = $items->get($itemId);
            $remaining = max(0, (float)($item['estimated_on_hand'] ?? 0));

            usort($indexes, function (int $a, int $b) use ($lots) {
                $aExpiry = $lots[$a]['expires_at'] ?? null;
                $bExpiry = $lots[$b]['expires_at'] ?? null;
                if ($aExpiry === $bExpiry) {
                    return strcmp((string)($lots[$b]['received_at'] ?? ''), (string)($lots[$a]['received_at'] ?? ''));
                }
                if ($aExpiry === null || $aExpiry === '') return -1;
                if ($bExpiry === null || $bExpiry === '') return 1;
                return strcmp((string)$bExpiry, (string)$aExpiry);
            });

            foreach ($indexes as $index) {
                if ($remaining <= 0) break;
                $capacity = max(0, (float)($lots[$index]['qty_received'] ?? 0));
                $kept = min($remaining, $capacity);
                $lots[$index]['estimated_remaining'] = round($kept, 4);
                $remaining -= $kept;
            }
        }

        foreach ($lots as &$lot) {
            $lot['expiry_status'] = 'none';
            if (!empty($lot['expires_at']) && (float)($lot['estimated_remaining'] ?? 0) > 0) {
                try {
                    $date = \Carbon\Carbon::parse($lot['expires_at'])->startOfDay();
                    if ($date->lt(now()->startOfDay())) {
                        $lot['expiry_status'] = 'expired';
                    } elseif ($date->lte(now()->addDays(5)->endOfDay())) {
                        $lot['expiry_status'] = 'soon';
                    } else {
                        $lot['expiry_status'] = 'ok';
                    }
                } catch (\Throwable $error) {
                    $lot['expiry_status'] = 'none';
                }
            }
        }
        unset($lot);

        return $lots;
    }

    private function storageMovement(
        int $locationId,
        int $storageId,
        int $itemId,
        float $qty,
        string $type,
        ?int $staffId,
        ?string $referenceType,
        ?int $referenceId,
        ?string $note
    ): void {
        DB::table('pmd_inventory_storage_movements')->insert([
            'location_id' => $locationId,
            'storage_location_id' => $storageId,
            'item_id' => $itemId,
            'qty_delta' => round($qty, 4),
            'movement_type' => mb_substr($type, 0, 40),
            'reference_type' => $referenceType ? mb_substr($referenceType, 0, 80) : null,
            'reference_id' => $referenceId,
            'note' => $note,
            'staff_id' => $staffId,
            'occurred_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function storageBalance(int $locationId, int $storageId, int $itemId): float
    {
        return round((float)DB::table('pmd_inventory_storage_movements')
            ->where('location_id', $locationId)
            ->where('storage_location_id', $storageId)
            ->where('item_id', $itemId)
            ->sum('qty_delta'), 4);
    }

    private function defaultStorageLocationId(int $locationId): int
    {
        $this->ensureDefaults($locationId);

        $id = (int)DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->value('id');

        if ($id < 1) {
            throw new RuntimeException('No storage location is configured.');
        }

        return $id;
    }

    private function item(int $locationId, int $itemId)
    {
        $item = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $itemId)
            ->where('active', 1)
            ->first();

        if (!$item) {
            throw new InvalidArgumentException('Stock item was not found.');
        }

        return $item;
    }

    private function supplier(int $locationId, int $supplierId)
    {
        $supplier = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->where('id', $supplierId)
            ->where('active', 1)
            ->first();

        if (!$supplier) {
            throw new InvalidArgumentException('Supplier was not found.');
        }

        return $supplier;
    }

    private function storageLocation(int $locationId, int $storageId)
    {
        $row = DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('id', $storageId)
            ->where('active', 1)
            ->first();

        if (!$row) {
            throw new InvalidArgumentException('Storage location was not found.');
        }

        return $row;
    }

    private function identifier(int $locationId, int $identifierId, ?int $itemId = null)
    {
        $row = DB::table('pmd_inventory_item_identifiers')
            ->where('location_id', $locationId)
            ->where('id', $identifierId)
            ->where('active', 1)
            ->when($itemId, fn ($query) => $query->where('item_id', $itemId))
            ->first();

        if (!$row) {
            throw new InvalidArgumentException('Barcode package mapping was not found.');
        }

        return $row;
    }

    private function purchaseOrder(int $locationId, int $purchaseOrderId)
    {
        $row = DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->where('id', $purchaseOrderId)
            ->first();

        if (!$row) {
            throw new InvalidArgumentException('Purchase order was not found.');
        }

        return $row;
    }

    private function inferCodeType(string $code): string
    {
        if (ctype_digit($code)) {
            return match (strlen($code)) {
                8 => 'EAN8',
                12 => 'UPC_A',
                13 => 'EAN13',
                14 => 'GTIN14',
                default => 'INTERNAL',
            };
        }

        if (preg_match('/^https?:\/\//i', $code)) {
            return 'QR_URL';
        }

        return 'INTERNAL';
    }

    private function validGtin(string $code): bool
    {
        if (!ctype_digit($code) || !in_array(strlen($code), [8, 12, 13, 14], true)) {
            return false;
        }

        $digits = array_map('intval', str_split($code));
        $check = array_pop($digits);
        $sum = 0;
        $weight = 3;

        for ($i = count($digits) - 1; $i >= 0; $i--) {
            $sum += $digits[$i] * $weight;
            $weight = $weight === 3 ? 1 : 3;
        }

        return ((10 - ($sum % 10)) % 10) === $check;
    }

    private function normalizeCode($value): string
    {
        $value = trim((string)($value ?? ''));
        $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value) ?? $value;

        if (preg_match('/^[\d\s-]+$/', $value)) {
            $value = preg_replace('/[\s-]+/', '', $value) ?? $value;
        }

        return mb_substr($value, 0, 190);
    }

    private function location(int $locationId): int
    {
        if ($locationId < 1) {
            throw new InvalidArgumentException('Restaurant location is required.');
        }

        return $locationId;
    }

    private function unit($value): string
    {
        $value = strtolower(trim((string)($value ?? 'piece')));
        if ($value === '') $value = 'piece';
        return mb_substr($value, 0, 30);
    }

    private function currency($value): string
    {
        $value = strtoupper(trim((string)($value ?? 'EUR')));
        return preg_match('/^[A-Z]{3}$/', $value) ? $value : 'EUR';
    }

    private function number($value, float $fallback = 0.0): float
    {
        return is_numeric($value) ? (float)$value : $fallback;
    }

    private function nullableText($value, int $limit): ?string
    {
        $value = trim((string)($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $limit);
    }

    private function nullableDate($value): ?string
    {
        $value = trim((string)($value ?? ''));
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : null;
    }

    private function nullableDateTime($value): ?string
    {
        $value = trim((string)($value ?? ''));
        if ($value === '') return null;

        try {
            return \Carbon\Carbon::parse($value)->toDateTimeString();
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function assertReady(): void
    {
        if (!$this->ready()) {
            throw new RuntimeException('Inventory Professional R24 is not provisioned yet. Run the R24 inventory migration.');
        }
    }
}
