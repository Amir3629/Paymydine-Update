<?php

namespace App\Services\PmdMobileSync;

use Admin\Models\Kds_stations_model;
use Admin\Models\Locations_model;
use Admin\Models\Menus_model;
use Admin\Models\Tables_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Admin\Services\PmdSharedFloorRegistryV1;
use App\Services\Platform\LocationPlatformContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Read-only bootstrap for the native Android local database.
 *
 * No browser session state is trusted here. Identity comes from
 * PmdMobileDeviceAuthService and all data is read from the active tenant DB.
 */
final class PmdMobileBootstrapService
{
    public const VERSION = 'pmd-mobile-bootstrap-v1';

    public function build(array $identity): array
    {
        $locationId = (int)$identity['location_id'];
        $location = Locations_model::query()->find($locationId);

        if (!$location) {
            throw new \RuntimeException('Restaurant location was not found.');
        }

        $platform = app(LocationPlatformContext::class)->state($locationId);
        $floors = $this->floors($locationId);
        $openOrders = $this->openOrders($locationId);

        return [
            'ok' => true,
            'version' => self::VERSION,
            'generated_at' => now()->toIso8601String(),
            'profile_expires_at' => now()->addHours(8)->toIso8601String(),
            'sync_protocol' => 'pmd-sync-v1',
            'tenant' => [
                'host' => request()->getHost(),
                'database' => $this->safeDatabaseName(),
            ],
            'location' => [
                'id' => $locationId,
                'name' => (string)($location->location_name ?? ''),
                'country_code' => $platform['country_code'] ?? null,
                'timezone' => $platform['profile']['timezone']
                    ?? setting('timezone', 'UTC'),
                'currency_code' => $platform['profile']['currency']['code']
                    ?? strtoupper((string)setting('default_currency_code', 'EUR')),
                'currency_minor_exponent' => $platform['profile']['currency']['minor_exponent']
                    ?? 2,
            ],
            'platform_context' => $platform,
            'identity' => [
                'device_id' => (int)$identity['device_id'],
                'user_id' => (int)$identity['user_id'],
                'staff_id' => (int)$identity['staff_id'],
                'staff_name' => (string)(
                    $identity['staff']->staff_name
                    ?? $identity['user']->staff_name
                    ?? $identity['user']->username
                    ?? ''
                ),
                'role_code' => (string)$identity['role_code'],
                'permissions' => $identity['permissions'],
                'surfaces' => $this->surfaces((string)$identity['role_code']),
            ],
            'floors' => $floors['floors'],
            'table_floor_map' => $floors['table_floor_map'],
            'tables' => $this->tables($locationId),
            'open_orders' => $openOrders,
            // PMD_ANDROID_OFFLINE_HISTORY_SNAPSHOT_V16
            // Quick POS history is carried in the same trusted restaurant
            // bootstrap so a verified POS session can inspect recent orders,
            // items, notes and payments after WAN loss without a second API.
            'history' => $this->recentHistory($locationId),
            'menu' => $this->menu($locationId),
            'kds_stations' => $this->kdsStations($locationId),
            'kds_statuses' => $this->kdsStatuses(),
            'payments' => [
                // Availability metadata only. Provider credentials never enter the app.
                'country_profile' => (array)($platform['profile']['payments'] ?? []),
                'terminal_profile' => (array)($platform['profile']['terminals'] ?? []),
                'offline_card_approval' => false,
            ],
            'edge' => $this->edgeMetadata($locationId),
            'sync' => [
                'cursor' => $this->currentCursor($locationId),
                'commands_enabled' => true,
                'certified_commands' => [
                    'ORDER_HOLD_V1',
                    'ORDER_SEND_V1',
                    'CASH_PAYMENT_V1',
                    'TABLE_STATE_V1',
                    'TABLE_MOVE_V1',
                    'KDS_STATUS_V1',
                ],
                'offline_payment_enabled' => false,
            ],
        ];
    }

