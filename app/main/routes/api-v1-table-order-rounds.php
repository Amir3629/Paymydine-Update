<?php

// PMD_TABLE_ROUND_INVOICE_R27
// Shared-table ordering v2 contract:
// - personal cart stays device-local in the frontend
// - confirmed personal items join ONE mutable shared draft for the current table session
// - submitting that draft creates ONE immutable order/invoice and never appends to an older order
// - later confirmed items create a fresh draft; the next submit creates a new order/invoice
// - all devices on the table read the same draft + submitted-order history

$pmdRoundEnsureSchema = function () use ($ensureTableOrderDraftTable) {
    $ensureTableOrderDraftTable();
    if (!\Illuminate\Support\Facades\Schema::hasColumn('pmd_table_order_drafts', 'session_key')) {
        try {
            \Illuminate\Support\Facades\Schema::table('pmd_table_order_drafts', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->string('session_key', 64)->nullable()->index();
            });
        } catch (\Throwable $e) {
            // A second request may have won the first-use schema race.
            if (!\Illuminate\Support\Facades\Schema::hasColumn('pmd_table_order_drafts', 'session_key')) throw $e;
        }
    }
};

$pmdRoundDraftContext = function ($query, array $context) {
    return $query->where(function ($q) use ($context) {
        if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
        if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
        if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
    });
};

$pmdRoundContextMatchesDraft = function ($draft, array $context): bool {
    if (!$draft) return false;
    $values = array_values(array_unique(array_filter([
        (string)($context['table_id'] ?? ''),
        (string)($context['table_no'] ?? ''),
        (string)($context['qr'] ?? ''),
    ], fn($v) => trim($v) !== '')));
    foreach ([(string)($draft->table_id ?? ''), (string)($draft->table_no ?? ''), (string)($draft->qr ?? '')] as $candidate) {
        if ($candidate !== '' && in_array($candidate, $values, true)) return true;
    }
    return false;
};

$pmdRoundOrderIsFinanciallyOpen = function ($order): bool {
    if (!$order) return false;
    $total = (float)($order->order_total ?? 0);
    $settled = (float)($order->settled_amount ?? 0);
    $settlement = strtolower(trim((string)($order->settlement_status ?? '')));
    if (in_array($settlement, ['paid', 'settled', 'cancelled', 'canceled', 'failed'], true)) return false;
    return $total <= 0 || $settled < $total - 0.0001;
};

$pmdRoundNewSessionKey = function (array $context, string $seed = ''): string {
    $basis = implode('|', [
        request()->getHost(),
        (string)($context['table_id'] ?? ''),
        (string)($context['table_no'] ?? ''),
        (string)($context['qr'] ?? ''),
        $seed,
        microtime(true),
        bin2hex(random_bytes(8)),
    ]);
    return 'pmds_'.substr(hash('sha256', $basis), 0, 32);
};

$pmdRoundBackfillLegacySession = function ($draft, array $context) use ($pmdRoundNewSessionKey) {
    $existing = trim((string)($draft->session_key ?? ''));
    if ($existing !== '') return $existing;
    $orderId = (int)($draft->order_id ?? 0);
    $sessionKey = 'pmds_legacy_'.substr(hash('sha256', implode('|', [
        request()->getHost(),
        (string)($context['table_id'] ?? ''),
        (string)($context['table_no'] ?? ''),
        (string)$orderId,
    ])), 0, 24);
    if ($orderId > 0) {
        DB::table('pmd_table_order_drafts')->where('order_id', $orderId)->update([
            'session_key' => $sessionKey,
            'updated_at' => now(),
        ]);
    } else {
        DB::table('pmd_table_order_drafts')->where('id', (int)$draft->id)->update([
            'session_key' => $sessionKey,
            'updated_at' => now(),
        ]);
    }
    return $sessionKey ?: $pmdRoundNewSessionKey($context, 'legacy');
};

