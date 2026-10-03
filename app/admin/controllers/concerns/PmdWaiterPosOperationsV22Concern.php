<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Orders_model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Waiter POS V2.2 operational actions.
 *
 * All writes are tenant-scoped by the active TastyIgniter connection. The
 * feature keeps payment, order and physical-table lifecycles independent.
 */
trait PmdWaiterPosOperationsV22Concern
{
    public function operationsSummaryV22($orderId = null)
    {
        try {
            $order = $this->v22Order((int)$orderId);
            $this->v22EnsureMetaTables();

            return response()->json($this->v22OperationsPayload($order));
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Operations could not be loaded. '.$e->getMessage()], 500);
        }
    }

    public function transferOrderV22($orderId = null)
    {
        try {
            $payload = $this->requestPayload();
            $targetTableId = (int)($payload['target_table_id'] ?? 0);
            if ($targetTableId < 1) {
                throw ValidationException::withMessages(['target_table_id' => 'Choose a destination table.']);
            }

            $result = DB::transaction(function () use ($orderId, $targetTableId, $payload) {
                $order = $this->v22Order((int)$orderId, true);
                $this->v22AssertExpectedOrderVersion($order, $payload);
                $this->v22AssertOrderFinanciallyMovable($order);

                $sourceTable = $this->tableForOrder($order);
                $targetTable = $this->resolveTable($targetTableId);
                if (!$targetTable) {
                    throw ValidationException::withMessages(['target_table_id' => 'Destination table was not found.']);
                }
                if ($sourceTable && (int)$sourceTable['id'] === (int)$targetTable['id']) {
                    throw ValidationException::withMessages(['target_table_id' => 'The order is already on that table.']);
                }

                $columns = Schema::getColumnListing('orders');
                if (in_array('table_id', $columns, true)) $order->table_id = (int)$targetTable['id'];
                if (in_array('order_type', $columns, true)) $order->order_type = (string)(int)$targetTable['id'];
                if (in_array('location_id', $columns, true) && (int)$targetTable['location_id'] > 0) {
                    $order->location_id = (int)$targetTable['location_id'];
                }
                $order->save();

                $this->markTableOccupiedForWaiterOrderV154($targetTable, $order);
                if ($sourceTable) $this->v22ReleaseTableIfUnused((int)$sourceTable['id'], (int)$order->getKey());
                $this->v22Log($order, 'transfer_order', ['from' => $sourceTable, 'to' => $targetTable]);

                return ['ok' => true, 'message' => 'Order moved to '.$targetTable['name'].'.', 'summary' => $this->v22OperationsPayload($order->fresh())];
            });

            return response()->json($result);
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Order could not be moved. '.$e->getMessage()], 500);
        }
    }

