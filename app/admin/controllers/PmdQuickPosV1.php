<?php

namespace Admin\Controllers;

use Admin\Facades\AdminLocation;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Tables_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Admin\Services\PmdRoleLandingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * PMD Quick POS V1
 *
 * A dedicated restaurant POS surface. UI state is intentionally separate from
 * CashierLab/Clean Workspace, while order, kitchen, payment and table lifecycle
 * authorities remain the proven PmdWaiterPosV1 implementation.
 */
class PmdQuickPosV1 extends PmdWaiterPosV1
{
    protected $requiredPermissions = 'Admin.Orders';

    public function index($mode = 'cashier')
    {
        $mode = $this->quickPosMode((string)$mode);

        // PMD_QPOS_INLINE_BOOTSTRAP_V1
        // The first HTML response already contains the authoritative POS
        // catalogue/table payload. The browser paints the final layout once
        // instead of painting a shell and waiting for a second bootstrap GET.
        $initialBootstrap = $this->quickPosBootstrapPayload($mode);

        return view()->file(
            base_path('app/admin/views/pmd_quick_pos_v1.blade.php'),
            [
                'mode' => $mode,
                'initialBootstrap' => $initialBootstrap,
            ]
        );
    }

    public function bootstrap($mode = 'cashier')
    {
        return response()->json(
            $this->quickPosBootstrapPayload(
                $this->quickPosMode((string)$mode)
            )
        );
    }

    protected function quickPosBootstrapPayload(string $mode): array
    {
        $mode = $this->quickPosMode($mode);
        $locationId = $this->quickPosLocationId();

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pos_entry'
        );