    /**
     * PMD_ANDROID_OFFLINE_HISTORY_SNAPSHOT_V16
     *
     * A bounded, read-only Quick POS history projection for local Android use.
     * It deliberately carries display facts only; invoice/receipt/payment
     * mutation endpoints remain Cloud-only.
     */
    private function recentHistory(int $locationId): array
    {
        $dayStart = now()->startOfDay();

        $snapshot = [
            'version' => 'pmd-mobile-history-v2',
            'generated_at' => now()->toIso8601String(),
            'today_started_at' => $dayStart->toIso8601String(),
            'today_complete' => true,
            'entries' => [],
        ];

        if (!Schema::hasTable('orders')) {
            return $snapshot;
        }

        try {
            $orderColumns = Schema::getColumnListing('orders');
            $primaryKey = in_array('order_id', $orderColumns, true)
                ? 'order_id'
                : (in_array('id', $orderColumns, true) ? 'id' : null);

            if ($primaryKey === null) {
                return $snapshot;
            }

            $baseQuery = DB::table('orders');
            if (
                $locationId > 0
                && in_array('location_id', $orderColumns, true)
            ) {
                $baseQuery->where('location_id', $locationId);
            }

            $dateColumn = in_array('created_at', $orderColumns, true)
                ? 'created_at'
                : (
                    in_array('updated_at', $orderColumns, true)
                        ? 'updated_at'
                        : null
                );
            $sort = $dateColumn ?: $primaryKey;

            // PMD_ANDROID_OFFLINE_TODAY_HISTORY_V17
            // Carry the whole current restaurant day first. A bounded cap
            // prevents pathological payload growth while still covering a
            // high-volume service day. Older rows are only backfilled when
            // today contains fewer than the legacy 300-row history window.
            if ($dateColumn !== null) {
                $todayRows = (clone $baseQuery)
                    ->where($dateColumn, '>=', $dayStart->toDateTimeString())
                    ->orderByDesc($sort)
                    ->limit(1201)
                    ->get();

                if ($todayRows->count() > 1200) {
                    $snapshot['today_complete'] = false;
                    $todayRows = $todayRows->take(1200)->values();
                }

                $orders = $todayRows;

                if ($orders->count() < 300) {
                    $needed = 300 - $orders->count();
                    $older = (clone $baseQuery)
                        ->where($dateColumn, '<', $dayStart->toDateTimeString())
                        ->orderByDesc($sort)
                        ->limit($needed)
                        ->get();
                    $orders = $orders->concat($older)->values();
                }
            } else {
                $orders = $baseQuery
                    ->orderByDesc($sort)
                    ->limit(300)
                    ->get();
            }

            if ($orders->isEmpty()) {
                return $snapshot;
            }

            $orderIds = $orders
                ->map(function ($row) use ($primaryKey) {
                    $raw = (array)$row;
                    return (int)($raw['order_id']
                        ?? $raw['id']
                        ?? $raw[$primaryKey]
                        ?? 0);
                })
                ->filter()
                ->values()
                ->all();

            $itemsByOrder = collect();
            if ($orderIds && Schema::hasTable('order_menus')) {
                $itemColumns = Schema::getColumnListing('order_menus');
                if (in_array('order_id', $itemColumns, true)) {
                    $itemsByOrder = DB::table('order_menus')
                        ->whereIn('order_id', $orderIds)
                        ->orderBy('order_id')
                        ->get()
                        ->groupBy(function ($row) {
                            return (int)($row->order_id ?? 0);
                        });
                }
            }

            $notesByOrder = collect();
            if ($orderIds && Schema::hasTable('order_notes')) {
                $noteColumns = Schema::getColumnListing('order_notes');
                if (in_array('order_id', $noteColumns, true)) {
                    $notesByOrder = DB::table('order_notes')
                        ->whereIn('order_id', $orderIds)
                        ->get()
                        ->groupBy(function ($row) {
                            return (int)($row->order_id ?? 0);
                        });
                }
            }

            $paymentsByOrder = collect();
            if (
                $orderIds
                && Schema::hasTable('order_payment_transactions')
                && Schema::hasColumn(
                    'order_payment_transactions',
                    'order_id'
                )
            ) {
                $paymentsByOrder = DB::table('order_payment_transactions')
                    ->whereIn('order_id', $orderIds)
                    ->get()
                    ->groupBy(function ($row) {
                        return (int)($row->order_id ?? 0);
                    });
            }

            $statusNames = [];
            if (
                Schema::hasTable('statuses')
                && Schema::hasColumn('statuses', 'status_id')
                && Schema::hasColumn('statuses', 'status_name')
            ) {
                $statusNames = DB::table('statuses')
                    ->pluck('status_name', 'status_id')
                    ->mapWithKeys(function ($name, $id) {
                        return [(int)$id => (string)$name];
                    })
                    ->all();
            }

            $entries = [];
            foreach ($orders as $order) {
                $raw = (array)$order;
                $orderId = (int)($raw['order_id']
                    ?? $raw['id']
                    ?? $raw[$primaryKey]
                    ?? 0);
                if ($orderId < 1) {
                    continue;
                }

                $tableId = (int)(
                    $raw['table_id']
                    ?? $raw['location_table_id']
                    ?? 0
                );
                $statusId = (int)($raw['status_id'] ?? 0);
                $statusName = trim((string)($statusNames[$statusId] ?? ''));
                $settlement = trim((string)(
                    $raw['settlement_status']
                    ?? $raw['payment_status']
                    ?? ''
                ));
                $total = (float)(
                    $raw['order_total']
                    ?? $raw['total']
                    ?? 0
                );
                // PMD_ANDROID_HISTORY_BUSINESS_TIME_V18
                // History is ordered/displayed by when the order was created,
                // never by the later WAN-reconciliation update timestamp.
                $time = (string)(
                    $raw['created_at']
                    ?? $raw['updated_at']
                    ?? ''
                );
                if ($time !== '') {
                    try {
                        $time = \Carbon\Carbon::parse(
                            $time,
                            now()->getTimezone()
                        )->toIso8601String();
                    } catch (\Throwable $ignored) {
                        // Keep the raw database value only as a last-resort
                        // display fallback. Sorting still has strtotime below.
                    }
                }

                $itemRows = collect(
                    $itemsByOrder->get($orderId, collect())
                );
                $items = [];
                foreach ($itemRows as $item) {
                    $itemRaw = (array)$item;
                    $name = trim((string)(
                        $itemRaw['name']
                        ?? $itemRaw['menu_name']
                        ?? 'Item'
                    ));
                    $quantity = max(1, (int)(
                        $itemRaw['quantity']
                        ?? $itemRaw['qty']
                        ?? 1
                    ));
                    $note = trim((string)(
                        $itemRaw['comment']
                        ?? $itemRaw['note']
                        ?? ''
                    ));
                    $items[] = [
                        'menu_id' => (int)(
                            $itemRaw['menu_id']
                            ?? $itemRaw['menu_item_id']
                            ?? 0
                        ) ?: null,
                        'name' => $name !== '' ? $name : 'Item',
                        'quantity' => $quantity,
                        'note' => $note,
                    ];
                }

                $summary = collect($items)
                    ->take(8)
                    ->map(function ($item) {
                        return (int)$item['quantity'].'× '.(string)$item['name'];
                    })
                    ->implode(', ');
                if (count($items) > 8) {
                    $summary .= ' +'.(count($items) - 8);
                }

                $payments = [];
                foreach (
                    collect($paymentsByOrder->get($orderId, collect()))
                    as $payment
                ) {
                    $paymentRaw = (array)$payment;
                    $payments[] = [
                        'time' => (string)(
                            $paymentRaw['paid_at']
                            ?? $paymentRaw['created_at']
                            ?? ''
                        ),
                        'method' => (string)(
                            $paymentRaw['payment_method']
                            ?? 'payment'
                        ),
                        'amount' => (float)($paymentRaw['amount'] ?? 0),
                        'tip_amount' => (float)(
                            $paymentRaw['tip_amount']
                            ?? 0
                        ),
                        'reference' => trim((string)(
                            $paymentRaw['payment_reference']
                            ?? ''
                        )),
                    ];
                }

                $notes = [];
                $orderComment = trim((string)($raw['comment'] ?? ''));
                if ($orderComment !== '') {
                    $notes[] = $orderComment;
                }
                foreach (
                    collect($notesByOrder->get($orderId, collect()))
                    as $noteRow
                ) {
                    $noteRaw = (array)$noteRow;
                    $note = trim((string)(
                        $noteRaw['note']
                        ?? $noteRaw['comment']
                        ?? ''
                    ));
                    if ($note !== '') {
                        $notes[] = $note;
                    }
                }
                foreach ($items as $item) {
                    if ((string)$item['note'] !== '') {
                        $notes[] = (string)$item['name'].': '.(string)$item['note'];
                    }
                }
                $notes = array_values(array_unique($notes));

                $entries[] = [
                    'kind' => 'order',
                    'time' => $time,
                    'title' => 'Order #'.$orderId,
                    'order_id' => $orderId,
                    'table_id' => $tableId ?: null,
                    'total' => $total,
                    'status' => $statusName,
                    'settlement_status' => $settlement,
                    'item_count' => count($items),
                    'item_summary' => $summary,
                    'items' => $items,
                    'notes' => $notes,
                    'payments' => $payments,
                ];
            }

            usort($entries, function (array $left, array $right): int {
                $a = strtotime((string)($left['time'] ?? '')) ?: 0;
                $b = strtotime((string)($right['time'] ?? '')) ?: 0;
                return $b <=> $a;
            });

            $snapshot['entries'] = $entries;
        } catch (\Throwable $error) {
            report($error);
        }

        return $snapshot;
    }