    public function mergeOrdersV22($orderId = null)
    {
        try {
            $payload = $this->requestPayload();
            $sourceOrderId = (int)($payload['source_order_id'] ?? 0);
            if ($sourceOrderId < 1 || $sourceOrderId === (int)$orderId) {
                throw ValidationException::withMessages(['source_order_id' => 'Choose another open check to merge.']);
            }

            $result = DB::transaction(function () use ($orderId, $sourceOrderId, $payload) {
                $target = $this->v22Order((int)$orderId, true);
                $source = $this->v22Order($sourceOrderId, true);
                $this->v22AssertExpectedOrderVersion($target, $payload);
                $this->v22AssertOrderFinanciallyMovable($target);
                $this->v22AssertOrderFinanciallyMovable($source);

                if ((int)($target->location_id ?? 0) !== (int)($source->location_id ?? 0)) {
                    throw ValidationException::withMessages(['source_order_id' => 'Checks from different locations cannot be merged.']);
                }

                if (Schema::hasTable('order_menus')) {
                    DB::table('order_menus')->where('order_id', $sourceOrderId)->update(['order_id' => (int)$target->getKey()]);
                }
                if (Schema::hasTable('order_menu_options') && Schema::hasColumn('order_menu_options', 'order_id')) {
                    DB::table('order_menu_options')->where('order_id', $sourceOrderId)->update(['order_id' => (int)$target->getKey()]);
                }
                if (Schema::hasTable('pmd_waiter_pos_item_meta')) {
                    DB::table('pmd_waiter_pos_item_meta')->where('order_id', $sourceOrderId)->update(['order_id' => (int)$target->getKey(), 'updated_at' => now()]);
                }

                $targetComment = trim((string)($target->comment ?? ''));
                $sourceComment = trim((string)($source->comment ?? ''));
                $mergeNote = '[Waiter POS] Merged check #'.$sourceOrderId.' into #'.(int)$target->getKey();
                if (Schema::hasColumn('orders', 'comment')) {
                    $target->comment = trim($targetComment."\n".$sourceComment."\n".$mergeNote);
                    $source->comment = trim($sourceComment."\n[Merged into order #".(int)$target->getKey().']');
                }
                if (Schema::hasColumn('orders', 'processed')) $source->processed = 1;
                if (Schema::hasColumn('orders', 'total_items')) $source->total_items = 0;
                if (Schema::hasColumn('orders', 'order_total')) $source->order_total = 0;
                if (Schema::hasColumn('orders', 'settlement_status')) $source->settlement_status = 'paid';
                if (Schema::hasColumn('orders', 'settled_amount')) $source->settled_amount = 0;
                $closedStatus = $this->v22StatusId(['merged', 'closed', 'cancelled', 'canceled', 'paid']);
                if ($closedStatus && Schema::hasColumn('orders', 'status_id')) $source->status_id = $closedStatus;
                $source->save();

                $this->recalculateOrder($target);
                $target->refresh();
                $this->v22Log($target, 'merge_orders', ['source_order_id' => $sourceOrderId]);
                $sourceTable = $this->tableForOrder($source);
                if ($sourceTable) $this->v22ReleaseTableIfUnused((int)$sourceTable['id'], $sourceOrderId);

                return ['ok' => true, 'message' => 'Checks merged into order #'.(int)$target->getKey().'.', 'summary' => $this->v22OperationsPayload($target)];
            });

            return response()->json($result);
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Checks could not be merged. '.$e->getMessage()], 500);
        }
    }

