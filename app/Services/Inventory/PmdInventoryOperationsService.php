<?php

namespace App\Services\Inventory;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

/**
 * PMD_INVENTORY_OPERATIONS_V2_R24
 *
 * Operational layer around the existing Inventory Control ledger. It owns
 * identifiers/packages, suppliers, purchase orders, storage/expiry metadata,
 * audited corrections/transfers, preparation batches and smart-order metadata.
 *
 * The existing PmdInventoryControlService remains the total-stock authority.
 */
final class PmdInventoryOperationsService
{
    private const TABLES = [
        'pmd_inventory_suppliers',
        'pmd_inventory_identifiers',
        'pmd_inventory_supplier_items',
        'pmd_inventory_storage_locations',
        'pmd_inventory_lots',
        'pmd_inventory_purchase_orders',
        'pmd_inventory_purchase_order_lines',
        'pmd_inventory_transfers',
        'pmd_inventory_transfer_lines',
        'pmd_inventory_cost_history',
        'pmd_inventory_settings',
        'pmd_inventory_preparations',
        'pmd_inventory_preparation_lines',
        'pmd_inventory_production_batches',
        'pmd_inventory_production_batch_lines',
    ];

    public function ready(): bool
    {
        foreach (self::TABLES as $table) {
            if (!Schema::hasTable($table)) {
                return false;
            }
        }

        foreach ([
            ['pmd_inventory_items', 'safety_stock'],
            ['pmd_inventory_items', 'track_expiry'],
            ['pmd_inventory_receipts', 'supplier_id'],
            ['pmd_inventory_receipts', 'reversed_at'],
            ['pmd_inventory_movements', 'storage_location_id'],
            ['pmd_inventory_movements', 'lot_id'],
            ['pmd_inventory_movements', 'purchase_order_line_id'],
        ] as [$table, $column]) {
            if (!Schema::hasColumn($table, $column)) {
                return false;
            }
        }

        return true;
    }

    public function enrichSnapshot(int $locationId, array $snapshot): array
    {
        $locationId = $this->location($locationId);
        $snapshot['operations_ready'] = $this->ready();

        if (!$this->ready()) {
            $snapshot['operations_error'] = 'Inventory Operations V2 migration is not installed yet.';
            return $snapshot;
        }

        $defaultStorageId = $this->ensureDefaultStorage($locationId);
        $settings = $this->settings($locationId, $defaultStorageId);

        $suppliers = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => $this->supplierRow($row))
            ->values()
            ->all();

        $supplierById = [];
        foreach ($suppliers as $supplier) {
            $supplierById[(int)$supplier['id']] = $supplier;
        }

        $supplierMetrics = DB::table('pmd_inventory_receipts')
            ->where('location_id', $locationId)
            ->whereNotNull('confirmed_at')
            ->whereNull('reversed_at')
            ->whereNotNull('supplier_id')
            ->where('purchased_at', '>=', now()->subDays(90)->toDateString())
            ->selectRaw(
                'supplier_id, COUNT(*) as receipt_count, '.
                'COALESCE(SUM(total_amount),0) as spend, MAX(purchased_at) as last_purchase_at'
            )
            ->groupBy('supplier_id')
            ->get()
            ->keyBy('supplier_id');

        foreach ($suppliers as &$supplier) {
            $metric = $supplierMetrics->get((int)$supplier['id']);
            $supplier['receipt_count_90d'] = (int)($metric->receipt_count ?? 0);
            $supplier['spend_90d'] = round((float)($metric->spend ?? 0), 2);
            $supplier['last_purchase_at'] = $metric && $metric->last_purchase_at
                ? (string)$metric->last_purchase_at
                : null;
            $supplierById[(int)$supplier['id']] = $supplier;
        }
        unset($supplier);

