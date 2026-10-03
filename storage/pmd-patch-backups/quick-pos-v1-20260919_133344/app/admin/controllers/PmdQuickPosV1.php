<?php

namespace Admin\Controllers;

use Admin\Facades\AdminLocation;
use Admin\Models\Orders_model;
use Admin\Models\Tables_model;
use Admin\Services\PmdDefaultStaffRoleService;
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

        return view()->file(
            base_path('app/admin/views/pmd_quick_pos_v1.blade.php'),
            [
                'mode' => $mode,
                'canSwitchMode' => $this->quickPosCanSwitchMode(),
                'legacyOrdersUrl' => admin_url('orders'),
            ]
        );
    }

    public function bootstrap($mode = 'cashier')
    {
        $mode = $this->quickPosMode((string)$mode);
        $locationId = $this->quickPosLocationId();

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pos_entry'
        );

        $menu = $this->menuPayload($locationId);

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pos_menu'
        );

        $tables = $this->quickPosTables($locationId);

        \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
            'quick_pos_tables'
        );

        $user = $this->currentUser();

        return response()->json([
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
            'permissions' => [
                'orders' => true,
                'payments' => $this->canManagePayments(),
            ],
            'tables' => $tables,
            'categories' => array_values((array)($menu['categories'] ?? [])),
            'menu_items' => array_values((array)($menu['items'] ?? [])),
            'warnings' => [
                'unconfigured_price_items' => (int)($menu['unconfigured_price_items'] ?? 0),
            ],
            'settings' => [
                'currency' => $this->currencySymbol(),
                'currency_code' => $this->currencyCode(),
                'table_data_url' => '/admin/pmd-waiter-pos-v1/data/{table}',
                'table_save_url' => '/admin/pmd-waiter-pos-v1/save/{table}',
                'off_premise_save_url' => '/admin/pos/save-off-premise',
                'payment_summary_url' => '/admin/pmd-waiter-pos-v1/payment-summary/{order}',
                'payment_settle_url' => '/admin/pmd-waiter-pos-v1/payment-settle/{order}',
                'payment_coupon_url' => '/admin/pmd-waiter-pos-v1/payment-coupon/{order}',
                'terminal_payment_url' => '/admin/pmd-waiter-pos-v1/terminal-payment/{order}',
                'terminal_attempts_url' => '/admin/orders/{order}/terminal-payment-attempts',
                'terminal_refresh_url' => '/admin/terminal-payments/attempts/{attempt}/refresh',
                'table_state_url' => '/admin/pmd-waiter-table-states-v154/{table}',
            ],
        ]);
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
                            'order' => 'The selected takeaway order no longer exists.',
                        ]);
                    }

                    if (
                        strtolower(trim((string)($order->order_type ?? '')))
                        !== Orders_model::COLLECTION
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'This order is not a takeaway order.',
                        ]);
                    }

                    if (!$this->orderIsOpen($order)) {
                        throw ValidationException::withMessages([
                            'order' => 'This takeaway order can no longer accept item changes because payment has started or the order was cancelled.',
                        ]);
                    }

                    $expectedUpdatedAt = trim((string)($payload['expected_updated_at'] ?? ''));
                    if (
                        $expectedUpdatedAt !== ''
                        && $order->updated_at
                        && (string)$order->updated_at !== $expectedUpdatedAt
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'This takeaway order was changed by another user. Refresh before sending new items.',
                        ]);
                    }
                }

                $isNew = !$order;

                if (!$order) {
                    $order = new Orders_model();
                    $this->fillNewDeliveryOrder($order, $payload, $mode);
                    $order->order_type = Orders_model::COLLECTION;

                    if (Schema::hasColumn('orders', 'first_name')) {
                        $order->first_name = 'Takeaway';
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

                return [
                    'ok' => true,
                    'version' => 'pmd-quick-pos-v1',
                    'service_mode' => 'takeaway',
                    'mode' => $mode,
                    'created' => $isNew,
                    'order_id' => (int)$order->getKey(),
                    'order_total' => (float)($order->order_total ?? 0),
                    'total_items' => (int)($order->total_items ?? 0),
                    'updated_at' => (string)($order->updated_at ?? ''),
                    'message' => $mode === 'send'
                        ? 'Takeaway order sent to the kitchen.'
                        : 'Takeaway order saved.',
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
                    ?: 'The takeaway order could not be saved.',
                'errors' => $error->errors(),
            ], 422);
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'version' => 'pmd-quick-pos-v1',
                'message' => 'The takeaway order could not be saved. '.$error->getMessage(),
            ], 500);
        }
    }

    protected function quickPosTables(int $locationId): array
    {
        try {
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
                ->map(function ($row) {
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