    public function moveItemsV22($orderId = null)
    {
        try {
            $payload = $this->requestPayload();
            $targetOrderId = (int)($payload['target_order_id'] ?? 0);
            $selected = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            if ($targetOrderId < 1 || $targetOrderId === (int)$orderId || !$selected) {
                throw ValidationException::withMessages(['items' => 'Choose a destination check and at least one item.']);
            }

            $result = DB::transaction(function () use ($orderId, $targetOrderId, $selected) {
                $source = $this->v22Order((int)$orderId, true);
                $target = $this->v22Order($targetOrderId, true);
                $this->v22AssertOrderFinanciallyMovable($source);
                $this->v22AssertOrderFinanciallyMovable($target);
                if (!Schema::hasTable('order_menus')) {
                    throw ValidationException::withMessages(['items' => 'Order items are unavailable.']);
                }

                $moved = 0;
                foreach ($selected as $selection) {
                    $orderMenuId = (int)($selection['order_menu_id'] ?? 0);
                    $requestedQty = round((float)($selection['quantity'] ?? 0), 3);
                    $row = DB::table('order_menus')->where('order_id', (int)$source->getKey())->where('order_menu_id', $orderMenuId)->lockForUpdate()->first();
                    if (!$row || $requestedQty <= 0) continue;
                    $data = (array)$row;
                    $quantity = max(0, (float)($data['quantity'] ?? 0));
                    if ($requestedQty > $quantity + 0.0001) {
                        throw ValidationException::withMessages(['items' => 'A moved quantity is greater than the source quantity.']);
                    }
                    $unit = $quantity > 0 ? (float)($data['subtotal'] ?? 0) / $quantity : (float)($data['price'] ?? 0);

                    if (abs($requestedQty - $quantity) <= 0.0001) {
                        DB::table('order_menus')->where('order_menu_id', $orderMenuId)->update(['order_id' => (int)$target->getKey()]);
                        if (Schema::hasTable('order_menu_options') && Schema::hasColumn('order_menu_options', 'order_id')) {
                            DB::table('order_menu_options')->where('order_menu_id', $orderMenuId)->update(['order_id' => (int)$target->getKey()]);
                        }
                        if (Schema::hasTable('pmd_waiter_pos_item_meta')) {
                            DB::table('pmd_waiter_pos_item_meta')->where('order_menu_id', $orderMenuId)->update(['order_id' => (int)$target->getKey(), 'updated_at' => now()]);
                        }
                    } else {
                        $insert = $data;
                        unset($insert['order_menu_id'], $insert['id'], $insert['created_at'], $insert['updated_at']);
                        $insert['order_id'] = (int)$target->getKey();
                        $insert['quantity'] = $requestedQty;
                        if (array_key_exists('subtotal', $insert)) $insert['subtotal'] = round($unit * $requestedQty, 4);
                        $insert = array_intersect_key($insert, array_flip(Schema::getColumnListing('order_menus')));
                        $newId = DB::table('order_menus')->insertGetId($insert);

                        DB::table('order_menus')->where('order_menu_id', $orderMenuId)->update([
                            'quantity' => round($quantity - $requestedQty, 3),
                            'subtotal' => round($unit * ($quantity - $requestedQty), 4),
                        ]);

                        if (Schema::hasTable('order_menu_options')) {
                            $optionRows = DB::table('order_menu_options')->where('order_menu_id', $orderMenuId)->get();
                            foreach ($optionRows as $option) {
                                $copy = (array)$option;
                                unset($copy['order_menu_option_id'], $copy['id'], $copy['created_at'], $copy['updated_at']);
                                $copy['order_menu_id'] = $newId;
                                if (array_key_exists('order_id', $copy)) $copy['order_id'] = (int)$target->getKey();
                                if (array_key_exists('quantity', $copy)) $copy['quantity'] = $requestedQty;
                                DB::table('order_menu_options')->insert(array_intersect_key($copy, array_flip(Schema::getColumnListing('order_menu_options'))));
                            }
                        }
                    }
                    $moved++;
                }

                if (!$moved) throw ValidationException::withMessages(['items' => 'No items were moved.']);
                $this->recalculateOrder($source);
                $this->recalculateOrder($target);
                $this->v22Log($source, 'move_items_out', ['target_order_id' => $targetOrderId, 'items' => $selected]);
                $this->v22Log($target, 'move_items_in', ['source_order_id' => (int)$source->getKey(), 'items' => $selected]);

                return ['ok' => true, 'message' => $moved.' item line(s) moved.', 'summary' => $this->v22OperationsPayload($source->fresh())];
            });

            return response()->json($result);
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Items could not be moved. '.$e->getMessage()], 500);
        }
    }

    public function itemServiceV22($orderId = null)
    {
        try {
            $payload = $this->requestPayload();
            $rows = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            if (!$rows) throw ValidationException::withMessages(['items' => 'Choose at least one item.']);
            $this->v22EnsureMetaTables();
            $order = $this->v22Order((int)$orderId);

            foreach ($rows as $row) {
                $itemId = (int)($row['order_menu_id'] ?? 0);
                if (!$itemId || !DB::table('order_menus')->where('order_id', (int)$order->getKey())->where('order_menu_id', $itemId)->exists()) continue;
                $data = [
                    'order_id' => (int)$order->getKey(),
                    'order_menu_id' => $itemId,
                    'seat_no' => max(0, min(99, (int)($row['seat_no'] ?? 0))) ?: null,
                    'course_no' => max(0, min(20, (int)($row['course_no'] ?? 0))) ?: null,
                    'course_status' => in_array(($row['course_status'] ?? ''), ['held', 'fired', 'served'], true) ? $row['course_status'] : 'held',
                    'updated_by' => $this->currentUserId(),
                    'updated_at' => now(),
                ];
                DB::table('pmd_waiter_pos_item_meta')->updateOrInsert(['order_menu_id' => $itemId], $data + ['created_at' => now()]);
            }
            $this->v22Log($order, 'item_service_update', ['items' => $rows]);
            return response()->json(['ok' => true, 'message' => 'Seat and course assignments saved.', 'summary' => $this->v22OperationsPayload($order)]);
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Seat/course data could not be saved. '.$e->getMessage()], 500);
        }
    }

