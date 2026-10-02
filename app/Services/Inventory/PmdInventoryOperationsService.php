<?php

namespace App\Services\Inventory;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

/**
 * PMD_INVENTORY_OPERATIONS_V24
 *
 * Additive operations layer on top of the stable Inventory Control ledger.
 * Owns supplier master data, barcode/GTIN packages, purchase orders, storage
 * locations, expiry metadata, transfer/reversal movements and operational
 * settings. Existing R22/R23 stock maths remain authoritative.
 */
final class PmdInventoryOperationsService
{
    public function ready(): bool
    {
        return Schema::hasTable('pmd_inventory_item_identifiers')
            && Schema::hasTable('pmd_inventory_suppliers')
            && Schema::hasTable('pmd_inventory_purchase_orders')
            && Schema::hasTable('pmd_inventory_storage_locations')
            && Schema::hasTable('pmd_inventory_settings');
    }

    public function snapshot(int $locationId): array
    {
        if (!$this->ready()) {
            return [
                'ready' => false,
                'suppliers' => [],
                'supplier_items' => [],
                'identifiers' => [],
                'storage_locations' => [],
                'purchase_orders' => [],
                'expiry_lots' => [],
                'recent_movements' => [],
                'cost_history' => [],
                'settings' => $this->defaultSettings(),
                'supplier_performance' => [],
                'storage_balances' => [],
            ];
        }

        $locationId = $this->location($locationId);
        $this->ensureDefaultStorageLocations($locationId);

        $settings = $this->settings($locationId);
        $warningDays = max(1, (int)($settings['expiry_warning_days'] ?? 7));

        $suppliers = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => [
                'id' => (int)$row->id,
                'name' => (string)$row->name,
                'account_code' => (string)($row->account_code ?? ''),
                'email' => (string)($row->email ?? ''),
                'phone' => (string)($row->phone ?? ''),
                'order_email' => (string)($row->order_email ?? ''),
                'lead_time_days' => (int)($row->lead_time_days ?? 1),
                'min_order_value' => round((float)($row->min_order_value ?? 0), 2),
                'notes' => (string)($row->notes ?? ''),
            ])
            ->values()
            ->all();