    private function menu(int $locationId): array
    {
        $with = ['categories', 'menu_options.menu_option_values.option_value'];

        if (Schema::hasTable('allergens') && Schema::hasTable('allergenables')) {
            $with[] = 'allergens';
        }
        if (Schema::hasTable('menu_images')) {
            $with[] = 'menu_images';
        }

        $query = Menus_model::with($with)
            ->whereHasOrDoesntHaveLocation($locationId)
            ->where('menu_status', 1)
            ->orderByRaw('COALESCE(menu_priority, 999999) ASC')
            ->orderBy('menu_name');

        if (Schema::hasColumn('menus', 'is_stock_out')) {
            $query->where(function ($q) {
                $q->whereNull('is_stock_out')->orWhere('is_stock_out', 0);
            });
        }

        $categories = [];
        $items = [];

        foreach ($query->limit(750)->get() as $menu) {
            $categoryIds = [];
            $categoryNames = [];

            foreach (($menu->categories ?: collect()) as $category) {
                if (isset($category->status) && !(bool)$category->status) {
                    continue;
                }

                $id = (int)($category->category_id ?? $category->getKey());
                if ($id < 1) continue;

                $name = trim((string)($category->name ?? $category->category_name ?? 'Menu'));
                $categories[$id] = ['id' => $id, 'name' => $name ?: 'Menu'];
                $categoryIds[] = $id;
                if ($name !== '') $categoryNames[] = $name;
            }

            $options = [];
            foreach (($menu->menu_options ?: collect()) as $option) {
                $values = [];
                foreach (($option->menu_option_values ?: collect()) as $value) {
                    $valueId = (int)($value->menu_option_value_id ?? $value->getKey());
                    if ($valueId < 1) continue;

                    $values[] = [
                        'id' => $valueId,
                        'name' => (string)(
                            $value->name
                            ?? optional($value->option_value)->value
                            ?? 'Option'
                        ),
                        'price' => round((float)($value->price ?? $value->new_price ?? 0), 4),
                        'default' => (bool)($value->is_default ?? false),
                    ];
                }

                if ($values) {
                    $options[] = [
                        'id' => (int)($option->menu_option_id ?? $option->getKey()),
                        'name' => (string)(
                            $option->option_name
                            ?? optional($option->option)->option_name
                            ?? 'Options'
                        ),
                        'required' => (bool)($option->required ?? false),
                        'min' => (int)($option->min_selected ?? 0),
                        'max' => max(1, (int)($option->max_selected ?? 1)),
                        'display_type' => (string)($option->display_type ?? 'radio'),
                        'values' => $values,
                    ];
                }
            }

            $allergens = [];
            if (isset($menu->allergens)) {
                foreach (($menu->allergens ?: collect()) as $allergen) {
                    if (isset($allergen->status) && !(bool)$allergen->status) continue;
                    $name = trim((string)($allergen->name ?? $allergen->allergen_name ?? ''));
                    if ($name === '') continue;

                    $allergens[] = [
                        'id' => (int)($allergen->allergen_id ?? $allergen->getKey()),
                        'name' => $name,
                    ];
                }
            }

            $images = $this->menuImages($menu);
            $price = round((float)$menu->menu_price, 4);

            $items[] = [
                'id' => (int)$menu->getKey(),
                'name' => (string)$menu->menu_name,
                'description' => trim(strip_tags((string)($menu->menu_description ?? ''))),
                'price' => $price,
                'price_configured' => $price > 0,
                'orderable' => $price > 0,
                'category_ids' => $categoryIds,
                'category_names' => array_values(array_unique($categoryNames)),
                'options' => $options,
                'has_options' => count($options) > 0,
                'minimum_qty' => max(1, (int)($menu->minimum_qty ?? 1)),
                'prep_minutes' => (int)($menu->prep_time_minutes ?? 0),
                'images' => $images,
                'image' => $images[0] ?? null,
                'allergens' => $allergens,
                'halal' => (bool)($menu->is_halal ?? false),
                'vegetarian' => (bool)($menu->is_vegetarian ?? false),
                'vegan' => (bool)($menu->is_vegan ?? false),
                'updated_at' => optional($menu->updated_at)->toIso8601String(),
            ];
        }

        return [
            'categories' => array_values($categories),
            'items' => $items,
        ];
    }

