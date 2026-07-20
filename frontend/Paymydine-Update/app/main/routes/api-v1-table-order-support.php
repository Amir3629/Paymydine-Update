<?php

                // Public table-order draft endpoints used by the customer QR frontend.
                // Keep these in the tenant-scoped public API layer so all devices on the same table can see active orders.
                $ensureTableOrderDraftTable = function () {
                    if (!\Illuminate\Support\Facades\Schema::hasTable('pmd_table_order_drafts')) {
                        \Illuminate\Support\Facades\Schema::create('pmd_table_order_drafts', function (\Illuminate\Database\Schema\Blueprint $table) {
                            $table->increments('id');
                            $table->string('table_id', 64)->nullable()->index();
                            $table->string('table_no', 64)->nullable()->index();
                            $table->string('table_name', 191)->nullable();
                            $table->string('qr', 191)->nullable()->index();
                            $table->string('status', 32)->default('draft')->index();
                            $table->unsignedInteger('order_id')->nullable()->index();
                            $table->longText('payload')->nullable();
                            $table->timestamps();
                        });
                    }
                };

                $resolveTableDraftContext = function (\Illuminate\Http\Request $request) {
                    $tableId = trim((string)$request->input('table_id', $request->query('table_id', '')));
                    $tableNo = trim((string)$request->input('table_no', $request->query('table_no', $request->query('table', ''))));
                    $qr = trim((string)$request->input('qr', $request->query('qr', '')));
                    $table = null;
                    foreach (array_values(array_unique(array_filter([$tableId, $tableNo], fn($v) => $v !== ''))) as $candidate) {
                        $table = DB::table('tables')->where('table_id', $candidate)->orWhere('table_no', $candidate)->first();
                        if ($table) break;
                    }
                    if (!$table && $qr !== '') $table = DB::table('tables')->where('qr_code', $qr)->first();
                    if ($table) {
                        $tableId = (string)($table->table_id ?? $tableId);
                        $tableNo = (string)($table->table_no ?? $tableNo);
                        if ($qr === '' && !empty($table->qr_code)) $qr = (string)$table->qr_code;
                    }
                    return [
                        'table' => $table,
                        'table_id' => $tableId,
                        'table_no' => $tableNo,
                        'table_name' => $table ? (string)($table->table_name ?? '') : '',
                        'qr' => $qr,
                        'candidates' => array_values(array_unique(array_filter([
                            $table ? (string)$table->table_id : null,
                            $table ? (string)$table->table_no : null,
                            $tableId,
                            $tableNo,
                        ], fn($v) => $v !== null && $v !== ''))),
                    ];
                };

                $normalizeDraftItems = function (array $items): array {
                    $normalized = [];
                    foreach ($items as $index => $item) {
                        $menuId = (int)($item['menu_id'] ?? $item['id'] ?? 0);
                        $qty = max(1, (int)($item['quantity'] ?? 1));
                        $hasPayloadPrice = array_key_exists('price', $item) && is_numeric($item['price']);
                        $price = $hasPayloadPrice ? (float)$item['price'] : null;
                        if ($menuId <= 0) continue;
                        $menu = DB::table('menus')->where('menu_id', $menuId)->where('menu_status', 1)->first();
                        if (!$menu) continue;
                        $name = trim((string)($item['name'] ?? '')) ?: (string)($menu->menu_name ?? ('Item '.($index + 1)));
                        $unitPrice = $hasPayloadPrice ? (float)$price : (float)($menu->menu_price ?? 0);
                        $lineSubtotal = array_key_exists('subtotal', $item) && is_numeric($item['subtotal'])
                            ? (float)$item['subtotal']
                            : round($unitPrice * $qty, 4);
                        $normalized[] = [
                            'id' => (int)round(microtime(true) * 1000) + $index,
                            'menu_id' => $menuId,
                            'name' => $name,
                            'quantity' => $qty,
                            'price' => $unitPrice,
                            'subtotal' => round($lineSubtotal, 4),
                            'options' => is_array($item['options'] ?? null) ? $item['options'] : [],
                            'guest_session_id' => trim((string)($item['guest_session_id'] ?? '')),
                        ];
                    }
                    return $normalized;
                };

                $formatTableOrderResponse = function ($draft = null, ?object $order = null, array $context = []) {
                    $items = [];
                    $status = 'empty';
                    $orderId = null;
                    $payment = null;
                    $settledAmount = 0.0;
                    $total = 0.0;
                    $subtotal = 0.0;
                    $taxAmount = 0.0;
                    $orderTotalsRows = [];
                    $statusName = null;
                    if ($draft) {
                        $payload = json_decode((string)($draft->payload ?? '[]'), true);
                        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
                        $status = (string)($draft->status ?? 'draft');
                        $orderId = $draft->order_id ? (int)$draft->order_id : null;
                    }
                    if ($order) {
                        $statusName = (string)($order->status_name ?? '');
                        $status = ((float)($order->settled_amount ?? 0) > 0) ? 'partially_paid' : 'submitted_unpaid';
                        $orderId = (int)$order->order_id;
                        $payment = (string)($order->payment ?? '');
                        $settledAmount = (float)($order->settled_amount ?? 0);
                        $total = (float)($order->order_total ?? 0);
                        $items = DB::table('order_menus')
                            ->where('order_id', $orderId)
                            ->orderBy('order_menu_id')
                            ->get(['order_menu_id','menu_id','name','quantity','price','subtotal'])
                            ->map(fn($row) => [
                                'order_menu_id' => (int)($row->order_menu_id ?? 0),
                                'menu_id' => (int)($row->menu_id ?? 0),
                                'name' => (string)($row->name ?? ''),
                                'quantity' => (float)($row->quantity ?? 0),
                                'price' => (float)($row->price ?? 0),
                                'subtotal' => (float)($row->subtotal ?? 0),
                                'paid_quantity' => 0,
                                'unpaid_quantity' => (float)($row->quantity ?? 0),
                            ])->values()->all();
                        $resolvedTotals = pmd_table_order_totals_from_order($orderId, $items, (float)($order->order_total ?? 0));
                        $subtotal = (float)$resolvedTotals['subtotal'];
                        $taxAmount = (float)$resolvedTotals['tax'];
                        $total = (float)$resolvedTotals['total'];
                        $orderTotalsRows = $resolvedTotals['rows'];
                        if ($total > 0 && $settledAmount >= $total - 0.0001) $status = 'paid';
                    }
                    if (!$order) {
                        $resolvedTotals = pmd_table_order_calculate_totals($items);
                        $subtotal = (float)$resolvedTotals['subtotal'];
                        $taxAmount = (float)$resolvedTotals['tax'];
                        $total = (float)$resolvedTotals['total'];
                        $orderTotalsRows = $resolvedTotals['rows'];
                    }
                    $groups = [];
                    foreach ($items as $item) {
                        $guest = (string)($item['guest_session_id'] ?? 'table');
                        if (!isset($groups[$guest])) $groups[$guest] = ['guest_session_id' => $guest === 'table' ? null : $guest, 'items' => [], 'subtotal' => 0.0];
                        $groups[$guest]['items'][] = $item;
                        $groups[$guest]['subtotal'] += (float)($item['subtotal'] ?? 0);
                    }
                    $remaining = max(0, $total - $settledAmount);
                    $hasActive = (bool)($draft || $order);
                    return response()->json([
                        'success' => true,
                        'status' => $status,
                        'status_name' => $statusName,
                        'paymentStatus' => $status === 'paid' ? 'paid' : ($settledAmount > 0 ? 'partial' : 'unpaid'),
                        'deliveryStatus' => $statusName,
                        'hasActiveTableOrder' => $hasActive,
                        'canShowToNewDevice' => $hasActive,
                        'draft_id' => $draft ? (int)$draft->id : null,
                        'order_id' => $orderId,
                        'orderId' => $orderId,
                        'orderNumber' => $orderId,
                        'table_id' => $context['table_id'] ?? ($draft->table_id ?? null),
                        'table_no' => $context['table_no'] ?? ($draft->table_no ?? null),
                        'table_name' => $context['table_name'] ?? ($draft->table_name ?? null),
                        'items' => array_values($items),
                        'groups' => array_values($groups),
                        'total' => round($total, 4),
                        'order_totals' => $orderTotalsRows,
                        'totals' => ['subtotal' => round($subtotal, 4), 'tax' => round($taxAmount, 4), 'total' => round($total, 4), 'orderTotal' => round($total, 4), 'settledAmount' => round($settledAmount, 4), 'remainingAmount' => round($remaining, 4)],
                        'settlement' => ['orderTotal' => round($total, 4), 'settledAmount' => round($settledAmount, 4), 'remainingAmount' => round($remaining, 4), 'settlementStatus' => $status === 'paid' ? 'paid' : ($settledAmount > 0 ? 'partial' : 'unpaid')],
                        'payment' => $payment,
                        'updatedAt' => $order ? (string)($order->updated_at ?? '') : ($draft ? (string)($draft->updated_at ?? '') : null),
                    ]);
                };

                $findActiveSubmittedTableOrder = function (array $context) {
                    $candidates = $context['candidates'] ?? [];
                    if (empty($candidates)) return null;
                    $orders = DB::table('orders')
                        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                        ->where('orders.payment', 'qr_pay_later')
                        ->whereIn('orders.order_type', $candidates)
                        ->orderByDesc('orders.order_id')
                        ->limit(12)
                        ->get(['orders.*', 'statuses.status_name']);
                    $terminalStatusNames = ['completed', 'complete', 'delivered', 'delivery-complete', 'cancelled', 'canceled', 'cancel'];
                    foreach ($orders as $order) {
                        $total = (float)($order->order_total ?? 0);
                        $settled = (float)($order->settled_amount ?? 0);
                        $settlementStatus = strtolower(trim((string)($order->settlement_status ?? '')));
                        $statusName = strtolower(trim((string)($order->status_name ?? '')));
                        $normalizedStatus = str_replace([' ', '_'], '-', $statusName);
                        $isPaid = in_array($settlementStatus, ['paid', 'settled'], true) || $normalizedStatus === 'paid' || ($total > 0 && $settled >= $total - 0.0001);
                        $isTerminal = in_array($normalizedStatus, $terminalStatusNames, true);
                        if (!$isPaid || !$isTerminal) {
                            if ($isPaid && $statusName === '') {
                                $updatedAt = $order->updated_at ? \Illuminate\Support\Carbon::parse($order->updated_at) : null;
                                if ($updatedAt && $updatedAt->lt(now()->subHours(2))) continue;
                            }
                            return $order;
                        }
                    }
                    return null;
                };


