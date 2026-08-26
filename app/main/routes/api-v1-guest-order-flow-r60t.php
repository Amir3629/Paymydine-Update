<?php

// PMD_ORDERING_FLOW_REVOLUTION_R60T
// Guest QR self-orders are private and payment-gated. Staff/Cashier table orders
// remain shared. This module deliberately does not alter payment, coupon, tip,
// provider, or invoice endpoints/files.

$pmdR60tOrderPaid = static function ($order): bool {
    if (!$order) return false;
    $total = max(0, (float)($order->order_total ?? 0));
    $settled = max(0, (float)($order->settled_amount ?? 0));
    $settlement = strtolower(trim((string)($order->settlement_status ?? '')));
    return in_array($settlement, ['paid', 'settled'], true)
        || ($total > 0 && $settled >= $total - 0.0001);
};

$pmdR60tIsGuestSelfOrder = static function ($order): bool {
    return str_contains((string)($order->comment ?? ''), '[pmd_origin:guest_self]');
};

$pmdR60tOrderBelongsToGuest = static function ($order, string $guestSessionId): bool {
    if (!$order || trim($guestSessionId) === '') return false;
    return str_contains((string)($order->comment ?? ''), '[submitted_by:'.trim($guestSessionId).']');
};

$pmdR60tMarkTableOccupied = static function (array $context): void {
    try {
        if (!\Illuminate\Support\Facades\Schema::hasTable('tables')
            || !\Illuminate\Support\Facades\Schema::hasColumn('tables', 'operational_status')) return;
        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('tables');
        $pk = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
        $pkValue = $pk ? (int)($context['table']->{$pk} ?? 0) : 0;
        if (!$pk || $pkValue < 1) return;
        $updates = ['operational_status' => 'occupied'];
        if (in_array('operational_status_updated_at', $columns, true)) $updates['operational_status_updated_at'] = now();
        if (in_array('updated_at', $columns, true)) $updates['updated_at'] = now();
        DB::table('tables')->where($pk, $pkValue)->update($updates);
    } catch (\Throwable $e) {
        \Log::warning('PMD R60T table occupancy update failed', ['message' => $e->getMessage()]);
    }
};