        $storageLocations = DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'name' => (string)$row->name,
                'type' => (string)$row->type,
                'is_default' => (bool)$row->is_default,
            ])
            ->values()
            ->all();

        $storageById = [];
        foreach ($storageLocations as $location) {
            $storageById[(int)$location['id']] = $location;
        }

        $identifiers = DB::table('pmd_inventory_identifiers')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->get()
            ->groupBy('item_id');

        $offers = DB::table('pmd_inventory_supplier_items')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderByDesc('preferred')
            ->orderBy('unit_cost')
            ->get()
            ->groupBy('item_id');

        $warningDays = max(1, (int)($settings['expiry_warning_days'] ?? 7));
        $lotRows = DB::table('pmd_inventory_lots as l')
            ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'l.item_id')
            ->leftJoin('pmd_inventory_storage_locations as s', 's.id', '=', 'l.storage_location_id')
            ->where('l.location_id', $locationId)
            ->where('l.status', 'open')
            ->where('l.qty_remaining', '>', 0)
            ->orderByRaw('CASE WHEN l.expiry_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('l.expiry_date')
            ->orderBy('l.received_at')
            ->get([
                'l.*',
                'i.name as item_name',
                'i.base_unit as base_unit',
                's.name as storage_name',
            ]);

        $lotsByItem = $lotRows->groupBy('item_id');
        $lots = $lotRows->map(function ($row) use ($warningDays) {
            $days = null;
            if (!empty($row->expiry_date)) {
                try {
                    $days = now()->startOfDay()->diffInDays(
                        \Carbon\Carbon::parse($row->expiry_date)->startOfDay(),
                        false
                    );
                } catch (\Throwable $ignored) {
                    $days = null;
                }
            }

            return [
                'id' => (int)$row->id,
                'item_id' => (int)$row->item_id,
                'item_name' => (string)($row->item_name ?? ''),
                'base_unit' => (string)($row->base_unit ?? 'piece'),
                'storage_location_id' => (int)($row->storage_location_id ?? 0),
                'storage_name' => (string)($row->storage_name ?? 'Unassigned'),
                'receipt_id' => (int)($row->receipt_id ?? 0),
                'lot_code' => (string)($row->lot_code ?? ''),
                'expiry_date' => $row->expiry_date ? (string)$row->expiry_date : null,
                'days_to_expiry' => $days,
                'expiry_warning' => $days !== null && $days <= $warningDays,
                'expired' => $days !== null && $days < 0,
                'received_at' => (string)($row->received_at ?? ''),
                'qty_received' => round((float)$row->qty_received, 4),
                'qty_remaining' => round((float)$row->qty_remaining, 4),
                'unit_cost' => round((float)$row->unit_cost, 4),
                'status' => (string)$row->status,
            ];
        })->values()->all();

        $purchaseOrders = $this->purchaseOrders($locationId, $supplierById);
        $transfers = $this->recentTransfers($locationId, $storageById);
        $preparations = $this->preparations($locationId);

        // Add audit / PO metadata to the existing recent-purchase contract.
        $recentPurchases = is_array($snapshot['recent_purchases'] ?? null)
            ? $snapshot['recent_purchases']
            : [];
        $receiptIds = array_values(array_filter(array_map(
            static fn ($row) => (int)($row['id'] ?? 0),
            $recentPurchases
        )));
        $receiptMeta = $receiptIds
            ? DB::table('pmd_inventory_receipts')
                ->where('location_id', $locationId)
                ->whereIn('id', $receiptIds)
                ->get([
                    'id',
                    'invoice_number',
                    'purchase_order_id',
                    'storage_location_id',
                    'document_fingerprint',
                    'reversed_at',
                    'reversed_by',
                ])
                ->keyBy('id')
            : collect();

        foreach ($recentPurchases as &$purchase) {
            $meta = $receiptMeta->get((int)($purchase['id'] ?? 0));
            $purchase['invoice_number'] = (string)($meta->invoice_number ?? '');
            $purchase['purchase_order_id'] = (int)($meta->purchase_order_id ?? 0);
            $purchase['storage_location_id'] = (int)($meta->storage_location_id ?? 0);
            $purchase['storage_name'] = (string)(
                $storageById[(int)($meta->storage_location_id ?? 0)]['name'] ?? ''
            );
            $purchase['reversed_at'] = !empty($meta->reversed_at)
                ? (string)$meta->reversed_at
                : null;
            $purchase['reversed_by'] = (int)($meta->reversed_by ?? 0);
        }
        unset($purchase);
        $snapshot['recent_purchases'] = $recentPurchases;

        $costHistoryByItem = DB::table('pmd_inventory_cost_history')
            ->where('location_id', $locationId)
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->get(['item_id', 'new_unit_cost', 'old_unit_cost', 'purchase_unit_cost', 'occurred_at'])
            ->groupBy('item_id');

        $itemRows = is_array($snapshot['items'] ?? null) ? $snapshot['items'] : [];
        $mappedItems = 0;
        $expiryRiskLots = 0;
        $expiredLots = 0;
        $alerts = [];
        $effectiveLotQty = [];

        foreach ($lots as $lot) {
            if ($lot['expired']) {
                $expiredLots++;
                $alerts[] = [
                    'type' => 'expiry',
                    'severity' => 'critical',
                    'title' => ($lot['item_name'] ?: 'Stock item').' expired',
                    'detail' => trim(($lot['lot_code'] ? 'Lot '.$lot['lot_code'].' · ' : '').
                        $this->numberLabel($lot['qty_remaining']).' '.$lot['base_unit'].' remaining'),
                    'item_id' => $lot['item_id'],
                ];
            } elseif ($lot['expiry_warning']) {
                $expiryRiskLots++;
                $alerts[] = [
                    'type' => 'expiry',
                    'severity' => 'warning',
                    'title' => ($lot['item_name'] ?: 'Stock item').' expires soon',
                    'detail' => 'Expires in '.$lot['days_to_expiry'].' day(s) · '.
                        $this->numberLabel($lot['qty_remaining']).' '.$lot['base_unit'].' remaining',
                    'item_id' => $lot['item_id'],
                ];
            }
        }

        foreach ($itemRows as &$item) {
            $itemId = (int)($item['id'] ?? 0);

            $itemIdentifiers = collect($identifiers->get($itemId, []))
                ->map(function ($row) use ($supplierById) {
                    return $this->identifierRow($row, $supplierById);
                })
                ->values()
                ->all();

            if ($itemIdentifiers) {
                $mappedItems++;
            }

            $itemOffers = collect($offers->get($itemId, []))
                ->map(function ($row) use ($supplierById) {
                    $supplierId = (int)$row->supplier_id;
                    return [
                        'id' => (int)$row->id,
                        'supplier_id' => $supplierId,
                        'supplier_name' => (string)($supplierById[$supplierId]['name'] ?? 'Supplier'),
                        'supplier_sku' => (string)($row->supplier_sku ?? ''),
                        'purchase_unit' => (string)$row->purchase_unit,
                        'purchase_to_base' => round((float)$row->purchase_to_base, 4),
                        'unit_cost' => round((float)$row->unit_cost, 4),
                        'moq' => round((float)$row->moq, 4),
                        'pack_multiple' => round((float)$row->pack_multiple, 4),
                        'lead_time_days' => $row->lead_time_days === null
                            ? (int)($supplierById[$supplierId]['lead_time_days'] ?? 1)
                            : (int)$row->lead_time_days,
                        'preferred' => (bool)$row->preferred,
                    ];
                })
                ->values()
                ->all();

            $preferred = null;
            foreach ($itemOffers as $offer) {
                if ($offer['preferred']) {
                    $preferred = $offer;
                    break;
                }
            }
            if (!$preferred && $itemOffers) {
                $preferred = $itemOffers[0];
            }

            $onHand = max(0, (float)($item['estimated_on_hand'] ?? 0));
            $rawItemLots = collect($lotsByItem->get($itemId, []))->values();
            $rawLotTotal = (float)$rawItemLots->sum('qty_remaining');
            // Sales are theoretical usage rather than movement rows. Apply
            // that consumption to the earliest-expiring lots in the snapshot
            // so FEFO screens do not overstate old batches.
            $consumeFromLots = max(0, $rawLotTotal - $onHand);

            $itemLots = $rawItemLots
                ->map(function ($row) use ($warningDays, &$consumeFromLots, &$effectiveLotQty) {
                    $recorded = max(0, (float)$row->qty_remaining);
                    $used = min($recorded, $consumeFromLots);
                    $effective = max(0, $recorded - $used);
                    $consumeFromLots = max(0, $consumeFromLots - $used);
                    $effectiveLotQty[(int)$row->id] = $effective;

                    $days = null;
                    if (!empty($row->expiry_date)) {
                        try {
                            $days = now()->startOfDay()->diffInDays(
                                \Carbon\Carbon::parse($row->expiry_date)->startOfDay(),
                                false
                            );
                        } catch (\Throwable $ignored) {
                            $days = null;
                        }
                    }
                    return [
                        'id' => (int)$row->id,
                        'lot_code' => (string)($row->lot_code ?? ''),
                        'expiry_date' => $row->expiry_date ? (string)$row->expiry_date : null,
                        'days_to_expiry' => $days,
                        'qty_recorded' => round($recorded, 4),
                        'qty_remaining' => round($effective, 4),
                        'storage_location_id' => (int)($row->storage_location_id ?? 0),
                        'storage_name' => (string)($row->storage_name ?? 'Unassigned'),
                        'expiry_warning' => $effective > 0.00005 && $days !== null && $days <= $warningDays,
                    ];
                })
                ->filter(static fn ($row) => (float)$row['qty_remaining'] > 0.00005)
                ->values()
                ->all();

            $leadDays = max(1, (int)($preferred['lead_time_days'] ?? 1));
            $daily = max(0, (float)($item['avg_daily_usage'] ?? 0));
            $par = max(0, (float)($item['par_level'] ?? 0));
            $safety = max(0, (float)($item['safety_stock'] ?? 0));
            $desiredBase = max($par, ($daily * $leadDays) + $safety);
            $smartBase = max(0, $desiredBase - $onHand);

            $smartPurchase = 0.0;
            $smartUnit = (string)($item['purchase_unit'] ?? $item['unit'] ?? 'piece');
            $smartCost = (float)($item['purchase_unit_cost'] ?? 0);
            $supplierId = 0;

            if ($preferred) {
                $factor = max(0.0001, (float)$preferred['purchase_to_base']);
                $raw = $smartBase / $factor;
                $moq = max(0.0001, (float)$preferred['moq']);
                $multiple = max(0.0001, (float)$preferred['pack_multiple']);
                $raw = max($raw, $smartBase > 0 ? $moq : 0);
                $smartPurchase = $raw > 0
                    ? ceil(($raw - 0.0000001) / $multiple) * $multiple
                    : 0;
                $smartUnit = (string)$preferred['purchase_unit'];
                $smartCost = (float)$preferred['unit_cost'];
                $supplierId = (int)$preferred['supplier_id'];
            } else {
                $factor = max(0.0001, (float)($item['purchase_to_base'] ?? 1));
                $smartPurchase = $smartBase / $factor;
            }

            $defaultStorage = (int)($item['default_storage_location_id'] ?? 0);
            if ($defaultStorage < 1) {
                $defaultStorage = (int)($settings['default_storage_id'] ?? $defaultStorageId);
            }

            $item['identifiers'] = $itemIdentifiers;
            $item['supplier_offers'] = $itemOffers;
            $item['preferred_supplier_offer'] = $preferred;
            $item['preferred_supplier_id'] = $supplierId;
            $item['lots'] = $itemLots;
            $item['default_storage_location_id'] = $defaultStorage;
            $item['default_storage_name'] = (string)($storageById[$defaultStorage]['name'] ?? 'Main storage');
            $item['smart_order_qty_base'] = round($smartBase, 4);
            $item['smart_order_qty'] = round($smartPurchase, 4);
            $item['smart_order_unit'] = $smartUnit;
            $item['smart_order_unit_cost'] = round($smartCost, 4);
            $item['smart_order_estimated_cost'] = round($smartPurchase * $smartCost, 2);
            $item['barcode_ready'] = !empty($itemIdentifiers);

            $costRows = collect($costHistoryByItem->get($itemId, []))->values();
            $latestCost = $costRows->get(0);
            $previousCost = $costRows->get(1);
            $costChangePct = null;
            if ($latestCost && $previousCost && (float)$previousCost->new_unit_cost > 0) {
                $costChangePct = round(
                    (((float)$latestCost->new_unit_cost - (float)$previousCost->new_unit_cost)
                        / (float)$previousCost->new_unit_cost) * 100,
                    1
                );
            }
            $item['cost_change_pct'] = $costChangePct;
            $item['last_cost_at'] = $latestCost && $latestCost->occurred_at
                ? (string)$latestCost->occurred_at
                : null;

            if ($costChangePct !== null && abs($costChangePct) >= 10) {
                $alerts[] = [
                    'type' => 'cost',
                    'severity' => $costChangePct > 0 ? 'warning' : 'info',
                    'title' => (string)($item['name'] ?? 'Stock item').' cost changed',
                    'detail' => ($costChangePct > 0 ? '+' : '').$costChangePct.'% versus previous receipt',
                    'item_id' => $itemId,
                ];
            }

            if (($item['status'] ?? '') === 'critical') {
                $alerts[] = [
                    'type' => 'stock',
                    'severity' => 'critical',
                    'title' => (string)($item['name'] ?? 'Stock item').' is critical',
                    'detail' => $this->numberLabel((float)($item['estimated_on_hand'] ?? 0)).
                        ' '.(string)($item['unit'] ?? 'piece').' estimated on hand',
                    'item_id' => $itemId,
                ];
            }
        }
        unset($item);

        foreach ($purchaseOrders as $order) {
            if (
                !in_array($order['status'], ['received', 'closed', 'cancelled'], true)
                && !empty($order['expected_at'])
                && (string)$order['expected_at'] < now()->toDateString()
            ) {
                $alerts[] = [
                    'type' => 'purchase_order',
                    'severity' => 'warning',
                    'title' => $order['order_number'].' is overdue',
                    'detail' => ($order['supplier_name'] ?: 'Supplier').' · expected '.$order['expected_at'],
                    'purchase_order_id' => $order['id'],
                ];
            }
        }

        $menuStockWarnings = [];
        if (!empty($settings['auto_menu_availability'])) {
            $itemById = [];
            foreach ($itemRows as $row) {
                $itemById[(int)($row['id'] ?? 0)] = $row;
            }

            foreach ((array)($snapshot['recipes'] ?? []) as $recipe) {
                $blocking = [];
                foreach ((array)($recipe['lines'] ?? []) as $line) {
                    $stock = $itemById[(int)($line['item_id'] ?? 0)] ?? null;
                    if (
                        $stock
                        && (
                            (string)($stock['status'] ?? '') === 'critical'
                            || (float)($stock['estimated_on_hand'] ?? 0) <= 0
                        )
                    ) {
                        $blocking[] = (string)($stock['name'] ?? $line['item_name'] ?? 'Stock');
                    }
                }

                if ($blocking) {
                    $warning = [
                        'menu_id' => (int)($recipe['menu_id'] ?? 0),
                        'menu_name' => (string)($recipe['menu_name'] ?? 'Menu item'),
                        'blocking_items' => array_values(array_unique($blocking)),
                    ];
                    $menuStockWarnings[] = $warning;
                    $alerts[] = [
                        'type' => 'menu_availability',
                        'severity' => 'warning',
                        'title' => $warning['menu_name'].' may be unavailable',
                        'detail' => 'Critical ingredient: '.implode(', ', $warning['blocking_items']),
                        'menu_id' => $warning['menu_id'],
                    ];
                }
            }
        }

        $wasteByReason = DB::table('pmd_inventory_movements')
            ->where('location_id', $locationId)
            ->where('movement_type', 'WASTE')
            ->where('occurred_at', '>=', now()->subDays(30))
            ->selectRaw(
                "COALESCE(NULLIF(reason,''),'Unspecified') as reason, ".
                'COUNT(*) as entries, SUM(ABS(qty_delta) * unit_cost) as cost'
            )
            ->groupBy('reason')
            ->orderByDesc('cost')
            ->get()
            ->map(static fn ($row) => [
                'reason' => (string)$row->reason,
                'entries' => (int)$row->entries,
                'cost' => round((float)$row->cost, 2),
            ])
            ->values()
            ->all();

        $varianceTop = [];
        $lastCountId = (int)($snapshot['last_count']['id'] ?? 0);
        if ($lastCountId > 0) {
            $varianceTop = DB::table('pmd_inventory_count_lines as l')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'l.item_id')
                ->where('l.count_id', $lastCountId)
                ->where('l.variance_qty', '<>', 0)
                ->get([
                    'l.item_id',
                    'i.name as item_name',
                    'i.base_unit',
                    'l.variance_qty',
                    'l.unit_cost_snapshot',
                ])
                ->sortByDesc(static fn ($row) => abs(
                    (float)$row->variance_qty * (float)$row->unit_cost_snapshot
                ))
                ->take(15)
                ->map(static fn ($row) => [
                    'item_id' => (int)$row->item_id,
                    'item_name' => (string)($row->item_name ?? 'Item'),
                    'unit' => (string)($row->base_unit ?? 'piece'),
                    'variance_qty' => round((float)$row->variance_qty, 4),
                    'variance_cost' => round((float)$row->variance_qty * (float)$row->unit_cost_snapshot, 2),
                ])
                ->values()
                ->all();
        }

        $estimatedFoodCost30d = 0.0;
        foreach ($itemRows as $row) {
            $estimatedFoodCost30d +=
                max(0, (float)($row['avg_daily_usage'] ?? 0))
                * 30
                * max(0, (float)($row['unit_cost'] ?? 0));
        }

        $snapshot['analytics'] = [
            'waste_by_reason_30d' => $wasteByReason,
            'variance_top' => $varianceTop,
            'estimated_food_cost_30d' => round($estimatedFoodCost30d, 2),
        ];
        $snapshot['menu_stock_warnings'] = $menuStockWarnings;

        foreach ($lots as &$lot) {
            if (array_key_exists((int)$lot['id'], $effectiveLotQty)) {
                $lot['qty_recorded'] = $lot['qty_remaining'];
                $lot['qty_remaining'] = round((float)$effectiveLotQty[(int)$lot['id']], 4);
                if ((float)$lot['qty_remaining'] <= 0.00005) {
                    $lot['expiry_warning'] = false;
                    $lot['expired'] = false;
                }
            }
        }
        unset($lot);
        $lots = array_values(array_filter(
            $lots,
            static fn ($lot) => (float)($lot['qty_remaining'] ?? 0) > 0.00005
        ));

        $snapshot['items'] = $itemRows;
        $snapshot['suppliers'] = $suppliers;
        $snapshot['storage_locations'] = $storageLocations;
        $snapshot['lots'] = $lots;
        $snapshot['purchase_orders'] = $purchaseOrders;
        $snapshot['transfers'] = $transfers;
        $snapshot['preparations'] = $preparations;
        $snapshot['inventory_settings'] = $settings;
        $snapshot['alerts'] = array_slice($alerts, 0, 80);

        $summary = is_array($snapshot['summary'] ?? null) ? $snapshot['summary'] : [];
        $summary['supplier_count'] = count($suppliers);
        $summary['barcode_mapped_items'] = $mappedItems;
        $summary['expiry_risk_lots'] = $expiryRiskLots;
        $summary['expired_lots'] = $expiredLots;
        $summary['open_purchase_orders'] = count(array_filter(
            $purchaseOrders,
            static fn ($row) => !in_array($row['status'], ['received', 'closed', 'cancelled'], true)
        ));
        $snapshot['summary'] = $summary;

        return $snapshot;
    }

    public function resolveCode(int $locationId, string $rawCode): array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $code = $this->normalizeCode($rawCode);

        if ($code === '') {
            throw new InvalidArgumentException('No barcode or QR code was received.');
        }

        $identifier = DB::table('pmd_inventory_identifiers as x')
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

        if ($identifier) {
            return [
                'found' => true,
                'code' => $code,
                'code_type' => (string)$identifier->code_type,
                'valid_gtin' => $this->isValidGtin($code),
                'identifier' => [
                    'id' => (int)$identifier->id,
                    'item_id' => (int)$identifier->item_id,
                    'item_name' => (string)$identifier->item_name,
                    'package_unit' => (string)$identifier->package_unit,
                    'package_quantity' => round((float)$identifier->package_quantity, 4),
                    'base_quantity' => round((float)$identifier->base_quantity, 4),
                    'base_unit' => (string)$identifier->base_unit,
                    'supplier_id' => (int)($identifier->supplier_id ?? 0),
                    'supplier_name' => (string)($identifier->supplier_name ?? ''),
                    'supplier_item_code' => (string)($identifier->supplier_item_code ?? ''),
                ],
            ];
        }

        // Backward-compatible R23 alias lookup. This does not infer package size.
        $legacyItems = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->whereNotNull('sku')
            ->get(['id', 'name', 'sku', 'base_unit', 'purchase_unit', 'purchase_to_base']);

        foreach ($legacyItems as $item) {
            $tokens = preg_split('/[\s,;|]+/', (string)$item->sku, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            if (in_array($code, $tokens, true)) {
                return [
                    'found' => true,
                    'legacy' => true,
                    'code' => $code,
                    'code_type' => $this->detectCodeType($code),
                    'valid_gtin' => $this->isValidGtin($code),
                    'identifier' => [
                        'id' => 0,
                        'item_id' => (int)$item->id,
                        'item_name' => (string)$item->name,
                        'package_unit' => (string)($item->purchase_unit ?? $item->base_unit),
                        'package_quantity' => 1,
                        'base_quantity' => round(max(0.0001, (float)($item->purchase_to_base ?? 1)), 4),
                        'base_unit' => (string)$item->base_unit,
                        'supplier_id' => 0,
                        'supplier_name' => '',
                        'supplier_item_code' => '',
                    ],
                ];
            }
        }

        return [
            'found' => false,
            'code' => $code,
            'code_type' => $this->detectCodeType($code),
            'valid_gtin' => $this->isValidGtin($code),
        ];
    }

    public function saveIdentifier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $code = $this->normalizeCode((string)($data['code'] ?? ''));

        if ($itemId < 1 || $code === '') {
            throw new InvalidArgumentException('Choose a stock item and enter the code.');
        }

        $item = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $itemId)
            ->where('active', 1)
            ->first();
        if (!$item) {
            throw new InvalidArgumentException('Stock item was not found.');
        }

        $codeType = strtolower(trim((string)($data['code_type'] ?? '')));
        if ($codeType === '' || $codeType === 'auto') {
            $codeType = $this->detectCodeType($code);
        }

        if (in_array($codeType, ['gtin8', 'upca', 'ean13', 'gtin14'], true) && !$this->isValidGtin($code)) {
            throw new InvalidArgumentException('This GTIN/EAN/UPC check digit is invalid.');
        }

        $packageUnit = $this->unit($data['package_unit'] ?? ($item->purchase_unit ?? $item->base_unit));
        $packageQuantity = max(0.0001, $this->number($data['package_quantity'] ?? 1, 1));
        $baseQuantity = max(0.0001, $this->number(
            $data['base_quantity'] ?? ($item->purchase_to_base ?? 1),
            (float)($item->purchase_to_base ?? 1)
        ));
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));

        if ($supplierId > 0 && !$this->supplierExists($locationId, $supplierId)) {
            throw new InvalidArgumentException('Supplier was not found.');
        }

        $existing = DB::table('pmd_inventory_identifiers')
            ->where('location_id', $locationId)
            ->where('code', $code)
            ->first();

        if ($existing && (int)$existing->item_id !== $itemId) {
            throw new InvalidArgumentException(
                'This code is already linked to another stock item.'
            );
        }

        $values = [
            'item_id' => $itemId,
            'code_type' => mb_substr($codeType ?: 'internal', 0, 30),
            'package_unit' => $packageUnit,
            'package_quantity' => round($packageQuantity, 4),
            'base_quantity' => round($baseQuantity, 4),
            'supplier_id' => $supplierId > 0 ? $supplierId : null,
            'supplier_item_code' => $this->nullableText($data['supplier_item_code'] ?? null, 120),
            'is_primary' => !empty($data['is_primary']),
            'source' => mb_substr(trim((string)($data['source'] ?? 'manual')) ?: 'manual', 0, 40),
            'verified_at' => now(),
            'active' => 1,
            'updated_at' => now(),
        ];

        if (!empty($values['is_primary'])) {
            DB::table('pmd_inventory_identifiers')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->update(['is_primary' => 0, 'updated_at' => now()]);
        }

        if ($existing) {
            DB::table('pmd_inventory_identifiers')
                ->where('id', (int)$existing->id)
                ->update($values);
            return (int)$existing->id;
        }

        return (int)DB::table('pmd_inventory_identifiers')->insertGetId(array_merge(
            $values,
            [
                'location_id' => $locationId,
                'code' => $code,
                'created_by' => $staffId,
                'created_at' => now(),
            ]
        ));
    }

    public function saveSupplier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $name = trim((string)($data['name'] ?? ''));

        if ($name === '') {
            throw new InvalidArgumentException('Supplier name is required.');
        }

        $duplicate = DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($supplierId > 0, fn ($q) => $q->where('id', '<>', $supplierId))
            ->where('active', 1)
            ->exists();

        if ($duplicate) {
            throw new InvalidArgumentException('A supplier with this name already exists.');
        }

        $values = [
            'name' => mb_substr($name, 0, 190),
            'account_ref' => $this->nullableText($data['account_ref'] ?? null, 120),
            'contact_name' => $this->nullableText($data['contact_name'] ?? null, 190),
            'email' => $this->nullableText($data['email'] ?? null, 190),
            'phone' => $this->nullableText($data['phone'] ?? null, 80),
            'lead_time_days' => max(0, min(365, (int)($data['lead_time_days'] ?? 1))),
            'min_order_value' => round(max(0, $this->number($data['min_order_value'] ?? 0, 0)), 4),
            'delivery_days_json' => json_encode(
                array_values(array_filter((array)($data['delivery_days'] ?? []))),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'notes' => $this->nullableText($data['notes'] ?? null, 4000),
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($supplierId > 0) {
            $exists = DB::table('pmd_inventory_suppliers')
                ->where('location_id', $locationId)
                ->where('id', $supplierId)
                ->exists();
            if (!$exists) {
                throw new InvalidArgumentException('Supplier was not found.');
            }
            DB::table('pmd_inventory_suppliers')->where('id', $supplierId)->update($values);
            return $supplierId;
        }

        return (int)DB::table('pmd_inventory_suppliers')->insertGetId(array_merge(
            $values,
            [
                'location_id' => $locationId,
                'created_by' => $staffId,
                'created_at' => now(),
            ]
        ));
    }

    public function saveSupplierItem(int $locationId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $itemId = max(0, (int)($data['item_id'] ?? 0));

        if (!$this->supplierExists($locationId, $supplierId)) {
            throw new InvalidArgumentException('Supplier was not found.');
        }
        if (!$this->itemExists($locationId, $itemId)) {
            throw new InvalidArgumentException('Stock item was not found.');
        }

        $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();
        $purchaseUnit = $this->unit($data['purchase_unit'] ?? ($item->purchase_unit ?? $item->base_unit));
        $factor = max(0.0001, $this->number(
            $data['purchase_to_base'] ?? ($item->purchase_to_base ?? 1),
            (float)($item->purchase_to_base ?? 1)
        ));

        if (!empty($data['preferred'])) {
            DB::table('pmd_inventory_supplier_items')
                ->where('location_id', $locationId)
                ->where('item_id', $itemId)
                ->update(['preferred' => 0, 'updated_at' => now()]);
        }

        $existing = DB::table('pmd_inventory_supplier_items')
            ->where('location_id', $locationId)
            ->where('supplier_id', $supplierId)
            ->where('item_id', $itemId)
            ->first();

        $values = [
            'supplier_sku' => $this->nullableText($data['supplier_sku'] ?? null, 120),
            'purchase_unit' => $purchaseUnit,
            'purchase_to_base' => round($factor, 4),
            'unit_cost' => round(max(0, $this->number($data['unit_cost'] ?? 0, 0)), 4),
            'moq' => round(max(0.0001, $this->number($data['moq'] ?? 1, 1)), 4),
            'pack_multiple' => round(max(0.0001, $this->number($data['pack_multiple'] ?? 1, 1)), 4),
            'lead_time_days' => isset($data['lead_time_days']) && $data['lead_time_days'] !== ''
                ? max(0, min(365, (int)$data['lead_time_days']))
                : null,
            'preferred' => !empty($data['preferred']),
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($existing) {
            DB::table('pmd_inventory_supplier_items')->where('id', (int)$existing->id)->update($values);
            return (int)$existing->id;
        }

        return (int)DB::table('pmd_inventory_supplier_items')->insertGetId(array_merge(
            $values,
            [
                'location_id' => $locationId,
                'supplier_id' => $supplierId,
                'item_id' => $itemId,
                'created_at' => now(),
            ]
        ));
    }

    public function saveStorageLocation(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $storageId = max(0, (int)($data['storage_location_id'] ?? 0));
        $name = trim((string)($data['name'] ?? ''));

        if ($name === '') {
            throw new InvalidArgumentException('Storage location name is required.');
        }

        if (!empty($data['is_default'])) {
            DB::table('pmd_inventory_storage_locations')
                ->where('location_id', $locationId)
                ->update(['is_default' => 0, 'updated_at' => now()]);
        }

        $values = [
            'name' => mb_substr($name, 0, 120),
            'type' => mb_substr(trim((string)($data['type'] ?? 'storage')) ?: 'storage', 0, 40),
            'is_default' => !empty($data['is_default']),
            'active' => 1,
            'updated_at' => now(),
        ];

        if ($storageId > 0) {
            $exists = DB::table('pmd_inventory_storage_locations')
                ->where('location_id', $locationId)
                ->where('id', $storageId)
                ->exists();
            if (!$exists) {
                throw new InvalidArgumentException('Storage location was not found.');
            }
            DB::table('pmd_inventory_storage_locations')->where('id', $storageId)->update($values);
            $id = $storageId;
        } else {
            $id = (int)DB::table('pmd_inventory_storage_locations')->insertGetId(array_merge(
                $values,
                [
                    'location_id' => $locationId,
                    'created_by' => $staffId,
                    'created_at' => now(),
                ]
            ));
        }

        if (!empty($data['is_default'])) {
            $this->saveSettings($locationId, $staffId, ['default_storage_id' => $id]);
        }

        return $id;
    }

    public function saveSettings(int $locationId, ?int $staffId, array $data): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $defaultStorage = isset($data['default_storage_id'])
            ? max(0, (int)$data['default_storage_id'])
            : null;

        if ($defaultStorage !== null && $defaultStorage > 0 && !$this->storageExists($locationId, $defaultStorage)) {
            throw new InvalidArgumentException('Default storage location was not found.');
        }

        $current = DB::table('pmd_inventory_settings')
            ->where('location_id', $locationId)
            ->first();

        $trigger = strtolower(trim((string)($data['consumption_trigger'] ?? ($current->consumption_trigger ?? 'paid'))));
        if (!in_array($trigger, ['paid', 'accepted', 'kitchen', 'completed'], true)) {
            $trigger = 'paid';
        }

        $values = [
            'consumption_trigger' => $trigger,
            'blind_counts' => array_key_exists('blind_counts', $data)
                ? (bool)$data['blind_counts']
                : (bool)($current->blind_counts ?? true),
            'low_stock_notifications' => array_key_exists('low_stock_notifications', $data)
                ? (bool)$data['low_stock_notifications']
                : (bool)($current->low_stock_notifications ?? true),
            'expiry_warning_days' => max(
                1,
                min(90, (int)($data['expiry_warning_days'] ?? ($current->expiry_warning_days ?? 7)))
            ),
            'default_storage_id' => $defaultStorage !== null
                ? ($defaultStorage > 0 ? $defaultStorage : null)
                : ($current->default_storage_id ?? null),
            'auto_menu_availability' => array_key_exists('auto_menu_availability', $data)
                ? (bool)$data['auto_menu_availability']
                : (bool)($current->auto_menu_availability ?? false),
            'updated_by' => $staffId,
            'updated_at' => now(),
        ];

        if ($current) {
            DB::table('pmd_inventory_settings')
                ->where('location_id', $locationId)
                ->update($values);
        } else {
            DB::table('pmd_inventory_settings')->insert(array_merge(
                $values,
                [
                    'location_id' => $locationId,
                    'created_at' => now(),
                ]
            ));
        }
    }

    public function bulkImportItems(int $locationId, ?int $staffId, array $data): array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $rows = $this->arrayValue($data['rows'] ?? []);

        if (!$rows) {
            throw new InvalidArgumentException('Import file has no stock rows.');
        }
        if (count($rows) > 1000) {
            throw new InvalidArgumentException('Import is limited to 1000 stock rows at a time.');
        }

        $control = app(PmdInventoryControlService::class);
        $saved = 0;
        $codes = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                continue;
            }

            $name = trim((string)($row['name'] ?? $row['item_name'] ?? ''));
            if ($name === '') {
                continue;
            }

            try {
                $existing = DB::table('pmd_inventory_items')
                    ->where('location_id', $locationId)
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                    ->where('active', 1)
                    ->first();

                $baseUnit = $this->unit($row['base_unit'] ?? $row['unit'] ?? ($existing->base_unit ?? 'piece'));
                $purchaseUnit = $this->unit($row['purchase_unit'] ?? ($existing->purchase_unit ?? $baseUnit));
                $factor = max(0.0001, $this->number(
                    $row['purchase_to_base'] ?? ($existing->purchase_to_base ?? 1),
                    1
                ));

                $itemId = $control->saveItem(
                    $locationId,
                    $staffId,
                    [
                        'item_id' => (int)($existing->id ?? 0),
                        'name' => $name,
                        'category' => $row['category'] ?? ($existing->category ?? ''),
                        'sku' => $row['sku'] ?? ($existing->sku ?? ''),
                        'unit' => $baseUnit,
                        'purchase_unit' => $purchaseUnit,
                        'purchase_to_base' => $factor,
                        'purchase_cost' => $this->number(
                            $row['purchase_cost'] ?? $row['unit_cost'] ?? (
                                (float)($existing->unit_cost ?? 0) * $factor
                            ),
                            0
                        ),
                        'reorder_point' => $this->number($row['reorder_point'] ?? 0, 0),
                        'par_level' => $this->number($row['par_level'] ?? 0, 0),
                        'safety_stock' => $this->number($row['safety_stock'] ?? 0, 0),
                        'supplier_name' => $row['supplier_name'] ?? ($existing->supplier_name ?? ''),
                        'yield_percent' => $this->number($row['yield_percent'] ?? 100, 100),
                        'track_expiry' => !empty($row['track_expiry']),
                        'default_storage_location_id' => (int)($row['default_storage_location_id'] ?? 0),
                        'opening_qty' => $existing ? null : $this->number($row['opening_qty'] ?? 0, 0),
                    ]
                );

                $saved++;

                $code = trim((string)($row['barcode'] ?? $row['gtin'] ?? ''));
                if ($code !== '') {
                    $this->saveIdentifier(
                        $locationId,
                        $staffId,
                        [
                            'item_id' => $itemId,
                            'code' => $code,
                            'code_type' => 'auto',
                            'package_unit' => $row['barcode_unit'] ?? $purchaseUnit,
                            'package_quantity' => 1,
                            'base_quantity' => $this->number(
                                $row['barcode_base_quantity'] ?? $factor,
                                $factor
                            ),
                            'source' => 'csv_import',
                            'is_primary' => true,
                        ]
                    );
                    $codes++;
                }
            } catch (\Throwable $error) {
                $errors[] = [
                    'row' => $index + 2,
                    'name' => $name,
                    'error' => $error->getMessage(),
                ];
            }
        }

        return [
            'saved' => $saved,
            'codes' => $codes,
            'errors' => array_slice($errors, 0, 50),
        ];
    }

    public function createPurchaseOrder(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $lines = $this->arrayValue($data['lines'] ?? []);

        if ($supplierId > 0 && !$this->supplierExists($locationId, $supplierId)) {
            throw new InvalidArgumentException('Supplier was not found.');
        }
        if (!$lines) {
            throw new InvalidArgumentException('Add at least one purchase-order line.');
        }

        $supplier = $supplierId > 0
            ? DB::table('pmd_inventory_suppliers')->where('id', $supplierId)->first()
            : null;

        return DB::transaction(function () use ($locationId, $staffId, $supplierId, $supplier, $data, $lines) {
            $orderedAt = $this->date((string)($data['ordered_at'] ?? now()->toDateString()));
            $expectedAt = trim((string)($data['expected_at'] ?? ''));
            if ($expectedAt === '' && $supplier) {
                $expectedAt = now()
                    ->addDays(max(0, (int)$supplier->lead_time_days))
                    ->toDateString();
            }
            $expectedAt = $expectedAt !== '' ? $this->date($expectedAt) : null;
            $send = !empty($data['send']);

            $id = (int)DB::table('pmd_inventory_purchase_orders')->insertGetId([
                'location_id' => $locationId,
                'supplier_id' => $supplierId > 0 ? $supplierId : null,
                'order_number' => 'PENDING',
                'status' => $send ? 'sent' : 'draft',
                'ordered_at' => $orderedAt,
                'expected_at' => $expectedAt,
                'subtotal' => 0,
                'notes' => $this->nullableText($data['notes'] ?? null, 4000),
                'created_by' => $staffId,
                'sent_at' => $send ? now() : null,
                'closed_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $orderNumber = 'PO-'.now()->format('Ymd').'-'.str_pad((string)$id, 5, '0', STR_PAD_LEFT);
            $subtotal = 0.0;

            foreach ($lines as $line) {
                if (!is_array($line)) {
                    continue;
                }

                $itemId = max(0, (int)($line['item_id'] ?? 0));
                $qty = max(0, $this->number($line['quantity'] ?? 0, 0));
                if ($itemId < 1 || $qty <= 0 || !$this->itemExists($locationId, $itemId)) {
                    continue;
                }

                $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();
                $supplierItemId = max(0, (int)($line['supplier_item_id'] ?? 0));
                $offer = $supplierItemId > 0
                    ? DB::table('pmd_inventory_supplier_items')
                        ->where('location_id', $locationId)
                        ->where('id', $supplierItemId)
                        ->where('item_id', $itemId)
                        ->first()
                    : null;

                if (!$offer && $supplierId > 0) {
                    $offer = DB::table('pmd_inventory_supplier_items')
                        ->where('location_id', $locationId)
                        ->where('supplier_id', $supplierId)
                        ->where('item_id', $itemId)
                        ->where('active', 1)
                        ->orderByDesc('preferred')
                        ->first();
                }

                $unit = $this->unit($line['unit'] ?? ($offer->purchase_unit ?? $item->purchase_unit ?? $item->base_unit));
                $factor = max(0.0001, $this->number(
                    $line['base_quantity_per_unit'] ?? ($offer->purchase_to_base ?? $item->purchase_to_base ?? 1),
                    1
                ));
                $cost = max(0, $this->number(
                    $line['unit_cost'] ?? ($offer->unit_cost ?? ((float)$item->unit_cost * $factor)),
                    0
                ));

                DB::table('pmd_inventory_purchase_order_lines')->insert([
                    'purchase_order_id' => $id,
                    'item_id' => $itemId,
                    'supplier_item_id' => $offer ? (int)$offer->id : null,
                    'ordered_qty' => round($qty, 4),
                    'received_qty' => 0,
                    'unit' => $unit,
                    'unit_cost' => round($cost, 4),
                    'base_quantity_per_unit' => round($factor, 4),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $subtotal += $qty * $cost;
            }

            if ($subtotal <= 0 && !DB::table('pmd_inventory_purchase_order_lines')->where('purchase_order_id', $id)->exists()) {
                throw new InvalidArgumentException('No valid purchase-order lines were provided.');
            }

            DB::table('pmd_inventory_purchase_orders')
                ->where('id', $id)
                ->update([
                    'order_number' => $orderNumber,
                    'subtotal' => round($subtotal, 4),
                    'updated_at' => now(),
                ]);

            return $id;
        });
    }

    public function setPurchaseOrderStatus(int $locationId, int $orderId, string $status): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $orderId = max(0, $orderId);
        $status = strtolower(trim($status));

        if (!in_array($status, ['draft', 'sent', 'cancelled', 'closed'], true)) {
            throw new InvalidArgumentException('Unsupported purchase-order status.');
        }

        $order = DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->where('id', $orderId)
            ->first();
        if (!$order) {
            throw new InvalidArgumentException('Purchase order was not found.');
        }
        if (in_array((string)$order->status, ['received', 'closed', 'cancelled'], true)) {
            throw new InvalidArgumentException('This purchase order is already final.');
        }

        if ($status === 'cancelled') {
            $received = DB::table('pmd_inventory_purchase_order_lines')
                ->where('purchase_order_id', $orderId)
                ->where('received_qty', '>', 0)
                ->exists();
            if ($received) {
                throw new InvalidArgumentException(
                    'Partially received orders cannot be cancelled. Receive or close the remaining balance instead.'
                );
            }
        }

        DB::table('pmd_inventory_purchase_orders')
            ->where('id', $orderId)
            ->update([
                'status' => $status,
                'sent_at' => $status === 'sent'
                    ? ($order->sent_at ?: now())
                    : $order->sent_at,
                'closed_at' => in_array($status, ['cancelled', 'closed'], true)
                    ? now()
                    : null,
                'updated_at' => now(),
            ]);
    }

    public function receivePurchaseOrder(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $orderId = max(0, (int)($data['purchase_order_id'] ?? 0));
        $order = DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->where('id', $orderId)
            ->first();

        if (!$order || in_array((string)$order->status, ['closed', 'cancelled'], true)) {
            throw new InvalidArgumentException('Purchase order is not available for receiving.');
        }

        $lineInput = $this->arrayValue($data['lines'] ?? []);
        $inputById = [];
        foreach ($lineInput as $line) {
            if (is_array($line) && (int)($line['line_id'] ?? 0) > 0) {
                $inputById[(int)$line['line_id']] = $line;
            }
        }

        $orderLines = DB::table('pmd_inventory_purchase_order_lines')
            ->where('purchase_order_id', $orderId)
            ->orderBy('id')
            ->get();

        $purchaseLines = [];
        foreach ($orderLines as $line) {
            $remaining = max(0, (float)$line->ordered_qty - (float)$line->received_qty);
            if ($remaining <= 0) {
                continue;
            }

            $input = $inputById[(int)$line->id] ?? [];
            $qty = array_key_exists('quantity', $input)
                ? max(0, $this->number($input['quantity'], 0))
                : $remaining;
            $qty = min($remaining, $qty);
            if ($qty <= 0) {
                continue;
            }

            $item = DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', (int)$line->item_id)
                ->where('active', 1)
                ->first();
            if (!$item) {
                continue;
            }

            $actualCost = max(0, $this->number(
                $input['unit_cost'] ?? $line->unit_cost,
                (float)$line->unit_cost
            ));

            $purchaseLines[] = [
                'item_id' => (int)$line->item_id,
                'item_name' => (string)$item->name,
                'quantity' => $qty,
                'unit' => (string)$line->unit,
                'unit_cost' => $actualCost,
                'base_quantity_per_unit' => (float)$line->base_quantity_per_unit,
                'purchase_order_line_id' => (int)$line->id,
                'lot_code' => $this->nullableText($input['lot_code'] ?? null, 120),
                'expiry_date' => $this->nullableDate($input['expiry_date'] ?? null),
            ];
        }

        if (!$purchaseLines) {
            throw new InvalidArgumentException('There is no remaining quantity to receive.');
        }

        $supplier = $order->supplier_id
            ? DB::table('pmd_inventory_suppliers')->where('id', (int)$order->supplier_id)->first()
            : null;

        $invoiceNumber = $this->nullableText($data['invoice_number'] ?? null, 120);
        $this->assertInvoiceAvailable(
            $locationId,
            (string)($supplier->name ?? ''),
            $invoiceNumber
        );

        $receiptId = app(PmdInventoryControlService::class)->savePurchase(
            $locationId,
            $staffId,
            [
                'supplier_name' => (string)($supplier->name ?? ''),
                'supplier_id' => (int)($order->supplier_id ?? 0),
                'purchased_at' => $this->date((string)($data['purchased_at'] ?? now()->toDateString())),
                'purchase_order_id' => $orderId,
                'storage_location_id' => max(0, (int)($data['storage_location_id'] ?? 0)),
                'invoice_number' => $invoiceNumber,
                'source' => 'purchase_order',
                'lines' => $purchaseLines,
            ]
        );

        $this->refreshPurchaseOrderStatus($orderId);

        return $receiptId;
    }

    public function recordPurchaseLine(
        int $locationId,
        ?int $staffId,
        int $itemId,
        int $receiptId,
        array $line,
        float $baseQty,
        float $baseCost,
        float $oldUnitCost,
        float $newUnitCost,
        ?int $storageLocationId,
        ?int $supplierId
    ): ?int {
        if (!$this->ready()) {
            return null;
        }

        $locationId = $this->location($locationId);
        $lotId = null;

        if (Schema::hasTable('pmd_inventory_cost_history')) {
            DB::table('pmd_inventory_cost_history')->insert([
                'location_id' => $locationId,
                'item_id' => $itemId,
                'supplier_id' => $supplierId && $supplierId > 0 ? $supplierId : null,
                'receipt_id' => $receiptId,
                'old_unit_cost' => round(max(0, $oldUnitCost), 6),
                'new_unit_cost' => round(max(0, $newUnitCost), 6),
                'purchase_unit_cost' => round(max(0, $baseCost) * max(0.0001, $this->number(
                    $line['base_quantity_per_unit'] ?? 1,
                    1
                )), 4),
                'occurred_at' => now(),
                'created_by' => $staffId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();
        $lotCode = trim((string)($line['lot_code'] ?? ''));
        $expiry = $this->nullableDate($line['expiry_date'] ?? null);
        $trackExpiry = (bool)($item->track_expiry ?? false);

        if ($lotCode !== '' || $expiry || $trackExpiry) {
            $storageId = $storageLocationId && $storageLocationId > 0
                ? $storageLocationId
                : $this->defaultStorageId($locationId);

            $lotId = (int)DB::table('pmd_inventory_lots')->insertGetId([
                'location_id' => $locationId,
                'item_id' => $itemId,
                'storage_location_id' => $storageId > 0 ? $storageId : null,
                'receipt_id' => $receiptId,
                'lot_code' => $lotCode !== '' ? mb_substr($lotCode, 0, 120) : null,
                'expiry_date' => $expiry,
                'received_at' => now(),
                'qty_received' => round($baseQty, 4),
                'qty_remaining' => round($baseQty, 4),
                'unit_cost' => round(max(0, $baseCost), 4),
                'status' => 'open',
                'created_by' => $staffId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $poLineId = max(0, (int)($line['purchase_order_line_id'] ?? 0));
        if ($poLineId > 0) {
            $poLine = DB::table('pmd_inventory_purchase_order_lines')
                ->where('id', $poLineId)
                ->first();
            if ($poLine) {
                $received = min(
                    (float)$poLine->ordered_qty,
                    (float)$poLine->received_qty + max(0, $this->number($line['quantity'] ?? 0, 0))
                );
                DB::table('pmd_inventory_purchase_order_lines')
                    ->where('id', $poLineId)
                    ->update([
                        'received_qty' => round($received, 4),
                        'updated_at' => now(),
                    ]);
            }
        }

        return $lotId;
    }

    public function reverseReceipt(int $locationId, ?int $staffId, int $receiptId, ?string $reason = null): void
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        DB::transaction(function () use ($locationId, $staffId, $receiptId, $reason) {
            $receipt = DB::table('pmd_inventory_receipts')
                ->where('location_id', $locationId)
                ->where('id', $receiptId)
                ->lockForUpdate()
                ->first();

            if (!$receipt || empty($receipt->confirmed_at)) {
                throw new InvalidArgumentException('Confirmed purchase was not found.');
            }
            if (!empty($receipt->reversed_at)) {
                throw new InvalidArgumentException('This purchase has already been reversed.');
            }

            $movements = DB::table('pmd_inventory_movements')
                ->where('location_id', $locationId)
                ->where('movement_type', 'PURCHASE')
                ->where('reference_type', 'purchase_receipt')
                ->where('reference_id', $receiptId)
                ->get();

            if ($movements->isEmpty()) {
                throw new InvalidArgumentException('No purchase movements were found for this receipt.');
            }

            foreach ($movements as $movement) {
                DB::table('pmd_inventory_movements')->insert([
                    'location_id' => $locationId,
                    'item_id' => (int)$movement->item_id,
                    'storage_location_id' => $movement->storage_location_id ?? null,
                    'lot_id' => $movement->lot_id ?? null,
                    'purchase_order_line_id' => $movement->purchase_order_line_id ?? null,
                    'movement_type' => 'PURCHASE_REVERSAL',
                    'qty_delta' => -abs((float)$movement->qty_delta),
                    'unit_cost' => (float)$movement->unit_cost,
                    'reference_type' => 'purchase_reversal',
                    'reference_id' => $receiptId,
                    'reason' => $this->nullableText($reason ?: 'Purchase reversed', 160),
                    'note' => null,
                    'staff_id' => $staffId,
                    'occurred_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if (!empty($movement->lot_id)) {
                    $lot = DB::table('pmd_inventory_lots')->where('id', (int)$movement->lot_id)->first();
                    if ($lot) {
                        $remaining = max(0, (float)$lot->qty_remaining - abs((float)$movement->qty_delta));
                        DB::table('pmd_inventory_lots')
                            ->where('id', (int)$lot->id)
                            ->update([
                                'qty_remaining' => round($remaining, 4),
                                'status' => $remaining <= 0.00005 ? 'closed' : $lot->status,
                                'updated_at' => now(),
                            ]);
                    }
                }

                if (!empty($movement->purchase_order_line_id)) {
                    $poLine = DB::table('pmd_inventory_purchase_order_lines')
                        ->where('id', (int)$movement->purchase_order_line_id)
                        ->first();
                    if ($poLine) {
                        $unitFactor = max(0.0001, (float)$poLine->base_quantity_per_unit);
                        $receivedUnits = abs((float)$movement->qty_delta) / $unitFactor;
                        DB::table('pmd_inventory_purchase_order_lines')
                            ->where('id', (int)$poLine->id)
                            ->update([
                                'received_qty' => round(max(0, (float)$poLine->received_qty - $receivedUnits), 4),
                                'updated_at' => now(),
                            ]);
                    }
                }
            }

            DB::table('pmd_inventory_receipts')
                ->where('id', $receiptId)
                ->update([
                    'reversed_at' => now(),
                    'reversed_by' => $staffId,
                    'updated_at' => now(),
                ]);

            if (!empty($receipt->purchase_order_id)) {
                $this->refreshPurchaseOrderStatus((int)$receipt->purchase_order_id);
            }
        });
    }

    public function transferStock(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $from = max(0, (int)($data['from_storage_id'] ?? 0));
        $to = max(0, (int)($data['to_storage_id'] ?? 0));
        $lines = $this->arrayValue($data['lines'] ?? []);

        if ($from < 1 || $to < 1 || $from === $to) {
            throw new InvalidArgumentException('Choose two different storage locations.');
        }
        if (!$this->storageExists($locationId, $from) || !$this->storageExists($locationId, $to)) {
            throw new InvalidArgumentException('Storage location was not found.');
        }
        if (!$lines) {
            throw new InvalidArgumentException('Add at least one transfer line.');
        }

        return DB::transaction(function () use ($locationId, $staffId, $from, $to, $lines, $data) {
            $transferId = (int)DB::table('pmd_inventory_transfers')->insertGetId([
                'location_id' => $locationId,
                'from_storage_id' => $from,
                'to_storage_id' => $to,
                'status' => 'completed',
                'note' => $this->nullableText($data['note'] ?? null, 2000),
                'staff_id' => $staffId,
                'transferred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($lines as $line) {
                if (!is_array($line)) {
                    continue;
                }

                $itemId = max(0, (int)($line['item_id'] ?? 0));
                $qty = max(0, $this->number($line['quantity'] ?? 0, 0));
                $lotId = max(0, (int)($line['lot_id'] ?? 0));

                if ($itemId < 1 || $qty <= 0 || !$this->itemExists($locationId, $itemId)) {
                    continue;
                }

                $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();
                $lot = null;
                if ($lotId > 0) {
                    $lot = DB::table('pmd_inventory_lots')
                        ->where('location_id', $locationId)
                        ->where('id', $lotId)
                        ->where('item_id', $itemId)
                        ->lockForUpdate()
                        ->first();

                    if (!$lot) {
                        throw new InvalidArgumentException('Selected transfer lot was not found.');
                    }
                    if ((int)($lot->storage_location_id ?? 0) !== $from) {
                        throw new InvalidArgumentException('Selected lot is not stored in the transfer source location.');
                    }
                    if ((float)$lot->qty_remaining + 0.00005 < $qty) {
                        throw new InvalidArgumentException('Transfer quantity is larger than the selected lot balance.');
                    }
                }

                DB::table('pmd_inventory_transfer_lines')->insert([
                    'transfer_id' => $transferId,
                    'item_id' => $itemId,
                    'lot_id' => $lotId > 0 ? $lotId : null,
                    'qty_base' => round($qty, 4),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                foreach ([
                    ['type' => 'TRANSFER_OUT', 'qty' => -$qty, 'storage' => $from],
                    ['type' => 'TRANSFER_IN', 'qty' => $qty, 'storage' => $to],
                ] as $movement) {
                    DB::table('pmd_inventory_movements')->insert([
                        'location_id' => $locationId,
                        'item_id' => $itemId,
                        'storage_location_id' => $movement['storage'],
                        'lot_id' => $lotId > 0 ? $lotId : null,
                        'purchase_order_line_id' => null,
                        'movement_type' => $movement['type'],
                        'qty_delta' => round((float)$movement['qty'], 4),
                        'unit_cost' => max(0, (float)$item->unit_cost),
                        'reference_type' => 'storage_transfer',
                        'reference_id' => $transferId,
                        'reason' => 'Storage transfer',
                        'note' => null,
                        'staff_id' => $staffId,
                        'occurred_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                if ($lotId > 0 && $lot) {
                    $remaining = max(0, (float)$lot->qty_remaining - $qty);
                    DB::table('pmd_inventory_lots')
                        ->where('id', $lotId)
                        ->update([
                            'qty_remaining' => round($remaining, 4),
                            'status' => $remaining <= 0.00005 ? 'closed' : $lot->status,
                            'updated_at' => now(),
                        ]);

                    DB::table('pmd_inventory_lots')->insert([
                        'location_id' => $locationId,
                        'item_id' => $itemId,
                        'storage_location_id' => $to,
                        'receipt_id' => $lot->receipt_id,
                        'lot_code' => $lot->lot_code,
                        'expiry_date' => $lot->expiry_date,
                        'received_at' => $lot->received_at,
                        'qty_received' => round($qty, 4),
                        'qty_remaining' => round($qty, 4),
                        'unit_cost' => (float)$lot->unit_cost,
                        'status' => 'open',
                        'created_by' => $staffId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            return $transferId;
        });
    }

    public function recordAdjustment(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $qty = $this->number($data['quantity_delta'] ?? 0, 0);
        $reason = trim((string)($data['reason'] ?? ''));

        if ($itemId < 1 || abs($qty) <= 0.00005 || !$this->itemExists($locationId, $itemId)) {
            throw new InvalidArgumentException('Choose an item and enter a non-zero adjustment.');
        }
        if ($reason === '') {
            throw new InvalidArgumentException('An adjustment reason is required.');
        }

        $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();
        $storageId = max(0, (int)($data['storage_location_id'] ?? 0));
        $lotId = max(0, (int)($data['lot_id'] ?? 0));

        return (int)DB::table('pmd_inventory_movements')->insertGetId([
            'location_id' => $locationId,
            'item_id' => $itemId,
            'storage_location_id' => $storageId > 0 ? $storageId : null,
            'lot_id' => $lotId > 0 ? $lotId : null,
            'purchase_order_line_id' => null,
            'movement_type' => 'ADJUSTMENT',
            'qty_delta' => round($qty, 4),
            'unit_cost' => max(0, (float)$item->unit_cost),
            'reference_type' => 'manual_adjustment',
            'reference_id' => null,
            'reason' => mb_substr($reason, 0, 160),
            'note' => $this->nullableText($data['note'] ?? null, 2000),
            'staff_id' => $staffId,
            'occurred_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function returnToSupplier(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $itemId = max(0, (int)($data['item_id'] ?? 0));
        $qty = max(0, $this->number($data['quantity'] ?? 0, 0));
        $supplierId = max(0, (int)($data['supplier_id'] ?? 0));
        $lotId = max(0, (int)($data['lot_id'] ?? 0));
        $storageId = max(0, (int)($data['storage_location_id'] ?? 0));

        if ($itemId < 1 || $qty <= 0 || !$this->itemExists($locationId, $itemId)) {
            throw new InvalidArgumentException('Choose a stock item and return quantity.');
        }
        if ($supplierId > 0 && !$this->supplierExists($locationId, $supplierId)) {
            throw new InvalidArgumentException('Supplier was not found.');
        }

        $item = DB::table('pmd_inventory_items')->where('id', $itemId)->first();
        $reason = $this->nullableText($data['reason'] ?? 'Return to supplier', 160);

        return DB::transaction(function () use (
            $locationId,
            $staffId,
            $itemId,
            $qty,
            $supplierId,
            $lotId,
            $storageId,
            $item,
            $reason,
            $data
        ) {
            if ($lotId > 0) {
                $lot = DB::table('pmd_inventory_lots')
                    ->where('location_id', $locationId)
                    ->where('id', $lotId)
                    ->where('item_id', $itemId)
                    ->lockForUpdate()
                    ->first();

                if (!$lot) {
                    throw new InvalidArgumentException('Selected lot was not found.');
                }
                if ((float)$lot->qty_remaining + 0.00005 < $qty) {
                    throw new InvalidArgumentException('Return quantity is larger than the selected lot balance.');
                }

                $remaining = max(0, (float)$lot->qty_remaining - $qty);
                DB::table('pmd_inventory_lots')
                    ->where('id', $lotId)
                    ->update([
                        'qty_remaining' => round($remaining, 4),
                        'status' => $remaining <= 0.00005 ? 'closed' : $lot->status,
                        'updated_at' => now(),
                    ]);
            }

            return (int)DB::table('pmd_inventory_movements')->insertGetId([
                'location_id' => $locationId,
                'item_id' => $itemId,
                'storage_location_id' => $storageId > 0 ? $storageId : null,
                'lot_id' => $lotId > 0 ? $lotId : null,
                'purchase_order_line_id' => null,
                'movement_type' => 'SUPPLIER_RETURN',
                'qty_delta' => -round($qty, 4),
                'unit_cost' => max(0, (float)$item->unit_cost),
                'reference_type' => 'supplier_return',
                'reference_id' => $supplierId > 0 ? $supplierId : null,
                'reason' => $reason,
                'note' => $this->nullableText($data['note'] ?? null, 2000),
                'staff_id' => $staffId,
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function itemLedger(int $locationId, int $itemId): array
    {
        $this->assertReady();
        $locationId = $this->location($locationId);

        $item = DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $itemId)
            ->first();
        if (!$item) {
            throw new InvalidArgumentException('Stock item was not found.');
        }

        $movements = DB::table('pmd_inventory_movements as m')
            ->leftJoin('staffs as s', 's.staff_id', '=', 'm.staff_id')
            ->leftJoin('pmd_inventory_storage_locations as sl', 'sl.id', '=', 'm.storage_location_id')
            ->leftJoin('pmd_inventory_lots as l', 'l.id', '=', 'm.lot_id')
            ->where('m.location_id', $locationId)
            ->where('m.item_id', $itemId)
            ->orderByDesc('m.occurred_at')
            ->orderByDesc('m.id')
            ->limit(150)
            ->get([
                'm.id',
                'm.movement_type',
                'm.qty_delta',
                'm.unit_cost',
                'm.reference_type',
                'm.reference_id',
                'm.reason',
                'm.note',
                'm.occurred_at',
                's.staff_name as staff_name',
                'sl.name as storage_name',
                'l.lot_code as lot_code',
                'l.expiry_date as expiry_date',
            ])
            ->map(static fn ($row) => [
                'id' => (int)$row->id,
                'type' => (string)$row->movement_type,
                'qty_delta' => round((float)$row->qty_delta, 4),
                'unit_cost' => round((float)$row->unit_cost, 4),
                'value_delta' => round((float)$row->qty_delta * (float)$row->unit_cost, 2),
                'reference_type' => (string)($row->reference_type ?? ''),
                'reference_id' => (int)($row->reference_id ?? 0),
                'reason' => (string)($row->reason ?? ''),
                'note' => (string)($row->note ?? ''),
                'occurred_at' => (string)$row->occurred_at,
                'staff_name' => (string)($row->staff_name ?? ''),
                'storage_name' => (string)($row->storage_name ?? ''),
                'lot_code' => (string)($row->lot_code ?? ''),
                'expiry_date' => $row->expiry_date ? (string)$row->expiry_date : null,
            ])
            ->values()
            ->all();

        $costHistory = DB::table('pmd_inventory_cost_history')
            ->where('location_id', $locationId)
            ->where('item_id', $itemId)
            ->orderByDesc('occurred_at')
            ->limit(50)
            ->get()
            ->map(static fn ($row) => [
                'old_unit_cost' => round((float)$row->old_unit_cost, 4),
                'new_unit_cost' => round((float)$row->new_unit_cost, 4),
                'purchase_unit_cost' => round((float)$row->purchase_unit_cost, 4),
                'occurred_at' => (string)$row->occurred_at,
                'receipt_id' => (int)($row->receipt_id ?? 0),
            ])
            ->values()
            ->all();

        return [
            'item' => [
                'id' => (int)$item->id,
                'name' => (string)$item->name,
                'unit' => (string)$item->base_unit,
            ],
            'movements' => $movements,
            'cost_history' => $costHistory,
        ];
    }

    public function savePreparation(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $preparationId = max(0, (int)($data['preparation_id'] ?? 0));
        $name = trim((string)($data['name'] ?? ''));
        $outputItemId = max(0, (int)($data['output_item_id'] ?? 0));
        $outputQty = max(0.0001, $this->number($data['output_qty'] ?? 1, 1));
        $lines = $this->arrayValue($data['lines'] ?? []);

        if ($name === '' || !$this->itemExists($locationId, $outputItemId)) {
            throw new InvalidArgumentException('Preparation name and output stock item are required.');
        }
        if (!$lines) {
            throw new InvalidArgumentException('Add at least one preparation ingredient.');
        }

        return DB::transaction(function () use (
            $locationId,
            $staffId,
            $preparationId,
            $name,
            $outputItemId,
            $outputQty,
            $lines
        ) {
            $values = [
                'name' => mb_substr($name, 0, 190),
                'output_item_id' => $outputItemId,
                'output_qty' => round($outputQty, 4),
                'active' => 1,
                'updated_at' => now(),
            ];

            if ($preparationId > 0) {
                $exists = DB::table('pmd_inventory_preparations')
                    ->where('location_id', $locationId)
                    ->where('id', $preparationId)
                    ->exists();
                if (!$exists) {
                    throw new InvalidArgumentException('Preparation was not found.');
                }
                DB::table('pmd_inventory_preparations')->where('id', $preparationId)->update($values);
                $id = $preparationId;
                DB::table('pmd_inventory_preparation_lines')->where('preparation_id', $id)->delete();
            } else {
                $id = (int)DB::table('pmd_inventory_preparations')->insertGetId(array_merge(
                    $values,
                    [
                        'location_id' => $locationId,
                        'created_by' => $staffId,
                        'created_at' => now(),
                    ]
                ));
            }

            foreach ($lines as $line) {
                if (!is_array($line)) {
                    continue;
                }
                $itemId = max(0, (int)($line['item_id'] ?? 0));
                $qty = max(0, $this->number($line['qty_input'] ?? 0, 0));
                if ($itemId < 1 || $qty <= 0 || $itemId === $outputItemId || !$this->itemExists($locationId, $itemId)) {
                    continue;
                }
                DB::table('pmd_inventory_preparation_lines')->insert([
                    'preparation_id' => $id,
                    'item_id' => $itemId,
                    'qty_input' => round($qty, 4),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $id;
        });
    }

    public function produceBatch(int $locationId, ?int $staffId, array $data): int
    {
        $this->assertReady();
        $locationId = $this->location($locationId);
        $preparationId = max(0, (int)($data['preparation_id'] ?? 0));
        $outputQty = max(0, $this->number($data['output_qty'] ?? 0, 0));

        $preparation = DB::table('pmd_inventory_preparations')
            ->where('location_id', $locationId)
            ->where('id', $preparationId)
            ->where('active', 1)
            ->first();

        if (!$preparation || $outputQty <= 0) {
            throw new InvalidArgumentException('Choose a preparation and enter output quantity.');
        }

        $lines = DB::table('pmd_inventory_preparation_lines')
            ->where('preparation_id', $preparationId)
            ->get();
        if ($lines->isEmpty()) {
            throw new InvalidArgumentException('Preparation has no ingredient lines.');
        }

        return DB::transaction(function () use (
            $locationId,
            $staffId,
            $data,
            $preparation,
            $lines,
            $outputQty
        ) {
            $scale = $outputQty / max(0.0001, (float)$preparation->output_qty);
            $storageId = max(0, (int)($data['storage_location_id'] ?? 0));
            if ($storageId < 1) {
                $storageId = $this->defaultStorageId($locationId);
            }

            $batchId = (int)DB::table('pmd_inventory_production_batches')->insertGetId([
                'location_id' => $locationId,
                'preparation_id' => (int)$preparation->id,
                'output_qty' => round($outputQty, 4),
                'storage_location_id' => $storageId > 0 ? $storageId : null,
                'lot_code' => $this->nullableText($data['lot_code'] ?? null, 120),
                'expiry_date' => $this->nullableDate($data['expiry_date'] ?? null),
                'staff_id' => $staffId,
                'note' => $this->nullableText($data['note'] ?? null, 2000),
                'produced_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $totalCost = 0.0;
            foreach ($lines as $line) {
                $item = DB::table('pmd_inventory_items')
                    ->where('location_id', $locationId)
                    ->where('id', (int)$line->item_id)
                    ->where('active', 1)
                    ->first();
                if (!$item) {
                    continue;
                }

                $qty = max(0, (float)$line->qty_input * $scale);
                $cost = max(0, (float)$item->unit_cost);
                $totalCost += $qty * $cost;

                DB::table('pmd_inventory_production_batch_lines')->insert([
                    'production_batch_id' => $batchId,
                    'item_id' => (int)$item->id,
                    'qty_input' => round($qty, 4),
                    'unit_cost' => round($cost, 4),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('pmd_inventory_movements')->insert([
                    'location_id' => $locationId,
                    'item_id' => (int)$item->id,
                    'storage_location_id' => null,
                    'lot_id' => null,
                    'purchase_order_line_id' => null,
                    'movement_type' => 'PRODUCTION_INPUT',
                    'qty_delta' => -round($qty, 4),
                    'unit_cost' => round($cost, 4),
                    'reference_type' => 'production_batch',
                    'reference_id' => $batchId,
                    'reason' => (string)$preparation->name,
                    'note' => null,
                    'staff_id' => $staffId,
                    'occurred_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $outputItem = DB::table('pmd_inventory_items')
                ->where('location_id', $locationId)
                ->where('id', (int)$preparation->output_item_id)
                ->where('active', 1)
                ->first();
            if (!$outputItem) {
                throw new RuntimeException('Preparation output item is no longer available.');
            }

            $outputUnitCost = $outputQty > 0 ? $totalCost / $outputQty : 0;

            DB::table('pmd_inventory_movements')->insert([
                'location_id' => $locationId,
                'item_id' => (int)$outputItem->id,
                'storage_location_id' => $storageId > 0 ? $storageId : null,
                'lot_id' => null,
                'purchase_order_line_id' => null,
                'movement_type' => 'PRODUCTION_OUTPUT',
                'qty_delta' => round($outputQty, 4),
                'unit_cost' => round($outputUnitCost, 4),
                'reference_type' => 'production_batch',
                'reference_id' => $batchId,
                'reason' => (string)$preparation->name,
                'note' => null,
                'staff_id' => $staffId,
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('pmd_inventory_items')
                ->where('id', (int)$outputItem->id)
                ->update([
                    'unit_cost' => round($outputUnitCost, 6),
                    'updated_at' => now(),
                ]);

            $lotCode = trim((string)($data['lot_code'] ?? ''));
            $expiry = $this->nullableDate($data['expiry_date'] ?? null);
            if ($lotCode !== '' || $expiry || !empty($outputItem->track_expiry)) {
                DB::table('pmd_inventory_lots')->insert([
                    'location_id' => $locationId,
                    'item_id' => (int)$outputItem->id,
                    'storage_location_id' => $storageId > 0 ? $storageId : null,
                    'receipt_id' => null,
                    'lot_code' => $lotCode !== '' ? mb_substr($lotCode, 0, 120) : null,
                    'expiry_date' => $expiry,
                    'received_at' => now(),
                    'qty_received' => round($outputQty, 4),
                    'qty_remaining' => round($outputQty, 4),
                    'unit_cost' => round($outputUnitCost, 4),
                    'status' => 'open',
                    'created_by' => $staffId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $batchId;
        });
    }

    public function assertDocumentFingerprintAvailable(int $locationId, string $fingerprint): void
    {
        if (!$this->ready() || !Schema::hasColumn('pmd_inventory_receipts', 'document_fingerprint')) {
            return;
        }

        $fingerprint = trim($fingerprint);
        if ($fingerprint === '') {
            return;
        }

        $duplicate = DB::table('pmd_inventory_receipts')
            ->where('location_id', $locationId)
            ->where('document_fingerprint', $fingerprint)
            ->where(function ($q) {
                $q->whereNotNull('confirmed_at')
                    ->orWhereIn('ai_status', ['review', 'manual_review']);
            })
            ->exists();

        if ($duplicate) {
            throw new InvalidArgumentException(
                'This supplier document was already scanned. Review the existing purchase instead of adding it twice.'
            );
        }
    }

    public function assertInvoiceAvailable(
        int $locationId,
        ?string $supplierName,
        ?string $invoiceNumber,
        ?int $excludeReceiptId = null
    ): void {
        if (!$this->ready() || !Schema::hasColumn('pmd_inventory_receipts', 'invoice_number')) {
            return;
        }

        $invoiceNumber = trim((string)$invoiceNumber);
        if ($invoiceNumber === '') {
            return;
        }

        $query = DB::table('pmd_inventory_receipts')
            ->where('location_id', $this->location($locationId))
            ->where('invoice_number', $invoiceNumber)
            ->where(function ($q) {
                $q->whereNotNull('confirmed_at')
                    ->orWhereIn('ai_status', ['review', 'manual_review']);
            });

        $supplierName = trim((string)$supplierName);
        if ($supplierName !== '') {
            $query->whereRaw('LOWER(COALESCE(supplier_name, \'\')) = ?', [mb_strtolower($supplierName)]);
        }
        if ($excludeReceiptId && $excludeReceiptId > 0) {
            $query->where('id', '<>', $excludeReceiptId);
        }

        if ($query->exists()) {
            throw new InvalidArgumentException(
                'This supplier invoice number already exists in Inventory.'
            );
        }
    }

    public function defaultStorageId(int $locationId): int
    {
        if (!$this->ready()) {
            return 0;
        }
        $locationId = $this->location($locationId);
        return $this->ensureDefaultStorage($locationId);
    }

    public function settingsForLocation(int $locationId): array
    {
        if (!$this->ready()) {
            return [
                'consumption_trigger' => 'paid',
                'blind_counts' => true,
                'low_stock_notifications' => true,
                'expiry_warning_days' => 7,
                'default_storage_id' => null,
                'auto_menu_availability' => false,
            ];
        }
        $locationId = $this->location($locationId);
        return $this->settings($locationId, $this->ensureDefaultStorage($locationId));
    }

    private function purchaseOrders(int $locationId, array $supplierById): array
    {
        $orders = DB::table('pmd_inventory_purchase_orders')
            ->where('location_id', $locationId)
            ->orderByDesc('id')
            ->limit(40)
            ->get();

        $ids = $orders->pluck('id')->map(fn ($id) => (int)$id)->all();
        $lines = $ids
            ? DB::table('pmd_inventory_purchase_order_lines as l')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'l.item_id')
                ->whereIn('l.purchase_order_id', $ids)
                ->orderBy('l.id')
                ->get([
                    'l.*',
                    'i.name as item_name',
                    'i.base_unit as base_unit',
                ])
                ->groupBy('purchase_order_id')
            : collect();

        return $orders->map(function ($row) use ($supplierById, $lines) {
            $orderLines = collect($lines->get((int)$row->id, []))
                ->map(static function ($line) {
                    $remaining = max(0, (float)$line->ordered_qty - (float)$line->received_qty);
                    return [
                        'id' => (int)$line->id,
                        'item_id' => (int)$line->item_id,
                        'item_name' => (string)($line->item_name ?? 'Item'),
                        'ordered_qty' => round((float)$line->ordered_qty, 4),
                        'received_qty' => round((float)$line->received_qty, 4),
                        'remaining_qty' => round($remaining, 4),
                        'unit' => (string)$line->unit,
                        'unit_cost' => round((float)$line->unit_cost, 4),
                        'base_quantity_per_unit' => round((float)$line->base_quantity_per_unit, 4),
                    ];
                })
                ->values()
                ->all();

            return [
                'id' => (int)$row->id,
                'order_number' => (string)$row->order_number,
                'supplier_id' => (int)($row->supplier_id ?? 0),
                'supplier_name' => (string)($supplierById[(int)($row->supplier_id ?? 0)]['name'] ?? ''),
                'status' => (string)$row->status,
                'ordered_at' => $row->ordered_at ? (string)$row->ordered_at : null,
                'expected_at' => $row->expected_at ? (string)$row->expected_at : null,
                'subtotal' => round((float)$row->subtotal, 2),
                'notes' => (string)($row->notes ?? ''),
                'sent_at' => $row->sent_at ? (string)$row->sent_at : null,
                'closed_at' => $row->closed_at ? (string)$row->closed_at : null,
                'lines' => $orderLines,
            ];
        })->values()->all();
    }

    private function recentTransfers(int $locationId, array $storageById): array
    {
        $rows = DB::table('pmd_inventory_transfers')
            ->where('location_id', $locationId)
            ->orderByDesc('transferred_at')
            ->limit(20)
            ->get();

        $ids = $rows->pluck('id')->map(fn ($id) => (int)$id)->all();
        $lines = $ids
            ? DB::table('pmd_inventory_transfer_lines as l')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'l.item_id')
                ->whereIn('l.transfer_id', $ids)
                ->get(['l.*', 'i.name as item_name', 'i.base_unit'])
                ->groupBy('transfer_id')
            : collect();

        return $rows->map(function ($row) use ($storageById, $lines) {
            return [
                'id' => (int)$row->id,
                'from_storage_id' => (int)$row->from_storage_id,
                'from_storage_name' => (string)($storageById[(int)$row->from_storage_id]['name'] ?? 'Storage'),
                'to_storage_id' => (int)$row->to_storage_id,
                'to_storage_name' => (string)($storageById[(int)$row->to_storage_id]['name'] ?? 'Storage'),
                'status' => (string)$row->status,
                'note' => (string)($row->note ?? ''),
                'transferred_at' => (string)$row->transferred_at,
                'lines' => collect($lines->get((int)$row->id, []))
                    ->map(static fn ($line) => [
                        'item_id' => (int)$line->item_id,
                        'item_name' => (string)($line->item_name ?? 'Item'),
                        'qty_base' => round((float)$line->qty_base, 4),
                        'unit' => (string)($line->base_unit ?? 'piece'),
                        'lot_id' => (int)($line->lot_id ?? 0),
                    ])
                    ->values()
                    ->all(),
            ];
        })->values()->all();
    }

    private function preparations(int $locationId): array
    {
        $rows = DB::table('pmd_inventory_preparations as p')
            ->leftJoin('pmd_inventory_items as o', 'o.id', '=', 'p.output_item_id')
            ->where('p.location_id', $locationId)
            ->where('p.active', 1)
            ->orderBy('p.name')
            ->get([
                'p.*',
                'o.name as output_item_name',
                'o.base_unit as output_unit',
            ]);

        $ids = $rows->pluck('id')->map(fn ($id) => (int)$id)->all();
        $lines = $ids
            ? DB::table('pmd_inventory_preparation_lines as l')
                ->leftJoin('pmd_inventory_items as i', 'i.id', '=', 'l.item_id')
                ->whereIn('l.preparation_id', $ids)
                ->get(['l.*', 'i.name as item_name', 'i.base_unit'])
                ->groupBy('preparation_id')
            : collect();

        return $rows->map(function ($row) use ($lines) {
            return [
                'id' => (int)$row->id,
                'name' => (string)$row->name,
                'output_item_id' => (int)$row->output_item_id,
                'output_item_name' => (string)($row->output_item_name ?? 'Output'),
                'output_qty' => round((float)$row->output_qty, 4),
                'output_unit' => (string)($row->output_unit ?? 'piece'),
                'lines' => collect($lines->get((int)$row->id, []))
                    ->map(static fn ($line) => [
                        'item_id' => (int)$line->item_id,
                        'item_name' => (string)($line->item_name ?? 'Item'),
                        'qty_input' => round((float)$line->qty_input, 4),
                        'unit' => (string)($line->base_unit ?? 'piece'),
                    ])
                    ->values()
                    ->all(),
            ];
        })->values()->all();
    }

    private function refreshPurchaseOrderStatus(int $orderId): void
    {
        $order = DB::table('pmd_inventory_purchase_orders')->where('id', $orderId)->first();
        if (!$order) {
            return;
        }

        $lines = DB::table('pmd_inventory_purchase_order_lines')
            ->where('purchase_order_id', $orderId)
            ->get();

        $anyReceived = false;
        $allReceived = !$lines->isEmpty();

        foreach ($lines as $line) {
            if ((float)$line->received_qty > 0) {
                $anyReceived = true;
            }
            if ((float)$line->received_qty + 0.00005 < (float)$line->ordered_qty) {
                $allReceived = false;
            }
        }

        $status = $allReceived ? 'received' : ($anyReceived ? 'partial' : (string)$order->status);
        if ($status === 'received') {
            $closedAt = now();
        } else {
            $closedAt = null;
        }

        DB::table('pmd_inventory_purchase_orders')
            ->where('id', $orderId)
            ->update([
                'status' => $status,
                'closed_at' => $closedAt,
                'updated_at' => now(),
            ]);
    }

    private function ensureDefaultStorage(int $locationId): int
    {
        $row = DB::table('pmd_inventory_storage_locations')
            ->where('location_id', $locationId)
            ->where('active', 1)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();

        if ($row) {
            if (empty($row->is_default)) {
                DB::table('pmd_inventory_storage_locations')
                    ->where('id', (int)$row->id)
                    ->update(['is_default' => 1, 'updated_at' => now()]);
            }
            return (int)$row->id;
        }

        return (int)DB::table('pmd_inventory_storage_locations')->insertGetId([
            'location_id' => $locationId,
            'name' => 'Main storage',
            'type' => 'storage',
            'is_default' => 1,
            'active' => 1,
            'created_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function settings(int $locationId, int $defaultStorageId): array
    {
        $row = DB::table('pmd_inventory_settings')
            ->where('location_id', $locationId)
            ->first();

        if (!$row) {
            DB::table('pmd_inventory_settings')->insert([
                'location_id' => $locationId,
                'consumption_trigger' => 'paid',
                'blind_counts' => 1,
                'low_stock_notifications' => 1,
                'expiry_warning_days' => 7,
                'default_storage_id' => $defaultStorageId ?: null,
                'auto_menu_availability' => 0,
                'updated_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $row = DB::table('pmd_inventory_settings')
                ->where('location_id', $locationId)
                ->first();
        } elseif (empty($row->default_storage_id) && $defaultStorageId > 0) {
            DB::table('pmd_inventory_settings')
                ->where('location_id', $locationId)
                ->update([
                    'default_storage_id' => $defaultStorageId,
                    'updated_at' => now(),
                ]);
            $row->default_storage_id = $defaultStorageId;
        }

        return [
            'consumption_trigger' => (string)($row->consumption_trigger ?? 'paid'),
            'blind_counts' => (bool)($row->blind_counts ?? true),
            'low_stock_notifications' => (bool)($row->low_stock_notifications ?? true),
            'expiry_warning_days' => (int)($row->expiry_warning_days ?? 7),
            'default_storage_id' => (int)($row->default_storage_id ?? 0),
            'auto_menu_availability' => (bool)($row->auto_menu_availability ?? false),
        ];
    }

    private function supplierRow($row): array
    {
        $days = json_decode((string)($row->delivery_days_json ?? '[]'), true);
        return [
            'id' => (int)$row->id,
            'name' => (string)$row->name,
            'account_ref' => (string)($row->account_ref ?? ''),
            'contact_name' => (string)($row->contact_name ?? ''),
            'email' => (string)($row->email ?? ''),
            'phone' => (string)($row->phone ?? ''),
            'lead_time_days' => (int)$row->lead_time_days,
            'min_order_value' => round((float)$row->min_order_value, 2),
            'delivery_days' => is_array($days) ? array_values($days) : [],
            'notes' => (string)($row->notes ?? ''),
        ];
    }

    private function identifierRow($row, array $supplierById): array
    {
        $supplierId = (int)($row->supplier_id ?? 0);
        return [
            'id' => (int)$row->id,
            'code' => (string)$row->code,
            'code_type' => (string)$row->code_type,
            'package_unit' => (string)$row->package_unit,
            'package_quantity' => round((float)$row->package_quantity, 4),
            'base_quantity' => round((float)$row->base_quantity, 4),
            'supplier_id' => $supplierId,
            'supplier_name' => (string)($supplierById[$supplierId]['name'] ?? ''),
            'supplier_item_code' => (string)($row->supplier_item_code ?? ''),
            'is_primary' => (bool)$row->is_primary,
            'source' => (string)$row->source,
            'verified_at' => $row->verified_at ? (string)$row->verified_at : null,
        ];
    }

    private function normalizeCode(string $value): string
    {
        $value = trim(preg_replace('/[\r\n\t]+/', '', $value) ?? '');
        if (preg_match('/^[0-9\s-]+$/', $value)) {
            $value = preg_replace('/[\s-]+/', '', $value) ?? $value;
        }
        return mb_substr($value, 0, 160);
    }

    private function detectCodeType(string $code): string
    {
        if (preg_match('/^https?:\/\//i', $code)) {
            return 'qr';
        }
        if (!ctype_digit($code)) {
            return 'internal';
        }

        return match (strlen($code)) {
            8 => 'gtin8',
            12 => 'upca',
            13 => 'ean13',
            14 => 'gtin14',
            default => 'internal',
        };
    }

    private function isValidGtin(string $code): bool
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

    private function supplierExists(int $locationId, int $supplierId): bool
    {
        return $supplierId > 0 && DB::table('pmd_inventory_suppliers')
            ->where('location_id', $locationId)
            ->where('id', $supplierId)
            ->where('active', 1)
            ->exists();
    }

    private function itemExists(int $locationId, int $itemId): bool
    {
        return $itemId > 0 && DB::table('pmd_inventory_items')
            ->where('location_id', $locationId)
            ->where('id', $itemId)
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

    private function location(int $locationId): int
    {
        $locationId = max(0, $locationId);
        if ($locationId < 1) {
            throw new InvalidArgumentException('No restaurant location is selected.');
        }
        return $locationId;
    }

    private function unit($value): string
    {
        $value = strtolower(trim((string)$value));
        return mb_substr($value !== '' ? $value : 'piece', 0, 30);
    }

    private function number($value, float $fallback = 0): float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return $fallback;
        }
        return round((float)$value, 4);
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

    private function date(string $value): string
    {
        $value = trim($value);
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)
            ? $value
            : now()->toDateString();
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

    private function numberLabel(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }
}
