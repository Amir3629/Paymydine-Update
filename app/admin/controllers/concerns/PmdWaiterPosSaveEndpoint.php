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
                    $order->comment = $existing === '' ? $entry : ($existing."\n".$entry);
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
                    'version' => 'pmd-waiter-pos-v2',
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
                'version' => 'pmd-waiter-pos-v2',
                'message' => collect($e->errors())->flatten()->first() ?: 'The order could not be saved.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'version' => 'pmd-waiter-pos-v2',
                'message' => 'The order could not be saved. '.$e->getMessage(),
            ], 500);
        }
    }

}