$pmdRoundResolveSessionKey = function (array $context, string $guestSessionId = '', bool $includeGuestHistory = false) use (
    $pmdRoundEnsureSchema,
    $pmdRoundDraftContext,
    $pmdRoundOrderIsFinanciallyOpen,
    $pmdRoundBackfillLegacySession,
    $pmdFindOpenTableOrderForContext
) {
    $pmdRoundEnsureSchema();

    $draftQuery = DB::table('pmd_table_order_drafts')->where('status', 'draft');
    $pmdRoundDraftContext($draftQuery, $context);
    $draft = $draftQuery->orderByDesc('id')->first();
    if ($draft) return $pmdRoundBackfillLegacySession($draft, $context);

    $submittedQuery = DB::table('pmd_table_order_drafts')
        ->where('status', 'submitted')
        ->whereNotNull('order_id');
    $pmdRoundDraftContext($submittedQuery, $context);
    $submitted = $submittedQuery->orderByDesc('id')->limit(60)->get();

    foreach ($submitted as $row) {
        $order = DB::table('orders')->where('order_id', (int)$row->order_id)->first();
        if ($pmdRoundOrderIsFinanciallyOpen($order)) return $pmdRoundBackfillLegacySession($row, $context);
    }

    if ($includeGuestHistory && trim($guestSessionId) !== '') {
        $needle = '%[guest_session:'.trim($guestSessionId).']%';
        foreach ($submitted as $row) {
            $updatedAt = !empty($row->updated_at) ? \Illuminate\Support\Carbon::parse($row->updated_at) : null;
            if ($updatedAt && $updatedAt->lt(now()->subHours(12))) continue;

            // PMD_CASHIER_PAID_SESSION_HISTORY_R44
            $historyPayload = json_decode(
                (string)($row->payload ?? ''),
                true
            ) ?: [];
            $cashierParticipants = array_map(
                static fn ($value) => trim((string)$value),
                (array)($historyPayload['cashier_participants'] ?? [])
            );
            if (in_array(trim($guestSessionId), $cashierParticipants, true)) {
                return $pmdRoundBackfillLegacySession($row, $context);
            }

            $belongs = DB::table('order_menus')
                ->where('order_id', (int)$row->order_id)
                ->where('comment', 'like', $needle)
                ->exists();
            if ($belongs) return $pmdRoundBackfillLegacySession($row, $context);
        }
    }

    // PMD_CASHIER_CANONICAL_ORDER_IN_ROUND_STATE_R43
    // Cashier/Waiter POS orders are canonical orders too, but they do not have
    // an R27 submitted-draft row. Give the newest financially-open table order
    // a stable synthetic session key so every QR device can hydrate it through
    // /table-orders/state without creating or mutating a database row.
    try {
        $externalOrder = $pmdFindOpenTableOrderForContext($context, null);
        if (
            $externalOrder
            && $pmdRoundOrderIsFinanciallyOpen($externalOrder)
            && (int)($externalOrder->order_id ?? 0) > 0
        ) {
            $externalOrderId = (int)$externalOrder->order_id;
            return 'pmds_cashier_'.substr(hash('sha256', implode('|', [
                request()->getHost(),
                (string)($context['table_id'] ?? ''),
                (string)($context['table_no'] ?? ''),
                (string)$externalOrderId,
            ])), 0, 28);
        }
    } catch (\Throwable $ignored) {}

    return null;
};

