<?php

namespace App\Services\Inventory;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

/**
 * PMD_INVENTORY_OPERATIONS_R24
 *
 * Operational layer for identifiers, suppliers, storage, batches/expiry,
 * purchase orders, transfers, production, settings and the audit ledger.
 *
 * The R1 control service remains the authority for the restaurant's overall
 * expected quantity. This service adds the real-world operational metadata
 * around that quantity without duplicating the sales-consumption engine.
 */
final class PmdInventoryOperationsService
{
    private const TABLES = [
        'pmd_inventory_suppliers',
        'pmd_inventory_storage_locations',
        'pmd_inventory_item_identifiers',
        'pmd_inventory_supplier_items',
        'pmd_inventory_purchase_orders',
        'pmd_inventory_purchase_order_lines',
        'pmd_inventory_batches',
        'pmd_inventory_transfers',
        'pmd_inventory_production_batches',
        'pmd_inventory_production_inputs',
        'pmd_inventory_settings',
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

    public function snapshot(int $locationId, array $inventoryRows = []): array
    {
        $locationId = $this->location($locationId);
        if (!$this->ready()) {
            return [
                'ready' => false,
                'settings' => $this->defaultSettings(),
                'suppliers' => [],
                'storage_locations' => [],
                'identifiers' => [],
                'supplier_items' => [],
                'batches' => [],
                'expiring_batches' => [],
                'purchase_orders' => [],
                'transfers' => [],
                'production_batches' => [],
                'ledger' => [],
                'analytics' => [],
            ];
        }

        $settings = $this->settings($locationId);

        $suppliers = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderBy('name')
            ->get()
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'name' => (string)$row->name,
                'contact_name' => (string)($row->contact_name ?? ''),
                'email' => (string)($row->email ?? ''),
                'phone' => (string)($row->phone ?? ''),
                'order_email' => (string)($row->order_email ?? ''),
                'lead_time_days' => (int)($row->lead_time_days ?? 0),
                'minimum_order_value' => round((float)($row->minimum_order_value ?? 0), 2),
            ])
            ->all();