    private function menuImages($menu): array
    {
        $images = [];

        try {
            if (method_exists($menu, 'getThumb')) {
                $thumb = trim((string)$menu->getThumb());
                if ($thumb !== '') $images[] = $thumb;
            }
        } catch (\Throwable $error) {
        }

        if (isset($menu->menu_images)) {
            foreach (($menu->menu_images ?: collect()) as $image) {
                $path = trim((string)($image->image_path ?? $image->path ?? ''));
                if ($path !== '') $images[] = $path;
            }
        }

        return array_values(array_unique(array_filter($images)));
    }

    private function tables(int $locationId): array
    {
        $versionMap = [];
        if (Schema::hasTable('pmd_sync_aggregate_versions')) {
            try {
                $versionMap = DB::table('pmd_sync_aggregate_versions')
                    ->where('location_id', $locationId)
                    ->where('aggregate', 'table')
                    ->pluck('version', 'aggregate_id')
                    ->mapWithKeys(function ($version, $aggregateId) {
                        return [(string)$aggregateId => (int)$version];
                    })
                    ->all();
            } catch (\Throwable $error) {
                $versionMap = [];
            }
        }

        return Tables_model::query()
            ->whereHasOrDoesntHaveLocation($locationId)
            ->isEnabled()
            ->orderBy('priority')
            ->orderBy('table_id')
            ->limit(500)
            ->get()
            ->map(function ($table) use ($versionMap) {
                $tableId = (int)$table->getKey();

                return [
                    'id' => $tableId,
                    'aggregate_version' => (int)(
                        $versionMap['table:'.$tableId]
                        ?? 0
                    ),
                    'number' => (string)($table->table_no ?? $table->getKey()),
                    'name' => (string)($table->table_name ?? ''),
                    'section' => (string)($table->table_section ?? ''),
                    'capacity' => (int)(
                        $table->preferred_capacity
                        ?? $table->max_capacity
                        ?? 0
                    ),
                    'operational_status' => (string)($table->operational_status ?? 'available'),
                    'floor_name' => (string)($table->floor_name ?? ''),
                    'floor' => [
                        'x' => $table->floor_x === null ? null : (float)$table->floor_x,
                        'y' => $table->floor_y === null ? null : (float)$table->floor_y,
                        'width' => $table->floor_width === null ? null : (float)$table->floor_width,
                        'height' => $table->floor_height === null ? null : (float)$table->floor_height,
                        'shape' => (string)($table->floor_shape ?? ''),
                    ],
                    'updated_at' => optional($table->updated_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    private function floors(int $locationId): array
    {
        try {
            $snapshot = app(PmdSharedFloorRegistryV1::class)->snapshot($locationId);
            return [
                'floors' => array_values((array)($snapshot['floors'] ?? [])),
                'table_floor_map' => (array)($snapshot['table_floor_map'] ?? []),
            ];
        } catch (\Throwable $error) {
            return ['floors' => [], 'table_floor_map' => []];
        }
    }

    private function kdsStations(int $locationId): array
    {
        if (!Schema::hasTable('kds_stations')) return [];

        $query = Kds_stations_model::query()
            ->where(function ($q) use ($locationId) {
                $q->whereNull('location_id')
                    ->orWhere('location_id', $locationId);
            })
            ->ordered();

        return $query->get()->map(function ($station) {
            return [
                'id' => (int)$station->getKey(),
                'name' => (string)$station->name,
                'slug' => (string)$station->slug,
                'category_ids' => array_values((array)$station->category_ids),
                'status_ids' => array_values((array)$station->status_ids),
                'can_change_status' => (bool)$station->can_change_status,
                'station_type' => (string)($station->station_type ?? 'kitchen'),
                'location_id' => $station->location_id === null
                    ? null
                    : (int)$station->location_id,
            ];
        })->values()->all();
    }

    /**
     * Open financially-editable table bills used to seed the local-first POS.
     *
     * This intentionally mirrors the Waiter POS structural-open rules: kitchen
     * completion is not financial closure, but cancellation/settlement/payment
     * activity makes the bill non-editable.
     */
    private function openOrders(int $locationId): array
    {
        if (!Schema::hasTable('orders')) return [];

        $columns = Schema::getColumnListing('orders');
        $pk = in_array('order_id', $columns, true) ? 'order_id' : 'id';
        if (!in_array($pk, $columns, true)) return [];

        $query = DB::table('orders');

        if (in_array('location_id', $columns, true)) {
            $query->where('location_id', $locationId);
        }

        if (in_array('table_id', $columns, true)) {
            $query->whereNotNull('table_id')->where('table_id', '>', 0);
        } else {
            // Native table continuation needs an unambiguous table identity.
            return [];
        }

        $cancelled = array_values(array_filter(array_map('intval', [
            setting('canceled_order_status'),
        ])));
        if ($cancelled && in_array('status_id', $columns, true)) {
            $query->whereNotIn('status_id', $cancelled);
        }

        if (in_array('settled_amount', $columns, true)) {
            $query->where(function ($q) {
                $q->whereNull('settled_amount')
                    ->orWhere('settled_amount', '<=', 0.0001);
            });
        }

        $financialColumn = in_array('settlement_status', $columns, true)
            ? 'settlement_status'
            : (
                in_array('payment_status', $columns, true)
                    ? 'payment_status'
                    : null
            );

        if ($financialColumn) {
            $query->where(function ($q) use ($financialColumn) {
                $q->whereNull($financialColumn)
                    ->orWhereNotIn($financialColumn, [
                        'partial',
                        'paid',
                        'settled',
                        'closed',
                        'cancelled',
                        'canceled',
                        'failed',
                        'refunded',
                    ]);
            });
        }

        if (
            Schema::hasTable('order_payment_transactions')
            && Schema::hasColumn('order_payment_transactions', 'order_id')
        ) {
            $query->whereNotExists(function ($q) use ($pk) {
                $q->select(DB::raw(1))
                    ->from('order_payment_transactions as pmd_payment_tx')
                    ->whereColumn(
                        'pmd_payment_tx.order_id',
                        'orders.'.$pk
                    );
            });
        }

        $rows = $query
            ->orderByDesc($pk)
            ->limit(500)
            ->get();

        if ($rows->isEmpty()) return [];

        // PMD_ANDROID_CANONICAL_OPEN_ORDER_ITEMS_V18
        // The canonical Quick POS "Sent" area must remain identical offline.
        // Carry the same order line facts in the trusted restaurant snapshot so
        // selecting a table after WAN loss still shows its sent items, notes,
        // quantities and prices instead of only a total.
        $rowOrderIds = $rows
            ->map(function ($row) use ($pk) {
                $raw = (array)$row;
                return (int)($raw[$pk] ?? 0);
            })
            ->filter()
            ->values()
            ->all();

        $itemsByOrder = collect();
        if ($rowOrderIds && Schema::hasTable('order_menus')) {
            $itemColumns = Schema::getColumnListing('order_menus');

            if (in_array('order_id', $itemColumns, true)) {
                $itemsByOrder = DB::table('order_menus')
                    ->whereIn('order_id', $rowOrderIds)
                    ->orderBy('order_id')
                    ->get()
                    ->groupBy(function ($item) {
                        return (int)($item->order_id ?? 0);
                    });
            }
        }

        $statusMap = [];
        if (Schema::hasTable('statuses')) {
            try {
                $statusMap = DB::table('statuses')
                    ->pluck('status_name', 'status_id')
                    ->mapWithKeys(function ($name, $id) {
                        return [(int)$id => (string)$name];
                    })
                    ->all();
            } catch (\Throwable $error) {
                $statusMap = [];
            }
        }

        $versionMap = [];
        if (Schema::hasTable('pmd_sync_aggregate_versions')) {
            try {
                $versionMap = DB::table('pmd_sync_aggregate_versions')
                    ->where('location_id', $locationId)
                    ->where('aggregate', 'order')
                    ->pluck('version', 'aggregate_id')
                    ->mapWithKeys(function ($version, $aggregateId) {
                        return [(string)$aggregateId => (int)$version];
                    })
                    ->all();
            } catch (\Throwable $error) {
                $versionMap = [];
            }
        }

        // PMD_ANDROID_CANONICAL_MULTI_CHECK_SNAPSHOT_V18
        // Canonical Quick POS supports multiple financially-open checks on the
        // same table. Carry every open check into the trusted tablet snapshot
        // so the offline check rail is the same product, not a reduced view.
        $out = [];

        foreach ($rows as $row) {
            $r = (array)$row;
            $orderId = (int)($r[$pk] ?? 0);
            $tableId = (int)($r['table_id'] ?? 0);
            if ($orderId < 1 || $tableId < 1) {
                continue;
            }

            $aggregateId = 'order:'.$orderId;
            $statusId = (int)($r['status_id'] ?? 0);

            $orderItems = collect(
                $itemsByOrder->get($orderId, collect())
            )->map(function ($item) {
                $rawItem = (array)$item;

                return [
                    'order_menu_id' => (int)(
                        $rawItem['order_menu_id']
                        ?? $rawItem['id']
                        ?? 0
                    ),
                    'menu_id' => (int)(
                        $rawItem['menu_id']
                        ?? 0
                    ),
                    'name' => (string)(
                        $rawItem['name']
                        ?? $rawItem['menu_name']
                        ?? 'Item'
                    ),
                    'quantity' => max(
                        1,
                        (int)(
                            $rawItem['quantity']
                            ?? $rawItem['qty']
                            ?? 1
                        )
                    ),
                    'price' => (float)(
                        $rawItem['price']
                        ?? $rawItem['unit_price']
                        ?? 0
                    ),
                    'subtotal' => (float)(
                        $rawItem['subtotal']
                        ?? 0
                    ),
                    'comment' => trim((string)(
                        $rawItem['comment']
                        ?? $rawItem['note']
                        ?? ''
                    )),
                ];
            })->values()->all();

            $out[] = [
                'order_id' => $orderId,
                'aggregate_id' => $aggregateId,
                'aggregate_version' => (int)($versionMap[$aggregateId] ?? 0),
                'table_id' => $tableId,
                'status_id' => $statusId ?: null,
                'status_name' => (string)($statusMap[$statusId] ?? ''),
                'settlement_status' => (string)(
                    $r['settlement_status']
                    ?? $r['payment_status']
                    ?? 'unpaid'
                ),
                'settled_amount' => (float)($r['settled_amount'] ?? 0),
                'order_total' => (float)($r['order_total'] ?? $r['total'] ?? 0),
                'total_items' => (int)($r['total_items'] ?? 0),
                'guest_count' => max(1, (int)($r['guest_count'] ?? 1)),
                'comment' => (string)($r['comment'] ?? ''),
                'updated_at' => (string)($r['updated_at'] ?? ''),
                'items' => $orderItems,
            ];
        }

        return $out;
    }

    private function kdsStatuses(): array
    {
        if (!Schema::hasTable('statuses')) return [];

        try {
            return DB::table('statuses')
                ->where('status_for', 'order')
                ->whereIn('status_name', [
                    'Received',
                    'Preparation',
                    'Delivery',
                ])
                ->get([
                    'status_id',
                    'status_name',
                    'status_color',
                ])
                ->map(function ($status) {
                    return [
                        'status_id' => (int)$status->status_id,
                        'status_name' => (string)$status->status_name,
                        'display_name' =>
                            $status->status_name === 'Preparation'
                                ? 'Preparing'
                                : (
                                    $status->status_name === 'Delivery'
                                        ? 'Ready'
                                        : (string)$status->status_name
                                ),
                        'status_color' =>
                            (string)($status->status_color ?? ''),
                    ];
                })
                ->values()
                ->all();
        } catch (\Throwable $error) {
            return [];
        }
    }

    private function surfaces(string $roleCode): array
    {
        $roles = PmdDefaultStaffRoleService::class;

        if ($roleCode === $roles::OWNER || $roleCode === $roles::MANAGER) {
            return ['manager', 'orders', 'pos', 'waiter', 'kds', 'reservations'];
        }
        if ($roleCode === $roles::CASHIER) return ['orders', 'pos'];
        if ($roleCode === $roles::WAITER) return ['waiter', 'pos'];
        if (str_starts_with($roleCode, $roles::KDS_PREFIX)) return ['kds'];
        if ($roleCode === $roles::RESERVATIONS) return ['reservations'];
        if ($roleCode === $roles::ACCOUNTANT) return ['accountant'];

        return ['mywork'];
    }

    private function edgeMetadata(int $locationId): ?array
    {
        if (!Schema::hasTable('pmd_mobile_edges')) {
            return null;
        }

        try {
            $edge = DB::table('pmd_mobile_edges')
                ->where('location_id', $locationId)
                ->where('is_active', 1)
                ->where(
                    'last_seen_at',
                    '>=',
                    now()->subMinutes(2)
                )
                ->first();

            if (!$edge) {
                return null;
            }

            return [
                'device_id' => (int)$edge->device_id,
                'fingerprint_sha256' =>
                    strtolower((string)$edge->fingerprint_sha256),
                'port' => (int)$edge->port,
                'protocol' => (string)$edge->protocol,
                'last_seen_at' => $edge->last_seen_at
                    ? (string)$edge->last_seen_at
                    : null,
            ];
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function currentCursor(int $locationId): int
    {
        if (!Schema::hasTable('pmd_sync_events')) return 0;

        return (int)(
            DB::table('pmd_sync_events')
                ->where('location_id', $locationId)
                ->max('sequence')
            ?? 0
        );
    }

    private function safeDatabaseName(): ?string
    {
        try {
            return (string)DB::connection()->getDatabaseName();
        } catch (\Throwable $error) {
            return null;
        }
    }
}