// PMD_CASHIER_PAID_SESSION_HISTORY_R44
// Bind QR participants to a Cashier-created canonical order by using the
// existing pmd_table_order_drafts session/history table. This does NOT create
// another order. It stores only a submitted history pointer to the real order.
$pmdRoundBindCashierOrderSessionR44 = function (
    array $context,
    $order,
    string $sessionKey,
    string $guestSessionId = ''
) use (
    $pmdRoundEnsureSchema,
    $pmdRoundDraftContext
) {
    $pmdRoundEnsureSchema();

    $orderId = (int)($order->order_id ?? 0);
    $sessionKey = trim($sessionKey);
    $guestSessionId = trim($guestSessionId);

    if ($orderId < 1 || $sessionKey === '') return null;

    return DB::transaction(function () use (
        $context,
        $orderId,
        $sessionKey,
        $guestSessionId,
        $pmdRoundDraftContext
    ) {
        $query = DB::table('pmd_table_order_drafts')
            ->where('status', 'submitted')
            ->where('order_id', $orderId)
            ->where('session_key', $sessionKey);
        $pmdRoundDraftContext($query, $context);
        $row = $query->lockForUpdate()->orderByDesc('id')->first();

        $payload = $row
            ? (json_decode((string)($row->payload ?? ''), true) ?: [])
            : [];

        $participants = array_values(array_unique(array_filter(
            array_map(
                static fn ($value) => trim((string)$value),
                (array)($payload['cashier_participants'] ?? [])
            ),
            static fn ($value) => $value !== ''
        )));

        if (
            $guestSessionId !== ''
            && !in_array($guestSessionId, $participants, true)
        ) {
            $participants[] = $guestSessionId;
        }

        if (count($participants) > 40) {
            $participants = array_slice($participants, -40);
        }

        $payload['source'] = 'cashier_canonical_r44';
        $payload['cashier_order_id'] = $orderId;
        $payload['cashier_participants'] = $participants;

        $data = [
            'table_id' => ($context['table_id'] ?? '') !== ''
                ? $context['table_id']
                : null,
            'table_no' => ($context['table_no'] ?? '') !== ''
                ? $context['table_no']
                : null,
            'table_name' => ($context['table_name'] ?? '') !== ''
                ? $context['table_name']
                : null,
            'qr' => ($context['qr'] ?? '') !== ''
                ? $context['qr']
                : null,
            'session_key' => $sessionKey,
            'status' => 'submitted',
            'order_id' => $orderId,
            'payload' => json_encode(
                $payload,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'updated_at' => now(),
        ];

        if ($row) {
            DB::table('pmd_table_order_drafts')
                ->where('id', (int)$row->id)
                ->update($data);
            return DB::table('pmd_table_order_drafts')
                ->where('id', (int)$row->id)
                ->first();
        }

        $data['created_at'] = now();
        $id = DB::table('pmd_table_order_drafts')->insertGetId($data);

        return DB::table('pmd_table_order_drafts')
            ->where('id', $id)
            ->first();
    });
};

$pmdRoundContextLockKey = function (array $context): string {
    return implode('|', [
        request()->getHost(),
        (string)($context['table_id'] ?? ''),
        (string)($context['table_no'] ?? ''),
        (string)($context['qr'] ?? ''),
    ]);
};

$pmdRoundWithNamedLock = function (string $basis, callable $callback) {
    $lockName = 'pmd_round_'.substr(hash('sha256', $basis), 0, 40);
    $acquired = true;
    try {
        $row = DB::selectOne('SELECT GET_LOCK(?, 8) AS acquired', [$lockName]);
        if ($row && property_exists($row, 'acquired')) $acquired = ((int)$row->acquired === 1);
    } catch (\Throwable $ignored) {
        // Existing-row FOR UPDATE locks still protect retry/idempotence if advisory locks are unavailable.
        $acquired = true;
    }
    if (!$acquired) throw new \RuntimeException('Table order is busy. Please try again.');
    try {
        return $callback();
    } finally {
        try { DB::selectOne('SELECT RELEASE_LOCK(?) AS released', [$lockName]); } catch (\Throwable $ignored) {}
    }
};

$pmdRoundAugmentOrderPayload = function (array $payload, $order, $submittedDraft, array $context, string $sessionKey): array {
    $orderId = (int)($order->order_id ?? 0);
    $menuRows = DB::table('order_menus')->where('order_id', $orderId)->orderBy('order_menu_id')->get([
        'order_menu_id', 'menu_id', 'comment', 'quantity', 'price', 'subtotal'
    ]);

    $guestByOrderMenu = [];
    foreach ($menuRows as $menuRow) {
        $comment = (string)($menuRow->comment ?? '');
        if (preg_match('/\\[guest_session:([^\\]]*)\\]/', $comment, $match)) {
            $guestByOrderMenu[(int)$menuRow->order_menu_id] = trim((string)$match[1]);
        }
    }

    // Mirror the proven QR settlement allocation contract so split/item payment on one
    // invoice cannot re-offer quantities already paid from another phone.
    $paidByOrderMenu = [];
    $paidByMenu = [];
    $allocationMode = 'none';
    if (\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')
        && \Illuminate\Support\Facades\Schema::hasTable('order_payment_transaction_items')) {
        $allocationColumn = null;
        foreach (['order_menu_id', 'order_item_id', 'menu_id'] as $candidate) {
            if (\Illuminate\Support\Facades\Schema::hasColumn('order_payment_transaction_items', $candidate)) {
                $allocationColumn = $candidate;
                break;
            }
        }
        if ($allocationColumn) {
            $allocationMode = $allocationColumn === 'menu_id' ? 'menu_id_legacy' : 'order_menu_id';
            $transactionIds = DB::table('order_payment_transactions')
                ->where('order_id', $orderId)
                ->whereNotIn('settlement_status', ['failed', 'cancelled', 'canceled'])
                ->pluck('id')
                ->map(fn($id) => (int)$id)
                ->filter(fn($id) => $id > 0)
                ->values()
                ->all();
            if ($transactionIds) {
                $allocRows = DB::table('order_payment_transaction_items')
                    ->whereIn('transaction_id', $transactionIds)
                    ->get([$allocationColumn, 'quantity_paid']);
                foreach ($allocRows as $allocRow) {
                    $key = (int)($allocRow->{$allocationColumn} ?? 0);
                    if ($key <= 0) continue;
                    $qty = max(0.0, (float)($allocRow->quantity_paid ?? 0));
                    if ($allocationMode === 'menu_id_legacy') $paidByMenu[$key] = ($paidByMenu[$key] ?? 0) + $qty;
                    else $paidByOrderMenu[$key] = ($paidByOrderMenu[$key] ?? 0) + $qty;
                }
            }
        }
    }

    $menuMeta = [];
    $consumedLegacyByMenu = [];
    foreach ($menuRows as $menuRow) {
        $orderedQty = max(0.0, (float)($menuRow->quantity ?? 0));
        if ($allocationMode === 'menu_id_legacy') {
            $menuId = (int)($menuRow->menu_id ?? 0);
            $availablePaid = (float)($paidByMenu[$menuId] ?? 0);
            $alreadyConsumed = (float)($consumedLegacyByMenu[$menuId] ?? 0);
            $paidQty = max(0.0, min($orderedQty, $availablePaid - $alreadyConsumed));
            $consumedLegacyByMenu[$menuId] = $alreadyConsumed + $paidQty;
        } else {
            $paidQty = max(0.0, min($orderedQty, (float)($paidByOrderMenu[(int)$menuRow->order_menu_id] ?? 0)));
        }
        $menuMeta[(int)$menuRow->order_menu_id] = [
            'paid' => round($paidQty, 3),
            'unpaid' => round(max(0, $orderedQty - $paidQty), 3),
        ];
    }

    $groups = [];
    foreach (($payload['items'] ?? []) as &$item) {
        $orderMenuId = (int)($item['order_menu_id'] ?? $item['orderMenuId'] ?? 0);
        $guest = $guestByOrderMenu[$orderMenuId] ?? '';
        $item['guest_session_id'] = $guest !== '' ? $guest : null;
        $item['paid_quantity'] = (float)($menuMeta[$orderMenuId]['paid'] ?? 0);
        $item['unpaid_quantity'] = (float)($menuMeta[$orderMenuId]['unpaid'] ?? ($item['quantity'] ?? 0));
        $groupKey = $guest !== '' ? $guest : 'table';
        if (!isset($groups[$groupKey])) {
            $groups[$groupKey] = ['guest_session_id' => $guest !== '' ? $guest : null, 'items' => [], 'subtotal' => 0.0];
        }
        $groups[$groupKey]['items'][] = $item;
        $groups[$groupKey]['subtotal'] += (float)($item['subtotal'] ?? 0);
    }
    unset($item);

    $createdAt = (string)($order->created_at ?? '');
    if ($createdAt === '' && !empty($order->order_date)) {
        $createdAt = trim((string)$order->order_date.' '.(string)($order->order_time ?? ''));
    }

    $payload['groups'] = array_values($groups);
    $payload['sessionKey'] = $sessionKey;
    $payload['draft_id'] = $submittedDraft ? (int)$submittedDraft->id : ($payload['draft_id'] ?? null);
    $payload['draftId'] = $payload['draft_id'];
    $payload['kind'] = 'submitted';
    $payload['created_at'] = $createdAt !== '' ? $createdAt : null;
    $payload['createdAt'] = $createdAt !== '' ? $createdAt : null;
    $payload['submittedAt'] = $submittedDraft ? (string)($submittedDraft->updated_at ?? '') : $createdAt;
    // PMD_PAID_INVOICE_ORDER_STATUS_R28
    // Keep fulfilment status independent from payment state. Older pay-existing runs
    // could overwrite status_id with Paid; recover the last non-financial kitchen state
    // from status history so already-paid rounds still show Received/Preparing/Ready.
    $financialStatusNames = ['paid', 'settled', 'payment open', 'payment complete', 'payment completed', 'partially paid', 'partial', 'unpaid'];
    $normalizeStatusName = function ($value) {
        return strtolower(trim(preg_replace('/\s+/u', ' ', (string)$value)));
    };
    $deliveryStatus = trim((string)($payload['deliveryStatus'] ?? $payload['status_name'] ?? ''));
    $currentWasFinancial = in_array($normalizeStatusName($deliveryStatus), $financialStatusNames, true);
    if ($currentWasFinancial) $deliveryStatus = '';

    if ($deliveryStatus === '' && $orderId > 0) {
        try {
            $morphClass = \Admin\Models\Orders_model::make()->getMorphClass();
            $historyRows = DB::table('status_history as sh')
                ->leftJoin('statuses as st', 'st.status_id', '=', 'sh.status_id')
                ->where('sh.object_id', $orderId)
                ->where('sh.object_type', $morphClass)
                ->orderByDesc('sh.created_at')
                ->orderByDesc('sh.status_history_id')
                ->limit(20)
                ->get(['st.status_name']);
            foreach ($historyRows as $historyRow) {
                $candidate = trim((string)($historyRow->status_name ?? ''));
                if ($candidate === '' || in_array($normalizeStatusName($candidate), $financialStatusNames, true)) continue;
                $deliveryStatus = $candidate;
                break;
            }
        } catch (\Throwable $ignored) {}
    }

    // R27-created table rounds start in the restaurant's status_id=1. This is only a
    // compatibility fallback for already-paid rows that have no historical status row.
    if ($deliveryStatus === '' && $orderId > 0 && stripos((string)($order->comment ?? ''), 'Table Round') !== false) {
        try {
            $candidate = trim((string)(DB::table('statuses')->where('status_id', 1)->value('status_name') ?? ''));
            if ($candidate !== '' && !in_array($normalizeStatusName($candidate), $financialStatusNames, true)) $deliveryStatus = $candidate;
        } catch (\Throwable $ignored) {}
    }

    $payload['deliveryStatus'] = $deliveryStatus !== '' ? $deliveryStatus : null;
    if ($deliveryStatus !== '' || $currentWasFinancial) $payload['status_name'] = $deliveryStatus !== '' ? $deliveryStatus : null;

    $orderTotalForInvoice = (float)($payload['totals']['orderTotal'] ?? $payload['total'] ?? $order->order_total ?? 0);
    $settledForInvoice = (float)($payload['totals']['settledAmount'] ?? $order->settled_amount ?? 0);
    $remainingForInvoice = max(0, (float)($payload['totals']['remainingAmount'] ?? ($orderTotalForInvoice - $settledForInvoice)));
    $settlementForInvoice = strtolower(trim((string)($order->settlement_status ?? '')));
    $isFullyPaidForInvoice = in_array($settlementForInvoice, ['paid', 'settled'], true)
        || strtolower((string)($payload['paymentStatus'] ?? '')) === 'paid'
        || ($orderTotalForInvoice > 0 && $remainingForInvoice <= 0.0001);
    $invoiceToken = ($isFullyPaidForInvoice && $orderId > 0 && trim($sessionKey) !== '')
        ? hash_hmac('sha256', request()->getHost().'|'.$orderId.'|'.$sessionKey, (string)config('app.key'))
        : null;
    $payload['invoiceAvailable'] = $invoiceToken !== null;
    $payload['invoiceDownloadToken'] = $invoiceToken;

    return $payload;
};

Route::get('/table-orders/state', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $formatTableOrderResponse,
    $pmdRoundEnsureSchema,
    $pmdRoundDraftContext,
    $pmdRoundResolveSessionKey,
    $pmdRoundAugmentOrderPayload,
    $pmdFindOpenTableOrderForContext,
    $pmdRoundBindCashierOrderSessionR44
) {
    $pmdRoundEnsureSchema();
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);
    $guestSessionId = trim((string)$request->query('guest_session_id', ''));
    $sessionKey = $pmdRoundResolveSessionKey($context, $guestSessionId, true);

    // PMD_CASHIER_PAID_SESSION_HISTORY_R44
    // While the Cashier order is still open, persist the current QR participant
    // on the synthetic R43 session. After full payment this submitted pointer
    // remains resolvable for that same guest, so invoiceAvailable can be shown.
    if ($sessionKey) {
        try {
            $cashierOrder = $pmdFindOpenTableOrderForContext($context, null);
            if ($cashierOrder && (int)($cashierOrder->order_id ?? 0) > 0) {
                $pmdRoundBindCashierOrderSessionR44(
                    $context,
                    $cashierOrder,
                    $sessionKey,
                    $guestSessionId
                );
            }
        } catch (\Throwable $ignored) {}
    }

    if (!$sessionKey) {
        return response()->json([
            'success' => true,
            'sessionKey' => null,
            'draft' => null,
            'orders' => [],
            'table_id' => $context['table_id'],
            'table_no' => $context['table_no'],
            'updatedAt' => now()->toIso8601String(),
        ]);
    }

    $draftQuery = DB::table('pmd_table_order_drafts')->where('status', 'draft')->where('session_key', $sessionKey);
    $pmdRoundDraftContext($draftQuery, $context);
    $draft = $draftQuery->orderByDesc('id')->first();
    $draftPayload = null;
    if ($draft) {
        $draftPayload = json_decode($formatTableOrderResponse($draft, null, $context)->getContent(), true) ?: [];
        $draftPayload['sessionKey'] = $sessionKey;
        $draftPayload['kind'] = 'draft';
    }

    $submittedQuery = DB::table('pmd_table_order_drafts')
        ->where('status', 'submitted')
        ->where('session_key', $sessionKey)
        ->whereNotNull('order_id');
    $pmdRoundDraftContext($submittedQuery, $context);
    $submittedRows = $submittedQuery->orderByDesc('id')->limit(40)->get();

    $orders = [];
    $seenOrderIds = [];
    foreach ($submittedRows as $submittedDraft) {
        $orderId = (int)($submittedDraft->order_id ?? 0);
        if ($orderId <= 0 || isset($seenOrderIds[$orderId])) continue;
        $seenOrderIds[$orderId] = true;
        $order = DB::table('orders')
            ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
            ->where('orders.order_id', $orderId)
            ->first(['orders.*', 'statuses.status_name']);
        if (!$order) continue;
        $payload = json_decode($formatTableOrderResponse(null, $order, $context)->getContent(), true) ?: [];
        $orders[] = $pmdRoundAugmentOrderPayload($payload, $order, $submittedDraft, $context, $sessionKey);
    }

    // PMD_CASHIER_CANONICAL_ORDER_IN_ROUND_STATE_R43
    // A Cashier-created open check is not represented by a submitted R27 draft.
    // Merge it into the same live response without duplicating an order that is
    // already present through a submitted draft.
    try {
        $externalOrder = $pmdFindOpenTableOrderForContext($context, null);
        $externalOrderId = (int)($externalOrder->order_id ?? 0);

        if ($externalOrderId > 0 && !isset($seenOrderIds[$externalOrderId])) {
            $seenOrderIds[$externalOrderId] = true;

            $payload = json_decode(
                $formatTableOrderResponse(
                    null,
                    $externalOrder,
                    $context
                )->getContent(),
                true
            ) ?: [];

            $payload['source'] = 'cashier_canonical';

            $orders[] = $pmdRoundAugmentOrderPayload(
                $payload,
                $externalOrder,
                null,
                $context,
                $sessionKey
            );
        }
    } catch (\Throwable $ignored) {}

    usort($orders, function ($a, $b) {
        return ((int)($b['order_id'] ?? 0)) <=> ((int)($a['order_id'] ?? 0));
    });

    return response()->json([
        'success' => true,
        'sessionKey' => $sessionKey,
        'draft' => $draftPayload,
        'orders' => $orders,
        'table_id' => $context['table_id'],
        'table_no' => $context['table_no'],
        'updatedAt' => now()->toIso8601String(),
    ]);
});