        $storageLocations = DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderBy('name')
            ->get()
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'name' => (string)$row->name,
                'code' => (string)$row->code,
                'kind' => (string)($row->kind ?? 'storage'),
            ])
            ->all();

        $identifiers = DB::table('pmd_inventory_item_identifiers as x')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'x.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'x.supplier_id')
            ->where('x.location_id', $locationId)
            ->where('x.active', 1)
            ->where('i.active', 1)
            ->orderBy('i.name')
            ->orderByDesc('x.is_primary')
            ->get([
                'x.id',
                'x.item_id',
                'x.supplier_id',
                'x.code',
                'x.code_type',
                'x.package_unit',
                'x.package_quantity',
                'x.base_quantity',
                'x.is_primary',
                'x.source',
                'x.verified_at',
                'i.name as item_name',
                'i.base_unit',
                's.name as supplier_name',
            ])
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'item_id' => (int)$row->item_id,
                'item_name' => (string)$row->item_name,
                'supplier_id' => (int)($row->supplier_id ?? 0),
                'supplier_name' => (string)($row->supplier_name ?? ''),
                'code' => (string)$row->code,
                'code_type' => (string)$row->code_type,
                'package_unit' => (string)$row->package_unit,
                'package_quantity' => round((float)$row->package_quantity, 4),
                'base_quantity' => round((float)$row->base_quantity, 4),
                'base_unit' => (string)$row->base_unit,
                'is_primary' => (bool)$row->is_primary,
                'source' => (string)$row->source,
                'verified_at' => (string)($row->verified_at ?? ''),
            ])
            ->all();

        $supplierItems = DB::table('pmd_inventory_supplier_items as si')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'si.supplier_id')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'si.item_id')
            ->where('si.location_id', $locationId)
            ->where('si.active', 1)
            ->where('i.active', 1)
            ->orderBy('s.name')
            ->orderBy('i.name')
            ->get([
                'si.*',
                's.name as supplier_name',
                'i.name as item_name',
                'i.base_unit',
            ])
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'supplier_id' => (int)$row->supplier_id,
                'supplier_name' => (string)($row->supplier_name ?? ''),
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'supplier_sku' => (string)($row->supplier_sku ?? ''),
                'package_unit' => (string)$row->package_unit,
                'package_quantity' => round((float)$row->package_quantity, 4),
                'base_quantity' => round((float)$row->base_quantity, 4),
                'base_unit' => (string)$row->base_unit,
                'price' => round((float)$row->price, 4),
                'currency' => (string)$row->currency,
                'minimum_order_qty' => round((float)$row->minimum_order_qty, 4),
                'order_multiple' => round((float)$row->order_multiple, 4),
                'is_preferred' => (bool)$row->is_preferred,
                'last_price_at' => (string)($row->last_price_at ?? ''),
            ])
            ->all();

        $batches = DB::table('pmd_inventory_batches as b')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'b.item_id')
            ->leftJoin('pmd_inventory_storage_locations as sl', 'sl.id', '=', 'b.storage_location_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'b.supplier_id')
            ->where('b.location_id', $locationId)
            ->where('b.status', 'open')
            ->where('b.qty_remaining', '>', 0)
            ->orderByRaw('b.expiry_date IS NULL, b.expiry_date ASC')
            ->orderByDesc('b.received_at')
            ->limit(150)
            ->get([
                'b.*',
                'i.name as item_name',
                'i.base_unit',
                'sl.name as storage_name',
                's.name as supplier_name',
            ])
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'base_unit' => (string)($row->base_unit ?? ''),
                'storage_location_id' => (int)($row->storage_location_id ?? 0),
                'storage_name' => (string)($row->storage_name ?? ''),
                'supplier_id' => (int)($row->supplier_id ?? 0),
                'supplier_name' => (string)($row->supplier_name ?? ''),
                'receipt_id' => (int)($row->receipt_id ?? 0),
                'lot_code' => (string)($row->lot_code ?? ''),
                'expiry_date' => (string)($row->expiry_date ?? ''),
                'received_at' => (string)($row->received_at ?? ''),
                'qty_received' => round((float)$row->qty_received, 4),
                'qty_remaining' => round((float)$row->qty_remaining, 4),
                'unit_cost' => round((float)$row->unit_cost, 4),
                'status' => (string)$row->status,
            ])
            ->all();

        // FEFO projection: theoretical sales usage lives in the core stock
        // engine instead of movement rows. Project that depletion onto the
        // oldest-expiring received lots first so expiry exposure reflects the
        // current expected stock instead of the original received quantity.
        $batches = $this->projectFefoRemaining($batches, $inventoryRows);

        $expiryDays = max(1, (int)($settings['expiry_alert_days'] ?? 3));
        $expiryLimit = now()->copy()->addDays($expiryDays)->toDateString();
        $expiring = array_values(array_filter($batches, static function ($batch) use ($expiryLimit) {
            $date = (string)($batch['expiry_date'] ?? '');
            return $date !== '' && $date <= $expiryLimit;
        }));

        $purchaseOrders = $this->purchaseOrders($locationId);
        $transfers = $this->recentTransfers($locationId);
        $production = $this->recentProduction($locationId);
        $ledger = $this->ledger($locationId);

        return [
            'ready' => true,
            'settings' => $settings,
            'suppliers' => $suppliers,
            'storage_locations' => $storageLocations,
            'identifiers' => $identifiers,
            'supplier_items' => $supplierItems,
            'batches' => $batches,
            'expiring_batches' => $expiring,
            'purchase_orders' => $purchaseOrders,
            'transfers' => $transfers,
            'production_batches' => $production,
            'ledger' => $ledger,
            'analytics' => $this->analytics($locationId, $expiring),
        ];
    }

    public function resolveIdentifier(int $locationId, string $rawCode): array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $parsed = $this->parseCode($rawCode);
        $code = $parsed['code'];

        $row = DB::table('pmd_inventory_item_identifiers as x')
            ->join('pmd_inventory_items as i', 'i.id', '=', 'x.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'x.supplier_id')
            ->where('x.location_id', $locationId)
            ->where('x.code', $code)
            ->where('x.active', 1)
            ->where('i.active', 1)
            ->first([
                'x.*',
                'i.name as item_name',
                'i.base_unit',
                'i.purchase_unit',
                'i.purchase_to_base',
                'i.unit_cost',
                's.name as supplier_name',
            ]);

        if (!$row) {
            return [
                'matched' => false,
                'input' => $parsed['input'],
                'code' => $code,
                'code_type' => $parsed['type'],
                'checksum_valid' => $parsed['checksum_valid'],
            ];
        }

        return [
            'matched' => true,
            'input' => $parsed['input'],
            'code' => (string)$row->code,
            'code_type' => (string)$row->code_type,
            'checksum_valid' => $parsed['checksum_valid'],
            'identifier_id' => (int)$row->id,
            'item_id' => (int)$row->item_id,
            'item_name' => (string)$row->item_name,
            'base_unit' => (string)$row->base_unit,
            'package_unit' => (string)$row->package_unit,
            'package_quantity' => round((float)$row->package_quantity, 4),
            'base_quantity' => round((float)$row->base_quantity, 4),
            'supplier_id' => (int)($row->supplier_id ?? 0),
            'supplier_name' => (string)($row->supplier_name ?? ''),
            'estimated_package_cost' => round(
                max(0, (float)$row->unit_cost) * max(0.0001, (float)$row->base_quantity),
                4
            ),
        ];
    }

    public function saveIdentifier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $rawCode = (string)($data['code'] ?? '');
        $parsed = $this->parseCode($rawCode);
        $code = $parsed['code'];

        if ($itemId < 1 || !$this->itemExists($locationId, $itemId)) {
            throw new InvalidArgumentException('Choose the stock item for this code.');
        }
        if ($code === '') {
            throw new InvalidArgumentException('Scan or enter a barcode / product code.');
        }

        $existing = DB::table('pmd_inventory_item_identifiers')
            ->where('location_id', $locationId)
            ->where('code', $code)
            ->first();

        if ($existing && (int)$existing->item_id !== $itemId && (bool)$existing->active) {
            throw new InvalidArgumentException(
                'This code is already linked to another stock item.'
            );
        }

        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        if ($supplierId > 0 && !$this->supplierExists($locationId, $supplierId)) {
            $supplierId = 0;
        }

        $packageUnit = $this->unit($data['package_unit'] ?? 'piece');
        $packageQty = max(0.0001, $this->number($data['package_quantity'] ?? 1, 1));
        $baseQty = max(0.0001, $this->number($data['base_quantity'] ?? 1, 1));

        $payload = [
            'location_id' => $locationId,
            'item_id' => $itemId,
            'supplier_id' => $supplierId > 0 ? $supplierId : null,
            'code' => mb_substr($code, 0, 190),
            'code_type' => mb_substr((string)($data['code_type'] ?? $parsed['type']), 0, 40),
            'package_unit' => $packageUnit,
            'package_quantity' => $packageQty,
            'base_quantity' => $baseQty,
            'is_primary' => !empty($data['is_primary']) ? 1 : 0,
            'source' => mb_substr((string)($data['source'] ?? 'manual'), 0, 40),
            'verified_at' => now(),
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($payload['is_primary']) {
            DB::table('pmd_inventory_item_identifiers')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->update([
                    'is_primary' => 0,
                    'updated_at' => now(),
                ]);
        }

        if ($existing) {
            DB::table('pmd_inventory_item_identifiers')
                ->where('id', (int)$existing->id)
                ->update($payload);
            $id = (int)$existing->id;
        } else {
            $payload['created_at'] = now();
            $id = (int)DB::table('pmd_inventory_item_identifiers')->insertGetId($payload);
        }

        $this->syncLegacySku($locationId, $itemId);

        return $id;
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

        $duplicate = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($id > 0, fn ($query) => $query->where('id', '<>', $id))
            ->where('active', 1)
            ->exists();

        if ($duplicate) {
            throw new InvalidArgumentException('This supplier already exists.');
        }

        $payload = [
            'name' => mb_substr($name, 0, 190),
            'contact_name' => $this->nullableText($data['contact_name'] ?? null, 190),
            'email' => $this->nullableText($data['email'] ?? null, 190),
            'phone' => $this->nullableText($data['phone'] ?? null, 80),
            'order_email' => $this->nullableText($data['order_email'] ?? null, 190),
            'lead_time_days' => max(0, min(365, (int)($data['lead_time_days'] ?? 0))),
            'minimum_order_value' => max(0, $this->number($data['minimum_order_value'] ?? 0, 0)),
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            $updated = DB::table('pmd_inventory_suppliers')
                ->where('location_id', $locationId)
                ->where('id', $id)
                ->update($payload);
            if (!$updated && !DB::table('pmd_inventory_suppliers')->where('location_id', $locationId)->where('id', $id)->exists()) {
                throw new InvalidArgumentException('Supplier was not found.');
            }
            return $id;
        }

        $payload['location_id'] = $locationId;
        $payload['created_by'] = $staffId;
        $payload['created_at'] = now();

        return (int)DB::table('pmd_inventory_suppliers')->insertGetId($payload);
    }

    public function saveSupplierItem(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['supplier_item_id'] ?? 0));
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $itemId = max(0, (int)($data['item_id'] ?? 0));

        if (!$this->supplierExists($locationId, $supplierId)) {
            throw new InvalidArgumentException('Choose a valid supplier.');
        }
        if (!$this->itemExists($locationId, $itemId)) {
            throw new InvalidArgumentException('Choose a valid stock item.');
        }

        $packageUnit = $this->unit($data['package_unit'] ?? 'piece');
        $packageQty = max(0.0001, $this->number($data['package_quantity'] ?? 1, 1));
        $baseQty = max(0.0001, $this->number($data['base_quantity'] ?? 1, 1));
        $price = max(0, $this->number($data['price'] ?? 0, 0));
        $currency = strtoupper(trim((string)($data['currency'] ?? 'EUR')));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            $currency = 'EUR';
        }

        $preferred = !empty($data['is_preferred']);
        if ($preferred) {
            DB::table('pmd_inventory_supplier_items')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->update([
                    'is_preferred' => 0,
                    'updated_at' => now(),
                ]);
        }

        $payload = [
            'location_id' => $locationId,
            'supplier_id' => $supplierId,
            'item_id' => $itemId,
            'supplier_sku' => $this->nullableText($data['supplier_sku'] ?? null, 120),
            'package_unit' => $packageUnit,
            'package_quantity' => $packageQty,
            'base_quantity' => $baseQty,
            'price' => $price,
            'currency' => $currency,
            'minimum_order_qty' => max(0, $this->number($data['minimum_order_qty'] ?? 0, 0)),
            'order_multiple' => max(0.0001, $this->number($data['order_multiple'] ?? 1, 1)),
            'is_preferred' => $preferred ? 1 : 0,
            'last_price_at' => $price > 0 ? now() : null,
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            DB::table('pmd_inventory_supplier_items')
                ->where('location_id', $locationId)
                ->where('id', $id)
                ->update($payload);
        } else {
            $payload['created_at'] = now();
            $id = (int)DB::table('pmd_inventory_supplier_items')->insertGetId($payload);
        }

        if ($preferred) {
            $supplierName = (string)DB::table('pmd_inventory_suppliers')
                ->where('id', $supplierId)
                ->value('name');

            DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', $itemId)
                ->update([
                    'preferred_supplier_id' => $supplierId,
                    'supplier_name' => $supplierName ?: null,
                    'lead_time_days' => max(0, (int)DB::table('pmd_inventory_suppliers')->where('id', $supplierId)->value('lead_time_days')),
                    'minimum_order_qty' => max(0, $this->number($data['minimum_order_qty'] ?? 0, 0)),
                    'order_multiple' => max(0.0001, $this->number($data['order_multiple'] ?? 1, 1)),
                    'updated_at' => now(),
                ]);
        }

        $barcode = trim((string)($data['barcode'] ?? ''));
        if ($barcode !== '') {
            $this->saveIdentifier($locationId, $staffId, [
                'item_id' => $itemId,
                'supplier_id' => $supplierId,
                'code' => $barcode,
                'package_unit' => $packageUnit,
                'package_quantity' => $packageQty,
                'base_quantity' => $baseQty,
                'source' => 'supplier',
                'is_primary' => !empty($data['barcode_primary']),
            ]);
        }

        return $id;
    }

    public function mergeItems(int $locationId, ?int $staffId, int $sourceItemId, int $targetItemId): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        if ($sourceItemId < 1 || $targetItemId < 1 || $sourceItemId === $targetItemId) {
            throw new InvalidArgumentException('Choose two different stock items to merge.');
        }

        $source = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $sourceItemId)
            ->where('active', 1)
            ->first();
        $target = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $targetItemId)
            ->where('active', 1)
            ->first();

        if (!$source || !$target) {
            throw new InvalidArgumentException('Both stock items must be active.');
        }
        if (strtolower((string)$source->base_unit) !== strtolower((string)$target->base_unit)) {
            throw new InvalidArgumentException(
                'Duplicate items can only be merged when their base stock unit is the same.'
            );
        }

        DB::transaction(function () use ($locationId, $sourceItemId, $targetItemId, $target) {
            // Recipe lines need conflict-aware merging because the table has a
            // unique location/menu/item key.
            $sourceRecipes = DB::table('pmd_inventory_recipes')
                ->where('location_id', $locationId)
                ->where('item_id', $sourceItemId)
                ->get();

            foreach ($sourceRecipes as $sourceRecipe) {
                $targetRecipe = DB::table('pmd_inventory_recipes')
                    ->where('location_id', $locationId)
                    ->where('menu_id', (int)$sourceRecipe->menu_id)
                    ->where('item_id', $targetItemId)
                    ->first();

                if ($targetRecipe) {
                    DB::table('pmd_inventory_recipes')
                        ->where('id', (int)$targetRecipe->id)
                        ->update([
                            'qty_per_sale' => round(
                                (float)$targetRecipe->qty_per_sale + (float)$sourceRecipe->qty_per_sale,
                                4
                            ),
                            'updated_at' => now(),
                        ]);
                    DB::table('pmd_inventory_recipes')
                        ->where('id', (int)$sourceRecipe->id)
                        ->update([
                            'active' => 0,
                            'updated_at' => now(),
                        ]);
                } else {
                    DB::table('pmd_inventory_recipes')
                        ->where('id', (int)$sourceRecipe->id)
                        ->update([
                            'item_id' => $targetItemId,
                            'updated_at' => now(),
                        ]);
                }
            }

            // Count lines also have a unique count/item key.
            $sourceCountLines = DB::table('pmd_inventory_count_lines')
                ->where('item_id', $sourceItemId)
                ->get();

            foreach ($sourceCountLines as $sourceLine) {
                $targetLine = DB::table('pmd_inventory_count_lines')
                    ->where('count_id', (int)$sourceLine->count_id)
                    ->where('item_id', $targetItemId)
                    ->first();

                if ($targetLine) {
                    $expected = (float)$targetLine->expected_qty + (float)$sourceLine->expected_qty;
                    $counted = (float)$targetLine->counted_qty + (float)$sourceLine->counted_qty;
                    $costWeightA = abs((float)$targetLine->expected_qty);
                    $costWeightB = abs((float)$sourceLine->expected_qty);
                    $denominator = $costWeightA + $costWeightB;
                    $unitCost = $denominator > 0
                        ? (
                            ((float)$targetLine->unit_cost_snapshot * $costWeightA)
                            + ((float)$sourceLine->unit_cost_snapshot * $costWeightB)
                        ) / $denominator
                        : (float)($target->unit_cost ?? 0);

                    $payload = [
                        'expected_qty' => round($expected, 4),
                        'counted_qty' => round($counted, 4),
                        'variance_qty' => round($counted - $expected, 4),
                        'unit_cost_snapshot' => round($unitCost, 4),
                        'updated_at' => now(),
                    ];
                    if (Schema::hasColumn('pmd_inventory_count_lines', 'is_counted')) {
                        $payload['is_counted'] =
                            (!empty($targetLine->is_counted) || !empty($sourceLine->is_counted)) ? 1 : 0;
                    }

                    DB::table('pmd_inventory_count_lines')
                        ->where('id', (int)$targetLine->id)
                        ->update($payload);
                    DB::table('pmd_inventory_count_lines')
                        ->where('id', (int)$sourceLine->id)
                        ->delete();
                } else {
                    DB::table('pmd_inventory_count_lines')
                        ->where('id', (int)$sourceLine->id)
                        ->update([
                            'item_id' => $targetItemId,
                            'updated_at' => now(),
                        ]);
                }
            }

            $simpleTables = [
                'pmd_inventory_movements',
                'pmd_inventory_item_identifiers',
                'pmd_inventory_supplier_items',
                'pmd_inventory_batches',
                'pmd_inventory_purchase_order_lines',
                'pmd_inventory_transfers',
                'pmd_inventory_production_inputs',
            ];

            foreach ($simpleTables as $table) {
                if (Schema::hasTable($table) && Schema::hasColumn($table, 'item_id')) {
                    DB::table($table)
                        ->where('item_id', $sourceItemId)
                        ->update(['item_id' => $targetItemId]);
                }
            }

            if (Schema::hasTable('pmd_inventory_production_batches')) {
                DB::table('pmd_inventory_production_batches')
                    ->where('output_item_id', $sourceItemId)
                    ->update([
                        'output_item_id' => $targetItemId,
                        'updated_at' => now(),
                    ]);
            }

            DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', $sourceItemId)
                ->update([
                    'active' => 0,
                    'updated_at' => now(),
                ]);

            $this->syncLegacySku($locationId, $targetItemId);
        });
    }

    public function saveStorageLocation(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['storage_location_id'] ?? 0));
        $name = trim((string)($data['name'] ?? ''));
        $code = strtoupper(trim((string)($data['code'] ?? '')));

        if ($name === '') {
            throw new InvalidArgumentException('Storage location name is required.');
        }
        if ($code === '') {
            $code = strtoupper(substr(preg_replace('/[^A-Za-z0-9]+/', '-', $name), 0, 60));
        }

        $payload = [
            'location_id' => $locationId,
            'name' => mb_substr($name, 0, 120),
            'code' => mb_substr($code, 0, 60),
            'kind' => mb_substr((string)($data['kind'] ?? 'storage'), 0, 40),
            'active' => 1,
            'updated_at' => now(),
        ];

        $duplicate = DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('code', $payload['code'])
            ->when($id > 0, fn ($query) => $query->where('id', '<>', $id))
            ->exists();
        if ($duplicate) {
            throw new InvalidArgumentException('Storage location code is already used.');
        }

        if ($id > 0) {
            DB::table('pmd_inventory_storage_locations')
                ->where('location_id', $locationId)
                ->where('id', $id)
                ->update($payload);
            return $id;
        }

        $payload['created_by'] = $staffId;
        $payload['created_at'] = now();
        return (int)DB::table('pmd_inventory_storage_locations')->insertGetId($payload);
    }

    public function saveSettings(int $locationId, array $data): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        $event = strtolower(trim((string)($data['consumption_event'] ?? 'paid')));
        if (!in_array($event, ['paid', 'ordered', 'processing', 'completed'], true)) {
            $event = 'paid';
        }

        $valuation = strtolower(trim((string)($data['valuation_method'] ?? 'weighted_average')));
        if (!in_array($valuation, ['weighted_average', 'last_cost'], true)) {
            $valuation = 'weighted_average';
        }

        DB::table('pmd_inventory_settings')->updateOrInsert(
            ['location_id' => $locationId],
            [
                'consumption_event' => $event,
                'valuation_method' => $valuation,
                'default_safety_days' => max(0, min(60, $this->number($data['default_safety_days'] ?? 2, 2))),
                'expiry_alert_days' => max(1, min(365, (int)($data['expiry_alert_days'] ?? 3))),
                'notifications_enabled' => !empty($data['notifications_enabled']) ? 1 : 0,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    public function savePurchaseOrder(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $lines = $this->arrayValue($data['lines'] ?? []);

        if ($supplierId > 0 && !$this->supplierExists($locationId, $supplierId)) {
            throw new InvalidArgumentException('Choose a valid supplier.');
        }
        if (!$lines) {
            throw new InvalidArgumentException('Add at least one purchase-order line.');
        }

        $poId = max(0, (int)($data['purchase_order_id'] ?? 0));
        $poNumber = trim((string)($data['po_number'] ?? ''));
        if ($poNumber === '') {
            $poNumber = $this->nextPoNumber($locationId);
        }

        return DB::transaction(function () use ($locationId, $staffId, $data, $supplierId, $lines, $poId, $poNumber) {
            $header = [
                'location_id' => $locationId,
                'supplier_id' => $supplierId > 0 ? $supplierId : null,
                'po_number' => mb_substr($poNumber, 0, 60),
                'status' => mb_substr((string)($data['status'] ?? 'draft'), 0, 30),
                'ordered_at' => $this->nullableDate($data['ordered_at'] ?? null),
                'expected_at' => $this->nullableDate($data['expected_at'] ?? null),
                'notes' => $this->nullableText($data['notes'] ?? null, 4000),
                'updated_at' => now(),
            ];

            if ($poId > 0) {
                $exists = DB::table('pmd_inventory_purchase_orders')
                    ->where('location_id', $locationId)
                    ->where('id', $poId)
                    ->exists();
                if (!$exists) {
                    throw new InvalidArgumentException('Purchase order was not found.');
                }
                DB::table('pmd_inventory_purchase_orders')->where('id', $poId)->update($header);
                DB::table('pmd_inventory_purchase_order_lines')->where('purchase_order_id', $poId)->delete();
            } else {
                $header['created_by'] = $staffId;
                $header['created_at'] = now();
                $poId = (int)DB::table('pmd_inventory_purchase_orders')->insertGetId($header);
            }

            $subtotal = 0.0;
            foreach ($lines as $line) {
                if (!is_array($line)) {
                    continue;
                }
                $itemId = max(0, (int)($line['item_id'] ?? 0));
                $qty = max(0, $this->number($line['quantity'] ?? $line['quantity_ordered'] ?? 0, 0));
                if ($itemId < 1 || $qty <= 0 || !$this->itemExists($locationId, $itemId)) {
                    continue;
                }

                $supplierItemId = max(0, (int)($line['supplier_item_id'] ?? 0));
                $packageUnit = $this->unit($line['package_unit'] ?? 'piece');
                $baseQty = max(0.0001, $this->number($line['base_quantity'] ?? 1, 1));
                $unitCost = max(0, $this->number($line['unit_cost'] ?? 0, 0));
                $itemName = (string)DB::table('pmd_inventory_items')->where('id', $itemId)->value('name');
                $lineTotal = $qty * $unitCost;
                $subtotal += $lineTotal;

                DB::table('pmd_inventory_purchase_order_lines')->insert([
                    'purchase_order_id' => $poId,
                    'item_id' => $itemId,
                    'supplier_item_id' => $supplierItemId > 0 ? $supplierItemId : null,
                    'description' => mb_substr((string)($line['description'] ?? $itemName), 0, 190),
                    'quantity_ordered' => $qty,
                    'quantity_received' => max(0, $this->number($line['quantity_received'] ?? 0, 0)),
                    'package_unit' => $packageUnit,
                    'base_quantity' => $baseQty,
                    'unit_cost' => $unitCost,
                    'line_total' => round($lineTotal, 4),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('pmd_inventory_purchase_orders')
                ->where('id', $poId)
                ->update([
                    'subtotal' => round($subtotal, 4),
                    'total' => round($subtotal, 4),
                    'updated_at' => now(),
                ]);

            return $poId;
        });
    }

    public function updatePurchaseOrderStatus(
        int $locationId,
        ?int $staffId,
        int $purchaseOrderId,
        string $status
    ): void {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $status = strtolower(trim($status));
        $allowed = ['draft', 'sent', 'cancelled', 'closed'];

        if (!in_array($status, $allowed, true)) {
            throw new InvalidArgumentException('Unsupported purchase-order status.');
        }

        $po = DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->where('id', $purchaseOrderId)
            ->first();

        if (!$po) {
            throw new InvalidArgumentException('Purchase order was not found.');
        }
        if (in_array((string)$po->status, ['received', 'closed', 'cancelled'], true)
            && $status !== 'closed') {
            throw new InvalidArgumentException('This purchase order can no longer change status.');
        }

        $payload = [
            'status' => $status,
            'updated_at' => now(),
        ];

        if ($status === 'sent') {
            $payload['sent_at'] = now();
            $payload['ordered_at'] = $po->ordered_at ?: now()->toDateString();
        }
        if ($status === 'closed') {
            $payload['received_at'] = $po->received_at ?: now();
        }

        DB::table('pmd_inventory_purchase_orders')
            ->where('id', $purchaseOrderId)
            ->update($payload);
    }

    public function receivePurchaseOrder(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $poId = max(0, (int)($data['purchase_order_id'] ?? 0));

        $po = DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->where('id', $poId)
            ->first();
        if (!$po) {
            throw new InvalidArgumentException('Purchase order was not found.');
        }
        if (in_array((string)$po->status, ['cancelled', 'closed'], true)) {
            throw new InvalidArgumentException('This purchase order cannot receive more stock.');
        }

        $requested = collect($this->arrayValue($data['lines'] ?? []))
            ->keyBy(static fn ($line) => is_array($line) ? (int)($line['line_id'] ?? 0) : 0);

        $orderLines = DB::table('pmd_inventory_purchase_order_lines')
            ->where('purchase_order_id', $poId)
            ->orderBy('id')
            ->get();

        $purchaseLines = [];
        $receivedByLine = [];

        foreach ($orderLines as $line) {
            $remaining = max(0, (float)$line->quantity_ordered - (float)$line->quantity_received);
            $input = $requested->get((int)$line->id);
            $qty = $input
                ? max(0, $this->number($input['quantity'] ?? 0, 0))
                : $remaining;
            $qty = min($remaining, $qty);

            if ($qty <= 0) {
                continue;
            }

            $purchaseLines[] = [
                'item_id' => (int)$line->item_id,
                'item_name' => (string)$line->description,
                'quantity' => $qty,
                'unit' => (string)$line->package_unit,
                'unit_cost' => $input && array_key_exists('unit_cost', $input)
                    ? max(0, $this->number($input['unit_cost'], (float)$line->unit_cost))
                    : (float)$line->unit_cost,
                'base_quantity' => (float)$line->base_quantity,
                'supplier_item_id' => (int)($line->supplier_item_id ?? 0),
                'storage_location_id' => (int)($input['storage_location_id'] ?? 0),
                'lot_code' => (string)($input['lot_code'] ?? ''),
                'expiry_date' => (string)($input['expiry_date'] ?? ''),
            ];
            $receivedByLine[(int)$line->id] = $qty;
        }

        if (!$purchaseLines) {
            throw new InvalidArgumentException('There is no remaining quantity to receive.');
        }

        $supplierName = '';
        if ((int)($po->supplier_id ?? 0) > 0) {
            $supplierName = (string)DB::table('pmd_inventory_suppliers')
                ->where('id', (int)$po->supplier_id)
                ->value('name');
        }

        $receiptId = app(PmdInventoryControlService::class)->savePurchase(
            $locationId,
            $staffId,
            [
                'supplier_id' => (int)($po->supplier_id ?? 0),
                'supplier_name' => $supplierName,
                'purchase_order_id' => $poId,
                'invoice_number' => (string)($data['invoice_number'] ?? ''),
                'delivery_note_number' => (string)($data['delivery_note_number'] ?? ''),
                'purchased_at' => (string)($data['purchased_at'] ?? now()->toDateString()),
                'lines' => $purchaseLines,
            ]
        );

        DB::transaction(function () use ($poId, $receivedByLine) {
            foreach ($receivedByLine as $lineId => $qty) {
                DB::table('pmd_inventory_purchase_order_lines')
                    ->where('purchase_order_id', $poId)
                    ->where('id', $lineId)
                    ->increment('quantity_received', $qty, ['updated_at' => now()]);
            }

            $lines = DB::table('pmd_inventory_purchase_order_lines')
                ->where('purchase_order_id', $poId)
                ->get(['quantity_ordered', 'quantity_received']);

            $complete = $lines->every(
                static fn ($line) => (float)$line->quantity_received + 0.00005 >= (float)$line->quantity_ordered
            );

            DB::table('pmd_inventory_purchase_orders')
                ->where('id', $poId)
                ->update([
                    'status' => $complete ? 'received' : 'partially_received',
                    'received_at' => $complete ? now() : null,
                    'updated_at' => now(),
                ]);
        });

        return $receiptId;
    }

    public function transferStock(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $from = max(0, (int)($data['from_storage_location_id'] ?? 0));
        $to = max(0, (int)($data['to_storage_location_id'] ?? 0));
        $qty = max(0, $this->number($data['quantity_base'] ?? $data['quantity'] ?? 0, 0));

        if (!$this->itemExists($locationId, $itemId)) {
            throw new InvalidArgumentException('Choose a valid stock item.');
        }
        if ($from < 1 || $to < 1 || $from === $to) {
            throw new InvalidArgumentException('Choose two different storage locations.');
        }
        if (!$this->storageExists($locationId, $from) || !$this->storageExists($locationId, $to)) {
            throw new InvalidArgumentException('Storage location was not found.');
        }
        if ($qty <= 0) {
            throw new InvalidArgumentException('Enter the transfer quantity.');
        }

        $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();

        return DB::transaction(function () use ($locationId, $staffId, $data, $itemId, $from, $to, $qty, $item) {
            $transferId = (int)DB::table('pmd_inventory_transfers')->insertGetId([
                'location_id' => $locationId,
                'item_id' => $itemId,
                'from_storage_location_id' => $from,
                'to_storage_location_id' => $to,
                'quantity_base' => $qty,
                'status' => 'completed',
                'occurred_at' => now(),
                'staff_id' => $staffId,
                'note' => $this->nullableText($data['note'] ?? null, 2000),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->insertMovement(
                $locationId, $itemId, 'TRANSFER_OUT', -$qty, (float)$item->unit_cost,
                $staffId, 'Storage transfer', null, 'inventory_transfer', $transferId, $from
            );
            $this->insertMovement(
                $locationId, $itemId, 'TRANSFER_IN', $qty, (float)$item->unit_cost,
                $staffId, 'Storage transfer', null, 'inventory_transfer', $transferId, $to
            );

            return $transferId;
        });
    }

    public function returnToSupplier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $storageId = max(0, (int)($data['storage_location_id'] ?? 0));
        $qty = max(0, $this->number($data['quantity_base'] ?? $data['quantity'] ?? 0, 0));

        if (!$this->itemExists($locationId, $itemId)) {
            throw new InvalidArgumentException('Choose a valid stock item.');
        }
        if ($supplierId > 0 && !$this->supplierExists($locationId, $supplierId)) {
            throw new InvalidArgumentException('Supplier was not found.');
        }
        if ($storageId > 0 && !$this->storageExists($locationId, $storageId)) {
            throw new InvalidArgumentException('Storage location was not found.');
        }
        if ($qty <= 0) {
            throw new InvalidArgumentException('Enter the quantity being returned.');
        }

        $current = app(PmdInventoryControlService::class)->snapshot($locationId);
        $stockRow = collect($current['items'] ?? [])->first(
            static fn ($row) => (int)($row['id'] ?? 0) === $itemId
        );
        if (!$stockRow || $qty > max(0, (float)($stockRow['estimated_on_hand'] ?? 0)) + 0.00005) {
            throw new InvalidArgumentException('Return quantity cannot exceed the expected stock on hand.');
        }

        $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();
        $supplierName = $supplierId > 0
            ? (string)DB::table('pmd_inventory_suppliers')->where('id', $supplierId)->value('name')
            : '';

        return $this->insertMovement(
            $locationId,
            $itemId,
            'SUPPLIER_RETURN',
            -$qty,
            (float)($item->unit_cost ?? 0),
            $staffId,
            'Return to supplier'.($supplierName !== '' ? ': '.$supplierName : ''),
            $this->nullableText($data['note'] ?? null, 2000),
            'supplier_return',
            $supplierId > 0 ? $supplierId : null,
            $storageId
        );
    }

    public function reverseReceipt(int $locationId, ?int $staffId, int $receiptId): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $receipt = DB::table('pmd_inventory_receipts')
            ->where('location_id', $locationId)
            ->where('id', $receiptId)
            ->first();

        if (!$receipt || empty($receipt->confirmed_at)) {
            throw new InvalidArgumentException('Confirmed purchase was not found.');
        }
        if (!empty($receipt->reversed_at) || (string)($receipt->status ?? '') === 'reversed') {
            throw new InvalidArgumentException('This purchase has already been reversed.');
        }

        DB::transaction(function () use ($locationId, $staffId, $receiptId) {
            $movements = DB::table('pmd_inventory_movements')
                ->where('location_id', $locationId)
                ->where('movement_type', 'PURCHASE')
                ->where('reference_type', 'purchase_receipt')
                ->where('reference_id', $receiptId)
                ->get();

            foreach ($movements as $movement) {
                $this->insertMovement(
                    $locationId,
                    (int)$movement->item_id,
                    'PURCHASE_REVERSAL',
                    -abs((float)$movement->qty_delta),
                    (float)$movement->unit_cost,
                    $staffId,
                    'Purchase reversed',
                    null,
                    'purchase_receipt_reversal',
                    $receiptId,
                    (int)($movement->storage_location_id ?? 0),
                    (int)($movement->batch_id ?? 0),
                    (int)$movement->id
                );
            }

            DB::table('pmd_inventory_batches')
                ->where('location_id', $locationId)
                ->where('receipt_id', $receiptId)
                ->update([
                    'status' => 'reversed',
                    'qty_remaining' => 0,
                    'updated_at' => now(),
                ]);

            DB::table('pmd_inventory_receipts')
                ->where('location_id', $locationId)
                ->where('id', $receiptId)
                ->update([
                    'status' => 'reversed',
                    'reversed_at' => now(),
                    'reversed_by' => $staffId,
                    'updated_at' => now(),
                ]);
        });
    }

    public function recordProduction(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $outputItemId = max(0, (int)($data['output_item_id'] ?? 0));
        $outputQty = max(0, $this->number($data['quantity_output'] ?? 0, 0));
        $inputs = $this->arrayValue($data['inputs'] ?? []);

        if (!$this->itemExists($locationId, $outputItemId) || $outputQty <= 0) {
            throw new InvalidArgumentException('Choose the prepared stock item and output quantity.');
        }
        if (!$inputs) {
            throw new InvalidArgumentException('Add at least one production input.');
        }

        return DB::transaction(function () use ($locationId, $staffId, $data, $outputItemId, $outputQty, $inputs) {
            $inputRows = [];
            $totalCost = 0.0;

            foreach ($inputs as $input) {
                if (!is_array($input)) {
                    continue;
                }
                $itemId = max(0, (int)($input['item_id'] ?? 0));
                $qty = max(0, $this->number($input['qty_base'] ?? $input['quantity'] ?? 0, 0));
                if ($itemId < 1 || $qty <= 0 || !$this->itemExists($locationId, $itemId)) {
                    continue;
                }
                $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();
                $cost = max(0, (float)($item->unit_cost ?? 0));
                $totalCost += $qty * $cost;
                $inputRows[] = [$itemId, $qty, $cost];
            }

            if (!$inputRows) {
                throw new InvalidArgumentException('No valid production inputs were provided.');
            }

            $outputCost = $outputQty > 0 ? $totalCost / $outputQty : 0;

            $batchId = (int)DB::table('pmd_inventory_production_batches')->insertGetId([
                'location_id' => $locationId,
                'output_item_id' => $outputItemId,
                'quantity_output' => $outputQty,
                'unit_cost' => round($outputCost, 6),
                'status' => 'completed',
                'produced_at' => now(),
                'staff_id' => $staffId,
                'note' => $this->nullableText($data['note'] ?? null, 2000),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($inputRows as [$itemId, $qty, $cost]) {
                DB::table('pmd_inventory_production_inputs')->insert([
                    'production_batch_id' => $batchId,
                    'item_id' => $itemId,
                    'qty_base' => $qty,
                    'unit_cost' => $cost,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $this->insertMovement(
                    $locationId, $itemId, 'PRODUCTION_INPUT', -$qty, $cost,
                    $staffId, 'Prep / production', null, 'production_batch', $batchId,
                    max(0, (int)($data['storage_location_id'] ?? 0))
                );
            }

            $this->insertMovement(
                $locationId, $outputItemId, 'PRODUCTION_OUTPUT', $outputQty, $outputCost,
                $staffId, 'Prep / production', null, 'production_batch', $batchId,
                max(0, (int)($data['storage_location_id'] ?? 0))
            );

            DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', $outputItemId)
                ->update([
                    'unit_cost' => round($outputCost, 6),
                    'updated_at' => now(),
                ]);

            return $batchId;
        });
    }

    /**
     * Called by PmdInventoryControlService after a purchase line movement was
     * recorded. Adds lot/expiry/storage metadata and supplier price history.
     */
    public function recordPurchaseLineMetadata(
        int $locationId,
        int $receiptId,
        int $itemId,
        array $line,
        float $baseQty,
        float $baseUnitCost,
        ?int $supplierId,
        int $movementId
    ): array {
        if (!$this->ready()) {
            return ['batch_id' => 0];
        }

        $storageId = max(0, (int)($line['storage_location_id'] ?? 0));
        if ($storageId < 1) {
            $storageId = max(0, (int)DB::table('pmd_inventory_items')
                ->where('id', $itemId)
                ->value('default_storage_location_id'));
        }

        $batchId = 0;
        $lot = trim((string)($line['lot_code'] ?? ''));
        $expiry = $this->nullableDate($line['expiry_date'] ?? null);

        if ($lot !== '' || $expiry !== null) {
            $batchId = (int)DB::table('pmd_inventory_batches')->insertGetId([
                'location_id' => $locationId,
                'item_id' => $itemId,
                'storage_location_id' => $storageId > 0 ? $storageId : null,
                'supplier_id' => $supplierId && $supplierId > 0 ? $supplierId : null,
                'receipt_id' => $receiptId,
                'lot_code' => $this->nullableText($lot, 120),
                'expiry_date' => $expiry,
                'received_at' => now(),
                'qty_received' => $baseQty,
                'qty_remaining' => $baseQty,
                'unit_cost' => $baseUnitCost,
                'status' => 'open',
                'notes' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if ($movementId > 0) {
            DB::table('pmd_inventory_movements')
                ->where('id', $movementId)
                ->update([
                    'storage_location_id' => $storageId > 0 ? $storageId : null,
                    'batch_id' => $batchId > 0 ? $batchId : null,
                    'metadata_json' => json_encode([
                        'identifier_id' => max(0, (int)($line['identifier_id'] ?? 0)),
                        'supplier_item_id' => max(0, (int)($line['supplier_item_id'] ?? 0)),
                        'lot_code' => $lot ?: null,
                        'expiry_date' => $expiry,
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'updated_at' => now(),
                ]);
        }

        $supplierItemId = max(0, (int)($line['supplier_item_id'] ?? 0));
        if ($supplierItemId > 0) {
            $supplierItem = DB::table('pmd_inventory_supplier_items')
                ->where('location_id', $locationId)
                ->where('id', $supplierItemId)
                ->first();

            if ($supplierItem) {
                $packagePrice = $baseUnitCost * max(0.0001, (float)$supplierItem->base_quantity);
                DB::table('pmd_inventory_supplier_items')
                    ->where('id', $supplierItemId)
                    ->update([
                        'price' => round($packagePrice, 4),
                        'last_price_at' => now(),
                        'updated_at' => now(),
                    ]);

                if (Schema::hasTable('pmd_inventory_supplier_price_history')) {
                    DB::table('pmd_inventory_supplier_price_history')->insert([
                        'location_id' => $locationId,
                        'supplier_item_id' => $supplierItemId,
                        'receipt_id' => $receiptId,
                        'price' => round($packagePrice, 4),
                        'currency' => (string)($supplierItem->currency ?? 'EUR'),
                        'source' => 'purchase',
                        'occurred_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        return ['batch_id' => $batchId, 'storage_location_id' => $storageId];
    }

    public function assertInvoiceNumberUnique(
        int $locationId,
        ?int $supplierId,
        ?string $supplierName,
        ?string $invoiceNumber,
        int $exceptReceiptId = 0
    ): void {
        if (!$this->ready()) {
            return;
        }

        $invoiceNumber = trim((string)$invoiceNumber);
        if ($invoiceNumber === '' || !Schema::hasColumn('pmd_inventory_receipts', 'invoice_number')) {
            return;
        }

        $query = DB::table('pmd_inventory_receipts')
            ->where('location_id', $locationId)
            ->whereRaw('LOWER(invoice_number) = ?', [mb_strtolower($invoiceNumber)])
            ->when($exceptReceiptId > 0, fn ($q) => $q->where('id', '<>', $exceptReceiptId))
            ->where(function ($q) {
                $q->whereNotNull('confirmed_at')
                    ->orWhereIn('status', ['review', 'confirmed']);
            });

        if ($supplierId && $supplierId > 0) {
            $query->where('supplier_id', $supplierId);
        } elseif (trim((string)$supplierName) !== '') {
            $query->whereRaw("LOWER(COALESCE(supplier_name, '')) = ?", [
                mb_strtolower(trim((string)$supplierName)),
            ]);
        }

        if ($query->exists()) {
            throw new InvalidArgumentException(
                'This supplier invoice number already exists. Open the existing receipt or reverse it instead of receiving it twice.'
            );
        }
    }

    public function assertReceiptHashUnique(int $locationId, ?string $hash, int $exceptReceiptId = 0): void
    {
        if (!$this->ready()) {
            return;
        }
        $hash = trim((string)$hash);
        if ($hash === '' || !Schema::hasColumn('pmd_inventory_receipts', 'invoice_hash')) {
            return;
        }

        $exists = DB::table('pmd_inventory_receipts')
            ->where('location_id', $locationId)
            ->where('invoice_hash', $hash)
            ->when($exceptReceiptId > 0, fn ($query) => $query->where('id', '<>', $exceptReceiptId))
            ->where(function ($query) {
                $query->whereNotNull('confirmed_at')
                    ->orWhereIn('ai_status', ['review', 'manual_review']);
            })
            ->exists();

        if ($exists) {
            throw new InvalidArgumentException(
                'This supplier bill appears to have already been scanned. Review the existing purchase instead of adding it twice.'
            );
        }
    }

    public function settings(int $locationId): array
    {
        if (!$this->ready()) {
            return $this->defaultSettings();
        }

        $row = DB::table('pmd_inventory_settings')
            ->where('location_id', $locationId)
            ->first();

        if (!$row) {
            return $this->defaultSettings();
        }

        return [
            'consumption_event' => (string)($row->consumption_event ?? 'paid'),
            'valuation_method' => (string)($row->valuation_method ?? 'weighted_average'),
            'default_safety_days' => round((float)($row->default_safety_days ?? 2), 2),
            'expiry_alert_days' => (int)($row->expiry_alert_days ?? 3),
            'notifications_enabled' => (bool)($row->notifications_enabled ?? true),
        ];
    }

    private function projectFefoRemaining(array $batches, array $inventoryRows): array
    {
        if (!$batches || !$inventoryRows) {
            return $batches;
        }

        $expectedByItem = [];
        foreach ($inventoryRows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $itemId = (int)($row['id'] ?? 0);
            if ($itemId > 0) {
                $expectedByItem[$itemId] = max(0, (float)($row['estimated_on_hand'] ?? 0));
            }
        }

        $indicesByItem = [];
        foreach ($batches as $index => $batch) {
            $itemId = (int)($batch['item_id'] ?? 0);
            if ($itemId > 0) {
                $indicesByItem[$itemId][] = $index;
            }
        }

        foreach ($indicesByItem as $itemId => $indices) {
            if (!array_key_exists($itemId, $expectedByItem)) {
                continue;
            }

            $recorded = 0.0;
            foreach ($indices as $index) {
                $recorded += max(0, (float)($batches[$index]['qty_remaining'] ?? 0));
            }

            $depleted = max(0, $recorded - $expectedByItem[$itemId]);

            // Query ordering is expiry first, so depletion is assigned FEFO.
            foreach ($indices as $index) {
                $raw = max(0, (float)($batches[$index]['qty_remaining'] ?? 0));
                $batches[$index]['recorded_qty_remaining'] = round($raw, 4);

                if ($depleted <= 0) {
                    $batches[$index]['qty_remaining'] = round($raw, 4);
                    continue;
                }

                $consume = min($raw, $depleted);
                $batches[$index]['qty_remaining'] = round(max(0, $raw - $consume), 4);
                $depleted -= $consume;
            }
        }

        return array_values(array_filter(
            $batches,
            static fn ($batch) => (float)($batch['qty_remaining'] ?? 0) > 0.00005
        ));
    }

    private function purchaseOrders(int $locationId): array
    {
        $orders = DB::table('pmd_inventory_purchase_orders as po')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'po.supplier_id')
            ->where('po.location_id', $locationId)
            ->orderByDesc('po.id')
            ->limit(50)
            ->get([
                'po.*',
                's.name as supplier_name',
            ]);

        $ids = $orders->pluck('id')->map(static fn ($id) => (int)$id)->all();
        $lines = $ids
            ? DB::table('pmd_inventory_purchase_order_lines as l')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'l.item_id')
                ->whereIn('l.purchase_order_id', $ids)
                ->orderBy('l.id')
                ->get([
                    'l.*',
                    'i.name as item_name',
                    'i.base_unit',
                ])
                ->groupBy('purchase_order_id')
            : collect();

        return $orders->map(static function ($row) use ($lines) {
            return [
                'id' => (int)$row->id,
                'po_number' => (string)$row->po_number,
                'supplier_id' => (int)($row->supplier_id ?? 0),
                'supplier_name' => (string)($row->supplier_name ?? ''),
                'status' => (string)$row->status,
                'ordered_at' => (string)($row->ordered_at ?? ''),
                'expected_at' => (string)($row->expected_at ?? ''),
                'sent_at' => (string)($row->sent_at ?? ''),
                'received_at' => (string)($row->received_at ?? ''),
                'subtotal' => round((float)$row->subtotal, 2),
                'total' => round((float)$row->total, 2),
                'notes' => (string)($row->notes ?? ''),
                'lines' => collect($lines->get((int)$row->id, []))
                    ->map(static fn ($line) => [
                        'id' => (int)$line->id,
                        'item_id' => (int)$line->item_id,
                        'item_name' => (string)($line->item_name ?? $line->description),
                        'supplier_item_id' => (int)($line->supplier_item_id ?? 0),
                        'quantity_ordered' => round((float)$line->quantity_ordered, 4),
                        'quantity_received' => round((float)$line->quantity_received, 4),
                        'package_unit' => (string)$line->package_unit,
                        'base_quantity' => round((float)$line->base_quantity, 4),
                        'base_unit' => (string)($line->base_unit ?? ''),
                        'unit_cost' => round((float)$line->unit_cost, 4),
                        'line_total' => round((float)$line->line_total, 2),
                    ])
                    ->values()
                    ->all(),
            ];
        })->all();
    }

    private function recentTransfers(int $locationId): array
    {
        return DB::table('pmd_inventory_transfers as t')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 't.item_id')
            ->leftJoin('pmd_inventory_storage_locations as f', 'f.id', '=', 't.from_storage_location_id')
            ->leftJoin('pmd_inventory_storage_locations as x', 'x.id', '=', 't.to_storage_location_id')
            ->leftJoin('staffs as s', 's.staff_id', '=', 't.staff_id')
            ->where('t.location_id', $locationId)
            ->orderByDesc('t.occurred_at')
            ->limit(50)
            ->get([
                't.*',
                'i.name as item_name',
                'i.base_unit',
                'f.name as from_name',
                'x.name as to_name',
                's.staff_name as staff_name',
            ])
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'item_name' => (string)($row->item_name ?? ''),
                'quantity_base' => round((float)$row->quantity_base, 4),
                'base_unit' => (string)($row->base_unit ?? ''),
                'from_name' => (string)($row->from_name ?? ''),
                'to_name' => (string)($row->to_name ?? ''),
                'occurred_at' => (string)$row->occurred_at,
                'staff_name' => (string)($row->staff_name ?? ''),
                'note' => (string)($row->note ?? ''),
            ])
            ->all();
    }

    private function recentProduction(int $locationId): array
    {
        $rows = DB::table('pmd_inventory_production_batches as p')
            ->leftJoin('pmd_inventory_items as o', 'o.id', '=', 'p.output_item_id')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'p.staff_id')
            ->where('p.location_id', $locationId)
            ->orderByDesc('p.produced_at')
            ->limit(40)
            ->get([
                'p.*',
                'o.name as output_name',
                'o.base_unit as output_unit',
                's.staff_name as staff_name',
            ]);

        $ids = $rows->pluck('id')->map(static fn ($id) => (int)$id)->all();
        $inputs = $ids
            ? DB::table('pmd_inventory_production_inputs as x')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'x.item_id')
                ->whereIn('x.production_batch_id', $ids)
                ->get([
                    'x.*',
                    'i.name as item_name',
                    'i.base_unit',
                ])
                ->groupBy('production_batch_id')
            : collect();

        return $rows->map(static function ($row) use ($inputs) {
            return [
                'id' => (int)$row->id,
                'output_item_id' => (int)$row->output_item_id,
                'output_name' => (string)($row->output_name ?? ''),
                'quantity_output' => round((float)$row->quantity_output, 4),
                'output_unit' => (string)($row->output_unit ?? ''),
                'unit_cost' => round((float)$row->unit_cost, 4),
                'produced_at' => (string)$row->produced_at,
                'staff_name' => (string)($row->staff_name ?? ''),
                'note' => (string)($row->note ?? ''),
                'inputs' => collect($inputs->get((int)$row->id, []))
                    ->map(static fn ($input) => [
                        'item_id' => (int)$input->item_id,
                        'item_name' => (string)($input->item_name ?? ''),
                        'qty_base' => round((float)$input->qty_base, 4),
                        'base_unit' => (string)($input->base_unit ?? ''),
                        'unit_cost' => round((float)$input->unit_cost, 4),
                    ])->values()->all(),
            ];
        })->all();
    }

    private function ledger(int $locationId): array
    {
        return DB::table('pmd_inventory_movements as m')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'm.item_id')
            ->leftJoin('pmd_inventory_storage_locations as sl', 'sl.id', '=', 'm.storage_location_id')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'm.staff_id')
            ->where('m.location_id', $locationId)
            ->orderByDesc('m.occurred_at')
            ->orderByDesc('m.id')
            ->limit(160)
            ->get([
                'm.id',
                'm.item_id',
                'm.movement_type',
                'm.qty_delta',
                'm.unit_cost',
                'm.reference_type',
                'm.reference_id',
                'm.reason',
                'm.note',
                'm.occurred_at',
                'm.batch_id',
                'm.reversal_of_movement_id',
                'i.name as item_name',
                'i.base_unit',
                'sl.name as storage_name',
                's.staff_name as staff_name',
            ])
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'movement_type' => (string)$row->movement_type,
                'qty_delta' => round((float)$row->qty_delta, 4),
                'base_unit' => (string)($row->base_unit ?? ''),
                'unit_cost' => round((float)$row->unit_cost, 4),
                'value' => round(abs((float)$row->qty_delta) * (float)$row->unit_cost, 2),
                'reference_type' => (string)($row->reference_type ?? ''),
                'reference_id' => (int)($row->reference_id ?? 0),
                'reason' => (string)($row->reason ?? ''),
                'note' => (string)($row->note ?? ''),
                'storage_name' => (string)($row->storage_name ?? ''),
                'staff_name' => (string)($row->staff_name ?? ''),
                'batch_id' => (int)($row->batch_id ?? 0),
                'reversal_of_movement_id' => (int)($row->reversal_of_movement_id ?? 0),
                'occurred_at' => (string)$row->occurred_at,
            ])
            ->all();
    }

    private function analytics(int $locationId, array $expiring): array
    {
        $purchase30 = $this->movementValue($locationId, ['PURCHASE'], 30);
        $purchase90 = $this->movementValue($locationId, ['PURCHASE'], 90);
        $waste30 = $this->movementValue($locationId, ['WASTE'], 30);
        $reversal30 = $this->movementValue($locationId, ['PURCHASE_REVERSAL'], 30);

        $expiryValue = 0.0;
        foreach ($expiring as $batch) {
            $expiryValue += max(0, (float)$batch['qty_remaining']) * max(0, (float)$batch['unit_cost']);
        }

        $priceChanges = [];
        if (Schema::hasTable('pmd_inventory_supplier_price_history')) {
            $supplierItems = DB::table('pmd_inventory_supplier_items as si')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'si.item_id')
                ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'si.supplier_id')
                ->where('si.location_id', $locationId)
                ->where('si.active', 1)
                ->get(['si.id', 'i.name as item_name', 's.name as supplier_name']);

            foreach ($supplierItems as $si) {
                $history = DB::table('pmd_inventory_supplier_price_history')
                    ->where('location_id', $locationId)
                    ->where('supplier_item_id', (int)$si->id)
                    ->orderByDesc('occurred_at')
                    ->limit(2)
                    ->pluck('price')
                    ->map(static fn ($value) => (float)$value)
                    ->all();

                if (count($history) === 2 && $history[1] > 0) {
                    $pct = (($history[0] - $history[1]) / $history[1]) * 100;
                    if (abs($pct) >= 1) {
                        $priceChanges[] = [
                            'item_name' => (string)($si->item_name ?? ''),
                            'supplier_name' => (string)($si->supplier_name ?? ''),
                            'current' => round($history[0], 2),
                            'previous' => round($history[1], 2),
                            'change_pct' => round($pct, 1),
                        ];
                    }
                }
            }
        }

        usort($priceChanges, static fn ($a, $b) => abs($b['change_pct']) <=> abs($a['change_pct']));

        $wasteByReason = DB::table('pmd_inventory_movements')
            ->where('location_id', $locationId)
            ->where('movement_type', 'WASTE')
            ->where('occurred_at', '>=', now()->subDays(30))
            ->selectRaw("COALESCE(NULLIF(reason, ''), 'Unspecified') as reason, COALESCE(SUM(ABS(qty_delta) * unit_cost), 0) as value")
            ->groupBy('reason')
            ->orderByDesc('value')
            ->limit(12)
            ->get()
            ->map(static fn ($row) => [
                'reason' => (string)$row->reason,
                'value' => round((float)$row->value, 2),
            ])
            ->all();

        $variance30 = 0.0;
        $varianceCount = 0;
        if (Schema::hasTable('pmd_inventory_count_lines') && Schema::hasTable('pmd_inventory_counts')) {
            $varianceRows = DB::table('pmd_inventory_count_lines as l')
                ->join('pmd_inventory_counts as c', 'c.id', '=', 'l.count_id')
                ->where('c.location_id', $locationId)
                ->where('c.status', 'completed')
                ->where('c.counted_at', '>=', now()->subDays(30))
                ->get([
                    'l.variance_qty',
                    'l.unit_cost_snapshot',
                ]);

            foreach ($varianceRows as $row) {
                $cost = (float)$row->variance_qty * (float)$row->unit_cost_snapshot;
                if (abs($cost) > 0.00005) {
                    $varianceCount++;
                    $variance30 += abs($cost);
                }
            }
        }

        return [
            'purchases_30d' => round($purchase30, 2),
            'purchases_90d' => round($purchase90, 2),
            'waste_30d' => round($waste30, 2),
            'purchase_reversals_30d' => round($reversal30, 2),
            'expiring_value' => round($expiryValue, 2),
            'expiring_batches' => count($expiring),
            'waste_by_reason' => $wasteByReason,
            'variance_value_30d' => round($variance30, 2),
            'variance_lines_30d' => $varianceCount,
            'open_purchase_orders' => (int)DB::table('pmd_inventory_purchase_orders')
                ->where('location_id', $locationId)
                ->whereIn('status', ['draft', 'sent', 'partially_received'])
                ->count(),
            'price_changes' => array_slice($priceChanges, 0, 12),
        ];
    }

    private function movementValue(int $locationId, array $types, int $days): float
    {
        return (float)DB::table('pmd_inventory_movements')
            ->where('location_id', $locationId)
            ->whereIn('movement_type', $types)
            ->where('occurred_at', '>=', now()->subDays($days))
            ->selectRaw('COALESCE(SUM(ABS(qty_delta) * unit_cost), 0) AS total')
            ->value('total');
    }

    private function insertMovement(
        int $locationId,
        int $itemId,
        string $type,
        float $qty,
        float $cost,
        ?int $staffId,
        ?string $reason,
        ?string $note,
        ?string $referenceType,
        ?int $referenceId,
        int $storageLocationId = 0,
        int $batchId = 0,
        int $reversalOf = 0
    ): int {
        return (int)DB::table('pmd_inventory_movements')->insertGetId([
            'location_id' => $locationId,
            'item_id' => $itemId,
            'movement_type' => mb_substr($type, 0, 40),
            'qty_delta' => round($qty, 4),
            'unit_cost' => round(max(0, $cost), 4),
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'reason' => $reason,
            'note' => $note,
            'staff_id' => $staffId,
            'storage_location_id' => $storageLocationId > 0 ? $storageLocationId : null,
            'batch_id' => $batchId > 0 ? $batchId : null,
            'reversal_of_movement_id' => $reversalOf > 0 ? $reversalOf : null,
            'metadata_json' => null,
            'occurred_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function parseCode(string $raw): array
    {
        $input = trim(preg_replace('/[\r\n\t]+/', '', $raw) ?? '');
        if ($input === '') {
            return ['input' => '', 'code' => '', 'type' => 'unknown', 'checksum_valid' => null];
        }

        $code = $input;
        $type = 'code';

        if (filter_var($input, FILTER_VALIDATE_URL)) {
            $type = 'qr_url';
            $path = (string)parse_url($input, PHP_URL_PATH);
            if (preg_match('~/(?:01/)?(\d{8,14})(?:/|$)~', $path, $match)) {
                $code = $match[1];
                $type = $this->numericCodeType($code);
            } else {
                parse_str((string)parse_url($input, PHP_URL_QUERY), $query);
                foreach (['gtin', '01'] as $key) {
                    if (!empty($query[$key]) && preg_match('/^\d{8,14}$/', (string)$query[$key])) {
                        $code = (string)$query[$key];
                        $type = $this->numericCodeType($code);
                        break;
                    }
                }
            }
        } elseif (preg_match('/^\(01\)(\d{14})/', $input, $match)) {
            $code = $match[1];
            $type = 'gtin14';
        } elseif (preg_match('/^01(\d{14})/', $input, $match)) {
            $code = $match[1];
            $type = 'gtin14';
        } elseif (preg_match('/^\d{8,14}$/', $input)) {
            $type = $this->numericCodeType($input);
        }

        $checksum = preg_match('/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/', $code)
            ? $this->validGtinChecksum($code)
            : null;

        return [
            'input' => $input,
            'code' => mb_substr($code, 0, 190),
            'type' => $type,
            'checksum_valid' => $checksum,
        ];
    }

    private function numericCodeType(string $code): string
    {
        return match (strlen($code)) {
            8 => 'ean8',
            12 => 'upca',
            13 => 'ean13',
            14 => 'gtin14',
            default => 'numeric',
        };
    }

    private function validGtinChecksum(string $code): bool
    {
        if (!preg_match('/^\d+$/', $code) || strlen($code) < 2) {
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

        $calculated = (10 - ($sum % 10)) % 10;
        return $calculated === $check;
    }

    private function syncLegacySku(int $locationId, int $itemId): void
    {
        $codes = DB::table('pmd_inventory_item_identifiers')
            ->where('location_id', $locationId)
            ->where('item_id', $itemId)
            ->where('active', 1)
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->pluck('code')
            ->map(static fn ($code) => trim((string)$code))
            ->filter()
            ->unique()
            ->values()
            ->all();

        DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $itemId)
            ->update([
                'sku' => $codes ? mb_substr(implode(',', $codes), 0, 120) : null,
                'updated_at' => now(),
            ]);
    }

    private function defaultSettings(): array
    {
        return [
            'consumption_event' => 'paid',
            'valuation_method' => 'weighted_average',
            'default_safety_days' => 2.0,
            'expiry_alert_days' => 3,
            'notifications_enabled' => true,
        ];
    }

    private function nextPoNumber(int $locationId): string
    {
        $prefix = 'PO-'.now()->format('Ymd').'-';
        $count = (int)DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->where('po_number', 'like', $prefix.'%')
            ->count();

        return $prefix.str_pad((string)($count + 1), 3, '0', STR_PAD_LEFT);
    }

    private function itemExists(int $locationId, int $itemId): bool
    {
        return $itemId > 0 && DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $itemId)
            ->where('active', 1)
            ->exists();
    }

    private function supplierExists(int $locationId, int $supplierId): bool
    {
        return $supplierId > 0 && DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->where('id', $supplierId)
            ->where('active', 1)
            ->exists();
    }

    private function storageExists(int $locationId, int $storageId): bool
    {
        return $storageId > 0 && DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('id', $storageId)
            ->where('active', 1)
            ->exists();
    }

    private function assertReady(): void
    {
        if (!$this->ready()) {
            throw new RuntimeException(
                'Inventory Operations R24 is not provisioned yet. Run the R24 inventory migration first.'
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
