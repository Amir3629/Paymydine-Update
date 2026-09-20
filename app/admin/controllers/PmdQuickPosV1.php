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

        /*
         * PMD_QPOS_EXACT_DASHBOARD_FLOOR_V26
         *
         * Quick POS no longer owns a second Floor renderer. The Map workspace
         * receives the SAME bootstrap + registry contract consumed by the
         * Dashboard/Manager/Reservations exact Floor partial/runtime.
         */
        $exactFloor = $this->quickPosExactFloorContext(
            (int)($initialBootstrap['location_id'] ?? 0)
        );

        return view()->file(
            base_path('app/admin/views/pmd_quick_pos_v1.blade.php'),
            [
                'mode' => $mode,
                'initialBootstrap' => $initialBootstrap,
                'pmdQuickPosExactFloor' => $exactFloor,
            ]
        );
    }

    /**
     * Build the exact Dashboard Floor context for the POS Map workspace.
     * Visual markup/runtime comes from the canonical shared partial/assets;
     * this method only supplies the same data/registry contract.
     */
    protected function quickPosExactFloorContext(int $locationId): array
    {
        $locationId = $locationId > 0
            ? $locationId
            : $this->quickPosLocationId();

        $floorService = app(
            \Admin\Services\PmdSharedFloorRegistryV1::class
        );

        $bootstrap = $this->quickPosExactFloorBootstrap();

        try {
            $bootstrap = $floorService->applyUserPageViewPreference(
                $locationId,
                'quick-pos',
                $bootstrap
            );
        } catch (\Throwable $ignored) {
        }

        $bootstrap['display_tables'] = $this->quickPosBuildFloorDisplayTables(
            (array)($bootstrap['data'] ?? []),
            (array)($bootstrap['layout'] ?? []),
            (array)($bootstrap['state'] ?? []),
            (string)($bootstrap['mode'] ?? 'full')
        );

        try {
            $snapshot = $floorService->snapshot($locationId);
        } catch (\Throwable $error) {
            $snapshot = [
                'floors' => [[
                    'id' => $floorService->defaultFloorId(),
                    'name' => 'Main Floor',
                    'is_default' => true,
                    'sort' => 0,
                ]],
                'cookie_name' => '',
                'legacy_cookie_name' => '',
                'table_floor_map' => [
                    'by_id' => [],
                    'by_number' => [],
                    'by_name' => [],
                ],
            ];
        }

        $floors = array_values((array)($snapshot['floors'] ?? []));
        $requested = '';
        $cookieName = trim((string)($snapshot['cookie_name'] ?? ''));

        if ($cookieName !== '') {
            $requested = trim((string)request()->cookie($cookieName, ''));
        }

        if (
            $requested === ''
            && !empty($snapshot['legacy_cookie_name'])
        ) {
            $requested = trim((string)request()->cookie(
                (string)$snapshot['legacy_cookie_name'],
                ''
            ));
        }

        $active = $floorService->activeFloor($floors, $requested);

        return [
            'bootstrap' => $bootstrap,
            'display_tables' => array_values(
                (array)($bootstrap['display_tables'] ?? [])
            ),
            'mode' => (string)($bootstrap['mode'] ?? 'full'),
            'zoom' => (float)($bootstrap['zoom'] ?? 1.0),
            'location_id' => $locationId,
            'registry' => $floors,
            'active' => $active,
            'cookie_name' => $cookieName,
            'table_floor_map' => (array)(
                $snapshot['table_floor_map']
                ?? [
                    'by_id' => [],
                    'by_number' => [],
                    'by_name' => [],
                ]
            ),
        ];
    }

    /**
     * Same Floor data/layout/state authorities used by DashboardLab.
     */
    protected function quickPosExactFloorBootstrap(): array
    {
        $data = [];
        $layout = [
            'ok' => true,
            'tables' => [],
            'floor' => ['width' => 1000, 'height' => 560],
        ];
        $state = [
            'tables' => [],
            'merges' => [],
        ];
        $errors = [];

        try {
            $source = new class extends PmdWaiterDashboardV151 {
                public function pmdQuickPosExactFloorData(): array
                {
                    return $this->v9CompatiblePayload(false);
                }
            };

            $data = $source->pmdQuickPosExactFloorData();
        } catch (\Throwable $error) {
            $errors['data'] = $error->getMessage();
        }

        try {
            $source = new class extends PmdFloorV1 {
                public function pmdQuickPosExactFloorState(): array
                {
                    return $this->canonicalizeState(
                        $this->readState()
                    );
                }
            };

            $state = $source->pmdQuickPosExactFloorState();
        } catch (\Throwable $error) {
            $errors['state'] = $error->getMessage();
        }

        try {
            $source = new PmdOwnerDashboardCleanV1();
            $response = $source->floorLayout();

            if (is_object($response) && method_exists($response, 'getData')) {
                $decoded = $response->getData(true);
                if (is_array($decoded) && ($decoded['ok'] ?? false) === true) {
                    $layout = $decoded;
                }
            }
        } catch (\Throwable $error) {
            $errors['layout'] = $error->getMessage();
        }

        // POS Map starts as a real Floor, not the compact one-row projection.
        $mode = 'full';
        $zoom = 1.0;

        return [
            'version' => 'qpos-exact-dashboard-floor-v26',
            'server_first_paint' => true,
            'mode' => $mode,
            'zoom' => $zoom,
            'data' => $data,
            'layout' => $layout,
            'state' => $state,
            'display_tables' => $this->quickPosBuildFloorDisplayTables(
                $data,
                $layout,
                $state,
                $mode
            ),
            'endpoints' => [
                'data' => admin_url('pmd-waiter-dashboard-v9-tenant-data'),
                'layout' => admin_url('pmd-owner-dashboard-floor-layout'),
                'state' => admin_url('pmd-floor-v1/state'),
                // Kept for the canonical runtime; POS intercepts table-open.
                'order' => admin_url('waiter-pos/{table}'),
            ],
            'errors' => $errors,
        ];
    }

    /**
     * Exact Floor zoom / Full Floor / One-row preference endpoint.
     */
    public function onSaveFloorViewPreference()
    {
        $user = $this->currentUser();
        if (!$user) {
            return response()->json([
                'ok' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $mode = trim((string)request()->input('layout_mode'));
        $zoom = request()->input('full_floor_zoom');

        if (!in_array($mode, ['full', 'row'], true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid Floor layout mode.',
            ], 422);
        }

        if (
            !is_numeric($zoom)
            || (float)$zoom < 0.4
            || (float)$zoom > 1.6
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'Invalid Floor zoom.',
            ], 422);
        }

        try {
            $view = app(
                \Admin\Services\PmdSharedFloorRegistryV1::class
            )->saveUserPageViewPreference(
                $this->quickPosLocationId(),
                'quick-pos',
                $mode,
                (float)$zoom
            );

            return response()->json([
                'ok' => true,
                'scope' => 'authenticated-user-page-location',
                'view' => $view,
            ]);
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'message' => 'Floor view preference could not be saved.',
            ], 500);
        }
    }

    /**
     * Canonical reservation-busy window contract used by the shared Floor.
     */
    public function onPmdFloorReservationBusyWindows()
    {
        return response()->json([
            'success' => true,
            'location_id' => $this->quickPosLocationId(),
            'windows' => $this->quickPosFloorReservationBusyWindows(
                $this->quickPosLocationId()
            ),
        ]);
    }

    protected function quickPosFloorReservationBusyWindows(
        int $locationId
    ): array {
        $locationId = max(0, $locationId);
        if ($locationId < 1) return [];

        try {
            if (
                !Schema::hasTable('reservations')
                || !Schema::hasTable('reservation_tables')
                || !Schema::hasTable('tables')
            ) {
                return [];
            }

            $now = \Carbon\Carbon::now('Europe/Berlin');
            $reservations = \Admin\Models\Reservations_model::with('tables')
                ->where('location_id', $locationId)
                ->whereBetween('reserve_date', [
                    $now->copy()->subDay()->toDateString(),
                    $now->copy()->addDay()->toDateString(),
                ])
                ->get();

            $windows = [];
            $seen = [];

            foreach ($reservations as $reservation) {
                if (!$reservation || $reservation->isCanceled()) continue;

                $date = substr(
                    trim((string)$reservation->getOriginal('reserve_date')),
                    0,
                    10
                );
                $time = substr(
                    trim((string)$reservation->getOriginal('reserve_time')),
                    0,
                    8
                );

                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) continue;
                if (!preg_match('/^\d{2}:\d{2}(?::\d{2})?$/', $time)) continue;
                if (strlen($time) === 5) $time .= ':00';

                try {
                    $start = \Carbon\Carbon::createFromFormat(
                        'Y-m-d H:i:s',
                        $date.' '.$time,
                        'Europe/Berlin'
                    );
                } catch (\Throwable $ignored) {
                    continue;
                }

                if (!$start) continue;

                $duration = max(
                    1,
                    (int)($reservation->duration ?? 0)
                );
                $end = $start->copy()->addMinutes($duration);

                foreach ($reservation->tables as $table) {
                    if (!$table) continue;

                    $tableId = (int)($table->table_id ?? 0);
                    $tableNo = trim((string)($table->table_no ?? ''));

                    if ($tableId < 1 && $tableNo === '') continue;

                    $key = implode(':', [
                        (int)($reservation->reservation_id ?? 0),
                        $tableId,
                        $start->getTimestamp(),
                    ]);

                    if (isset($seen[$key])) continue;
                    $seen[$key] = true;

                    $windows[] = [
                        'reservation_id' =>
                            (int)($reservation->reservation_id ?? 0),
                        'table_id' => $tableId,
                        'table_no' => $tableNo,
                        'start_ms' => $start->getTimestamp() * 1000,
                        'end_ms' => $end->getTimestamp() * 1000,
                    ];
                }
            }

            return $windows;
        } catch (\Throwable $error) {
            report($error);
            return [];
        }
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
                'transfer_url' => '/admin/pos/transfer',
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
     * PMD_QPOS_TRANSFER_V24
     *
     * Two intentionally different restaurant operations:
     * - order: correct one check that was opened on the wrong table;
     * - table: guests physically move, so every payable check moves together.
     *
     * Items/payments/invoices stay attached to the same order IDs. Only the
     * canonical table reference changes.
     */
    public function transfer()
    {
        $payload = request()->json()->all() ?: request()->all();

        $sourceId = (int)($payload['source_table_id'] ?? 0);
        $targetId = (int)($payload['target_table_id'] ?? 0);
        $scope = strtolower(trim((string)($payload['scope'] ?? 'order')));
        $orderId = (int)($payload['order_id'] ?? 0);

        if (!in_array($scope, ['order', 'table'], true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Choose check or whole table.',
            ], 422);
        }

        if ($sourceId < 1 || $targetId < 1 || $sourceId === $targetId) {
            return response()->json([
                'ok' => false,
                'message' => 'Choose a different destination table.',
            ], 422);
        }

        $source = $this->resolveTable($sourceId);
        $target = $this->resolveTable($targetId);

        if (!$source || !$target) {
            return response()->json([
                'ok' => false,
                'message' => 'Source or destination table was not found.',
            ], 404);
        }

        $sourceLocation = (int)($source['location_id'] ?? 0);
        $targetLocation = (int)($target['location_id'] ?? 0);

        if (
            $sourceLocation > 0
            && $targetLocation > 0
            && $sourceLocation !== $targetLocation
        ) {
            return response()->json([
                'ok' => false,
                'message' => 'Tables must belong to the same location.',
            ], 422);
        }

        $sourceOrders = $this->quickPosOpenOrdersForTable($source);

        if (!$sourceOrders) {
            return response()->json([
                'ok' => false,
                'message' => 'There are no open checks to move.',
            ], 422);
        }

        if ($scope === 'order') {
            if ($orderId < 1) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Choose a check to move.',
                ], 422);
            }

            $selected = array_values(array_filter(
                $sourceOrders,
                static function (array $order) use ($orderId): bool {
                    return (int)($order['order_id'] ?? 0) === $orderId;
                }
            ));

            if (!$selected) {
                return response()->json([
                    'ok' => false,
                    'message' => 'That check is no longer on this table.',
                ], 409);
            }

            $orderIds = [$orderId];
        } else {
            $targetOrders = $this->quickPosOpenOrdersForTable($target);

            if ($targetOrders) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Destination already has a check. Move one check instead.',
                ], 409);
            }

            $targetStatus = $this->quickPosTransferTableStatus($targetId);

            if (
                $targetStatus !== ''
                && !in_array(
                    $targetStatus,
                    ['available', 'reserved'],
                    true
                )
            ) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Choose a free or reserved table for a whole-table move.',
                ], 409);
            }

            $orderIds = array_values(array_unique(array_filter(array_map(
                static fn (array $order): int =>
                    (int)($order['order_id'] ?? 0),
                $sourceOrders
            ))));
        }

        if (!$orderIds) {
            return response()->json([
                'ok' => false,
                'message' => 'There are no checks to move.',
            ], 422);
        }

        try {
            $result = DB::transaction(function () use (
                $source,
                $target,
                $sourceOrders,
                $orderIds,
                $scope
            ) {
                if (!Schema::hasTable('orders')) {
                    throw new \RuntimeException('Orders table is unavailable.');
                }

                $columns = Schema::getColumnListing('orders');
                $primaryKey = in_array('order_id', $columns, true)
                    ? 'order_id'
                    : (
                        in_array('id', $columns, true)
                            ? 'id'
                            : null
                    );

                if (!$primaryKey) {
                    throw new \RuntimeException('Order primary key is unavailable.');
                }

                $lockedQuery = DB::table('orders')
                    ->whereIn($primaryKey, $orderIds);

                $this->applyTableScope(
                    $lockedQuery,
                    $columns,
                    $source
                );

                $lockedIds = $lockedQuery
                    ->lockForUpdate()
                    ->pluck($primaryKey)
                    ->map(static fn ($id): int => (int)$id)
                    ->filter()
                    ->values()
                    ->all();

                sort($lockedIds);
                $expectedIds = $orderIds;
                sort($expectedIds);

                if ($lockedIds !== $expectedIds) {
                    return [
                        'ok' => false,
                        'http_status' => 409,
                        'message' => 'One of the checks moved already. Refresh and try again.',
                    ];
                }

                $updates = [];

                foreach (
                    ['table_id', 'dining_table_id', 'location_table_id']
                    as $column
                ) {
                    if (in_array($column, $columns, true)) {
                        $updates[$column] = (int)$target['id'];
                    }
                }

                if (in_array('table_no', $columns, true)) {
                    $updates['table_no'] = (string)$target['number'];
                }

                if (in_array('table_name', $columns, true)) {
                    $updates['table_name'] = (string)$target['name'];
                }

                if (in_array('order_type', $columns, true)) {
                    $updates['order_type'] = (string)(int)$target['id'];
                }

                if (in_array('updated_at', $columns, true)) {
                    $updates['updated_at'] = date('Y-m-d H:i:s');
                }

                if (!$updates) {
                    throw new \RuntimeException(
                        'No canonical table reference exists on orders.'
                    );
                }

                DB::table('orders')
                    ->whereIn($primaryKey, $orderIds)
                    ->update($updates);

                $remainingSourceChecks = max(
                    0,
                    count($sourceOrders) - count($orderIds)
                );

                $sourceCurrentStatus =
                    $this->quickPosTransferTableStatus(
                        (int)$source['id']
                    );

                $sourceNext = $scope === 'table'
                    ? 'cleaning'
                    : (
                        $remainingSourceChecks > 0
                            ? ($sourceCurrentStatus ?: 'occupied')
                            : 'available'
                    );

                $context = [
                    'source_table_id' => (int)$source['id'],
                    'target_table_id' => (int)$target['id'],
                    'scope' => $scope,
                    'order_ids' => $orderIds,
                ];

                $historyOrderId = count($orderIds) === 1
                    ? (int)$orderIds[0]
                    : null;

                $sourceStatus = $this->quickPosTransferSetTableStatus(
                    (int)$source['id'],
                    $sourceNext,
                    $scope === 'table'
                        ? 'pos_table_moved_to_'.$target['id']
                        : 'pos_check_moved_to_'.$target['id'],
                    $historyOrderId,
                    $context
                );

                $targetStatus = $this->quickPosTransferSetTableStatus(
                    (int)$target['id'],
                    'occupied',
                    $scope === 'table'
                        ? 'pos_table_moved_from_'.$source['id']
                        : 'pos_check_moved_from_'.$source['id'],
                    $historyOrderId,
                    $context
                );

                return [
                    'ok' => true,
                    'moved_order_ids' => $orderIds,
                    'source_table_id' => (int)$source['id'],
                    'target_table_id' => (int)$target['id'],
                    'source_status' => $sourceStatus,
                    'target_status' => $targetStatus,
                ];
            });

            $status = (int)($result['http_status'] ?? 200);
            unset($result['http_status']);

            if (empty($result['ok'])) {
                return response()->json($result, $status);
            }

            $count = count((array)($result['moved_order_ids'] ?? []));

            $result['message'] = $scope === 'table'
                ? 'Table moved to '.$this->quickPosTransferTableLabel($target).'.'
                : 'Check #'.(int)$orderIds[0].' moved to '.$this->quickPosTransferTableLabel($target).'.';

            $result['moved_count'] = $count;

            return response()->json($result);
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'message' => 'Could not move the check. Please try again.',
            ], 500);
        }
    }

    protected function quickPosTransferTableLabel(array $table): string
    {
        $number = trim((string)($table['number'] ?? ''));

        return $number !== ''
            ? 'table '.$number
            : 'table '.(int)($table['id'] ?? 0);
    }

    protected function quickPosTransferTableStatus(int $tableId): string
    {
        if (
            $tableId < 1
            || !Schema::hasTable('tables')
            || !Schema::hasColumn('tables', 'operational_status')
        ) {
            return '';
        }

        $columns = Schema::getColumnListing('tables');
        $primaryKey = in_array('table_id', $columns, true)
            ? 'table_id'
            : (
                in_array('id', $columns, true)
                    ? 'id'
                    : null
            );

        if (!$primaryKey) {
            return '';
        }

        return $this->quickPosNormalizeTableStatus(
            (string)(
                DB::table('tables')
                    ->where($primaryKey, $tableId)
                    ->value('operational_status')
                ?? 'available'
            )
        );
    }

    protected function quickPosTransferSetTableStatus(
        int $tableId,
        string $next,
        string $reason,
        ?int $orderId,
        array $context
    ): string {
        if (
            $tableId < 1
            || !Schema::hasTable('tables')
        ) {
            return $next;
        }

        $columns = Schema::getColumnListing('tables');
        $primaryKey = in_array('table_id', $columns, true)
            ? 'table_id'
            : (
                in_array('id', $columns, true)
                    ? 'id'
                    : null
            );

        if (!$primaryKey) {
            return $next;
        }

        $row = DB::table('tables')
            ->where($primaryKey, $tableId)
            ->lockForUpdate()
            ->first();

        if (!$row) {
            return $next;
        }

        $raw = (array)$row;
        $old = $this->quickPosNormalizeTableStatus(
            (string)($raw['operational_status'] ?? 'available')
        );

        if (
            in_array('operational_status', $columns, true)
            && $old !== $next
        ) {
            $updates = [
                'operational_status' => $next,
            ];

            if (
                in_array(
                    'operational_status_updated_at',
                    $columns,
                    true
                )
            ) {
                $updates['operational_status_updated_at'] =
                    date('Y-m-d H:i:s');
            }

            if (
                in_array(
                    'operational_status_updated_by',
                    $columns,
                    true
                )
            ) {
                $updates['operational_status_updated_by'] =
                    $this->currentUserId();
            }

            if (in_array('updated_at', $columns, true)) {
                $updates['updated_at'] = date('Y-m-d H:i:s');
            }

            DB::table('tables')
                ->where($primaryKey, $tableId)
                ->update($updates);

            $this->quickPosWriteTransferHistory(
                $tableId,
                $old,
                $next,
                $reason,
                $orderId,
                $context
            );
        }

        return $next;
    }

    protected function quickPosWriteTransferHistory(
        int $tableId,
        string $old,
        string $new,
        string $reason,
        ?int $orderId,
        array $context
    ): void {
        $historyTable = null;

        foreach (
            ['pmd_table_status_history', 'ti_pmd_table_status_history']
            as $candidate
        ) {
            if (Schema::hasTable($candidate)) {
                $historyTable = $candidate;
                break;
            }
        }

        if (!$historyTable) {
            return;
        }

        $columns = Schema::getColumnListing($historyTable);

        $row = array_intersect_key([
            'table_id' => $tableId,
            'old_status' => $old,
            'new_status' => $new,
            'reason' => substr($reason, 0, 100),
            'actor_id' => $this->currentUserId(),
            'order_id' => $orderId,
            'context' => json_encode($context),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ], array_flip($columns));

        if ($row) {
            DB::table($historyTable)->insert($row);
        }
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
     * PMD_QPOS_HISTORY_STRUCTURED_V20
     *
     * Compact, schema-safe operational history for the POS. It intentionally
     * reads existing canonical order/payment/note/status tables only; no new
     * audit store is introduced.
     */
    public function history()
    {
        $scope = strtolower(trim((string)request()->query('scope', 'selected')));
        $tableId = max(0, (int)request()->query('table_id', 0));
        $limit = max(20, min(500, (int)request()->query('limit', 160)));
        $fromRaw = trim((string)request()->query('from', ''));
        $toRaw = trim((string)request()->query('to', ''));
        $fromDate = preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $fromRaw)
            ? $fromRaw
            : '';
        $toDate = preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $toRaw)
            ? $toRaw
            : '';
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

        if ($orderSort !== $primaryKey) {
            if ($fromDate !== '') {
                $query->where($orderSort, '>=', $fromDate.' 00:00:00');
            }
            if ($toDate !== '') {
                $query->where($orderSort, '<=', $toDate.' 23:59:59');
            }
        }

        $orders = $query
            ->orderByDesc($orderSort)
            ->limit(min(500, $limit))
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
            $itemSummary = '';
            $itemCount = (int)$itemRows->count();
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
                    $itemSummary = $summary;
                    $parts[] = $summary;
                }
            }

            $comment = $this->quickPosVisibleNote(
                (string)($raw['comment'] ?? '')
            );
            if ($comment !== '') {
                $parts[] = 'Note: '.$comment;
            }

            $invoicePrefix = trim((string)($raw['invoice_prefix'] ?? ''));
            $invoiceNumber = $invoicePrefix !== ''
                ? $invoicePrefix.$orderId
                : '';

            $entries[] = [
                'kind' => 'order',
                'time' => (string)($raw['updated_at'] ?? $raw['created_at'] ?? ''),
                'title' => 'Order #'.$orderId,
                'detail' => implode(' · ', $parts),
                'order_id' => $orderId,
                'total' => $total,
                'status' => $statusName,
                'settlement_status' => $settlement,
                'invoice_number' => $invoiceNumber,
                'invoice_url' => '/admin/orders/invoice/'.$orderId,
                'item_count' => $itemCount,
                'item_summary' => $itemSummary,
                'note' => $comment,
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
                    $transactionId = (int)(
                        $raw['id']
                        ?? $raw['transaction_id']
                        ?? 0
                    );

                    $entries[] = [
                        'kind' => 'payment',
                        'time' => (string)($raw['paid_at'] ?? $raw['created_at'] ?? ''),
                        'title' => 'Payment · Order #'.(int)($raw['order_id'] ?? 0),
                        'detail' => implode(' · ', $parts),
                        'order_id' => (int)($raw['order_id'] ?? 0),
                        'payment_method' => (string)($raw['payment_method'] ?? ''),
                        'amount' => (float)($raw['amount'] ?? 0),
                        'tip_amount' => $tip,
                        'cash_received' => array_key_exists('cash_received', $raw)
                            && $raw['cash_received'] !== null
                                ? (float)$raw['cash_received']
                                : null,
                        'change_due' => $change,
                        'payer_label' => $payer,
                        'payment_reference' => $reference,
                        'payment_note' => $paymentNote,
                        'transaction_id' => $transactionId ?: null,
                        'receipt_url' => $transactionId > 0
                            ? '/admin/orders/split-receipt/'.$transactionId
                            : null,
                        'invoice_url' => $transactionId > 0
                            ? '/admin/orders/split-invoice/'.$transactionId
                            : null,
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
                        'status_name' => $statusName,
                        'status_comment' => trim((string)($raw['comment'] ?? '')),
                    ];
                }
            }
        }

        if ($scope !== 'pickup' && Schema::hasTable('table_notes')) {
            $cols = Schema::getColumnListing('table_notes');
            if (in_array('table_id', $cols, true)) {
                $tableNoteQuery = DB::table('table_notes');

                if ($scope === 'table' && $tableId > 0) {
                    $tableNoteQuery->where('table_id', $tableId);
                } elseif ($scope === 'all') {
                    $locationTableIds = array_values(array_filter(array_map(
                        'intval',
                        array_column(
                            $this->quickPosTables($locationId, [], '', false),
                            'id'
                        )
                    )));

                    if ($locationTableIds) {
                        $tableNoteQuery->whereIn('table_id', $locationTableIds);
                    } else {
                        $tableNoteQuery->whereRaw('1 = 0');
                    }
                }

                $timeColumn = in_array('created_at', $cols, true)
                    ? 'created_at'
                    : (
                        in_array('timestamp', $cols, true)
                            ? 'timestamp'
                            : null
                    );

                if ($timeColumn) {
                    if ($fromDate !== '') {
                        $tableNoteQuery->where(
                            $timeColumn,
                            '>=',
                            $fromDate.' 00:00:00'
                        );
                    }
                    if ($toDate !== '') {
                        $tableNoteQuery->where(
                            $timeColumn,
                            '<=',
                            $toDate.' 23:59:59'
                        );
                    }
                }

                $rows = $tableNoteQuery
                    ->orderByDesc(
                        $timeColumn
                            ?: (in_array('id', $cols, true) ? 'id' : 'table_id')
                    )
                    ->limit(min(180, $limit))
                    ->get();

                foreach ($rows as $row) {
                    $raw = (array)$row;
                    $note = trim((string)(
                        $raw['note']
                        ?? $raw['message']
                        ?? ''
                    ));
                    if ($note === '') {
                        continue;
                    }

                    $noteTableId = (int)($raw['table_id'] ?? 0);
                    $entries[] = [
                        'kind' => 'table_note',
                        'time' => (string)(
                            $raw['created_at']
                            ?? $raw['timestamp']
                            ?? $raw['updated_at']
                            ?? ''
                        ),
                        'title' => $noteTableId > 0
                            ? 'Table note · Table '.$noteTableId
                            : 'Table note',
                        'detail' => $note,
                        'order_id' => isset($raw['order_id'])
                            ? (int)$raw['order_id']
                            : null,
                        'table_id' => $noteTableId ?: null,
                    ];
                }
            }
        }

        /* PMD_QPOS_HISTORY_NOTIFICATIONS_V15
         * Waiter calls and table notes are first-class history events. */
        if ($scope !== 'pickup' && Schema::hasTable('notifications')) {
            $cols = Schema::getColumnListing('notifications');
            if (
                in_array('table_id', $cols, true)
                && in_array('type', $cols, true)
            ) {
                $notificationQuery = DB::table('notifications')
                    ->whereIn('type', ['waiter_call', 'table_note']);

                if ($scope === 'table' && $tableId > 0) {
                    $notificationQuery->where('table_id', $tableId);
                } elseif ($scope === 'all') {
                    $locationTableIds = array_values(array_filter(array_map(
                        'intval',
                        array_column($this->quickPosTables($locationId, [], '', false), 'id')
                    )));
                    if ($locationTableIds) {
                        $notificationQuery->whereIn('table_id', $locationTableIds);
                    } else {
                        $notificationQuery->whereRaw('1 = 0');
                    }
                }

                if (in_array('created_at', $cols, true)) {
                    if ($fromDate !== '') {
                        $notificationQuery->where(
                            'created_at',
                            '>=',
                            $fromDate.' 00:00:00'
                        );
                    }
                    if ($toDate !== '') {
                        $notificationQuery->where(
                            'created_at',
                            '<=',
                            $toDate.' 23:59:59'
                        );
                    }
                }

                $rows = $notificationQuery
                    ->orderByDesc(
                        in_array('created_at', $cols, true)
                            ? 'created_at'
                            : (
                                in_array('notification_id', $cols, true)
                                    ? 'notification_id'
                                    : 'table_id'
                            )
                    )
                    ->limit(min(160, $limit))
                    ->get();

                foreach ($rows as $row) {
                    $raw = (array)$row;
                    $type = strtolower(trim((string)($raw['type'] ?? '')));
                    $title = trim((string)($raw['title'] ?? ''));
                    $message = trim((string)($raw['message'] ?? ''));
                    $notificationTableId = (int)($raw['table_id'] ?? 0);

                    $entries[] = [
                        'kind' => $type === 'waiter_call'
                            ? 'waiter_call'
                            : 'table_note',
                        'time' => (string)(
                            $raw['created_at']
                            ?? $raw['updated_at']
                            ?? ''
                        ),
                        'title' => $title !== ''
                            ? $title
                            : (
                                $type === 'waiter_call'
                                    ? 'Waiter call · Table '.$notificationTableId
                                    : 'Table note · Table '.$notificationTableId
                            ),
                        'detail' => $message,
                        'order_id' => null,
                        'table_id' => $notificationTableId,
                        'status' => (string)($raw['status'] ?? ''),
                        'priority' => (string)($raw['priority'] ?? ''),
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
                } elseif ($scope === 'all') {
                    $locationTableIds = array_values(array_filter(array_map(
                        'intval',
                        array_column(
                            $this->quickPosTables($locationId, [], '', false),
                            'id'
                        )
                    )));

                    if ($locationTableIds) {
                        $tableStatusQuery->whereIn(
                            'table_id',
                            $locationTableIds
                        );
                    } else {
                        $tableStatusQuery->whereRaw('1 = 0');
                    }
                }

                $rows = $tableStatusQuery
                    ->orderByDesc(
                        in_array('created_at', $cols, true)
                            ? 'created_at'
                            : 'id'
                    )
                    ->limit(min(240, $limit))
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
                        'table_id' => (int)($raw['table_id'] ?? 0),
                        'old_status' => (string)($raw['old_status'] ?? ''),
                        'new_status' => (string)($raw['new_status'] ?? ''),
                        'reason' => $reason,
                    ];
                }
            }
        }

        $fromTs = $fromDate !== ''
            ? (strtotime($fromDate.' 00:00:00') ?: 0)
            : 0;
        $toTs = $toDate !== ''
            ? (strtotime($toDate.' 23:59:59') ?: PHP_INT_MAX)
            : PHP_INT_MAX;

        if ($fromTs > 0 || $toTs < PHP_INT_MAX) {
            $entries = array_values(array_filter(
                $entries,
                static function (array $entry) use ($fromTs, $toTs): bool {
                    $time = strtotime((string)($entry['time'] ?? '')) ?: 0;
                    if ($time <= 0) {
                        return false;
                    }
                    return $time >= $fromTs && $time <= $toTs;
                }
            ));
        }

        usort($entries, function (array $a, array $b): int {
            return (strtotime((string)($b['time'] ?? '')) ?: 0)
                <=> (strtotime((string)($a['time'] ?? '')) ?: 0);
        });

        return response()->json([
            'ok' => true,
            'version' => 'pmd-qpos-history-v15',
            'scope' => $scope,
            'scope_label' => $scopeLabel,
            'from' => $fromDate,
            'to' => $toDate,
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

    /* PMD_QPOS_EXACT_DASHBOARD_FLOOR_SERVER_TABLES_V26
     * Copied from DashboardLab's server-first exact Floor normalization so
     * the POS Map cannot drift visually or geometrically from Dashboard.
     */
    protected function quickPosBuildFloorDisplayTables(
        array $data,
        array $layout,
        array $state,
        string $mode
    ): array {
        $rawTables = $data['tables']
            ?? ($data['sections']['floor_plan']['tables'] ?? []);

        if (!is_array($rawTables)) {
            $rawTables = [];
        }

        /* PMD_DASHBOARD_LAB_FLOOR_SERVER_NORMALIZE_V2 */
        $orders = $data['orders']
            ?? ($data['current_orders'] ?? []);

        if (!is_array($orders)) {
            $orders = [];
        }

        $layoutById = [];
        foreach (($layout['tables'] ?? []) as $item) {
            if (!is_array($item)) {
                continue;
            }

            $id = trim((string)(
                $item['id']
                ?? $item['table_id']
                ?? $item['table_no']
                ?? $item['table_number']
                ?? ''
            ));

            if ($id !== '') {
                $layoutById[$id] = $item;
            }
        }

        $tables = [];

        foreach ($rawTables as $index => $raw) {
            if (!is_array($raw)) {
                continue;
            }

            $id = trim((string)(
                $raw['id']
                ?? $raw['table_id']
                ?? $raw['location_table_id']
                ?? $raw['number']
                ?? $raw['table_number']
                ?? ''
            ));

            $number = trim((string)(
                $raw['number']
                ?? $raw['table_number']
                ?? $raw['table_no']
                ?? $raw['id']
                ?? $raw['table_id']
                ?? ''
            ));

            if ($id === '' || $number === '') {
                continue;
            }

            $cleanFloorKey = static function ($value): string {
                $value = preg_replace(
                    '/\s+/',
                    ' ',
                    (string)$value
                );

                return trim((string)$value);
            };

            $tableKeys = array_values(array_filter(array_map(
                $cleanFloorKey,
                [
                    $raw['id'] ?? null,
                    $raw['table_id'] ?? null,
                    $raw['number'] ?? null,
                    $raw['table_number'] ?? null,
                    $raw['table_no'] ?? null,
                    $raw['name'] ?? null,
                    $raw['label'] ?? null,
                ]
            ), static fn ($value) => $value !== ''));

            $linkedOrders = array_values(array_filter(
                $orders,
                static function ($order) use (
                    $tableKeys,
                    $cleanFloorKey
                ): bool {
                    if (!is_array($order)) {
                        return false;
                    }

                    $orderKeys = array_values(array_filter(array_map(
                        $cleanFloorKey,
                        [
                            $order['table_id'] ?? null,
                            $order['location_table_id'] ?? null,
                            $order['table_number'] ?? null,
                            $order['table_no'] ?? null,
                            $order['table_ref'] ?? null,
                            $order['table'] ?? null,
                            $order['table_label'] ?? null,
                        ]
                    ), static fn ($value) => $value !== ''));

                    return count(
                        array_intersect($tableKeys, $orderKeys)
                    ) > 0;
                }
            ));

            $linkedOrderHasNote = count(array_filter(
                $linkedOrders,
                static function ($order): bool {
                    return trim((string)(
                        $order['note']
                        ?? $order['comment']
                        ?? ''
                    )) !== '';
                }
            )) > 0;

            $custom = is_array($state['tables'][$id] ?? null)
                ? $state['tables'][$id]
                : [];

            $rawStatus = strtolower(trim((string)(
                $custom['status']
                ?? $raw['status']
                ?? $raw['latest_order_status']
                ?? ''
            )));

            // PMD_R65_ORDERS_SWITCH_PHYSICAL_FLOOR_AUTHORITY
            // Physical table occupancy is independent from kitchen/payment state.
            // If the canonical table row provides operational_status, it owns the
            // available/occupied/cleaning/reserved decision. Order-derived status
            // is compatibility fallback only for legacy rows without that field.
            $operationalStatus = strtolower(trim((string)(
                $raw['operational_status']
                ?? $raw['table_operational_status']
                ?? ''
            )));
            if ($operationalStatus === 'free') $operationalStatus = 'available';
            $hasOperationalAuthority = in_array(
                $operationalStatus,
                ['available', 'occupied', 'cleaning', 'reserved'],
                true
            );

            $waiterCall = $rawStatus === 'waiter-call'
                || $this->quickPosFloorBool($raw['waiter_call'] ?? false)
                || $this->quickPosFloorBool($raw['needs_waiter'] ?? false)
                || $this->quickPosFloorBool($raw['call_waiter'] ?? false);

            $cleaning = $hasOperationalAuthority
                ? $operationalStatus === 'cleaning'
                : ($rawStatus === 'cleaning'
                    || $this->quickPosFloorBool($raw['cleaning_required'] ?? false)
                    || $this->quickPosFloorBool($raw['needs_cleaning'] ?? false));

            $reserved = $hasOperationalAuthority
                ? $operationalStatus === 'reserved'
                : ($rawStatus === 'reserved'
                    || $this->quickPosFloorBool($raw['reserved'] ?? false)
                    || $this->quickPosFloorBool($raw['is_reserved'] ?? false));

            $occupied = $hasOperationalAuthority
                ? $operationalStatus === 'occupied'
                : ($rawStatus === 'occupied'
                    || count($linkedOrders) > 0
                    || (int)($raw['open_orders'] ?? 0) > 0);

            $note = trim((string)(
                $custom['note']
                ?? $raw['note']
                ?? $raw['comment']
                ?? ''
            ));

            $status = ($waiterCall || $note !== '' || $linkedOrderHasNote)
                ? 'attention'
                : ($cleaning
                    ? 'cleaning'
                    : ($reserved
                        ? 'reserved'
                        : ($occupied ? 'occupied' : 'available')));

            /*
             * Match Floor V1 normalize() exactly for first paint.
             * The browser engine reads raw.floor_x/raw.floor.y here;
             * using the secondary layout response on the server caused
             * a second coordinate authority and a refresh-time position swap.
             */
            $floor = is_array($raw['floor'] ?? null)
                ? $raw['floor']
                : [];

            $x = $this->quickPosFloorNumber(
                $raw['floor_x']
                    ?? $floor['x']
                    ?? null,
                80 + (($index % 6) * 150)
            );

            $y = $this->quickPosFloorNumber(
                $raw['floor_y']
                    ?? $floor['y']
                    ?? null,
                60 + (floor($index / 6) * 110)
            );

            // Same initial 1000x560 clamp used by Floor V1 normalize().
            $x = max(64.0, min(936.0, $x));
            $y = max(54.0, min(506.0, $y));

            $tables[$id] = [
                'id' => $id,
                'number' => $number,
                'name' => trim((string)(
                    $raw['name']
                    ?? $raw['label']
                    ?? ('Table '.$number)
                )),
                'area' => trim((string)(
                    $raw['section']
                    ?? $raw['table_section']
                    ?? $raw['table_zone']
                    ?? $raw['zone']
                    ?? $raw['floor_name']
                    ?? 'Main'
                )),
                'capacity' => (int)(
                    $raw['capacity']
                    ?? $raw['table_capacity']
                    ?? 0
                ),
                'status' => $status,
                'waiter_call' => $waiterCall,
                'cleaning' => $cleaning,
                'note' => $note,
                'open_orders' => (int)($raw['open_orders'] ?? 0),
                'x' => $x,
                'y' => $y,
                'w' => 108,
                'h' => 88,
                'is_merged' => false,
                'merge_id' => null,
                'member_ids' => [],
                'smallest_number' => is_numeric($number)
                    ? (float)$number
                    : 999999,
            ];
        }

        $handled = [];
        $display = [];
        $merges = is_array($state['merges'] ?? null)
            ? $state['merges']
            : [];

        foreach ($tables as $id => $table) {
            if (isset($handled[$id])) {
                continue;
            }

            $mergeId = null;
            $memberIds = [];

            foreach ($merges as $candidateId => $merge) {
                $ids = array_map('strval', (array)($merge['table_ids'] ?? []));
                if (in_array((string)$id, $ids, true)) {
                    $mergeId = (string)$candidateId;
                    $memberIds = $ids;
                    break;
                }
            }

            if ($mergeId === null) {
                $display[] = $table;
                $handled[$id] = true;
                continue;
            }

            $members = [];
            foreach ($memberIds as $memberId) {
                if (isset($tables[$memberId])) {
                    $members[] = $tables[$memberId];
                    $handled[$memberId] = true;
                }
            }

            if (count($members) < 2) {
                $display[] = $table;
                continue;
            }

            usort($members, static function ($left, $right) {
                return ($left['smallest_number'] <=> $right['smallest_number'])
                    ?: strnatcasecmp($left['number'], $right['number']);
            });

            $priority = [
                'available' => 1,
                'occupied' => 2,
                'reserved' => 3,
                'cleaning' => 4,
                'attention' => 5,
                'waiter-call' => 5,
            ];

            $status = 'available';
            foreach ($members as $member) {
                if (($priority[$member['status']] ?? 0) > ($priority[$status] ?? 0)) {
                    $status = $member['status'];
                }
            }

            $numbers = array_column($members, 'number');
            $display[] = [
                'id' => $members[0]['id'],
                'number' => implode(' + ', $numbers),
                'name' => 'Merged tables '.implode(', ', $numbers),
                'area' => $members[0]['area'],
                'capacity' => array_sum(array_column($members, 'capacity')),
                'status' => $status,
                'waiter_call' => count(array_filter(
                    $members,
                    static fn ($member) => $member['waiter_call']
                )) > 0,
                'cleaning' => count(array_filter(
                    $members,
                    static fn ($member) => $member['cleaning']
                )) > 0,
                'note' => implode(' · ', array_values(array_filter(
                    array_column($members, 'note')
                ))),
                'open_orders' => array_sum(array_column($members, 'open_orders')),
                'x' => array_sum(array_column($members, 'x')) / count($members),
                'y' => array_sum(array_column($members, 'y')) / count($members),
                'w' => $mode === 'row' ? 270 : 178,
                'h' => $mode === 'row' ? 104 : 146,
                'is_merged' => true,
                'merge_id' => $mergeId,
                'member_ids' => array_column($members, 'id'),
                'smallest_number' => min(array_column($members, 'smallest_number')),
            ];
        }

        if ($mode === 'row') {
            usort($display, static function ($left, $right) {
                return ($left['smallest_number'] <=> $right['smallest_number'])
                    ?: strnatcasecmp($left['number'], $right['number']);
            });

            $cursor = 24.0;
            foreach ($display as &$table) {
                $table['x'] = $cursor + ($table['w'] / 2);
                $table['y'] = 22 + ($table['h'] / 2);
                $cursor += $table['w'] + 18;
            }
            unset($table);
        }

        return array_values($display);
    }

    protected function quickPosFloorBool($value): bool
    {
        return in_array(
            $value,
            [true, 1, '1', 'true'],
            true
        );
    }

    protected function quickPosFloorNumber($value, float $fallback): float
    {
        return is_numeric($value)
            ? (float)$value
            : $fallback;
    }


    protected function quickPosTables(
        int $locationId,
        array $floorSnapshot = [],
        string $defaultFloorId = '',
        bool $withSignals = true
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
                'floor_x',
                'floor_y',
                'floor_width',
                'floor_height',
                'floor_shape',
                'visible_on_floor_plan',
                'table_section',
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
                    $number = trim((string)(
                        preg_replace('/^table\\s*/iu', '', $number)
                        ?? $number
                    ));
                    if ($number === '') {
                        $number = (string)$id;
                    }

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

                    /* PMD_QPOS_FLOOR_MAP_V25
                     * Reuse the same physical table coordinates that power the
                     * shared Cashier/Dashboard/Reservations floor surfaces.
                     * No second floor-layout authority is introduced here. */
                    $floorX = isset($row->floor_x)
                        && is_numeric($row->floor_x)
                            ? (float)$row->floor_x
                            : null;
                    $floorY = isset($row->floor_y)
                        && is_numeric($row->floor_y)
                            ? (float)$row->floor_y
                            : null;
                    $floorWidth = isset($row->floor_width)
                        && is_numeric($row->floor_width)
                            ? max(72.0, (float)$row->floor_width)
                            : 170.0;
                    $floorHeight = isset($row->floor_height)
                        && is_numeric($row->floor_height)
                            ? max(58.0, (float)$row->floor_height)
                            : 88.0;

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
                        'floor_x' => $floorX,
                        'floor_y' => $floorY,
                        'floor_width' => $floorWidth,
                        'floor_height' => $floorHeight,
                        'floor_shape' => trim((string)(
                            $row->floor_shape
                            ?? 'rectangle'
                        )) ?: 'rectangle',
                        'visible_on_floor_plan' => !isset(
                            $row->visible_on_floor_plan
                        ) || (bool)$row->visible_on_floor_plan,
                        'section' => trim((string)(
                            $row->table_section
                            ?? ''
                        )),
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
            return $withSignals
                ? $this->quickPosDecorateTableSignals($tables, $locationId)
                : $tables;
        } catch (\Throwable $error) {
            report($error);
            return [];
        }
    }

    /**
     * PMD_QPOS_TABLE_SIGNALS_V15
     *
     * Tiny cashier-facing signals only. Physical status remains authoritative;
     * payment/note/call signals never change Free/Busy/Clean/Reserved.
     */
    protected function quickPosDecorateTableSignals(
        array $tables,
        int $locationId
    ): array {
        if (!$tables) {
            return [];
        }

        $indexByKey = [];
        $tableById = [];
        $signals = [];

        foreach ($tables as $index => $table) {
            $id = (int)($table['id'] ?? 0);
            if ($id < 1) {
                continue;
            }

            $signals[$id] = [
                'payment_state' => 'none',
                'due_amount' => 0.0,
                'waiter_calls' => 0,
                'note_count' => 0,
            ];
            $tableById[$id] = $table;

            $number = strtolower(trim((string)($table['number'] ?? '')));
            $name = strtolower(trim((string)($table['name'] ?? '')));

            foreach (array_unique(array_filter([
                (string)$id,
                $number,
                $name,
                $number !== '' ? 'table '.$number : '',
            ])) as $key) {
                if (!isset($indexByKey[$key])) {
                    $indexByKey[$key] = $id;
                }
            }
        }

        try {
            if (Schema::hasTable('orders')) {
                $cols = Schema::getColumnListing('orders');
                $primaryKey = in_array('order_id', $cols, true)
                    ? 'order_id'
                    : (in_array('id', $cols, true) ? 'id' : null);

                if ($primaryKey && in_array('order_type', $cols, true)) {
                    $select = array_values(array_intersect([
                        $primaryKey,
                        'order_type',
                        'order_total',
                        'total',
                        'settled_amount',
                        'settlement_status',
                        'payment_status',
                        'comment',
                        'created_at',
                        'updated_at',
                        'location_id',
                    ], $cols));

                    $query = DB::table('orders');

                    if (
                        $locationId > 0
                        && in_array('location_id', $cols, true)
                    ) {
                        $query->where('location_id', $locationId);
                    }

                    if (in_array('created_at', $cols, true)) {
                        $query->where(
                            'created_at',
                            '>=',
                            now()->subHours(36)->format('Y-m-d H:i:s')
                        );
                    }

                    $rows = $query
                        ->orderByDesc($primaryKey)
                        ->limit(600)
                        ->get($select ?: ['*']);

                    $seen = [];

                    foreach ($rows as $row) {
                        $raw = (array)$row;
                        $ref = strtolower(trim((string)($raw['order_type'] ?? '')));
                        if ($ref === '') {
                            continue;
                        }

                        $tableId = 0;
                        if (ctype_digit($ref)) {
                            $numericRef = (int)$ref;
                            if (isset($signals[$numericRef])) {
                                $tableId = $numericRef;
                            }
                        }
                        if ($tableId < 1) {
                            $tableId = (int)($indexByKey[$ref] ?? 0);
                        }

                        if ($tableId < 1 || isset($seen[$tableId])) {
                            continue;
                        }
                        $seen[$tableId] = true;

                        $tableRow = $tableById[$tableId] ?? [];
                        $physical = strtolower(trim((string)(
                            $tableRow['status'] ?? 'available'
                        )));

                        // Avoid stale financial badges on a physically free table.
                        if ($physical === 'available') {
                            continue;
                        }

                        $total = (float)(
                            $raw['order_total']
                            ?? $raw['total']
                            ?? 0
                        );
                        $settled = max(0, (float)(
                            $raw['settled_amount']
                            ?? 0
                        ));
                        $remaining = max(0, $total - $settled);
                        $settlement = strtolower(trim((string)(
                            $raw['settlement_status']
                            ?? $raw['payment_status']
                            ?? ''
                        )));

                        if (
                            $settlement === 'paid'
                            || $settlement === 'settled'
                            || $settlement === 'closed'
                            || ($total > 0 && $remaining <= 0.005)
                        ) {
                            $signals[$tableId]['payment_state'] = 'paid';
                        } elseif ($settled > 0.005) {
                            $signals[$tableId]['payment_state'] = 'partial';
                            $signals[$tableId]['due_amount'] = $remaining;
                        } elseif ($total > 0.005) {
                            $signals[$tableId]['payment_state'] = 'due';
                            $signals[$tableId]['due_amount'] = $remaining;
                        }

                        $note = $this->quickPosVisibleNote(
                            (string)($raw['comment'] ?? '')
                        );
                        if ($note !== '') {
                            $signals[$tableId]['note_count']++;
                        }
                    }
                }
            }
        } catch (\Throwable $error) {
            report($error);
        }

        try {
            if (Schema::hasTable('notifications')) {
                $cols = Schema::getColumnListing('notifications');
                $tableIds = array_values(array_filter(array_map(
                    'intval',
                    array_column($tables, 'id')
                )));

                if (
                    $tableIds
                    && in_array('table_id', $cols, true)
                    && in_array('type', $cols, true)
                ) {
                    $query = DB::table('notifications')
                        ->whereIn('table_id', $tableIds)
                        ->whereIn('type', ['waiter_call', 'table_note']);

                    if (in_array('status', $cols, true)) {
                        $query->where(function ($q) {
                            $q->whereNull('status')
                                ->orWhere('status', '!=', 'resolved');
                        });
                    }

                    if (in_array('created_at', $cols, true)) {
                        $query->where(
                            'created_at',
                            '>=',
                            now()->subDays(2)->format('Y-m-d H:i:s')
                        );
                    }

                    foreach ($query->limit(300)->get() as $row) {
                        $raw = (array)$row;
                        $tableId = (int)($raw['table_id'] ?? 0);
                        if (!isset($signals[$tableId])) {
                            continue;
                        }

                        $type = strtolower(trim((string)($raw['type'] ?? '')));
                        if ($type === 'waiter_call') {
                            $signals[$tableId]['waiter_calls']++;
                        } elseif ($type === 'table_note') {
                            $signals[$tableId]['note_count']++;
                        }
                    }
                }
            }
        } catch (\Throwable $error) {
            report($error);
        }

        foreach ($tables as &$table) {
            $id = (int)($table['id'] ?? 0);
            $signal = $signals[$id] ?? [
                'payment_state' => 'none',
                'due_amount' => 0.0,
                'waiter_calls' => 0,
                'note_count' => 0,
            ];

            $table['payment_state'] = (string)$signal['payment_state'];
            $table['due_amount'] = (float)$signal['due_amount'];
            $table['waiter_calls'] = (int)$signal['waiter_calls'];
            $table['note_count'] = (int)$signal['note_count'];
        }
        unset($table);

        return $tables;
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