Route::post('/table-orders/confirm-items', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $normalizeDraftItems,
    $formatTableOrderResponse,
    $pmdRoundEnsureSchema,
    $pmdRoundDraftContext,
    $pmdRoundResolveSessionKey,
    $pmdRoundNewSessionKey,
    $pmdRoundContextLockKey,
    $pmdRoundWithNamedLock,
    $pmdRoundAugmentOrderPayload
) {
    $pmdRoundEnsureSchema();
    $request->validate([
        'guest_session_id' => 'required|string|max:191',
        'items' => 'required|array|min:1',
        'confirmation_id' => 'nullable|string|max:191',
    ]);
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);
    $guestSessionId = trim((string)$request->input('guest_session_id', ''));
    $confirmationId = trim((string)$request->input('confirmation_id', ''));
    $items = $normalizeDraftItems((array)$request->input('items', []));
    if (!$items) return response()->json(['success' => false, 'error' => 'No valid menu items'], 422);

    $lockBasis = $pmdRoundContextLockKey($context);
    $result = $pmdRoundWithNamedLock($lockBasis, function () use (
        $context,
        $guestSessionId,
        $items,
        $confirmationId,
        $pmdRoundDraftContext,
        $pmdRoundResolveSessionKey,
        $pmdRoundNewSessionKey
    ) {
        // includeGuestHistory=true lets the same participant keep today's paid invoice
        // history while a brand-new scanner gets a clean session once nothing is open.
        $sessionKey = $pmdRoundResolveSessionKey($context, $guestSessionId, true)
            ?: $pmdRoundNewSessionKey($context, 'new');

        // Confirmation IDs survive the draft -> submitted transition. This makes a retry
        // safe even when the first HTTP response was lost and another phone already sent
        // that draft to the kitchen before this device retried.
        if ($confirmationId !== '') {
            $history = DB::table('pmd_table_order_drafts')
                ->where('session_key', $sessionKey)
                ->orderByDesc('id')
                ->limit(60)
                ->get();
            foreach ($history as $row) {
                $historyPayload = json_decode((string)($row->payload ?? ''), true) ?: [];
                $historyConfirmations = (array)($historyPayload['confirmations'] ?? []);
                if (!in_array($confirmationId, $historyConfirmations, true)) continue;
                return [
                    'sessionKey' => $sessionKey,
                    'draft' => (string)$row->status === 'draft' ? $row : null,
                    'alreadySubmittedOrderId' => (string)$row->status === 'submitted' ? (int)($row->order_id ?? 0) : 0,
                    'alreadySubmittedDraft' => (string)$row->status === 'submitted' ? $row : null,
                    'alreadyConfirmed' => true,
                ];
            }
        }

        $draft = DB::transaction(function () use ($context, $items, $confirmationId, $sessionKey, $pmdRoundDraftContext) {
            $query = DB::table('pmd_table_order_drafts')->where('status', 'draft')->where('session_key', $sessionKey);
            $pmdRoundDraftContext($query, $context);
            $draft = $query->lockForUpdate()->orderByDesc('id')->first();
            $payload = $draft ? (json_decode((string)$draft->payload, true) ?: []) : [];
            $confirmations = array_values(array_filter((array)($payload['confirmations'] ?? []), fn($value) => is_string($value) && $value !== ''));
            if ($confirmationId !== '' && in_array($confirmationId, $confirmations, true)) return $draft;

            $existingItems = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            $merged = array_values(array_merge($existingItems, $items));
            if ($confirmationId !== '') $confirmations[] = $confirmationId;
            if (count($confirmations) > 100) $confirmations = array_slice($confirmations, -100);
            $data = [
                'table_id' => $context['table_id'] ?: null,
                'table_no' => $context['table_no'] ?: null,
                'table_name' => $context['table_name'] ?: null,
                'qr' => $context['qr'] ?: null,
                'session_key' => $sessionKey,
                'status' => 'draft',
                'payload' => json_encode(['items' => $merged, 'confirmations' => $confirmations], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ];
            if ($draft) {
                DB::table('pmd_table_order_drafts')->where('id', (int)$draft->id)->update($data);
                return DB::table('pmd_table_order_drafts')->where('id', (int)$draft->id)->first();
            }
            $data['created_at'] = now();
            $id = DB::table('pmd_table_order_drafts')->insertGetId($data);
            return DB::table('pmd_table_order_drafts')->where('id', $id)->first();
        });

        return [
            'sessionKey' => $sessionKey,
            'draft' => $draft,
            'alreadySubmittedOrderId' => 0,
            'alreadySubmittedDraft' => null,
            'alreadyConfirmed' => false,
        ];
    });

    if ((int)($result['alreadySubmittedOrderId'] ?? 0) > 0) {
        $order = DB::table('orders')
            ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
            ->where('orders.order_id', (int)$result['alreadySubmittedOrderId'])
            ->first(['orders.*', 'statuses.status_name']);
        if ($order) {
            $payload = json_decode($formatTableOrderResponse(null, $order, $context)->getContent(), true) ?: [];
            $payload = $pmdRoundAugmentOrderPayload($payload, $order, $result['alreadySubmittedDraft'], $context, $result['sessionKey']);
            $payload['alreadyConfirmed'] = true;
            return response()->json($payload);
        }
    }

    $payload = json_decode($formatTableOrderResponse($result['draft'], null, $context)->getContent(), true) ?: [];
    $payload['sessionKey'] = $result['sessionKey'];
    $payload['kind'] = 'draft';
    $payload['alreadyConfirmed'] = (bool)($result['alreadyConfirmed'] ?? false);
    return response()->json($payload);
});