$pmdR60tReleasePaidGuestOrder = static function ($order, array $context) use ($pmdR60tOrderPaid, $pmdR60tIsGuestSelfOrder, $pmdR60tMarkTableOccupied): bool {
    if (!$order || !$pmdR60tIsGuestSelfOrder($order) || !$pmdR60tOrderPaid($order)) return false;
    if ((int)($order->processed ?? 0) === 1) return true;

    return DB::transaction(function () use ($order, $context, $pmdR60tMarkTableOccupied) {
        $fresh = DB::table('orders')->where('order_id', (int)$order->order_id)->lockForUpdate()->first();
        if (!$fresh) return false;
        $total = max(0, (float)($fresh->order_total ?? 0));
        $settled = max(0, (float)($fresh->settled_amount ?? 0));
        $status = strtolower(trim((string)($fresh->settlement_status ?? '')));
        $paid = in_array($status, ['paid', 'settled'], true) || ($total > 0 && $settled >= $total - 0.0001);
        if (!$paid) return false;

        if ((int)($fresh->processed ?? 0) !== 1) {
            DB::table('orders')->where('order_id', (int)$fresh->order_id)->update([
                'processed' => 1,
                'updated_at' => now(),
            ]);
            $pmdR60tMarkTableOccupied($context);
            try {
                DB::table('notifications')->insert([
                    'type' => 'order',
                    'title' => 'New paid QR order #'.(int)$fresh->order_id,
                    'table_id' => (int)($context['table_id'] ?: 0),
                    'table_name' => (string)(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')),
                    'payload' => json_encode([
                        'order_id' => (int)$fresh->order_id,
                        'origin' => 'guest_self',
                        'payment_gated' => true,
                    ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                    'status' => 'new',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Throwable $ignored) {}
        }
        return true;
    });
};

$pmdR60tContextCandidates = static function (array $context): array {
    return array_values(array_unique(array_filter([
        $context['table_id'] ?? null,
        $context['table_no'] ?? null,
        $context['table_name'] ?? null,
        isset($context['table']->table_id) ? (string)$context['table']->table_id : null,
        isset($context['table']->table_no) ? (string)$context['table']->table_no : null,
        isset($context['table']->table_name) ? (string)$context['table']->table_name : null,
    ], static fn($value) => $value !== null && trim((string)$value) !== '')));
};

$pmdR60tPayload = static function ($order, array $context, string $origin) use ($formatTableOrderResponse) {
    $payload = json_decode($formatTableOrderResponse(null, $order, $context)->getContent(), true) ?: [];
    $payload['orderOrigin'] = $origin;
    $payload['source'] = $origin;
    $payload['canSplit'] = $origin === 'staff_shared';
    $payload['paymentRequiredBeforeKitchen'] = $origin === 'guest_self';
    $payload['kitchenReleased'] = $origin === 'staff_shared' || (int)($order->processed ?? 0) === 1;
    return $payload;
};

Route::get('/guest-orders/state', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $pmdR60tContextCandidates,
    $pmdR60tIsGuestSelfOrder,
    $pmdR60tOrderBelongsToGuest,
    $pmdR60tReleasePaidGuestOrder,
    $pmdR60tPayload
) {
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);
    $guestSessionId = trim((string)$request->query('guest_session_id', ''));
    if ($guestSessionId === '') return response()->json(['success' => false, 'error' => 'guest_session_id is required'], 422);

    $candidates = $pmdR60tContextCandidates($context);
    $rows = DB::table('orders')
        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
        ->where(function ($q) use ($candidates) {
            if ($candidates) $q->whereIn('orders.order_type', $candidates);
            foreach ($candidates as $candidate) {
                $candidate = trim((string)$candidate);
                if ($candidate !== '' && !ctype_digit($candidate)) $q->orWhere('orders.comment', 'like', '%Table: '.$candidate.'%');
            }
        })
        ->orderByDesc('orders.order_id')
        ->limit(80)
        ->get(['orders.*', 'statuses.status_name']);

    $self = [];
    $shared = [];
    foreach ($rows as $order) {
        if ($pmdR60tIsGuestSelfOrder($order)) {
            if (!$pmdR60tOrderBelongsToGuest($order, $guestSessionId)) continue;
            $pmdR60tReleasePaidGuestOrder($order, $context);
            $order = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', (int)$order->order_id)
                ->first(['orders.*', 'statuses.status_name']);
            if ($order) $self[] = $pmdR60tPayload($order, $context, 'guest_self');
            continue;
        }

        // Staff/Cashier/Waiter orders stay table-shared. Only expose financially open
        // orders, plus recently paid shared orders while the table visit remains occupied.
        $total = max(0, (float)($order->order_total ?? 0));
        $settled = max(0, (float)($order->settled_amount ?? 0));
        $settlement = strtolower(trim((string)($order->settlement_status ?? '')));
        $financiallyOpen = !in_array($settlement, ['cancelled', 'canceled', 'failed', 'refunded', 'void', 'voided'], true)
            && ($total <= 0 || $settled < $total - 0.0001);
        $tableOccupied = strtolower(trim((string)($context['table']->operational_status ?? ''))) === 'occupied';
        if (!$financiallyOpen && !$tableOccupied) continue;
        $shared[] = $pmdR60tPayload($order, $context, 'staff_shared');
    }

    return response()->json([
        'success' => true,
        'selfOrders' => array_values($self),
        'sharedStaffOrders' => array_values($shared),
        'orders' => array_values(array_merge($shared, $self)),
        'updatedAt' => now()->toIso8601String(),
    ]);
});

Route::post('/guest-orders/prepare', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $normalizeDraftItems,
    $pmdR60tPayload
) {
    $request->validate([
        'guest_session_id' => 'required|string|max:191',
        'confirmation_id' => 'required|string|max:191',
        'items' => 'required|array|min:1',
    ]);
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);
    $guestSessionId = trim((string)$request->input('guest_session_id'));
    $confirmationId = trim((string)$request->input('confirmation_id'));
    $items = $normalizeDraftItems((array)$request->input('items', []));
    if (!$items) return response()->json(['success' => false, 'error' => 'No valid menu items'], 422);

    $confirmationMarker = '[guest_confirm:'.$confirmationId.']';
    $existing = DB::table('orders')
        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
        ->where('orders.comment', 'like', '%'.$confirmationMarker.'%')
        ->where('orders.comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
        ->first(['orders.*', 'statuses.status_name']);
    if ($existing) return response()->json($pmdR60tPayload($existing, $context, 'guest_self'));

    $orderId = DB::transaction(function () use ($context, $request, $guestSessionId, $confirmationId, $confirmationMarker, $items) {
        $resolvedTotals = pmd_table_order_calculate_totals($items);
        $total = (float)$resolvedTotals['total'];
        $lastOrderId = (int)(DB::table('orders')->orderByDesc('order_id')->lockForUpdate()->value('order_id') ?? 0);
        $orderId = $lastOrderId + 1;
        $comment = trim('QR Self Order | Table ID: '.($context['table_id'] ?? '').' | Table: '.(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')).
            ' | [pmd_origin:guest_self] | [payment_hold] | [submitted_by:'.$guestSessionId.'] | '.$confirmationMarker, ' |');
        $insert = [
            'order_id' => $orderId,
            'first_name' => 'Table',
            'last_name' => 'Customer',
            'email' => '',
            'telephone' => '',
            'location_id' => (int)(($context['table']->location_id ?? null) ?: $request->input('location_id', 1)),
            'order_type' => (string)(($context['table_id'] ?? '') ?: ($context['table_no'] ?? 'table')),
            'order_total' => round($total, 4),
            'order_date' => now()->format('Y-m-d'),
            'order_time' => now()->format('H:i:s'),
            'status_id' => 1,
            'comment' => $comment,
            // Critical R60T gate: KDS/Admin processing does not receive this order until paid.
            'processed' => 0,
            'payment' => 'qr_pay_later',
            'total_items' => array_sum(array_map(static fn($i) => (int)($i['quantity'] ?? 1), $items)),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent() ?? 'API Client',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) $insert['settlement_status'] = 'unpaid';
        if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) $insert['settled_amount'] = 0;
        DB::table('orders')->insert($insert);

        foreach ($items as $item) {
            DB::table('order_menus')->insert([
                'order_id' => $orderId,
                'menu_id' => (int)($item['menu_id'] ?? 0),
                'name' => (string)($item['name'] ?? 'Item'),
                'quantity' => max(1, (int)($item['quantity'] ?? 1)),
                'price' => (float)($item['price'] ?? 0),
                'subtotal' => (float)($item['subtotal'] ?? 0),
                'comment' => trim(((string)($item['note'] ?? '') !== '' ? (string)$item['note'].' | ' : '').'[guest_session:'.$guestSessionId.']', ' |'),
                'option_values' => !empty($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null,
            ]);
        }
        $totalsRows = array_map(static fn($row) => array_merge(['order_id' => $orderId], $row), $resolvedTotals['rows']);
        DB::table('order_totals')->insert($totalsRows);
        return $orderId;
    });

    $order = DB::table('orders')
        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
        ->where('orders.order_id', $orderId)
        ->first(['orders.*', 'statuses.status_name']);
    return response()->json($pmdR60tPayload($order, $context, 'guest_self'), 201);
});