    public function voidItemV22($orderId = null)
    {
        try {
            $this->v22AssertSensitivePermission();
            $payload = $this->requestPayload();
            $itemId = (int)($payload['order_menu_id'] ?? 0);
            $qty = round((float)($payload['quantity'] ?? 0), 3);
            $reason = trim((string)($payload['reason'] ?? ''));
            if (!$itemId || $qty <= 0 || $reason === '') {
                throw ValidationException::withMessages(['void' => 'Choose an item, quantity and void reason.']);
            }

            $result = DB::transaction(function () use ($orderId, $itemId, $qty, $reason) {
                $order = $this->v22Order((int)$orderId, true);
                $row = DB::table('order_menus')->where('order_id', (int)$order->getKey())->where('order_menu_id', $itemId)->lockForUpdate()->first();
                if (!$row) throw ValidationException::withMessages(['item' => 'Item was not found.']);
                $data = (array)$row;
                $current = max(0, (float)($data['quantity'] ?? 0));
                if ($qty > $current + 0.0001) throw ValidationException::withMessages(['quantity' => 'Void quantity is too high.']);
                $unit = $current > 0 ? (float)($data['subtotal'] ?? 0) / $current : (float)($data['price'] ?? 0);
                $remaining = round(max(0, $current - $qty), 3);
                $comment = trim((string)($data['comment'] ?? ''));
                $updates = ['quantity' => $remaining, 'subtotal' => round($unit * $remaining, 4)];
                if (Schema::hasColumn('order_menus', 'comment')) $updates['comment'] = trim($comment."\n[VOID {$qty}] {$reason}");
                DB::table('order_menus')->where('order_menu_id', $itemId)->update($updates);

                $this->v22EnsureMetaTables();
                $existing = DB::table('pmd_waiter_pos_item_meta')->where('order_menu_id', $itemId)->first();
                DB::table('pmd_waiter_pos_item_meta')->updateOrInsert(['order_menu_id' => $itemId], [
                    'order_id' => (int)$order->getKey(),
                    'voided_quantity' => round((float)($existing->voided_quantity ?? 0) + $qty, 3),
                    'void_reason' => $reason,
                    'updated_by' => $this->currentUserId(),
                    'updated_at' => now(),
                    'created_at' => $existing ? ($existing->created_at ?? now()) : now(),
                ]);
                $this->recalculateOrder($order);
                $this->v22Log($order, 'void_item', ['order_menu_id' => $itemId, 'quantity' => $qty, 'reason' => $reason]);
                return ['ok' => true, 'message' => 'Item quantity voided.', 'summary' => $this->v22OperationsPayload($order->fresh())];
            });
            return response()->json($result);
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Item could not be voided. '.$e->getMessage()], 500);
        }
    }

    public function voidOrderV22($orderId = null)
    {
        try {
            $this->v22AssertSensitivePermission();
            $payload = $this->requestPayload();
            $reason = trim((string)($payload['reason'] ?? ''));
            if ($reason === '') throw ValidationException::withMessages(['reason' => 'Enter a cancellation reason.']);

            $result = DB::transaction(function () use ($orderId, $reason) {
                $order = $this->v22Order((int)$orderId, true);
                $this->v22AssertOrderFinanciallyMovable($order);
                $table = $this->tableForOrder($order);
                if (Schema::hasColumn('orders', 'comment')) $order->comment = trim((string)$order->comment."\n[VOID ORDER] ".$reason);
                if (Schema::hasColumn('orders', 'processed')) $order->processed = 1;
                $status = $this->v22StatusId(['void', 'cancelled', 'canceled', 'closed']);
                if ($status && Schema::hasColumn('orders', 'status_id')) $order->status_id = $status;
                $order->save();
                $this->v22Log($order, 'void_order', ['reason' => $reason]);
                if ($table) $this->v22ReleaseTableIfUnused((int)$table['id'], (int)$order->getKey());
                return ['ok' => true, 'message' => 'Order cancelled.', 'summary' => $this->v22OperationsPayload($order->fresh())];
            });
            return response()->json($result);
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Order could not be cancelled. '.$e->getMessage()], 500);
        }
    }

