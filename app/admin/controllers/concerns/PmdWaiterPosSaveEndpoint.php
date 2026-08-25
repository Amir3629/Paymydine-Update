<?php

namespace Admin\Controllers\Concerns;

use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

trait PmdWaiterPosSaveEndpoint
{
    public function save($tableId = null)
    {
        $table = $this->resolveTable((int)$tableId);
        if (!$table) {
            return response()->json(['ok' => false, 'message' => 'Table not found.'], 404);
        }

        $payload = $this->requestPayload();
        $mode = strtolower(trim((string)($payload['mode'] ?? 'send')));
        if (!in_array($mode, ['hold', 'send'], true)) {
            $mode = 'send';
        }

        $cart = $payload['items'] ?? [];
        if (!is_array($cart) || count($cart) < 1) {
            return response()->json(['ok' => false, 'message' => 'Add at least one item.'], 422);
        }

        try {
            $result = DB::transaction(function () use ($table, $payload, $cart, $mode) {
                $requestedOrderId = (int)($payload['order_id'] ?? 0);
                $order = $this->resolveWritableOrder($table, $requestedOrderId, true);
                $isNew = !$order;

                if ($order) {
                    $expectedUpdatedAt = trim((string)($payload['expected_updated_at'] ?? ''));
                    if ($expectedUpdatedAt !== '' && $order->updated_at && (string)$order->updated_at !== $expectedUpdatedAt) {
                        throw ValidationException::withMessages([
                            'order' => 'This order was changed by another user. Refresh before sending new items.',
                        ]);
                    }
                }

                if (!$order) {
                    $order = new Orders_model();
                    $this->fillNewOrder($order, $table, $payload, $mode);
                    $order->saveOrFail();
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
                    $entry = '[Waiter POS] '.$note;
                    $alreadyPresent = $existing === $note
                        || strpos($existing, $entry) !== false
                        || strpos($existing, $note) !== false;
                    if (!$alreadyPresent) {
                        $order->comment = $existing === '' ? $entry : ($existing."\n".$entry);
                    }
                }

                if (Schema::hasColumn('orders', 'guest_count')) {
                    $order->guest_count = max(1, min(99, (int)($payload['guest_count'] ?? 1)));
                }

                if (Schema::hasColumn('orders', 'payment') && trim((string)$order->payment) === '') {
                    $order->payment = 'qr_pay_later';
                }
                if (Schema::hasColumn('orders', 'settlement_status') && !in_array((string)$order->settlement_status, ['partial', 'paid'], true)) {
                    $order->settlement_status = 'unpaid';
                }
                if (Schema::hasColumn('orders', 'settled_amount') && $order->settled_amount === null) {
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
                $this->recordWaiterPosNoteHistoryV26($order, $cart, $note, $mode);

                // Order lifecycle, payment lifecycle and table lifecycle are
                // independent. Creating/appending an order occupies the table;
                // payment completion deliberately does not release it.
                $this->markTableOccupiedForWaiterOrderV154($table, $order);

                if ($statusId && method_exists($order, 'addStatusHistory')) {
                    try {
                        $order->addStatusHistory($statusId, [
                            'comment' => $mode === 'send'
                                ? 'Sent from PayMyDine Waiter POS'
                                : 'Saved / held from PayMyDine Waiter POS',
                            'notify' => false,
                        ]);
                    } catch (\Throwable $ignored) {
                    }
                }

                $order->refresh();

                return [
                    'ok' => true,
                    'version' => 'pmd-waiter-pos-v2.6',
                    'mode' => $mode,
                    'created' => $isNew,
                    'order_id' => (int)$order->getKey(),
                    'order_total' => (float)($order->order_total ?? 0),
                    'total_items' => (int)($order->total_items ?? 0),
                    'updated_at' => (string)($order->updated_at ?? ''),
                    'message' => $mode === 'send'
                        ? 'Order sent to the kitchen.'
                        : 'Order saved without sending to the kitchen.',
                    'urls' => $this->orderUrls((int)$order->getKey()),
                ];
            });

            return response()->json($result);
        } catch (ValidationException $e) {
            return response()->json([
                'ok' => false,
                'version' => 'pmd-waiter-pos-v2.6',
                'message' => collect($e->errors())->flatten()->first() ?: 'The order could not be saved.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'version' => 'pmd-waiter-pos-v2.6',
                'message' => 'The order could not be saved. '.$e->getMessage(),
            ], 500);
        }
    }

    // PMD_CASHIER_DELIVERY_SAVE_R52
    //
    // No physical table is invented here.
    // Staff orders created without a selected table use the
    // canonical Orders_model::DELIVERY order type.
    public function saveDelivery()
    {
        $payload =
            $this->requestPayload();

        $mode =
            strtolower(
                trim(
                    (string)(
                        $payload['mode'] ??
                        'send'
                    )
                )
            );

        if (
            !in_array(
                $mode,
                ['hold', 'send'],
                true
            )
        ) {
            $mode = 'send';
        }

        $cart =
            $payload['items'] ?? [];

        if (
            !is_array($cart) ||
            count($cart) < 1
        ) {
            return response()->json(
                [
                    'ok' => false,
                    'message' =>
                        'Add at least one item.',
                ],
                422
            );
        }

        try {
            $result =
                DB::transaction(
                    function () use (
                        $payload,
                        $cart,
                        $mode
                    ) {
                        $requestedOrderId =
                            (int)(
                                $payload['order_id'] ??
                                0
                            );

                        $order = null;

                        if ($requestedOrderId > 0) {
                            $order =
                                Orders_model::query()
                                    ->where(
                                        'order_id',
                                        $requestedOrderId
                                    )
                                    ->lockForUpdate()
                                    ->first();

                            if (!$order) {
                                throw ValidationException::withMessages(
                                    [
                                        'order' =>
                                            'The selected delivery order no longer exists.',
                                    ]
                                );
                            }

                            if (
                                strtolower(
                                    trim(
                                        (string)(
                                            $order->order_type ??
                                            ''
                                        )
                                    )
                                ) !==
                                Orders_model::DELIVERY
                            ) {
                                throw ValidationException::withMessages(
                                    [
                                        'order' =>
                                            'This order is not a delivery order.',
                                    ]
                                );
                            }

                            if (
                                !$this->orderIsOpen(
                                    $order
                                )
                            ) {
                                throw ValidationException::withMessages(
                                    [
                                        'order' =>
                                            'This delivery bill can no longer accept item changes because payment has started or the order was cancelled.',
                                    ]
                                );
                            }

                            $expectedUpdatedAt =
                                trim(
                                    (string)(
                                        $payload[
                                            'expected_updated_at'
                                        ] ??
                                        ''
                                    )
                                );

                            if (
                                $expectedUpdatedAt !== '' &&
                                $order->updated_at &&
                                (string)$order->updated_at !==
                                    $expectedUpdatedAt
                            ) {
                                throw ValidationException::withMessages(
                                    [
                                        'order' =>
                                            'This delivery order was changed by another user. Refresh before sending new items.',
                                    ]
                                );
                            }
                        }

                        $isNew =
                            !$order;

                        if (!$order) {
                            $order =
                                new Orders_model();

                            $this
                                ->fillNewDeliveryOrder(
                                    $order,
                                    $payload,
                                    $mode
                                );

                            $order->saveOrFail();

                            /*
                             * Orders_model has legacy session-table
                             * compatibility. Reassert Delivery after create
                             * so a stale table session can never relabel it.
                             */
                            if (
                                Schema::hasColumn(
                                    'orders',
                                    'order_type'
                                ) &&
                                strtolower(
                                    trim(
                                        (string)(
                                            $order->order_type ??
                                            ''
                                        )
                                    )
                                ) !==
                                Orders_model::DELIVERY
                            ) {
                                $order->order_type =
                                    Orders_model::DELIVERY;

                                $order->save();
                            }

                            $this
                                ->ensureBaseTotals(
                                    $order
                                );
                        }

                        $added =
                            $this->appendItems(
                                $order,
                                $cart
                            );

                        if ($added < 1) {
                            throw ValidationException::withMessages(
                                [
                                    'items' =>
                                        'No valid, priced menu items were added.',
                                ]
                            );
                        }

                        $note =
                            trim(
                                (string)(
                                    $payload['note'] ??
                                    ''
                                )
                            );

                        if (
                            $note !== '' &&
                            Schema::hasColumn(
                                'orders',
                                'comment'
                            )
                        ) {
                            $existing =
                                trim(
                                    (string)(
                                        $order->comment ??
                                        ''
                                    )
                                );

                            $entry =
                                '[Cashier Delivery] ' .
                                $note;

                            $alreadyPresent =
                                $existing === $note ||
                                strpos(
                                    $existing,
                                    $entry
                                ) !== false ||
                                strpos(
                                    $existing,
                                    $note
                                ) !== false;

                            if (!$alreadyPresent) {
                                $order->comment =
                                    $existing === ''
                                        ? $entry
                                        : (
                                            $existing .
                                            "\n" .
                                            $entry
                                        );
                            }
                        }

                        if (
                            Schema::hasColumn(
                                'orders',
                                'guest_count'
                            )
                        ) {
                            $order->guest_count =
                                max(
                                    1,
                                    min(
                                        99,
                                        (int)(
                                            $payload[
                                                'guest_count'
                                            ] ??
                                            1
                                        )
                                    )
                                );
                        }

                        if (
                            Schema::hasColumn(
                                'orders',
                                'payment'
                            ) &&
                            trim(
                                (string)(
                                    $order->payment ??
                                    ''
                                )
                            ) === ''
                        ) {
                            $order->payment =
                                'qr_pay_later';
                        }

                        if (
                            Schema::hasColumn(
                                'orders',
                                'settlement_status'
                            ) &&
                            !in_array(
                                (string)(
                                    $order->settlement_status ??
                                    ''
                                ),
                                ['partial', 'paid'],
                                true
                            )
                        ) {
                            $order->settlement_status =
                                'unpaid';
                        }

                        if (
                            Schema::hasColumn(
                                'orders',
                                'settled_amount'
                            ) &&
                            $order->settled_amount ===
                                null
                        ) {
                            $order->settled_amount =
                                0;
                        }

                        $statusId =
                            $this->resolveStatusId(
                                $mode
                            );

                        if (
                            $statusId &&
                            Schema::hasColumn(
                                'orders',
                                'status_id'
                            )
                        ) {
                            $order->status_id =
                                $statusId;
                        }

                        if (
                            Schema::hasColumn(
                                'orders',
                                'processed'
                            )
                        ) {
                            $order->processed =
                                $mode === 'send';
                        }

                        $order->save();

                        $this->recalculateOrder(
                            $order
                        );

                        $this
                            ->recordWaiterPosNoteHistoryV26(
                                $order,
                                $cart,
                                $note,
                                $mode
                            );

                        /*
                         * Deliberately NO table lifecycle call.
                         * Delivery must never occupy/free a physical table.
                         */

                        if (
                            $statusId &&
                            method_exists(
                                $order,
                                'addStatusHistory'
                            )
                        ) {
                            try {
                                $order->addStatusHistory(
                                    $statusId,
                                    [
                                        'comment' =>
                                            $mode === 'send'
                                                ? 'Sent from PayMyDine Cashier delivery'
                                                : 'Saved from PayMyDine Cashier delivery',

                                        'notify' =>
                                            false,
                                    ]
                                );
                            } catch (
                                \Throwable $ignored
                            ) {
                            }
                        }

                        $order->refresh();

                        return [
                            'ok' => true,

                            'version' =>
                                'pmd-cashier-delivery-v1',

                            'mode' =>
                                $mode,

                            'order_type' =>
                                Orders_model::DELIVERY,

                            'created' =>
                                $isNew,

                            'order_id' =>
                                (int)$order->getKey(),

                            'order_total' =>
                                (float)(
                                    $order->order_total ??
                                    0
                                ),

                            'total_items' =>
                                (int)(
                                    $order->total_items ??
                                    0
                                ),

                            'updated_at' =>
                                (string)(
                                    $order->updated_at ??
                                    ''
                                ),

                            'message' =>
                                $mode === 'send'
                                    ? 'Delivery order sent to the kitchen.'
                                    : 'Delivery order saved.',

                            'urls' =>
                                $this->orderUrls(
                                    (int)$order->getKey()
                                ),
                        ];
                    }
                );

            return response()->json(
                $result
            );
        } catch (
            ValidationException $e
        ) {
            return response()->json(
                [
                    'ok' => false,

                    'version' =>
                        'pmd-cashier-delivery-v1',

                    'message' =>
                        collect(
                            $e->errors()
                        )->flatten()->first()
                        ?:
                        'The delivery order could not be saved.',

                    'errors' =>
                        $e->errors(),
                ],
                422
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json(
                [
                    'ok' => false,

                    'version' =>
                        'pmd-cashier-delivery-v1',

                    'message' =>
                        'The delivery order could not be saved. ' .
                        $e->getMessage(),
                ],
                500
            );
        }
    }

    protected function fillNewDeliveryOrder(
        Orders_model $order,
        array $payload,
        string $mode
    ): void {
        $columns =
            Schema::getColumnListing(
                'orders'
            );

        $statusId =
            $this->resolveStatusId(
                $mode
            );

        $locationId =
            max(
                0,
                (int)(
                    $payload['location_id'] ??
                    0
                )
            );

        if (
            $locationId > 0 &&
            Schema::hasTable(
                'locations'
            ) &&
            !DB::table('locations')
                ->where(
                    'location_id',
                    $locationId
                )
                ->exists()
        ) {
            $locationId = 0;
        }

        if (
            $locationId < 1 &&
            Schema::hasTable(
                'locations'
            )
        ) {
            $locationId =
                (int)(
                    DB::table(
                        'locations'
                    )->value(
                        'location_id'
                    )
                    ?:
                    1
                );
        }

        $data = [
            'location_id' =>
                $locationId ?: 1,

            'order_type' =>
                Orders_model::DELIVERY,

            'status_id' =>
                $statusId,

            'payment' =>
                'qr_pay_later',

            'settlement_status' =>
                'unpaid',

            'settled_amount' =>
                0,

            'order_date' =>
                date('Y-m-d'),

            'order_time' =>
                date('H:i:s'),

            'order_time_is_asap' =>
                1,

            'processed' =>
                $mode === 'send'
                    ? 1
                    : 0,

            'first_name' =>
                'Delivery',

            'last_name' =>
                'Guest',

            'email' =>
                '',

            'telephone' =>
                '',

            'comment' =>
                trim(
                    (string)(
                        $payload['note'] ??
                        ''
                    )
                ),

            'total_items' =>
                0,

            'order_total' =>
                0,

            'guest_count' =>
                max(
                    1,
                    min(
                        99,
                        (int)(
                            $payload[
                                'guest_count'
                            ] ??
                            1
                        )
                    )
                ),

            'ip_address' =>
                request()->ip(),

            'user_agent' =>
                (string)
                request()->userAgent(),
        ];

        foreach (
            $data as
            $key => $value
        ) {
            if (
                in_array(
                    $key,
                    $columns,
                    true
                ) &&
                $value !== null
            ) {
                $order->{$key} =
                    $value;
            }
        }
    }

}