Route::post('/table-orders/submit', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $formatTableOrderResponse,
    $pmdRoundEnsureSchema,
    $pmdRoundContextMatchesDraft,
    $pmdRoundNewSessionKey,
    $pmdRoundContextLockKey,
    $pmdRoundWithNamedLock,
    $pmdRoundAugmentOrderPayload
) {
    $pmdRoundEnsureSchema();
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);
    $draftId = (int)$request->input('draft_id', 0);
    if ($draftId <= 0) return response()->json(['success' => false, 'error' => 'draft_id is required'], 422);

    $probe = DB::table('pmd_table_order_drafts')->where('id', $draftId)->first();
    if (!$probe || !$pmdRoundContextMatchesDraft($probe, $context)) {
        return response()->json(['success' => false, 'error' => 'Table draft not found'], 404);
    }
    $sessionKey = trim((string)($probe->session_key ?? '')) ?: $pmdRoundNewSessionKey($context, 'draft-'.$draftId);
    $orderId = null;
    $alreadySubmitted = false;

    $pmdRoundWithNamedLock($pmdRoundContextLockKey($context), function () use (
        &$orderId,
        &$alreadySubmitted,
        $draftId,
        $context,
        $request,
        $sessionKey,
        $pmdRoundContextMatchesDraft
    ) {
        DB::transaction(function () use (&$orderId, &$alreadySubmitted, $draftId, $context, $request, $sessionKey, $pmdRoundContextMatchesDraft) {
            $draft = DB::table('pmd_table_order_drafts')->where('id', $draftId)->lockForUpdate()->first();
            if (!$draft || !$pmdRoundContextMatchesDraft($draft, $context)) throw new \RuntimeException('Table draft not found');

            if ((string)$draft->status === 'submitted' && (int)($draft->order_id ?? 0) > 0) {
                $orderId = (int)$draft->order_id;
                $alreadySubmitted = true;
                return;
            }
            if ((string)$draft->status !== 'draft') throw new \RuntimeException('This table draft is no longer open');

            $payload = json_decode((string)$draft->payload, true) ?: [];
            $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            if (!$items) throw new \RuntimeException('No draft items to submit');

            // IMPORTANT R27 invariant: every submitted draft becomes a NEW order/invoice.
            // Never append new food to an older submitted/unpaid order.
            $resolvedTotals = pmd_table_order_calculate_totals($items);
            $total = (float)$resolvedTotals['total'];
            $comment = trim('Table Round | Table ID: '.($context['table_id'] ?? '').' | Table: '.(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')).' | [table_session:'.$sessionKey.'] | [table_draft_id:'.$draftId.']'.($request->input('guest_session_id') ? ' | [submitted_by:'.$request->input('guest_session_id').']' : ''), ' |');
            $insert = [
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
                'processed' => 1,
                'payment' => 'qr_pay_later',
                'total_items' => array_sum(array_map(fn($i) => (int)($i['quantity'] ?? 1), $items)),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent() ?? 'API Client',
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) $insert['settlement_status'] = 'unpaid';
            if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) $insert['settled_amount'] = 0;

            // The existing PayMyDine order schema allocates order_id explicitly. Lock the
            // current highest row before max+1 so simultaneous table submits on different
            // tables cannot produce the same invoice number.
            $lastOrderId = (int)(DB::table('orders')->orderByDesc('order_id')->lockForUpdate()->value('order_id') ?? 0);
            $orderId = $lastOrderId + 1;
            $insert['order_id'] = $orderId;
            DB::table('orders')->insert($insert);

            foreach ($items as $item) {
                DB::table('order_menus')->insert([
                    'order_id' => $orderId,
                    'menu_id' => (int)($item['menu_id'] ?? 0),
                    'name' => (string)($item['name'] ?? 'Item'),
                    'quantity' => max(1, (int)($item['quantity'] ?? 1)),
                    'price' => (float)($item['price'] ?? 0),
                    'subtotal' => (float)($item['subtotal'] ?? 0),
                    // PMD_ITEM_NOTE_ORDER_MENU_R29: keep the human kitchen note in the canonical
                    // order_menus.comment while preserving the R27 guest-session marker. Admin + KDS
                    // already strip the internal marker and display only the human instruction.
                    'comment' => trim(((string)($item['note'] ?? '') !== '' ? (string)$item['note'].' | ' : '').'[guest_session:'.(string)($item['guest_session_id'] ?? '').']', ' |'),
                    'option_values' => !empty($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null,
                ]);
            }
            $totalsRows = array_map(fn($row) => array_merge(['order_id' => $orderId], $row), $resolvedTotals['rows']);
            DB::table('order_totals')->insert($totalsRows);
            DB::table('pmd_table_order_drafts')->where('id', $draftId)->update([
                'status' => 'submitted',
                'order_id' => $orderId,
                'session_key' => $sessionKey,
                'updated_at' => now(),
            ]);

            try {
                DB::table('notifications')->insert([
                    'type' => 'order',
                    'title' => 'New table order #'.$orderId,
                    'table_id' => (int)($context['table_id'] ?: 0),
                    'table_name' => (string)(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')),
                    'payload' => json_encode(['order_id' => $orderId, 'draft_id' => $draftId, 'session_key' => $sessionKey, 'round_invoice' => true]),
                    'status' => 'new',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Throwable $ignored) {}
        });
    });

    if (!$orderId) return response()->json(['success' => false, 'error' => 'No order was created'], 422);
    $order = DB::table('orders')
        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
        ->where('orders.order_id', $orderId)
        ->first(['orders.*', 'statuses.status_name']);
    if (!$order) return response()->json(['success' => false, 'error' => 'Submitted order not found'], 404);
    $submittedDraft = DB::table('pmd_table_order_drafts')->where('id', $draftId)->first();
    $payload = json_decode($formatTableOrderResponse(null, $order, $context)->getContent(), true) ?: [];
    $payload = $pmdRoundAugmentOrderPayload($payload, $order, $submittedDraft, $context, $sessionKey);
    $payload['alreadySubmitted'] = $alreadySubmitted;
    return response()->json($payload);
});