    public function reopenOrderV22($orderId = null)
    {
        try {
            $this->v22AssertSensitivePermission();
            $result = DB::transaction(function () use ($orderId) {
                $order = $this->v22Order((int)$orderId, true);
                if ((float)($order->settled_amount ?? 0) > 0.0001) {
                    throw ValidationException::withMessages(['order' => 'A paid or partially paid check must be refunded before reopening.']);
                }
                if (Schema::hasColumn('orders', 'processed')) $order->processed = 0;
                if (Schema::hasColumn('orders', 'settlement_status')) $order->settlement_status = 'unpaid';
                $status = $this->resolveStatusId('hold');
                if ($status && Schema::hasColumn('orders', 'status_id')) $order->status_id = $status;
                $order->save();
                $table = $this->tableForOrder($order);
                if ($table) $this->markTableOccupiedForWaiterOrderV154($table, $order);
                $this->v22Log($order, 'reopen_order', []);
                return ['ok' => true, 'message' => 'Check reopened.', 'summary' => $this->v22OperationsPayload($order->fresh())];
            });
            return response()->json($result);
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => 'Check could not be reopened. '.$e->getMessage()], 500);
        }
    }

    public function printLinksV22($orderId = null)
    {
        try {
            $order = $this->v22Order((int)$orderId);
            return response()->json([
                'ok' => true,
                'order_id' => (int)$order->getKey(),
                'guest_bill_url' => '/admin/orders/receipt/'.(int)$order->getKey(),
                'kitchen_ticket_url' => '/admin/orders/print/'.(int)$order->getKey(),
                'order_url' => '/admin/orders/edit/'.(int)$order->getKey(),
            ]);
        } catch (ValidationException $e) {
            return $this->v22ValidationResponse($e);
        }
    }

    protected function v22OperationsPayload(Orders_model $order): array
    {
        $this->v22EnsureMetaTables();
        $orderId = (int)$order->getKey();
        $table = $this->tableForOrder($order);
        $items = Schema::hasTable('order_menus')
            ? DB::table('order_menus')->where('order_id', $orderId)->orderBy('order_menu_id')->get()->map(function ($row) {
                $r = (array)$row;
                $meta = Schema::hasTable('pmd_waiter_pos_item_meta')
                    ? DB::table('pmd_waiter_pos_item_meta')->where('order_menu_id', (int)($r['order_menu_id'] ?? 0))->first()
                    : null;
                return [
                    'order_menu_id' => (int)($r['order_menu_id'] ?? 0),
                    'name' => (string)($r['name'] ?? 'Item'),
                    'quantity' => (float)($r['quantity'] ?? 0),
                    'subtotal' => (float)($r['subtotal'] ?? 0),
                    'comment' => (string)($r['comment'] ?? ''),
                    'seat_no' => $meta ? (int)($meta->seat_no ?? 0) : 0,
                    'course_no' => $meta ? (int)($meta->course_no ?? 0) : 0,
                    'course_status' => $meta ? (string)($meta->course_status ?? 'held') : 'held',
                    'voided_quantity' => $meta ? (float)($meta->voided_quantity ?? 0) : 0,
                ];
            })->values()->all()
            : [];

        $tables = $this->v22Tables((int)($order->location_id ?? 0));
        $orders = $this->v22MergeCandidates($order);
        return [
            'ok' => true,
            'version' => 'pmd-waiter-pos-v2.2',
            'order' => [
                'order_id' => $orderId,
                'status_id' => (int)($order->status_id ?? 0),
                'settlement_status' => (string)($order->settlement_status ?? 'unpaid'),
                'settled_amount' => (float)($order->settled_amount ?? 0),
                'order_total' => (float)($order->order_total ?? 0),
                'guest_count' => max(1, (int)($order->guest_count ?? 1)),
                'updated_at' => (string)($order->updated_at ?? ''),
            ],
            'table' => $table,
            'items' => $items,
            'tables' => $tables,
            'open_checks' => $orders,
            'permissions' => [
                'can_transfer' => true,
                'can_merge' => true,
                'can_move_items' => true,
                'can_assign_seats' => true,
                'can_void' => $this->v22CanSensitive(),
                'can_reopen' => $this->v22CanSensitive(),
            ],
        ];
    }

    protected function v22Order(int $orderId, bool $lock = false): Orders_model
    {
        if ($orderId < 1) throw ValidationException::withMessages(['order' => 'Order not found.']);
        $query = Orders_model::query()->where('order_id', $orderId);
        if ($lock) $query->lockForUpdate();
        $order = $query->first();
        if (!$order) throw ValidationException::withMessages(['order' => 'Order not found.']);
        return $order;
    }

    protected function v22Tables(int $locationId): array
    {
        if (!Schema::hasTable('tables')) return [];
        $columns = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
        if (!$pk) return [];
        $query = DB::table('tables');
        if ($locationId > 0 && in_array('location_id', $columns, true)) $query->where('location_id', $locationId);
        return $query->orderBy($pk)->limit(300)->get()->map(function ($row) use ($pk) {
            $r = (array)$row;
            $number = $r['table_no'] ?? $r['table_number'] ?? $r[$pk];
            return [
                'id' => (int)$r[$pk],
                'number' => (string)$number,
                'name' => (string)($r['table_name'] ?? $r['name'] ?? ('Table '.$number)),
                'status' => (string)($r['operational_status'] ?? ''),
            ];
        })->values()->all();
    }

    protected function v22MergeCandidates(Orders_model $current): array
    {
        if (!Schema::hasTable('orders')) return [];
        $columns = Schema::getColumnListing('orders');
        $query = DB::table('orders')->where('order_id', '!=', (int)$current->getKey());
        if (in_array('location_id', $columns, true)) $query->where('location_id', (int)($current->location_id ?? 0));
        if (in_array('settled_amount', $columns, true)) $query->where(function ($q) { $q->whereNull('settled_amount')->orWhere('settled_amount', '<=', 0); });
        if (in_array('settlement_status', $columns, true)) $query->whereNotIn('settlement_status', ['paid']);
        return $query->orderByDesc('order_id')->limit(80)->get()->map(function ($row) {
            $r = (array)$row;
            $table = $this->tableForOrder(Orders_model::query()->where('order_id', (int)$r['order_id'])->first());
            return [
                'order_id' => (int)$r['order_id'],
                'table' => $table,
                'total' => (float)($r['order_total'] ?? 0),
                'items' => (int)($r['total_items'] ?? 0),
                'updated_at' => (string)($r['updated_at'] ?? ''),
            ];
        })->values()->all();
    }

    protected function v22AssertOrderFinanciallyMovable(Orders_model $order): void
    {
        if ((float)($order->settled_amount ?? 0) > 0.0001 || strtolower((string)($order->settlement_status ?? '')) === 'partial') {
            throw ValidationException::withMessages(['order' => 'Paid or partially paid checks cannot be transferred, merged or split between checks.']);
        }
        if (Schema::hasTable('order_payment_transactions') && DB::table('order_payment_transactions')->where('order_id', (int)$order->getKey())->exists()) {
            throw ValidationException::withMessages(['order' => 'This check already has payment history and cannot be structurally changed.']);
        }
    }

    protected function v22AssertExpectedOrderVersion(Orders_model $order, array $payload): void
    {
        $expected = trim((string)($payload['expected_updated_at'] ?? ''));
        if ($expected !== '' && (string)($order->updated_at ?? '') !== $expected) {
            throw ValidationException::withMessages(['order' => 'This order changed. Refresh before continuing.']);
        }
    }

    protected function v22CanSensitive(): bool
    {
        $user = $this->currentUser();
        if (!$user) return false;
        foreach (['Admin.Orders.Delete', 'Admin.Orders.Manage', 'Admin.Payments'] as $permission) {
            try { if ($user->hasPermission($permission)) return true; } catch (\Throwable $ignored) {}
        }
        return false;
    }

    protected function v22AssertSensitivePermission(): void
    {
        if (!$this->v22CanSensitive()) abort(403, 'Manager permission required.');
    }

    protected function v22StatusId(array $patterns): ?int
    {
        if (!Schema::hasTable('statuses')) return null;
        $columns = Schema::getColumnListing('statuses');
        $id = in_array('status_id', $columns, true) ? 'status_id' : 'id';
        $name = in_array('status_name', $columns, true) ? 'status_name' : (in_array('name', $columns, true) ? 'name' : null);
        if (!$name) return null;
        foreach ($patterns as $pattern) {
            $row = DB::table('statuses')->whereRaw('LOWER('.$name.') LIKE ?', ['%'.strtolower($pattern).'%'])->first();
            if ($row) return (int)$row->{$id};
        }
        return null;
    }

    protected function v22ReleaseTableIfUnused(int $tableId, int $excludingOrderId): void
    {
        if (!Schema::hasTable('tables') || !Schema::hasColumn('tables', 'operational_status')) return;
        $orderColumns = Schema::getColumnListing('orders');
        $active = DB::table('orders')->where('order_id', '!=', $excludingOrderId);
        if (in_array('table_id', $orderColumns, true)) {
            $active->where('table_id', $tableId);
        } elseif (in_array('order_type', $orderColumns, true)) {
            $active->where('order_type', (string)$tableId);
        } else return;
        if (in_array('settlement_status', $orderColumns, true)) $active->whereNotIn('settlement_status', ['paid']);
        if ($active->exists()) return;
        $tableColumns = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $tableColumns, true) ? 'table_id' : 'id';
        $updates = ['operational_status' => 'available'];
        if (in_array('operational_status_updated_at', $tableColumns, true)) $updates['operational_status_updated_at'] = now();
        if (in_array('operational_status_updated_by', $tableColumns, true)) $updates['operational_status_updated_by'] = $this->currentUserId();
        if (in_array('updated_at', $tableColumns, true)) $updates['updated_at'] = now();
        DB::table('tables')->where($pk, $tableId)->update($updates);
    }

    protected function v22EnsureMetaTables(): void
    {
        if (!Schema::hasTable('pmd_waiter_pos_item_meta')) {
            Schema::create('pmd_waiter_pos_item_meta', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('order_id')->index();
                $table->unsignedBigInteger('order_menu_id')->unique();
                $table->unsignedInteger('seat_no')->nullable();
                $table->unsignedInteger('course_no')->nullable();
                $table->string('course_status', 20)->default('held');
                $table->decimal('voided_quantity', 12, 3)->default(0);
                $table->string('void_reason', 255)->nullable();
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->timestamps();
            });
        }
        if (!Schema::hasTable('pmd_waiter_pos_operation_logs')) {
            Schema::create('pmd_waiter_pos_operation_logs', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('order_id')->index();
                $table->string('action', 60)->index();
                $table->longText('payload')->nullable();
                $table->unsignedBigInteger('actor_id')->nullable();
                $table->timestamps();
            });
        }
    }

    protected function v22Log(Orders_model $order, string $action, array $payload): void
    {
        $this->v22EnsureMetaTables();
        DB::table('pmd_waiter_pos_operation_logs')->insert([
            'order_id' => (int)$order->getKey(),
            'action' => $action,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'actor_id' => $this->currentUserId(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function v22ValidationResponse(ValidationException $e)
    {
        return response()->json([
            'ok' => false,
            'message' => collect($e->errors())->flatten()->first() ?: 'The operation could not be completed.',
            'errors' => $e->errors(),
        ], 422);
    }
}