        $supplierItems = DB::table('pmd_inventory_supplier_items as si')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'si.supplier_id')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'si.item_id')
            ->where('si.location_id', $locationId)
            ->where('si.active', 1)
            ->where('i.active', 1)
            ->orderByDesc('si.is_primary')
            ->orderBy('i.name')
            ->get([
                'si.*',
                's.name as supplier_name',
                'i.name as item_name',
                'i.base_unit as base_unit',
            ])
            ->map(fn ($row) => [
                'id' => (int)$row->id,
                'supplier_id' => (int)$row->supplier_id,
                'supplier_name' => (string)($row->supplier_name ?? ''),
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'base_unit' => (string)($row->base_unit ?? 'piece'),
                'supplier_sku' => (string)($row->supplier_sku ?? ''),
                'pack_unit' => (string)($row->pack_unit ?? 'piece'),
                'pack_to_base' => round(max(0.0001, (float)($row->pack_to_base ?? 1)), 4),
                'pack_cost' => round((float)($row->pack_cost ?? 0), 4),
                'min_order_qty' => round((float)($row->min_order_qty ?? 0), 4),
                'order_multiple' => round(max(0.0001, (float)($row->order_multiple ?? 1)), 4),
                'is_primary' => (bool)$row->is_primary,
            ])
            ->values()
            ->all();

        $identifiers = DB::table('pmd_inventory_item_identifiers as bi')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'bi.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'bi.supplier_id')
            ->where('bi.location_id', $locationId)
            ->where('bi.active', 1)
            ->where('i.active', 1)
            ->orderByDesc('bi.is_primary')
            ->orderBy('i.name')
            ->get([
                'bi.*',
                'i.name as item_name',
                'i.base_unit as base_unit',
                's.name as supplier_name',
            ])
            ->map(fn ($row) => [
                'id' => (int)$row->id,
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'base_unit' => (string)($row->base_unit ?? 'piece'),
                'supplier_id' => $row->supplier_id ? (int)$row->supplier_id : null,
                'supplier_name' => (string)($row->supplier_name ?? ''),
                'code' => (string)$row->code,
                'normalized_code' => (string)$row->normalized_code,
                'code_type' => (string)$row->code_type,
                'package_unit' => (string)$row->package_unit,
                'package_to_base' => round(max(0.0001, (float)$row->package_to_base), 4),
                'is_primary' => (bool)$row->is_primary,
                'verified_at' => $row->verified_at ? (string)$row->verified_at : null,
            ])
            ->values()
            ->all();

        $storageLocations = DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => [
                'id' => (int)$row->id,
                'name' => (string)$row->name,
                'type' => (string)$row->type,
            ])
            ->values()
            ->all();

        $purchaseOrders = DB::table('pmd_inventory_purchase_orders as po')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'po.supplier_id')
            ->where('po.location_id', $locationId)
            ->orderByRaw("CASE WHEN po.status IN ('draft','sent','partial') THEN 0 ELSE 1 END")
            ->orderByDesc('po.id')
            ->limit(60)
            ->get([
                'po.*',
                's.name as supplier_name',
            ])
            ->map(function ($row) {
                $lines = DB::table('pmd_inventory_purchase_order_lines as pol')
                    ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'pol.item_id')
                    ->where('pol.purchase_order_id', (int)$row->id)
                    ->orderBy('pol.id')
                    ->get([
                        'pol.*',
                        'i.name as item_name',
                        'i.base_unit as base_unit',
                    ])
                    ->map(fn ($line) => [
                        'id' => (int)$line->id,
                        'item_id' => (int)$line->item_id,
                        'item_name' => (string)($line->item_name ?? ''),
                        'base_unit' => (string)($line->base_unit ?? 'piece'),
                        'supplier_item_id' => $line->supplier_item_id ? (int)$line->supplier_item_id : null,
                        'ordered_qty' => round((float)$line->ordered_qty, 4),
                        'received_qty' => round((float)$line->received_qty, 4),
                        'unit' => (string)$line->unit,
                        'pack_to_base' => round(max(0.0001, (float)$line->pack_to_base), 4),
                        'unit_cost' => round((float)$line->unit_cost, 4),
                    ])
                    ->values()
                    ->all();

                return [
                    'id' => (int)$row->id,
                    'supplier_id' => $row->supplier_id ? (int)$row->supplier_id : null,
                    'supplier_name' => (string)($row->supplier_name ?? ''),
                    'order_number' => (string)$row->order_number,
                    'status' => (string)$row->status,
                    'ordered_at' => $row->ordered_at ? (string)$row->ordered_at : null,
                    'expected_at' => $row->expected_at ? (string)$row->expected_at : null,
                    'received_at' => $row->received_at ? (string)$row->received_at : null,
                    'currency' => (string)$row->currency,
                    'subtotal' => round((float)$row->subtotal, 2),
                    'notes' => (string)($row->notes ?? ''),
                    'lines' => $lines,
                ];
            })
            ->values()
            ->all();

        $today = Carbon::today();
        $expiryLots = DB::table('pmd_inventory_lots as l')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'l.item_id')
            ->leftJoin('pmd_inventory_storage_locations as sl', 'sl.id', '=', 'l.storage_location_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'l.supplier_id')
            ->where('l.location_id', $locationId)
            ->where('l.active', 1)
            ->whereNotNull('l.expiry_date')
            ->whereDate('l.expiry_date', '<=', $today->copy()->addDays(max(30, $warningDays))->toDateString())
            ->orderBy('l.expiry_date')
            ->limit(100)
            ->get([
                'l.*',
                'i.name as item_name',
                'i.base_unit as base_unit',
                'sl.name as storage_name',
                's.name as supplier_name',
            ])
            ->map(function ($row) use ($today, $warningDays) {
                $expiry = Carbon::parse($row->expiry_date)->startOfDay();
                $days = $today->diffInDays($expiry, false);
                return [
                    'id' => (int)$row->id,
                    'item_id' => (int)$row->item_id,
                    'item_name' => (string)($row->item_name ?? ''),
                    'unit' => (string)($row->base_unit ?? 'piece'),
                    'storage_location_id' => $row->storage_location_id ? (int)$row->storage_location_id : null,
                    'storage_name' => (string)($row->storage_name ?? ''),
                    'supplier_name' => (string)($row->supplier_name ?? ''),
                    'lot_code' => (string)($row->lot_code ?? ''),
                    'expiry_date' => (string)$row->expiry_date,
                    'days_to_expiry' => (int)$days,
                    'qty_received' => round((float)$row->qty_received, 4),
                    'unit_cost' => round((float)$row->unit_cost, 4),
                    'status' => $days < 0 ? 'expired' : ($days <= $warningDays ? 'expiring' : 'future'),
                ];
            })
            ->values()
            ->all();

        $recentMovements = DB::table('pmd_inventory_movements as m')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'm.item_id')
            ->leftJoin('pmd_inventory_storage_locations as sf', 'sf.id', '=', 'm.storage_location_id')
            ->leftJoin('pmd_inventory_storage_locations as st', 'st.id', '=', 'm.to_storage_location_id')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'm.staff_id')
            ->where('m.location_id', $locationId)
            ->orderByDesc('m.occurred_at')
            ->orderByDesc('m.id')
            ->limit(120)
            ->get([
                'm.*',
                'i.name as item_name',
                'i.base_unit as unit',
                'sf.name as storage_name',
                'st.name as to_storage_name',
                's.staff_name as staff_name',
            ])
            ->map(fn ($row) => [
                'id' => (int)$row->id,
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'unit' => (string)($row->unit ?? 'piece'),
                'movement_type' => (string)$row->movement_type,
                'qty_delta' => round((float)$row->qty_delta, 4),
                'unit_cost' => round((float)$row->unit_cost, 4),
                'reason' => (string)($row->reason ?? ''),
                'note' => (string)($row->note ?? ''),
                'staff_name' => (string)($row->staff_name ?? ''),
                'storage_location_id' => $row->storage_location_id ? (int)$row->storage_location_id : null,
                'storage_name' => (string)($row->storage_name ?? ''),
                'to_storage_location_id' => $row->to_storage_location_id ? (int)$row->to_storage_location_id : null,
                'to_storage_name' => (string)($row->to_storage_name ?? ''),
                'reference_type' => (string)($row->reference_type ?? ''),
                'reference_id' => $row->reference_id ? (int)$row->reference_id : null,
                'reversal_of_id' => $row->reversal_of_id ? (int)$row->reversal_of_id : null,
                'occurred_at' => (string)$row->occurred_at,
            ])
            ->values()
            ->all();

        $costHistory = DB::table('pmd_inventory_cost_history as c')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'c.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'c.supplier_id')
            ->where('c.location_id', $locationId)
            ->orderByDesc('c.purchased_at')
            ->orderByDesc('c.id')
            ->limit(120)
            ->get([
                'c.*',
                'i.name as item_name',
                's.name as supplier_name',
            ])
            ->map(fn ($row) => [
                'id' => (int)$row->id,
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'supplier_id' => $row->supplier_id ? (int)$row->supplier_id : null,
                'supplier_name' => (string)($row->supplier_name ?? ''),
                'base_unit_cost' => round((float)$row->base_unit_cost, 6),
                'purchase_unit_cost' => round((float)$row->purchase_unit_cost, 4),
                'purchase_unit' => (string)($row->purchase_unit ?? ''),
                'purchased_at' => $row->purchased_at ? (string)$row->purchased_at : null,
            ])
            ->values()
            ->all();

        $supplierPerformance = DB::table('pmd_inventory_cost_history as c')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'c.supplier_id')
            ->where('c.location_id', $locationId)
            ->whereNotNull('c.supplier_id')
            ->whereDate('c.purchased_at', '>=', now()->subDays(90)->toDateString())
            ->groupBy('c.supplier_id', 's.name')
            ->get([
                'c.supplier_id',
                's.name as supplier_name',
                DB::raw('COUNT(*) as purchase_lines'),
                DB::raw('AVG(c.purchase_unit_cost) as avg_purchase_unit_cost'),
                DB::raw('MAX(c.purchased_at) as last_purchase_at'),
            ])
            ->map(fn ($row) => [
                'supplier_id' => (int)$row->supplier_id,
                'supplier_name' => (string)($row->supplier_name ?? ''),
                'purchase_lines_90d' => (int)$row->purchase_lines,
                'avg_purchase_unit_cost_90d' => round((float)$row->avg_purchase_unit_cost, 4),
                'last_purchase_at' => $row->last_purchase_at ? (string)$row->last_purchase_at : null,
            ])
            ->values()
            ->all();

        $storageBalances = DB::table('pmd_inventory_movements as m')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'm.item_id')
            ->leftJoin('pmd_inventory_storage_locations as sl', 'sl.id', '=', 'm.storage_location_id')
            ->where('m.location_id', $locationId)
            ->whereNotNull('m.storage_location_id')
            ->groupBy('m.storage_location_id', 'sl.name', 'm.item_id', 'i.name', 'i.base_unit')
            ->get([
                'm.storage_location_id',
                'sl.name as storage_name',
                'm.item_id',
                'i.name as item_name',
                'i.base_unit as unit',
                DB::raw('SUM(m.qty_delta) as qty'),
            ])
            ->map(fn ($row) => [
                'storage_location_id' => (int)$row->storage_location_id,
                'storage_name' => (string)($row->storage_name ?? ''),
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'unit' => (string)($row->unit ?? 'piece'),
                'qty' => round((float)$row->qty, 4),
            ])
            ->values()
            ->all();

        return [
            'ready' => true,
            'suppliers' => $suppliers,
            'supplier_items' => $supplierItems,
            'identifiers' => $identifiers,
            'storage_locations' => $storageLocations,
            'purchase_orders' => $purchaseOrders,
            'expiry_lots' => $expiryLots,
            'recent_movements' => $recentMovements,
            'cost_history' => $costHistory,
            'settings' => $settings,
            'supplier_performance' => $supplierPerformance,
            'storage_balances' => $storageBalances,
            'barcode_stats' => [
                'linked_codes' => count($identifiers),
                'items_with_codes' => count(array_unique(array_column($identifiers, 'item_id'))),
            ],
        ];
    }

    public function resolveIdentifier(int $locationId, string $rawCode): ?array
    {
        if (!$this->ready()) {
            return null;
        }

        $locationId = $this->location($locationId);
        $parsed = $this->parseCode($rawCode);
        if ($parsed['normalized_code'] === '') {
            return null;
        }

        $row = DB::table('pmd_inventory_item_identifiers as bi')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'bi.item_id')
            ->leftJoin('pmd_inventory_suppliers as s', 's.id', '=', 'bi.supplier_id')
            ->where('bi.location_id', $locationId)
            ->where('bi.normalized_code', $parsed['normalized_code'])
            ->where('bi.active', 1)
            ->where('i.active', 1)
            ->first([
                'bi.*',
                'i.name as item_name',
                'i.base_unit as base_unit',
                'i.unit_cost as unit_cost',
                's.name as supplier_name',
            ]);

        if (!$row) {
            return null;
        }

        return [
            'id' => (int)$row->id,
            'item_id' => (int)$row->item_id,
            'item_name' => (string)$row->item_name,
            'base_unit' => (string)$row->base_unit,
            'unit_cost' => round((float)$row->unit_cost, 6),
            'supplier_id' => $row->supplier_id ? (int)$row->supplier_id : null,
            'supplier_name' => (string)($row->supplier_name ?? ''),
            'code' => (string)$row->code,
            'normalized_code' => (string)$row->normalized_code,
            'code_type' => (string)$row->code_type,
            'package_unit' => (string)$row->package_unit,
            'package_to_base' => round(max(0.0001, (float)$row->package_to_base), 4),
            'is_primary' => (bool)$row->is_primary,
        ];
    }

    public function parseCode(string $rawCode): array
    {
        $raw = trim(preg_replace('/[\r\n\t]+/', '', $rawCode) ?? '');
        if ($raw === '') {
            return ['raw_code' => '', 'normalized_code' => '', 'code_type' => 'unknown', 'valid' => false];
        }

        $candidate = $raw;
        if (preg_match('~^https?://~i', $raw)) {
            $parts = parse_url($raw);
            $path = (string)($parts['path'] ?? '');
            if (preg_match('~/(?:01|gtin)/(\d{8,14})(?:/|$)~i', $path, $m)) {
                $candidate = $m[1];
            } elseif (!empty($parts['query'])) {
                parse_str((string)$parts['query'], $query);
                foreach (['gtin', '01', 'ean', 'upc'] as $key) {
                    if (!empty($query[$key]) && preg_match('/^\d{8,14}$/', (string)$query[$key])) {
                        $candidate = (string)$query[$key];
                        break;
                    }
                }
            }
        }

        $normalized = preg_replace('/[\s\-]+/', '', trim($candidate)) ?? '';
        $type = 'internal';
        $valid = true;

        if (preg_match('/^\d+$/', $normalized)) {
            $length = strlen($normalized);
            $type = match ($length) {
                8 => 'EAN8',
                12 => 'UPCA',
                13 => 'EAN13',
                14 => 'GTIN14',
                default => 'numeric',
            };
            $valid = in_array($length, [8, 12, 13, 14], true)
                ? $this->validGtin($normalized)
                : ($length >= 4 && $length <= 32);
        } elseif (preg_match('~^https?://~i', $raw)) {
            $type = 'QR_URL';
            $normalized = $raw;
        } elseif (strlen($normalized) > 190) {
            $valid = false;
        }

        return [
            'raw_code' => $raw,
            'normalized_code' => $normalized,
            'code_type' => $type,
            'valid' => $valid,
        ];
    }

    public function saveIdentifier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['id'] ?? $data['identifier_id'] ?? 0));
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        if ($itemId < 1 || !DB::table('pmd_inventory_items')->where('location_id', $locationId)->where('id', $itemId)->where('active', 1)->exists()) {
            throw new InvalidArgumentException('Choose a valid stock item.');
        }

        $parsed = $this->parseCode((string)($data['code'] ?? ''));
        if ($parsed['normalized_code'] === '') {
            throw new InvalidArgumentException('Scan or enter a barcode / product code.');
        }
        if (!$parsed['valid']) {
            throw new InvalidArgumentException('The barcode check digit or code format is not valid.');
        }

        $packageToBase = max(0.0001, $this->number($data['package_to_base'] ?? 1));
        $packageUnit = $this->text($data['package_unit'] ?? 'piece', 40) ?: 'piece';
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0)) ?: null;
        if ($supplierId && !DB::table('pmd_inventory_suppliers')->where('location_id', $locationId)->where('id', $supplierId)->where('active', 1)->exists()) {
            throw new InvalidArgumentException('Supplier was not found.');
        }

        $duplicate = DB::table('pmd_inventory_item_identifiers')
            ->where('location_id', $locationId)
            ->where('normalized_code', $parsed['normalized_code'])
            ->when($id > 0, fn ($q) => $q->where('id', '<>', $id))
            ->first();

        if ($duplicate && (int)$duplicate->item_id !== $itemId) {
            throw new InvalidArgumentException('This code is already linked to another stock item.');
        }
        if ($duplicate && $id < 1) {
            $id = (int)$duplicate->id;
        }

        if ($id < 1) {
            $existingId = DB::table('pmd_inventory_supplier_items')
                ->where('location_id', $locationId)
                ->where('supplier_id', $supplierId)
                ->where('item_id', $itemId)
                ->where('active', 1)
                ->orderByDesc('is_primary')
                ->value('id');
            if ($existingId) $id = (int)$existingId;
        }

        $isPrimary = $this->bool($data['is_primary'] ?? false);
        if ($isPrimary) {
            DB::table('pmd_inventory_item_identifiers')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->update(['is_primary' => 0, 'updated_at' => now()]);
        }

        $payload = [
            'location_id' => $locationId,
            'item_id' => $itemId,
            'supplier_id' => $supplierId,
            'code' => $this->text($parsed['raw_code'], 190),
            'normalized_code' => $this->text($parsed['normalized_code'], 190),
            'code_type' => $this->text($parsed['code_type'], 30),
            'package_unit' => $packageUnit,
            'package_to_base' => round($packageToBase, 4),
            'is_primary' => $isPrimary ? 1 : 0,
            'verified_at' => now(),
            'active' => 1,
            'created_by' => $staffId,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            $exists = DB::table('pmd_inventory_item_identifiers')
                ->where('location_id', $locationId)
                ->where('id', $id)
                ->exists();
            if (!$exists) {
                throw new InvalidArgumentException('Barcode link was not found.');
            }
            unset($payload['created_by']);
            DB::table('pmd_inventory_item_identifiers')->where('id', $id)->update($payload);
            return $id;
        }

        $payload['created_at'] = now();
        return (int)DB::table('pmd_inventory_item_identifiers')->insertGetId($payload);
    }

    public function supplierIdForName(int $locationId, ?int $staffId, string $name): ?int
    {
        if (!$this->ready()) return null;
        $locationId = $this->location($locationId);
        $name = $this->text($name, 190);
        if ($name === '') return null;

        $existing = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->where('active', 1)
            ->value('id');

        if ($existing) return (int)$existing;

        return $this->saveSupplier($locationId, $staffId, ['name' => $name]);
    }

    public function saveSupplier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['supplier_id'] ?? 0));
        $name = $this->text($data['name'] ?? '', 190);
        if ($name === '') {
            throw new InvalidArgumentException('Supplier name is required.');
        }

        $payload = [
            'location_id' => $locationId,
            'name' => $name,
            'account_code' => $this->nullableText($data['account_code'] ?? null, 120),
            'email' => $this->nullableText($data['email'] ?? null, 190),
            'phone' => $this->nullableText($data['phone'] ?? null, 80),
            'order_email' => $this->nullableText($data['order_email'] ?? null, 190),
            'lead_time_days' => max(0, min(365, (int)($data['lead_time_days'] ?? 1))),
            'min_order_value' => round(max(0, $this->number($data['min_order_value'] ?? 0)), 4),
            'notes' => $this->nullableText($data['notes'] ?? null, 4000),
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            if (!DB::table('pmd_inventory_suppliers')->where('location_id', $locationId)->where('id', $id)->exists()) {
                throw new InvalidArgumentException('Supplier was not found.');
            }
            DB::table('pmd_inventory_suppliers')->where('id', $id)->update($payload);
            return $id;
        }

        $payload['created_by'] = $staffId;
        $payload['created_at'] = now();
        return (int)DB::table('pmd_inventory_suppliers')->insertGetId($payload);
    }

    public function saveSupplierItem(int $locationId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['supplier_item_id'] ?? 0));
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $itemId = max(0, (int)($data['item_id'] ?? 0));

        if (!$supplierId || !DB::table('pmd_inventory_suppliers')->where('location_id', $locationId)->where('id', $supplierId)->where('active', 1)->exists()) {
            throw new InvalidArgumentException('Choose a supplier.');
        }
        $item = DB::table('pmd_inventory_items')->where('location_id', $locationId)->where('id', $itemId)->where('active', 1)->first();
        if (!$item) {
            throw new InvalidArgumentException('Choose a stock item.');
        }

        $isPrimary = $this->bool($data['is_primary'] ?? false);
        if ($isPrimary) {
            DB::table('pmd_inventory_supplier_items')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->update(['is_primary' => 0, 'updated_at' => now()]);
        }

        $payload = [
            'location_id' => $locationId,
            'supplier_id' => $supplierId,
            'item_id' => $itemId,
            'supplier_sku' => $this->nullableText($data['supplier_sku'] ?? null, 160),
            'pack_unit' => $this->text($data['pack_unit'] ?? ($item->purchase_unit ?? $item->base_unit), 40),
            'pack_to_base' => round(max(0.0001, $this->number($data['pack_to_base'] ?? ($item->purchase_to_base ?? 1))), 4),
            'pack_cost' => round(max(0, $this->number($data['pack_cost'] ?? 0)), 4),
            'min_order_qty' => round(max(0, $this->number($data['min_order_qty'] ?? 0)), 4),
            'order_multiple' => round(max(0.0001, $this->number($data['order_multiple'] ?? 1)), 4),
            'is_primary' => $isPrimary ? 1 : 0,
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            if (!DB::table('pmd_inventory_supplier_items')->where('location_id', $locationId)->where('id', $id)->exists()) {
                throw new InvalidArgumentException('Supplier item was not found.');
            }
            DB::table('pmd_inventory_supplier_items')->where('id', $id)->update($payload);
        } else {
            $payload['created_at'] = now();
            $id = (int)DB::table('pmd_inventory_supplier_items')->insertGetId($payload);
        }

        if ($isPrimary) {
            $supplierName = DB::table('pmd_inventory_suppliers')->where('id', $supplierId)->value('name');
            DB::table('pmd_inventory_items')->where('id', $itemId)->update([
                'preferred_supplier_id' => $supplierId,
                'supplier_name' => $supplierName ?: $item->supplier_name,
                'purchase_unit' => $payload['pack_unit'],
                'purchase_to_base' => $payload['pack_to_base'],
                'updated_at' => now(),
            ]);
        }

        return $id;
    }

    public function saveStorageLocation(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['storage_location_id'] ?? 0));
        $name = $this->text($data['name'] ?? '', 160);
        if ($name === '') {
            throw new InvalidArgumentException('Storage location name is required.');
        }

        $payload = [
            'location_id' => $locationId,
            'name' => $name,
            'type' => $this->text($data['type'] ?? 'storage', 50) ?: 'storage',
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($id > 0) {
            if (!DB::table('pmd_inventory_storage_locations')->where('location_id', $locationId)->where('id', $id)->exists()) {
                throw new InvalidArgumentException('Storage location was not found.');
            }
            DB::table('pmd_inventory_storage_locations')->where('id', $id)->update($payload);
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
        $trigger = strtolower($this->text($data['consumption_trigger'] ?? 'paid', 30));
        if (!in_array($trigger, ['paid', 'accepted', 'kitchen', 'completed'], true)) {
            $trigger = 'paid';
        }

        $payload = [
            'consumption_trigger' => $trigger,
            'default_storage_location_id' => max(0, (int)($data['default_storage_location_id'] ?? 0)) ?: null,
            'expiry_warning_days' => max(1, min(120, (int)($data['expiry_warning_days'] ?? 7))),
            'blind_count' => $this->bool($data['blind_count'] ?? false) ? 1 : 0,
            'low_stock_notifications' => $this->bool($data['low_stock_notifications'] ?? true) ? 1 : 0,
            'menu_availability_guard' => $this->bool($data['menu_availability_guard'] ?? false) ? 1 : 0,
            'updated_at' => now(),
        ];

        $exists = DB::table('pmd_inventory_settings')->where('location_id', $locationId)->exists();
        if ($exists) {
            DB::table('pmd_inventory_settings')->where('location_id', $locationId)->update($payload);
        } else {
            $payload['location_id'] = $locationId;
            $payload['created_at'] = now();
            DB::table('pmd_inventory_settings')->insert($payload);
        }
    }

    public function savePurchaseOrder(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $id = max(0, (int)($data['purchase_order_id'] ?? 0));
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0)) ?: null;
        if ($supplierId && !DB::table('pmd_inventory_suppliers')->where('location_id', $locationId)->where('id', $supplierId)->where('active', 1)->exists()) {
            throw new InvalidArgumentException('Supplier was not found.');
        }

        $lines = is_array($data['lines'] ?? null) ? $data['lines'] : [];
        if (!$lines) {
            throw new InvalidArgumentException('Add at least one purchase-order line.');
        }

        $status = strtolower($this->text($data['status'] ?? 'draft', 30));
        if (!in_array($status, ['draft', 'sent', 'partial', 'received', 'closed', 'cancelled'], true)) {
            $status = 'draft';
        }

        return DB::transaction(function () use ($locationId, $staffId, $data, $id, $supplierId, $lines, $status) {
            $orderNumber = $this->text($data['order_number'] ?? '', 80);
            if ($orderNumber === '') {
                do {
                    $orderNumber = 'PO-'.now()->format('Ymd-His').'-'.random_int(100, 999);
                } while (
                    DB::table('pmd_inventory_purchase_orders')
                        ->where('location_id', $locationId)
                        ->where('order_number', $orderNumber)
                        ->exists()
                );
            }

            $subtotal = 0.0;
            $cleanLines = [];
            foreach ($lines as $line) {
                if (!is_array($line)) continue;
                $itemId = max(0, (int)($line['item_id'] ?? 0));
                $qty = max(0, $this->number($line['quantity'] ?? $line['ordered_qty'] ?? 0));
                if ($itemId < 1 || $qty <= 0) continue;
                $item = DB::table('pmd_inventory_items')->where('location_id', $locationId)->where('id', $itemId)->where('active', 1)->first();
                if (!$item) continue;

                $unitCost = max(0, $this->number($line['unit_cost'] ?? 0));
                $subtotal += $qty * $unitCost;
                $cleanLines[] = [
                    'item_id' => $itemId,
                    'supplier_item_id' => max(0, (int)($line['supplier_item_id'] ?? 0)) ?: null,
                    'ordered_qty' => round($qty, 4),
                    'received_qty' => round(max(0, $this->number($line['received_qty'] ?? 0)), 4),
                    'unit' => $this->text($line['unit'] ?? ($item->purchase_unit ?? $item->base_unit), 40),
                    'pack_to_base' => round(max(0.0001, $this->number($line['pack_to_base'] ?? ($item->purchase_to_base ?? 1))), 4),
                    'unit_cost' => round($unitCost, 4),
                ];
            }

            if (!$cleanLines) {
                throw new InvalidArgumentException('Purchase order has no valid lines.');
            }

            $payload = [
                'location_id' => $locationId,
                'supplier_id' => $supplierId,
                'order_number' => $orderNumber,
                'status' => $status,
                'ordered_at' => $data['ordered_at'] ?? now()->toDateString(),
                'expected_at' => $data['expected_at'] ?? null,
                'currency' => strtoupper($this->text($data['currency'] ?? 'EUR', 3)),
                'subtotal' => round($subtotal, 4),
                'notes' => $this->nullableText($data['notes'] ?? null, 4000),
                'updated_at' => now(),
            ];

            if ($id > 0) {
                if (!DB::table('pmd_inventory_purchase_orders')->where('location_id', $locationId)->where('id', $id)->exists()) {
                    throw new InvalidArgumentException('Purchase order was not found.');
                }
                DB::table('pmd_inventory_purchase_orders')->where('id', $id)->update($payload);
                DB::table('pmd_inventory_purchase_order_lines')->where('purchase_order_id', $id)->delete();
            } else {
                $payload['created_by'] = $staffId;
                $payload['created_at'] = now();
                $id = (int)DB::table('pmd_inventory_purchase_orders')->insertGetId($payload);
            }

            foreach ($cleanLines as $line) {
                $line['purchase_order_id'] = $id;
                $line['created_at'] = now();
                $line['updated_at'] = now();
                DB::table('pmd_inventory_purchase_order_lines')->insert($line);
            }

            return $id;
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
        $purchaseOrderId = max(0, $purchaseOrderId);
        $status = strtolower(trim($status));

        if (!in_array($status, ['draft', 'sent', 'partial', 'received', 'closed', 'cancelled'], true)) {
            throw new InvalidArgumentException('Purchase-order status is not valid.');
        }

        $po = DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->where('id', $purchaseOrderId)
            ->first();

        if (!$po) {
            throw new InvalidArgumentException('Purchase order was not found.');
        }

        if ((string)$po->status === 'cancelled' && $status !== 'cancelled') {
            throw new InvalidArgumentException('A cancelled purchase order cannot be reopened.');
        }

        if ($status === 'cancelled') {
            $received = DB::table('pmd_inventory_purchase_order_lines')
                ->where('purchase_order_id', $purchaseOrderId)
                ->where('received_qty', '>', 0)
                ->exists();
            if ($received) {
                throw new InvalidArgumentException('A partially received purchase order cannot be cancelled. Receive or close the remainder instead.');
            }
        }

        if ($status === 'received') {
            $lines = DB::table('pmd_inventory_purchase_order_lines')
                ->where('purchase_order_id', $purchaseOrderId)
                ->get();
            $complete = $lines->isNotEmpty() && $lines->every(
                fn ($line) => (float)$line->received_qty + 0.00005 >= (float)$line->ordered_qty
            );
            if (!$complete) {
                throw new InvalidArgumentException('Receive all ordered quantities before marking this PO received.');
            }
        }

        $payload = [
            'status' => $status,
            'updated_at' => now(),
        ];

        if ($status === 'sent' && !$po->ordered_at) {
            $payload['ordered_at'] = now()->toDateString();
        }
        if ($status === 'received' && !$po->received_at) {
            $payload['received_at'] = now();
        }
        if ($status === 'closed' && !$po->received_at) {
            $payload['received_at'] = now();
        }
        if ($status === 'sent' && Schema::hasColumn('pmd_inventory_purchase_orders', 'approved_by')) {
            $payload['approved_by'] = $staffId;
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
        $po = DB::table('pmd_inventory_purchase_orders')->where('location_id', $locationId)->where('id', $poId)->first();
        if (!$po || in_array((string)$po->status, ['cancelled', 'closed'], true)) {
            throw new InvalidArgumentException('Purchase order is unavailable.');
        }

        $requestedLines = is_array($data['lines'] ?? null) ? $data['lines'] : [];
        $poLines = DB::table('pmd_inventory_purchase_order_lines')->where('purchase_order_id', $poId)->get()->keyBy('id');
        $purchaseLines = [];
        $receivedByLine = [];

        foreach ($requestedLines as $line) {
            if (!is_array($line)) continue;
            $poLineId = max(0, (int)($line['purchase_order_line_id'] ?? 0));
            $poLine = $poLines->get($poLineId);
            if (!$poLine) continue;

            $qty = max(0, $this->number($line['quantity'] ?? 0));
            if ($qty <= 0) continue;
            $remaining = max(0, (float)$poLine->ordered_qty - (float)$poLine->received_qty);
            $qty = min($qty, $remaining);
            if ($qty <= 0) continue;

            $purchaseLines[] = [
                'item_id' => (int)$poLine->item_id,
                'quantity' => $qty,
                'unit' => (string)$poLine->unit,
                'unit_cost' => (float)$poLine->unit_cost,
                'storage_location_id' => max(0, (int)($line['storage_location_id'] ?? 0)) ?: null,
                'lot_code' => $this->nullableText($line['lot_code'] ?? null, 160),
                'expiry_date' => $line['expiry_date'] ?? null,
                'supplier_id' => $po->supplier_id ? (int)$po->supplier_id : null,
                'purchase_order_line_id' => $poLineId,
            ];
            $receivedByLine[$poLineId] = $qty;
        }

        if (!$purchaseLines) {
            throw new InvalidArgumentException('Enter at least one received quantity.');
        }

        $supplierName = $po->supplier_id
            ? (string)(DB::table('pmd_inventory_suppliers')->where('id', $po->supplier_id)->value('name') ?? '')
            : '';

        $receiptId = app(PmdInventoryControlService::class)->savePurchase(
            $locationId,
            $staffId,
            [
                'supplier_name' => $supplierName,
                'supplier_id' => $po->supplier_id,
                'purchase_order_id' => $poId,
                'supplier_invoice_number' => $data['supplier_invoice_number'] ?? null,
                'purchased_at' => $data['purchased_at'] ?? now()->toDateString(),
                'source' => 'purchase_order',
                'lines' => $purchaseLines,
            ]
        );

        foreach ($receivedByLine as $lineId => $qty) {
            DB::table('pmd_inventory_purchase_order_lines')
                ->where('id', $lineId)
                ->increment('received_qty', $qty, ['updated_at' => now()]);
        }

        $lines = DB::table('pmd_inventory_purchase_order_lines')->where('purchase_order_id', $poId)->get();
        $complete = $lines->every(fn ($line) => (float)$line->received_qty + 0.00005 >= (float)$line->ordered_qty);
        $receivedAny = $lines->contains(fn ($line) => (float)$line->received_qty > 0);

        DB::table('pmd_inventory_purchase_orders')->where('id', $poId)->update([
            'status' => $complete ? 'received' : ($receivedAny ? 'partial' : (string)$po->status),
            'received_at' => $complete ? now() : null,
            'updated_at' => now(),
        ]);

        return $receiptId;
    }

    public function transferStock(int $locationId, ?int $staffId, array $data): array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $qty = max(0, $this->number($data['quantity'] ?? 0));
        $from = max(0, (int)($data['from_storage_location_id'] ?? 0));
        $to = max(0, (int)($data['to_storage_location_id'] ?? 0));

        if ($itemId < 1 || $qty <= 0 || $from < 1 || $to < 1 || $from === $to) {
            throw new InvalidArgumentException('Choose an item, quantity and two different storage locations.');
        }

        $item = DB::table('pmd_inventory_items')->where('location_id', $locationId)->where('id', $itemId)->where('active', 1)->first();
        if (!$item) throw new InvalidArgumentException('Stock item was not found.');
        foreach ([$from, $to] as $storageId) {
            if (!DB::table('pmd_inventory_storage_locations')->where('location_id', $locationId)->where('id', $storageId)->where('active', 1)->exists()) {
                throw new InvalidArgumentException('Storage location was not found.');
            }
        }

        return DB::transaction(function () use ($locationId, $staffId, $item, $qty, $from, $to, $data) {
            $now = now();
            $referenceId = (int)($now->format('YmdHis').random_int(10, 99));
            $common = [
                'location_id' => $locationId,
                'item_id' => (int)$item->id,
                'unit_cost' => round((float)$item->unit_cost, 4),
                'reference_type' => 'storage_transfer',
                'reference_id' => $referenceId,
                'reason' => 'Storage transfer',
                'note' => $this->nullableText($data['note'] ?? null, 2000),
                'staff_id' => $staffId,
                'occurred_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $out = $common + [
                'movement_type' => 'TRANSFER_OUT',
                'qty_delta' => -round($qty, 4),
                'storage_location_id' => $from,
                'to_storage_location_id' => $to,
            ];
            $outId = (int)DB::table('pmd_inventory_movements')->insertGetId($out);

            $in = $common + [
                'movement_type' => 'TRANSFER_IN',
                'qty_delta' => round($qty, 4),
                'storage_location_id' => $to,
                'to_storage_location_id' => null,
            ];
            $inId = (int)DB::table('pmd_inventory_movements')->insertGetId($in);

            return ['out_movement_id' => $outId, 'in_movement_id' => $inId];
        });
    }

    public function returnToSupplier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $qty = max(0, $this->number($data['quantity'] ?? 0));
        if ($itemId < 1 || $qty <= 0) {
            throw new InvalidArgumentException('Choose an item and return quantity.');
        }
        $item = DB::table('pmd_inventory_items')->where('location_id', $locationId)->where('id', $itemId)->where('active', 1)->first();
        if (!$item) throw new InvalidArgumentException('Stock item was not found.');

        return (int)DB::table('pmd_inventory_movements')->insertGetId([
            'location_id' => $locationId,
            'item_id' => $itemId,
            'movement_type' => 'RETURN_SUPPLIER',
            'qty_delta' => -round($qty, 4),
            'unit_cost' => round((float)$item->unit_cost, 4),
            'reference_type' => 'supplier_return',
            'reference_id' => max(0, (int)($data['supplier_id'] ?? 0)) ?: null,
            'reason' => $this->nullableText($data['reason'] ?? 'Returned to supplier', 160),
            'note' => $this->nullableText($data['note'] ?? null, 2000),
            'staff_id' => $staffId,
            'storage_location_id' => max(0, (int)($data['storage_location_id'] ?? 0)) ?: null,
            'occurred_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function reverseMovement(int $locationId, ?int $staffId, int $movementId, ?string $note = null): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $movement = DB::table('pmd_inventory_movements')->where('location_id', $locationId)->where('id', $movementId)->first();
        if (!$movement) throw new InvalidArgumentException('Inventory movement was not found.');
        if ((float)$movement->qty_delta == 0.0) throw new InvalidArgumentException('This movement cannot be reversed.');
        if (DB::table('pmd_inventory_movements')->where('location_id', $locationId)->where('reversal_of_id', $movementId)->exists()) {
            throw new InvalidArgumentException('This movement has already been reversed.');
        }

        return (int)DB::table('pmd_inventory_movements')->insertGetId([
            'location_id' => $locationId,
            'item_id' => (int)$movement->item_id,
            'movement_type' => 'REVERSAL',
            'qty_delta' => -1 * (float)$movement->qty_delta,
            'unit_cost' => (float)$movement->unit_cost,
            'reference_type' => 'movement_reversal',
            'reference_id' => $movementId,
            'reason' => 'Reversal of '.$movement->movement_type,
            'note' => $this->nullableText($note, 2000),
            'staff_id' => $staffId,
            'storage_location_id' => $movement->storage_location_id ?? null,
            'to_storage_location_id' => $movement->to_storage_location_id ?? null,
            'lot_id' => $movement->lot_id ?? null,
            'reversal_of_id' => $movementId,
            'occurred_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function mergeItems(int $locationId, int $keepItemId, int $mergeItemId): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        if ($keepItemId < 1 || $mergeItemId < 1 || $keepItemId === $mergeItemId) {
            throw new InvalidArgumentException('Choose two different stock items.');
        }

        foreach ([$keepItemId, $mergeItemId] as $id) {
            if (!DB::table('pmd_inventory_items')->where('location_id', $locationId)->where('id', $id)->exists()) {
                throw new InvalidArgumentException('Stock item was not found.');
            }
        }

        DB::transaction(function () use ($locationId, $keepItemId, $mergeItemId) {
            foreach ([
                'pmd_inventory_movements',
                'pmd_inventory_lots',
                'pmd_inventory_cost_history',
                'pmd_inventory_supplier_items',
                'pmd_inventory_item_identifiers',
                'pmd_inventory_purchase_order_lines',
            ] as $table) {
                if (Schema::hasTable($table) && Schema::hasColumn($table, 'item_id')) {
                    DB::table($table)->where('item_id', $mergeItemId)->update(['item_id' => $keepItemId]);
                }
            }

            if (Schema::hasTable('pmd_inventory_count_lines')) {
                $countLines = DB::table('pmd_inventory_count_lines')
                    ->where('item_id', $mergeItemId)
                    ->get();

                foreach ($countLines as $line) {
                    $keptLine = DB::table('pmd_inventory_count_lines')
                        ->where('count_id', $line->count_id)
                        ->where('item_id', $keepItemId)
                        ->first();

                    if ($keptLine) {
                        $keepCounted = (float)$keptLine->counted_qty;
                        $mergeCounted = (float)$line->counted_qty;
                        $combinedCounted = $keepCounted + $mergeCounted;
                        $combinedCost = $combinedCounted > 0
                            ? (
                                ($keepCounted * (float)$keptLine->unit_cost_snapshot)
                                + ($mergeCounted * (float)$line->unit_cost_snapshot)
                              ) / $combinedCounted
                            : max(
                                (float)$keptLine->unit_cost_snapshot,
                                (float)$line->unit_cost_snapshot
                              );

                        DB::table('pmd_inventory_count_lines')
                            ->where('id', $keptLine->id)
                            ->update([
                                'expected_qty' => (float)$keptLine->expected_qty + (float)$line->expected_qty,
                                'counted_qty' => $combinedCounted,
                                'variance_qty' => (float)$keptLine->variance_qty + (float)$line->variance_qty,
                                'unit_cost_snapshot' => round($combinedCost, 6),
                                'updated_at' => now(),
                            ]);

                        DB::table('pmd_inventory_count_lines')
                            ->where('id', $line->id)
                            ->delete();
                    } else {
                        DB::table('pmd_inventory_count_lines')
                            ->where('id', $line->id)
                            ->update([
                                'item_id' => $keepItemId,
                                'updated_at' => now(),
                            ]);
                    }
                }
            }

            if (Schema::hasTable('pmd_inventory_recipes')) {
                $recipes = DB::table('pmd_inventory_recipes')->where('location_id', $locationId)->where('item_id', $mergeItemId)->get();
                foreach ($recipes as $recipe) {
                    $duplicate = DB::table('pmd_inventory_recipes')
                        ->where('location_id', $locationId)
                        ->where('menu_id', $recipe->menu_id)
                        ->where('item_id', $keepItemId)
                        ->where('active', $recipe->active)
                        ->first();
                    if ($duplicate) {
                        DB::table('pmd_inventory_recipes')->where('id', $recipe->id)->update([
                            'active' => 0,
                            'effective_to' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        DB::table('pmd_inventory_recipes')->where('id', $recipe->id)->update([
                            'item_id' => $keepItemId,
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            DB::table('pmd_inventory_items')->where('id', $mergeItemId)->update([
                'active' => 0,
                'updated_at' => now(),
            ]);
        });
    }

    public function recordPurchaseMetadata(
        int $locationId,
        int $receiptId,
        int $itemId,
        float $baseQty,
        float $baseUnitCost,
        float $purchaseUnitCost,
        string $purchaseUnit,
        array $line,
        ?int $movementId = null
    ): void {
        if (!$this->ready()) return;
        $locationId = $this->location($locationId);
        $supplierId = max(0, (int)($line['supplier_id'] ?? 0)) ?: null;
        $storageId = max(0, (int)($line['storage_location_id'] ?? 0)) ?: ($this->settings($locationId)['default_storage_location_id'] ?? null);
        $lotCode = $this->nullableText($line['lot_code'] ?? null, 160);
        $expiryDate = $this->dateOrNull($line['expiry_date'] ?? null);

        if ($movementId && Schema::hasColumn('pmd_inventory_movements', 'storage_location_id')) {
            DB::table('pmd_inventory_movements')->where('id', $movementId)->update([
                'storage_location_id' => $storageId,
                'metadata_json' => json_encode([
                    'supplier_id' => $supplierId,
                    'purchase_order_line_id' => max(0, (int)($line['purchase_order_line_id'] ?? 0)) ?: null,
                ], JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ]);
        }

        DB::table('pmd_inventory_cost_history')->insert([
            'location_id' => $locationId,
            'item_id' => $itemId,
            'supplier_id' => $supplierId,
            'receipt_id' => $receiptId,
            'base_unit_cost' => round(max(0, $baseUnitCost), 6),
            'purchase_unit_cost' => round(max(0, $purchaseUnitCost), 4),
            'purchase_unit' => $purchaseUnit,
            'purchased_at' => $this->dateOrNull($line['purchased_at'] ?? null) ?: now()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($lotCode !== null || $expiryDate !== null) {
            $lotId = (int)DB::table('pmd_inventory_lots')->insertGetId([
                'location_id' => $locationId,
                'item_id' => $itemId,
                'storage_location_id' => $storageId,
                'supplier_id' => $supplierId,
                'receipt_id' => $receiptId,
                'lot_code' => $lotCode,
                'expiry_date' => $expiryDate,
                'qty_received' => round(max(0, $baseQty), 4),
                'unit_cost' => round(max(0, $baseUnitCost), 4),
                'active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($movementId) {
                DB::table('pmd_inventory_movements')->where('id', $movementId)->update([
                    'lot_id' => $lotId,
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function updateReceiptMetadata(int $locationId, int $receiptId, array $data): void
    {
        if (!$this->ready() || !Schema::hasTable('pmd_inventory_receipts')) return;
        $locationId = $this->location($locationId);

        $supplierId = max(0, (int)($data['supplier_id'] ?? 0)) ?: null;
        $invoice = $this->nullableText($data['supplier_invoice_number'] ?? null, 120);
        $poId = max(0, (int)($data['purchase_order_id'] ?? 0)) ?: null;
        $hash = $this->nullableText($data['document_hash'] ?? null, 64);

        if ($invoice !== null) {
            $dup = DB::table('pmd_inventory_receipts')
                ->where('location_id', $locationId)
                ->where('id', '<>', $receiptId)
                ->whereNotNull('confirmed_at')
                ->where('supplier_invoice_number', $invoice)
                ->when($supplierId, fn ($q) => $q->where('supplier_id', $supplierId))
                ->exists();
            if ($dup) {
                throw new InvalidArgumentException('This supplier invoice number was already received.');
            }
        }

        if ($hash !== null) {
            $dupHash = DB::table('pmd_inventory_receipts')
                ->where('location_id', $locationId)
                ->where('id', '<>', $receiptId)
                ->where('document_hash', $hash)
                ->exists();
            if ($dupHash) {
                throw new InvalidArgumentException('This invoice file was already scanned.');
            }
        }

        $payload = ['updated_at' => now()];
        if (array_key_exists('supplier_id', $data)) {
            $payload['supplier_id'] = $supplierId;
        }
        if (array_key_exists('supplier_invoice_number', $data)) {
            $payload['supplier_invoice_number'] = $invoice;
        }
        if (array_key_exists('purchase_order_id', $data)) {
            $payload['purchase_order_id'] = $poId;
        }
        if (array_key_exists('document_hash', $data)) {
            $payload['document_hash'] = $hash;
        }

        DB::table('pmd_inventory_receipts')
            ->where('location_id', $locationId)
            ->where('id', $receiptId)
            ->update($payload);
    }

    public function settings(int $locationId): array
    {
        if (!$this->ready()) return $this->defaultSettings();
        $locationId = $this->location($locationId);
        $row = DB::table('pmd_inventory_settings')->where('location_id', $locationId)->first();
        if (!$row) return $this->defaultSettings();

        return [
            'consumption_trigger' => (string)($row->consumption_trigger ?? 'paid'),
            'default_storage_location_id' => $row->default_storage_location_id ? (int)$row->default_storage_location_id : null,
            'expiry_warning_days' => (int)($row->expiry_warning_days ?? 7),
            'blind_count' => (bool)($row->blind_count ?? false),
            'low_stock_notifications' => (bool)($row->low_stock_notifications ?? true),
            'menu_availability_guard' => (bool)($row->menu_availability_guard ?? false),
        ];
    }

    private function ensureDefaultStorageLocations(int $locationId): void
    {
        if (!Schema::hasTable('pmd_inventory_storage_locations')) return;
        if (DB::table('pmd_inventory_storage_locations')->where('location_id', $locationId)->exists()) return;

        $now = now();
        foreach ([
            ['Main storage', 'storage'],
            ['Kitchen', 'kitchen'],
            ['Bar', 'bar'],
            ['Fridge', 'fridge'],
            ['Freezer', 'freezer'],
        ] as [$name, $type]) {
            DB::table('pmd_inventory_storage_locations')->insert([
                'location_id' => $locationId,
                'name' => $name,
                'type' => $type,
                'active' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    private function defaultSettings(): array
    {
        return [
            'consumption_trigger' => 'paid',
            'default_storage_location_id' => null,
            'expiry_warning_days' => 7,
            'blind_count' => false,
            'low_stock_notifications' => true,
            'menu_availability_guard' => false,
        ];
    }

    private function validGtin(string $digits): bool
    {
        if (!preg_match('/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/', $digits)) {
            return false;
        }

        $sum = 0;
        $check = (int)substr($digits, -1);
        $body = substr($digits, 0, -1);
        $weight = 3;

        for ($i = strlen($body) - 1; $i >= 0; $i--) {
            $sum += ((int)$body[$i]) * $weight;
            $weight = $weight === 3 ? 1 : 3;
        }

        return ((10 - ($sum % 10)) % 10) === $check;
    }

    private function bool(mixed $value): bool
    {
        if (is_bool($value)) return $value;
        if (is_numeric($value)) return (int)$value === 1;
        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'on'], true);
    }

    private function number(mixed $value): float
    {
        if (is_string($value)) {
            $value = str_replace(',', '.', trim($value));
        }
        return is_numeric($value) ? (float)$value : 0.0;
    }

    private function text(mixed $value, int $max): string
    {
        return mb_substr(trim((string)$value), 0, $max);
    }

    private function nullableText(mixed $value, int $max): ?string
    {
        $value = $this->text($value, $max);
        return $value === '' ? null : $value;
    }

    private function dateOrNull(mixed $value): ?string
    {
        $value = trim((string)$value);
        if ($value === '') return null;
        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable $error) {
            throw new InvalidArgumentException('Expiry date is not valid.');
        }
    }

    private function location(int $locationId): int
    {
        if ($locationId < 1) {
            throw new RuntimeException('Inventory location is unavailable.');
        }
        return $locationId;
    }

    private function assertReady(): void
    {
        if (!$this->ready()) {
            throw new RuntimeException('Inventory Operations V24 is not provisioned yet. Run the inventory migration first.');
        }
    }
}