        $menu = $this->menuPayload($locationId);

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pos_menu'
        );

        // PMD_QPOS_CANONICAL_FLOORS_V1
        // Reuse the shared floor registry/assignment authority. Legacy
        // tables.floor_name is deliberately not treated as authoritative.
        $floorService = app(
            \Admin\Services\PmdSharedFloorRegistryV1::class
        );

        try {
            $floorSnapshot = $floorService->snapshot($locationId);
        } catch (\Throwable $error) {
            $floorSnapshot = [
                'floors' => [[
                    'id' => $floorService->defaultFloorId(),
                    'name' => 'Main Floor',
                    'is_default' => true,
                    'sort' => 0,
                ]],
                'table_assignments' => [],
            ];
        }

        $floors = array_values(array_map(
            static function ($floor): array {
                return [
                    'id' => (string)($floor['id'] ?? ''),
                    'name' => trim((string)($floor['name'] ?? '')) ?: 'Floor',
                    'is_default' => !empty($floor['is_default']),
                    'sort' => (int)($floor['sort'] ?? 0),
                ];
            },
            (array)($floorSnapshot['floors'] ?? [])
        ));

        if (!$floors) {
            $floors[] = [
                'id' => $floorService->defaultFloorId(),
                'name' => 'Main Floor',
                'is_default' => true,
                'sort' => 0,
            ];
        }

        $defaultFloorId = '';
        foreach ($floors as $floor) {
            if (!empty($floor['is_default'])) {
                $defaultFloorId = (string)$floor['id'];
                break;
            }
        }
        if ($defaultFloorId === '') {
            $defaultFloorId = (string)$floors[0]['id'];
        }

        $floorCookieName = 'pmd_qpos_floor_v1_'.$locationId;
        $requestedFloorId = trim((string)request()->cookie(
            $floorCookieName,
            ''
        ));
        $activeFloor = $floorService->activeFloor(
            $floors,
            $requestedFloorId
        );
        $activeFloorId = trim((string)($activeFloor['id'] ?? ''));
        if ($activeFloorId === '') {
            $activeFloorId = $defaultFloorId;
        }

        $tables = $this->quickPosTables(
            $locationId,
            $floorSnapshot,
            $defaultFloorId
        );

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pos_tables'
        );

        $user = $this->currentUser();

        return [
            'ok' => true,
            'version' => 'pmd-quick-pos-v1',
            'mode' => $mode,
            'can_switch_mode' => $this->quickPosCanSwitchMode(),
            'location_id' => $locationId,
            'user' => [
                'id' => $user ? (int)$user->getKey() : null,
                'name' => $user
                    ? (string)($user->name ?? $user->username ?? $user->email ?? 'Staff')
                    : 'Staff',
                'role' => $this->quickPosRoleCode(),
            ],
            'profile' => $this->quickPosProfilePayload(),
            'permissions' => [
                'orders' => true,
                'payments' => $this->canManagePayments(),
            ],
            'floors' => $floors,
            'default_floor_id' => $defaultFloorId,
            'active_floor_id' => $activeFloorId,
            'floor_cookie_name' => $floorCookieName,
            'tables' => $tables,
            'categories' => array_values((array)($menu['categories'] ?? [])),
            'menu_items' => array_values((array)($menu['items'] ?? [])),
            'warnings' => [
                'unconfigured_price_items' => (int)($menu['unconfigured_price_items'] ?? 0),
            ],
            'settings' => [
                'currency' => $this->currencySymbol(),
                'currency_code' => $this->currencyCode(),
                'table_data_url' => '/admin/pos/table/{table}',
                'table_save_url' => '/admin/pos/save/{table}',
                'off_premise_save_url' => '/admin/pos/save-off-premise',
                'payment_summary_url' => '/admin/pos/payment-summary/{order}',
                'payment_settle_url' => '/admin/pos/payment-settle/{order}',
                'payment_coupon_url' => '/admin/pmd-waiter-pos-v1/payment-coupon/{order}',
                'terminal_payment_url' => '/admin/pmd-waiter-pos-v1/terminal-payment/{order}',
                'terminal_attempts_url' => '/admin/orders/{order}/terminal-payment-attempts',
                'terminal_refresh_url' => '/admin/terminal-payments/attempts/{attempt}/refresh',
                'table_state_url' => '/admin/pmd-waiter-table-states-v154/{table}',
                'history_url' => '/admin/pos/history',
            ],
        ];
    }

    public function paymentSummary($orderId = null)
    {
        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pay_summary_entry'
        );

        $response = parent::paymentSummary($orderId);

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pay_summary_response'
        );

        return $response;
    }

    public function settlePayment($orderId = null)
    {
        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pay_settle_entry'
        );

        $response = parent::settlePayment($orderId);

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pay_settle_response'
        );

        return $response;
    }

    public function save($tableId = null)
    {
        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_save_entry'
        );

        $response = parent::save($tableId);

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_save_response'
        );

        return $response;
    }

    protected function recalculateOrder(Orders_model $order): void
    {
        parent::recalculateOrder($order);

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_save_recalculate'
        );
    }

    protected function recordWaiterPosNoteHistoryV26(
        Orders_model $order,
        array $cart,
        string $orderNote,
        string $mode
    ): void {
        parent::recordWaiterPosNoteHistoryV26(
            $order,
            $cart,
            $orderNote,
            $mode
        );

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_save_note_history'
        );
    }

    protected function markTableOccupiedForWaiterOrderV154(
        array $table,
        $order
    ): void {
        parent::markTableOccupiedForWaiterOrderV154(
            $table,
            $order
        );

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_save_table_state'
        );
    }

    /**
     * PMD_QUICK_POS_FAST_WRITE_V2
     *
     * The legacy waiter save contract stays authoritative, but Quick POS uses
     * this controller so protected persistence hooks can be optimized without
     * changing legacy Waiter POS behavior.
     */
    protected function appendItems(Orders_model $order, array $cart): int
    {
        $rows = array_values(array_filter($cart, 'is_array'));
        if (!$rows) {
            return 0;
        }

        $menuIds = array_values(array_unique(array_filter(array_map(
            static function ($row): int {
                return (int)($row['menu_id'] ?? $row['id'] ?? 0);
            },
            $rows
        ))));

        if (!$menuIds) {
            return 0;
        }

        $menuModel = new Menus_model();
        $menuKey = $menuModel->getKeyName();

        $menus = Menus_model::with(
            'menu_options.menu_option_values.option_value'
        )
            ->whereIn($menuKey, $menuIds)
            ->get()
            ->keyBy(function ($menu) {
                return (int)$menu->getKey();
            });

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_save_menu_hydrate'
        );

        $hasStockOut = $this->pmdPosHasColumn('menus', 'is_stock_out');
        $orderMenuColumns = $this->pmdPosColumns('order_menus');
        $orderMenuColumnMap = array_flip($orderMenuColumns);

        $hasOptionTable = $this->pmdPosHasTable('order_menu_options');
        $optionColumnMap = $hasOptionTable
            ? array_flip($this->pmdPosColumns('order_menu_options'))
            : [];

        $added = 0;
        $optionInserts = [];

        foreach ($rows as $row) {
            $menuId = (int)($row['menu_id'] ?? $row['id'] ?? 0);
            $qty = max(1, min(99, (int)($row['quantity'] ?? $row['qty'] ?? 1)));

            if ($menuId < 1) {
                continue;
            }

            $menu = $menus->get($menuId);

            if (!$menu || !(bool)$menu->menu_status) {
                continue;
            }

            if ($hasStockOut && (bool)$menu->is_stock_out) {
                continue;
            }

            $basePrice = (float)$menu->menu_price;
            if ($basePrice <= 0) {
                continue;
            }

            $optionRows = $this->validatedOptions(
                $menu,
                $row['options'] ?? []
            );

            $optionUnit = array_sum(array_map(
                static fn ($option): float => (float)$option['price'],
                $optionRows
            ));

            $unit = round($basePrice + $optionUnit, 4);

            $insert = array_intersect_key([
                'order_id' => (int)$order->getKey(),
                'menu_id' => $menuId,
                'name' => (string)$menu->menu_name,
                'quantity' => $qty,
                'price' => $unit,
                'subtotal' => round($unit * $qty, 4),
                'comment' => trim((string)($row['comment'] ?? '')),
                'option_values' => serialize(
                    array_column($optionRows, 'value_id')
                ),
            ], $orderMenuColumnMap);

            $orderMenuId = DB::table('order_menus')->insertGetId($insert);

            if ($hasOptionTable && $optionRows) {
                foreach ($optionRows as $option) {
                    $optionInserts[] = array_intersect_key([
                        'order_menu_id' => $orderMenuId,
                        'order_id' => (int)$order->getKey(),
                        'menu_id' => $menuId,
                        'order_menu_option_id' => (int)$option['option_id'],
                        'menu_option_value_id' => (int)$option['value_id'],
                        'order_option_name' => (string)$option['name'],
                        'order_option_price' => (float)$option['price'],
                        'quantity' => $qty,
                    ], $optionColumnMap);
                }
            }

            $added++;
        }

        if ($optionInserts) {
            DB::table('order_menu_options')->insert($optionInserts);
        }

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_save_items_inserted'
        );

        return $added;
    }

    /**
     * Kitchen ETA is informative, not part of the write acknowledgement.
     * Defer it until after the HTTP response so Send feels instant while the
     * exact same order write remains transactional and authoritative.
     */
    protected function pmdKitchenEtaAfterSendV1(
        int $orderId,
        array $cart,
        string $reason
    ): array {
        $items = [];

        foreach ($cart as $row) {
            if (!is_array($row)) {
                continue;
            }

            $menuId = (int)($row['menu_id'] ?? $row['id'] ?? 0);
            if ($menuId < 1) {
                continue;
            }

            $items[] = [
                'menu_id' => $menuId,
                'quantity' => max(
                    1,
                    (int)($row['quantity'] ?? $row['qty'] ?? 1)
                ),
            ];
        }

        try {
            app()->terminating(function () use (
                $orderId,
                $items,
                $reason
            ) {
                try {
                    app(
                        \App\Services\PmdKitchenEtaLifecycleService::class
                    )->onItemsSent(
                        $orderId,
                        $items,
                        null,
                        $reason
                    );
                } catch (\Throwable $error) {
                    \Log::warning(
                        'PMD Quick POS deferred kitchen ETA failed',
                        [
                            'order_id' => $orderId,
                            'reason' => $reason,
                            'message' => $error->getMessage(),
                        ]
                    );
                }
            });

            \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
                'quick_save_eta_deferred'
            );

            return [
                'deferred' => true,
                'order_id' => $orderId,
            ];
        } catch (\Throwable $error) {
            return parent::pmdKitchenEtaAfterSendV1(
                $orderId,
                $cart,
                $reason
            );
        }
    }

    /**
     * PMD_QUICK_POS_LEAN_TABLE_DATA_V2
     *
     * Quick POS does not need the legacy waiter payload's menu catalogue on
     * every table click. Read the selected table and its open checks only.
     * Order lines and status labels are fetched in batches to avoid the
     * per-order N+1 query pattern in openOrdersForTable().
     */
    public function tableData($tableId = null)
    {
        $table = $this->resolveTable((int)$tableId);

        if (!$table) {
            return response()->json([
                'ok' => false,
                'version' => 'pmd-quick-pos-v2',
                'message' => 'Table not found.',
            ], 404);
        }

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pos_table_entry'
        );

        $orders = $this->quickPosOpenOrdersForTable($table);

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pos_table_orders'
        );

        return response()->json([
            'ok' => true,
            'version' => 'pmd-quick-pos-v2',
            'table' => $table,
            'open_orders' => $orders,
            'active_order_id' => count($orders)
                ? (int)$orders[0]['order_id']
                : null,
        ]);
    }

    /**
     * PMD_QPOS_PARTIAL_PAYMENT_SCOPE_V1
     *
     * Partial payments lock structural order edits, but the check must remain
     * visible in Quick POS until its remaining balance is fully settled.
     */
    protected function applyQuickPosPayableScope($query, array $columns): void
    {
        $cancelled = array_values(array_filter(array_map('intval', [
            setting('canceled_order_status'),
        ])));

        if ($cancelled && in_array('status_id', $columns, true)) {
            $query->whereNotIn('status_id', $cancelled);
        }

        if (in_array('settlement_status', $columns, true)) {
            $query->where(function ($q) {
                $q->whereNull('settlement_status')
                    ->orWhereNotIn('settlement_status', [
                        'paid',
                        'settled',
                        'closed',
                        'cancelled',
                        'canceled',
                        'refunded',
                    ]);
            });
        } elseif (in_array('payment_status', $columns, true)) {
            $query->where(function ($q) {
                $q->whereNull('payment_status')
                    ->orWhereNotIn('payment_status', [
                        'paid',
                        'settled',
                        'closed',
                        'cancelled',
                        'canceled',
                        'refunded',
                    ]);
            });
        }
    }

    protected function quickPosOpenOrdersForTable(array $table): array
    {
        if (!Schema::hasTable('orders')) {
            return [];
        }

        $columns = Schema::getColumnListing('orders');
        $query = DB::table('orders');

        $this->applyTableScope($query, $columns, $table);
        $this->applyQuickPosPayableScope($query, $columns);

        $primaryKey = in_array('order_id', $columns, true)
            ? 'order_id'
            : 'id';

        $rows = $query
            ->orderByDesc($primaryKey)
            ->limit(20)
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        $orderIds = $rows
            ->map(function ($row) use ($primaryKey) {
                return (int)($row->order_id ?? $row->id ?? $row->{$primaryKey} ?? 0);
            })
            ->filter()
            ->values()
            ->all();

        $itemsByOrder = collect();

        if ($orderIds && Schema::hasTable('order_menus')) {
            $itemsByOrder = DB::table('order_menus')
                ->whereIn('order_id', $orderIds)
                ->orderBy('order_id')
                ->orderBy(
                    Schema::hasColumn('order_menus', 'order_menu_id')
                        ? 'order_menu_id'
                        : 'id'
                )
                ->get()
                ->groupBy(function ($row) {
                    return (int)($row->order_id ?? 0);
                });
        }

        $statusIds = $rows
            ->map(fn ($row) => (int)($row->status_id ?? 0))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $statusNames = [];

        if (
            $statusIds
            && Schema::hasTable('statuses')
            && Schema::hasColumn('statuses', 'status_id')
        ) {
            $statusNames = DB::table('statuses')
                ->whereIn('status_id', $statusIds)
                ->pluck('status_name', 'status_id')
                ->mapWithKeys(function ($name, $id) {
                    return [(int)$id => (string)$name];
                })
                ->all();
        }

        return $rows->map(function ($row) use (
            $primaryKey,
            $itemsByOrder,
            $statusNames
        ) {
            $raw = (array)$row;
            $orderId = (int)(
                $raw['order_id']
                ?? $raw['id']
                ?? $raw[$primaryKey]
                ?? 0
            );

            $items = collect($itemsByOrder->get($orderId, collect()))
                ->map(function ($item) {
                    $rawItem = (array)$item;
                    $quantity = (float)($rawItem['quantity'] ?? 1);
                    $subtotal = (float)($rawItem['subtotal'] ?? 0);
                    $fallbackPrice = (float)($rawItem['price'] ?? 0);

                    return [
                        'id' => (int)($rawItem['order_menu_id'] ?? $rawItem['id'] ?? 0),
                        'order_menu_id' => (int)($rawItem['order_menu_id'] ?? $rawItem['id'] ?? 0),
                        'menu_id' => (int)($rawItem['menu_id'] ?? 0),
                        'name' => (string)($rawItem['name'] ?? 'Item'),
                        'quantity' => $quantity,
                        'price' => $quantity > 0 && $subtotal > 0
                            ? round($subtotal / $quantity, 4)
                            : $fallbackPrice,
                        'subtotal' => $subtotal,
                        'comment' => $this->quickPosVisibleNote(
                            (string)($rawItem['comment'] ?? '')
                        ),
                    ];
                })
                ->values()
                ->all();

            $statusId = (int)($raw['status_id'] ?? 0);

            return [
                'order_id' => $orderId,
                'status_id' => $statusId ?: null,
                'status_name' => (string)($statusNames[$statusId] ?? ''),
                'payment' => (string)($raw['payment'] ?? ''),
                'settlement_status' => (string)($raw['settlement_status'] ?? 'unpaid'),
                'settled_amount' => (float)($raw['settled_amount'] ?? 0),
                'structural_locked' =>
                    (float)($raw['settled_amount'] ?? 0) > 0.0001
                    || in_array(
                        strtolower(trim((string)($raw['settlement_status'] ?? ''))),
                        ['partial', 'paid', 'settled', 'closed', 'refunded'],
                        true
                    ),
                'total' => (float)($raw['order_total'] ?? $raw['total'] ?? 0),
                'total_items' => (int)($raw['total_items'] ?? 0),
                'guest_count' => max(1, (int)($raw['guest_count'] ?? 1)),
                'created_at' => (string)($raw['created_at'] ?? ''),
                'updated_at' => (string)($raw['updated_at'] ?? ''),
                'comment' => $this->quickPosVisibleNote(
                    (string)($raw['comment'] ?? '')
                ),
                'items' => $items,
                'urls' => $this->orderUrls($orderId),
            ];
        })->values()->all();
    }

    protected function quickPosVisibleNote(string $value): string
    {
        $value = preg_replace(
            '/\\[(?:guest_session|table_session|table_draft_id|submitted_by):[^\\]]*\\]/iu',
            '',
            $value
        ) ?? $value;

        $value = preg_replace('/\\s*\\|\\s*\\|\\s*/u', ' | ', $value) ?? $value;
        $value = preg_replace('/\\s{2,}/u', ' ', $value) ?? $value;

        return trim($value, " |\\t\\n\\r\\0\\x0B");
    }

    public function saveOffPremise()
    {
        $payload = $this->requestPayload();
        $serviceMode = strtolower(trim((string)($payload['service_mode'] ?? 'takeaway')));

        if ($serviceMode === 'delivery') {
            return $this->saveDelivery();
        }

        return $this->saveCollection($payload);
    }

    protected function saveCollection(array $payload)
    {
        $mode = strtolower(trim((string)($payload['mode'] ?? 'send')));
        if (!in_array($mode, ['hold', 'send'], true)) {
            $mode = 'send';
        }

        $cart = $payload['items'] ?? [];
        if (!is_array($cart) || count($cart) < 1) {
            return response()->json([
                'ok' => false,
                'message' => 'Add at least one item.',
            ], 422);
        }

        try {
            $result = DB::transaction(function () use ($payload, $cart, $mode) {
                $requestedOrderId = (int)($payload['order_id'] ?? 0);
                $order = null;

                if ($requestedOrderId > 0) {
                    $order = Orders_model::query()
                        ->where('order_id', $requestedOrderId)
                        ->lockForUpdate()
                        ->first();

                    if (!$order) {
                        throw ValidationException::withMessages([
                            'order' => 'The selected Pickup order no longer exists.',
                        ]);
                    }

                    if (
                        strtolower(trim((string)($order->order_type ?? '')))
                        !== Orders_model::COLLECTION
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'This order is not a Pickup order.',
                        ]);
                    }

                    if (!$this->orderIsOpen($order)) {
                        throw ValidationException::withMessages([
                            'order' => 'This Pickup order can no longer accept item changes because payment has started or the order was cancelled.',
                        ]);
                    }

                    $expectedUpdatedAt = trim((string)($payload['expected_updated_at'] ?? ''));
                    if (
                        $expectedUpdatedAt !== ''
                        && $order->updated_at
                        && (string)$order->updated_at !== $expectedUpdatedAt
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'This Pickup order was changed by another user. Refresh before sending new items.',
                        ]);
                    }
                }

                $isNew = !$order;

                if (!$order) {
                    $order = new Orders_model();
                    $this->fillNewDeliveryOrder($order, $payload, $mode);
                    $order->order_type = Orders_model::COLLECTION;

                    if (Schema::hasColumn('orders', 'first_name')) {
                        $order->first_name = 'Pickup';
                    }
                    if (Schema::hasColumn('orders', 'last_name')) {
                        $order->last_name = 'Guest';
                    }

                    $order->saveOrFail();

                    // Orders_model still carries legacy session-table behavior.
                    // Reassert collection after create so an unrelated session
                    // table can never relabel a counter order.
                    if (
                        Schema::hasColumn('orders', 'order_type')
                        && strtolower(trim((string)($order->order_type ?? '')))
                            !== Orders_model::COLLECTION
                    ) {
                        $order->order_type = Orders_model::COLLECTION;
                        $order->save();
                    }

                    $this->ensureBaseTotals($order);
                }

                $added = $this->appendItems($order, $cart);
                if ($added < 1) {
                    throw ValidationException::withMessages([
                        'items' => 'No valid, priced menu items were added.',
                    ]);
                }

                $note = trim((string)($payload['note'] ?? ''));
                if ($note !== '' && Schema::hasColumn('orders', 'comment')) {
                    $existing = trim((string)($order->comment ?? ''));
                    $entry = '[Quick POS Takeaway] '.$note;
                    if (
                        $existing !== $note
                        && strpos($existing, $entry) === false
                        && strpos($existing, $note) === false
                    ) {
                        $order->comment = $existing === ''
                            ? $entry
                            : ($existing."\n".$entry);
                    }
                }

                if (Schema::hasColumn('orders', 'guest_count')) {
                    $order->guest_count = max(
                        1,
                        min(99, (int)($payload['guest_count'] ?? 1))
                    );
                }

                if (
                    Schema::hasColumn('orders', 'payment')
                    && trim((string)($order->payment ?? '')) === ''
                ) {
                    $order->payment = 'qr_pay_later';
                }

                if (
                    Schema::hasColumn('orders', 'settlement_status')
                    && !in_array(
                        (string)($order->settlement_status ?? ''),
                        ['partial', 'paid'],
                        true
                    )
                ) {
                    $order->settlement_status = 'unpaid';
                }

                if (
                    Schema::hasColumn('orders', 'settled_amount')
                    && $order->settled_amount === null
                ) {
                    $order->settled_amount = 0;
                }

                $statusId = $this->resolveStatusId($mode);
                if ($statusId && Schema::hasColumn('orders', 'status_id')) {
                    $order->status_id = $statusId;
                }

                if (Schema::hasColumn('orders', 'processed')) {
                    $order->processed = $mode === 'send';
                }

                $order->save();
                $this->recalculateOrder($order);
                $this->recordWaiterPosNoteHistoryV26(
                    $order,
                    $cart,
                    $note,
                    $mode
                );

                if ($statusId && method_exists($order, 'addStatusHistory')) {
                    try {
                        $order->addStatusHistory($statusId, [
                            'comment' => $mode === 'send'
                                ? 'Sent from PayMyDine Quick POS Takeaway'
                                : 'Saved from PayMyDine Quick POS Takeaway',
                            'notify' => false,
                        ]);
                    } catch (\Throwable $ignored) {
                    }
                }

                $order->refresh();

                $orderTotal = (float)($order->order_total ?? 0);
                $settledAmount = max(
                    0,
                    (float)($order->settled_amount ?? 0)
                );
                $remainingAmount = max(
                    0,
                    round($orderTotal - $settledAmount, 4)
                );

                return [
                    'ok' => true,
                    'version' => 'pmd-quick-pos-v1',
                    'service_mode' => 'takeaway',
                    'mode' => $mode,
                    'created' => $isNew,
                    'order_id' => (int)$order->getKey(),
                    'order_total' => $orderTotal,
                    'total_items' => (int)($order->total_items ?? 0),
                    'updated_at' => (string)($order->updated_at ?? ''),
                    'settlement_status' =>
                        (string)($order->settlement_status ?? 'unpaid'),
                    'settled_amount' => $settledAmount,
                    'remaining_amount' => $remainingAmount,
                    // PMD_QPOS_PICKUP_PAYMENT_HANDOFF_V1
                    // Pickup has the same instant Cash handoff as a table.
                    'payment_quick' => [
                        'ok' => true,
                        'preview' => false,
                        'order' => [
                            'order_id' => (int)$order->getKey(),
                            'updated_at' =>
                                (string)($order->updated_at ?? ''),
                        ],
                        'settlement' => [
                            'order_total' => $orderTotal,
                            'settled_amount' => $settledAmount,
                            'remaining_amount' => $remainingAmount,
                        ],
                        'terminal_providers' => [],
                    ],
                    'message' => $mode === 'send'
                        ? 'Pickup sent'
                        : 'Pickup saved',
                    'urls' => $this->orderUrls((int)$order->getKey()),
                ];
            });

            if (($result['mode'] ?? '') === 'send' && !empty($result['order_id'])) {
                $result['eta'] = $this->pmdKitchenEtaAfterSendV1(
                    (int)$result['order_id'],
                    $cart,
                    'quick_pos_takeaway_send'
                );
            }

            return response()->json($result);
        } catch (ValidationException $error) {
            return response()->json([
                'ok' => false,
                'version' => 'pmd-quick-pos-v1',
                'message' => collect($error->errors())->flatten()->first()
                    ?: 'The Pickup order could not be saved.',
                'errors' => $error->errors(),
            ], 422);
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'version' => 'pmd-quick-pos-v1',
                'message' => 'The Pickup order could not be saved. '.$error->getMessage(),
            ], 500);
        }
    }

    /**
     * PMD_QPOS_HISTORY_V1
     *
     * Compact, schema-safe operational history for the POS. It intentionally
     * reads existing canonical order/payment/note/status tables only; no new
     * audit store is introduced.
     */
    public function history()
    {
        $scope = strtolower(trim((string)request()->query('scope', 'selected')));
        $tableId = max(0, (int)request()->query('table_id', 0));
        $limit = max(20, min(160, (int)request()->query('limit', 100)));
        $locationId = $this->quickPosLocationId();
        $entries = [];
        $orderIds = [];
        $scopeLabel = 'All history';

        if (!Schema::hasTable('orders')) {
            return response()->json([
                'ok' => true,
                'version' => 'pmd-qpos-history-v1',
                'scope' => $scope,
                'scope_label' => $scopeLabel,
                'entries' => [],
            ]);
        }

        $orderColumns = Schema::getColumnListing('orders');
        $primaryKey = in_array('order_id', $orderColumns, true)
            ? 'order_id'
            : 'id';

        $query = DB::table('orders');

        if ($locationId > 0 && in_array('location_id', $orderColumns, true)) {
            $query->where('location_id', $locationId);
        }

        if ($scope === 'table' && $tableId > 0) {
            $table = $this->resolveTable($tableId);
            if ($table) {
                $this->applyTableScope($query, $orderColumns, $table);
                $scopeLabel = 'Table '.(string)($table['number'] ?? $tableId);
            } else {
                $query->whereRaw('1 = 0');
                $scopeLabel = 'Selected table';
            }
        } elseif ($scope === 'pickup') {
            if (in_array('order_type', $orderColumns, true)) {
                $query->where('order_type', Orders_model::COLLECTION);
            } else {
                $query->whereRaw('1 = 0');
            }
            $scopeLabel = 'Pickup';
        } else {
            $scope = 'all';
            $scopeLabel = 'All history';
        }

        $orderSort = in_array('created_at', $orderColumns, true)
            ? 'created_at'
            : $primaryKey;

        $orders = $query
            ->orderByDesc($orderSort)
            ->limit(min(80, $limit))
            ->get();

        $orderIds = $orders
            ->map(function ($row) use ($primaryKey) {
                return (int)($row->order_id ?? $row->id ?? $row->{$primaryKey} ?? 0);
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

        $money = function ($value): string {
            return $this->currencySymbol().number_format(
                (float)$value,
                2,
                '.',
                ''
            );
        };

        foreach ($orders as $order) {
            $raw = (array)$order;
            $orderId = (int)($raw['order_id'] ?? $raw['id'] ?? $raw[$primaryKey] ?? 0);
            if ($orderId < 1) {
                continue;
            }

            $parts = [];
            $statusId = (int)($raw['status_id'] ?? 0);
            $statusName = trim((string)($statusNames[$statusId] ?? ''));
            if ($statusName !== '') {
                $parts[] = $statusName;
            }

            $total = (float)($raw['order_total'] ?? $raw['total'] ?? 0);
            if ($total > 0) {
                $parts[] = $money($total);
            }

            $settlement = trim((string)($raw['settlement_status'] ?? ''));
            if ($settlement !== '') {
                $parts[] = ucfirst($settlement);
            }

            $itemRows = collect($itemsByOrder->get($orderId, collect()));
            if ($itemRows->isNotEmpty()) {
                $summary = $itemRows
                    ->take(6)
                    ->map(function ($item) {
                        return max(1, (int)($item->quantity ?? 1))
                            .'× '.trim((string)($item->name ?? 'Item'));
                    })
                    ->filter()
                    ->implode(', ');
                if ($itemRows->count() > 6) {
                    $summary .= ' +'.($itemRows->count() - 6);
                }
                if ($summary !== '') {
                    $parts[] = $summary;
                }
            }

            $comment = $this->quickPosVisibleNote(
                (string)($raw['comment'] ?? '')
            );
            if ($comment !== '') {
                $parts[] = 'Note: '.$comment;
            }

            $entries[] = [
                'kind' => 'order',
                'time' => (string)($raw['updated_at'] ?? $raw['created_at'] ?? ''),
                'title' => 'Order #'.$orderId,
                'detail' => implode(' · ', $parts),
                'order_id' => $orderId,
            ];

            foreach ($itemRows as $item) {
                $note = $this->quickPosVisibleNote(
                    (string)($item->comment ?? '')
                );
                if ($note === '') {
                    continue;
                }
                $entries[] = [
                    'kind' => 'item_note',
                    'time' => (string)($item->updated_at ?? $item->created_at ?? $raw['updated_at'] ?? ''),
                    'title' => 'Item note · '.trim((string)($item->name ?? 'Item')),
                    'detail' => $note,
                    'order_id' => $orderId,
                ];
            }
        }

        if ($orderIds && Schema::hasTable('order_notes')) {
            $cols = Schema::getColumnListing('order_notes');
            if (in_array('order_id', $cols, true)) {
                $rows = DB::table('order_notes')
                    ->whereIn('order_id', $orderIds)
                    ->orderByDesc(
                        in_array('created_at', $cols, true)
                            ? 'created_at'
                            : (in_array('id', $cols, true) ? 'id' : 'order_id')
                    )
                    ->limit($limit)
                    ->get();

                foreach ($rows as $row) {
                    $raw = (array)$row;
                    $note = trim((string)($raw['note'] ?? $raw['comment'] ?? ''));
                    if ($note === '') {
                        continue;
                    }
                    $entries[] = [
                        'kind' => 'note',
                        'time' => (string)($raw['created_at'] ?? $raw['updated_at'] ?? ''),
                        'title' => 'Order note · #'.(int)($raw['order_id'] ?? 0),
                        'detail' => $note,
                        'order_id' => (int)($raw['order_id'] ?? 0),
                    ];
                }
            }
        }

        if ($orderIds && Schema::hasTable('order_payment_transactions')) {
            $cols = Schema::getColumnListing('order_payment_transactions');
            if (in_array('order_id', $cols, true)) {
                $rows = DB::table('order_payment_transactions')
                    ->whereIn('order_id', $orderIds)
                    ->orderByDesc(
                        in_array('paid_at', $cols, true)
                            ? 'paid_at'
                            : (in_array('created_at', $cols, true) ? 'created_at' : 'id')
                    )
                    ->limit($limit)
                    ->get();

                foreach ($rows as $row) {
                    $raw = (array)$row;
                    $parts = [
                        ucfirst(str_replace('_', ' ', (string)($raw['payment_method'] ?? 'Payment'))),
                        $money((float)($raw['amount'] ?? 0)),
                    ];
                    $tip = (float)($raw['tip_amount'] ?? 0);
                    if ($tip > 0) {
                        $parts[] = 'Tip '.$money($tip);
                    }
                    if (array_key_exists('cash_received', $raw) && $raw['cash_received'] !== null) {
                        $parts[] = 'Cash '.$money((float)$raw['cash_received']);
                    }
                    $change = (float)($raw['change_due'] ?? 0);
                    if ($change > 0) {
                        $parts[] = 'Change '.$money($change);
                    }
                    $payer = trim((string)($raw['payer_label'] ?? ''));
                    if ($payer !== '') {
                        $parts[] = $payer;
                    }
                    $reference = trim((string)($raw['payment_reference'] ?? ''));
                    if ($reference !== '') {
                        $parts[] = 'Ref '.$reference;
                    }
                    $paymentNote = trim((string)($raw['notes'] ?? ''));
                    if ($paymentNote !== '') {
                        $parts[] = 'Note: '.$paymentNote;
                    }
                    $entries[] = [
                        'kind' => 'payment',
                        'time' => (string)($raw['paid_at'] ?? $raw['created_at'] ?? ''),
                        'title' => 'Payment · Order #'.(int)($raw['order_id'] ?? 0),
                        'detail' => implode(' · ', $parts),
                        'order_id' => (int)($raw['order_id'] ?? 0),
                    ];
                }
            }
        }

        if ($orderIds && Schema::hasTable('payment_attempts')) {
            $cols = Schema::getColumnListing('payment_attempts');
            if (in_array('order_id', $cols, true)) {
                $rows = DB::table('payment_attempts')
                    ->whereIn('order_id', $orderIds)
                    ->orderByDesc(in_array('created_at', $cols, true) ? 'created_at' : 'id')
                    ->limit(min(50, $limit))
                    ->get();

                foreach ($rows as $row) {
                    $raw = (array)$row;
                    $parts = [
                        ucfirst(str_replace('_', ' ', (string)($raw['provider_code'] ?? 'Terminal'))),
                        $money((float)($raw['amount'] ?? 0)),
                        ucfirst(str_replace('_', ' ', (string)($raw['status'] ?? ''))),
                    ];
                    $error = trim((string)($raw['error_message'] ?? ''));
                    if ($error !== '') {
                        $parts[] = $error;
                    }
                    $entries[] = [
                        'kind' => 'terminal',
                        'time' => (string)($raw['updated_at'] ?? $raw['created_at'] ?? ''),
                        'title' => 'Terminal · Order #'.(int)($raw['order_id'] ?? 0),
                        'detail' => implode(' · ', array_filter($parts)),
                        'order_id' => (int)($raw['order_id'] ?? 0),
                    ];
                }
            }
        }

        if ($orderIds && Schema::hasTable('status_history')) {
            $cols = Schema::getColumnListing('status_history');
            if (in_array('object_id', $cols, true)) {
                $statusQuery = DB::table('status_history')
                    ->whereIn('object_id', $orderIds);

                if (in_array('object_type', $cols, true)) {
                    try {
                        $statusQuery->where(
                            'object_type',
                            Orders_model::make()->getMorphClass()
                        );
                    } catch (\Throwable $ignored) {
                    }
                }

                $rows = $statusQuery
                    ->orderByDesc(in_array('created_at', $cols, true) ? 'created_at' : 'status_history_id')
                    ->limit($limit)
                    ->get();

                foreach ($rows as $row) {
                    $raw = (array)$row;
                    $statusId = (int)($raw['status_id'] ?? 0);
                    $detail = trim((string)($raw['comment'] ?? ''));
                    $statusName = trim((string)($statusNames[$statusId] ?? ''));
                    if ($statusName !== '') {
                        $detail = $statusName.($detail !== '' ? ' · '.$detail : '');
                    }
                    $entries[] = [
                        'kind' => 'status',
                        'time' => (string)($raw['created_at'] ?? $raw['updated_at'] ?? ''),
                        'title' => 'Status · Order #'.(int)($raw['object_id'] ?? 0),
                        'detail' => $detail,
                        'order_id' => (int)($raw['object_id'] ?? 0),
                    ];
                }
            }
        }

        if ($scope === 'table' && $tableId > 0 && Schema::hasTable('table_notes')) {
            $cols = Schema::getColumnListing('table_notes');
            if (in_array('table_id', $cols, true)) {
                $rows = DB::table('table_notes')
                    ->where('table_id', $tableId)
                    ->orderByDesc(
                        in_array('created_at', $cols, true)
                            ? 'created_at'
                            : (in_array('timestamp', $cols, true) ? 'timestamp' : 'id')
                    )
                    ->limit(min(50, $limit))
                    ->get();

                foreach ($rows as $row) {
                    $raw = (array)$row;
                    $note = trim((string)($raw['note'] ?? $raw['message'] ?? ''));
                    if ($note === '') {
                        continue;
                    }
                    $entries[] = [
                        'kind' => 'table_note',
                        'time' => (string)($raw['created_at'] ?? $raw['timestamp'] ?? ''),
                        'title' => 'Table note',
                        'detail' => $note,
                        'order_id' => null,
                    ];
                }
            }
        }

        $tableStatusTable = null;
        foreach (['pmd_table_status_history', 'ti_pmd_table_status_history'] as $candidate) {
            if (Schema::hasTable($candidate)) {
                $tableStatusTable = $candidate;
                break;
            }
        }

        if ($tableStatusTable && $scope !== 'pickup') {
            $cols = Schema::getColumnListing($tableStatusTable);
            if (in_array('table_id', $cols, true)) {
                $tableStatusQuery = DB::table($tableStatusTable);
                if ($scope === 'table' && $tableId > 0) {
                    $tableStatusQuery->where('table_id', $tableId);
                }

                $rows = $tableStatusQuery
                    ->orderByDesc(
                        in_array('created_at', $cols, true)
                            ? 'created_at'
                            : 'id'
                    )
                    ->limit(min(80, $limit))
                    ->get();

                foreach ($rows as $row) {
                    $raw = (array)$row;
                    $old = ucfirst(str_replace('_', ' ', (string)($raw['old_status'] ?? '')));
                    $new = ucfirst(str_replace('_', ' ', (string)($raw['new_status'] ?? '')));
                    $reason = trim((string)($raw['reason'] ?? ''));
                    $detail = trim($old.' → '.$new);
                    if ($reason !== '') {
                        $detail .= ' · '.$reason;
                    }

                    $entries[] = [
                        'kind' => 'table_status',
                        'time' => (string)($raw['created_at'] ?? $raw['updated_at'] ?? ''),
                        'title' => 'Table '.(int)($raw['table_id'] ?? 0).' · status',
                        'detail' => $detail,
                        'order_id' => isset($raw['order_id'])
                            ? (int)$raw['order_id']
                            : null,
                    ];
                }
            }
        }

        usort($entries, function (array $a, array $b): int {
            return (strtotime((string)($b['time'] ?? '')) ?: 0)
                <=> (strtotime((string)($a['time'] ?? '')) ?: 0);
        });

        return response()->json([
            'ok' => true,
            'version' => 'pmd-qpos-history-v1',
            'scope' => $scope,
            'scope_label' => $scopeLabel,
            'entries' => array_slice($entries, 0, $limit),
        ]);
    }

    protected function quickPosProfilePayload(): array
    {
        $user = $this->currentUser();
        $role = $this->quickPosRoleCode();
        $landing = '';

        try {
            $landing = (string)(
                app(PmdRoleLandingService::class)->routeFor($user)
                ?: ''
            );
        } catch (\Throwable $ignored) {
        }

        $canReturn = $landing !== ''
            && !in_array($landing, ['pos', 'pos/waiter'], true);

        return [
            'name' => $user
                ? (string)($user->name ?? $user->username ?? $user->email ?? 'Staff')
                : 'Staff',
            'role' => $role,
            'logout_url' => admin_url('logout'),
            'dashboard_url' => $canReturn
                ? admin_url($landing)
                : null,
            'can_return_dashboard' => $canReturn,
        ];
    }

    protected function quickPosTables(
        int $locationId,
        array $floorSnapshot = [],
        string $defaultFloorId = ''
    ): array {
        try {
            $assignments = (array)(
                $floorSnapshot['table_assignments']
                ?? []
            );

            $floorNames = [];
            foreach ((array)($floorSnapshot['floors'] ?? []) as $floor) {
                $floorId = trim((string)($floor['id'] ?? ''));
                if ($floorId === '') {
                    continue;
                }
                $floorNames[$floorId] =
                    trim((string)($floor['name'] ?? ''))
                    ?: 'Floor';
            }

            if ($defaultFloorId === '') {
                foreach ((array)($floorSnapshot['floors'] ?? []) as $floor) {
                    if (!empty($floor['is_default'])) {
                        $defaultFloorId =
                            trim((string)($floor['id'] ?? ''));
                        break;
                    }
                }
            }

            if ($defaultFloorId === '') {
                $defaultFloorId = (string)app(
                    \Admin\Services\PmdSharedFloorRegistryV1::class
                )->defaultFloorId();
            }
            $columns = Schema::getColumnListing('tables');
            if (!$columns) {
                return [];
            }

            $select = array_values(array_intersect([
                'table_id',
                'id',
                'table_no',
                'table_number',
                'table_name',
                'name',
                'capacity',
                'table_capacity',
                'min_capacity',
                'max_capacity',
                'operational_status',
                'location_id',
            ], $columns));

            $query = Tables_model::query();

            if ($locationId > 0) {
                try {
                    $query->whereHasLocation($locationId);
                } catch (\Throwable $ignored) {
                    if (in_array('location_id', $columns, true)) {
                        $query->where('location_id', $locationId);
                    }
                }
            }

            try {
                $query->isEnabled();
            } catch (\Throwable $ignored) {
            }

            $orderColumn = in_array('table_no', $columns, true)
                ? 'table_no'
                : (in_array('table_number', $columns, true)
                    ? 'table_number'
                    : (in_array('table_id', $columns, true) ? 'table_id' : null));

            if ($orderColumn) {
                $query->orderBy($orderColumn);
            }

            $tables = $query
                ->limit(250)
                ->get($select ?: ['*'])
                ->map(function ($row) use (
                    $assignments,
                    $defaultFloorId,
                    $floorNames
                ) {
                    $id = (int)($row->table_id ?? $row->id ?? 0);
                    $number = (string)(
                        $row->table_no
                        ?? $row->table_number
                        ?? $id
                    );
                    $name = trim((string)(
                        $row->table_name
                        ?? $row->name
                        ?? ''
                    ));

                    $floorId = trim((string)(
                        $assignments[(string)$id]
                        ?? $defaultFloorId
                    ));

                    if ($floorId === '') {
                        $floorId = $defaultFloorId;
                    }

                    return [
                        'id' => $id,
                        'number' => $number,
                        'name' => $name !== '' ? $name : 'Table '.$number,
                        'capacity' => (int)(
                            $row->capacity
                            ?? $row->table_capacity
                            ?? $row->max_capacity
                            ?? $row->min_capacity
                            ?? 0
                        ),
                        'floor_id' => $floorId,
                        'floor_name' => (string)(
                            $floorNames[$floorId]
                            ?? 'Main Floor'
                        ),
                        'status' => $this->quickPosNormalizeTableStatus(
                            (string)($row->operational_status ?? 'available')
                        ),
                    ];
                })
                ->filter(fn ($row) => (int)$row['id'] > 0)
                ->values()
                ->all();

            /*
             * PMD_QUICK_POS_TABLE_STATUS_AUTHORITY_V2
             *
             * Physical table status is authoritative here. An unpaid/open
             * historical check must never silently turn a physically free
             * table into Busy. The selected table payload still exposes its
             * open checks separately in the right-hand check panel.
             */
            return $tables;
        } catch (\Throwable $error) {
            report($error);
            return [];
        }
    }

    protected function quickPosNormalizeTableStatus(string $status): string
    {
        $status = strtolower(trim($status));
        if ($status === '' || $status === 'free') {
            return 'available';
        }

        return in_array(
            $status,
            ['available', 'occupied', 'cleaning', 'reserved'],
            true
        ) ? $status : 'available';
    }

    protected function quickPosLocationId(): int
    {
        try {
            $id = (int)AdminLocation::getId();
            if ($id > 0) {
                return $id;
            }
        } catch (\Throwable $ignored) {
        }

        try {
            $user = $this->currentUser();
            $staff = $user ? $user->staff : null;
            if ($staff && method_exists($staff, 'relationLoaded') && $staff->relationLoaded('locations')) {
                $location = $staff->locations->sortBy('location_id')->first();
                $id = (int)($location->location_id ?? 0);
                if ($id > 0) {
                    return $id;
                }
            }
        } catch (\Throwable $ignored) {
        }

        try {
            return max(1, (int)DB::table('locations')->value('location_id'));
        } catch (\Throwable $ignored) {
            return 1;
        }
    }

    protected function quickPosRoleCode(): string
    {
        try {
            return app(PmdDefaultStaffRoleService::class)
                ->roleCodeForUser($this->currentUser());
        } catch (\Throwable $ignored) {
            return '';
        }
    }

    protected function quickPosMode(string $requested): string
    {
        $requested = strtolower(trim($requested));
        $role = $this->quickPosRoleCode();

        if ($role === PmdDefaultStaffRoleService::WAITER || $role === 'waiter') {
            return 'waiter';
        }

        if ($role === PmdDefaultStaffRoleService::CASHIER || $role === 'cashier') {
            return 'cashier';
        }

        return $requested === 'waiter'
            ? 'waiter'
            : 'cashier';
    }

    protected function quickPosCanSwitchMode(): bool
    {
        $role = $this->quickPosRoleCode();

        return !in_array(
            $role,
            [
                PmdDefaultStaffRoleService::CASHIER,
                'cashier',
                PmdDefaultStaffRoleService::WAITER,
                'waiter',
            ],
            true
        );
    }
}
