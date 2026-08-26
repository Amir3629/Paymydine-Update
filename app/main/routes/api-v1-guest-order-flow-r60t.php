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

$pmdR60tIsLegacyGuestRound = static function ($order): bool {
    $comment = (string)($order->comment ?? '');
    return str_contains($comment, '[table_session:')
        || str_contains($comment, '[table_draft_id:')
        || str_contains($comment, 'Table Round')
        || str_contains($comment, 'Table Draft Basket');
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
        $current = DB::table('tables')->where($pk, $pkValue)->first(['operational_status']);
        if ($current && strtolower(trim((string)($current->operational_status ?? ''))) === 'occupied') return;
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

// Keep the canonical paid-invoice security contract without bringing back the
// old shared guest draft. This row has no table/QR identity, so table-state
// discovery cannot expose a private self-order to another scanner.
$pmdR60tEnsurePrivateInvoicePointer = static function ($order, string $guestSessionId) use ($pmdRoundEnsureSchema): array {
    $orderId = (int)($order->order_id ?? 0);
    $guestSessionId = trim($guestSessionId);
    if ($orderId < 1 || $guestSessionId === '') return [null, ''];

    try {
        $pmdRoundEnsureSchema();
        $sessionKey = 'pmds_r60t_'.substr(hash('sha256', request()->getHost().'|'.$orderId.'|'.$guestSessionId), 0, 32);
        $pointer = DB::table('pmd_table_order_drafts')
            ->where('status', 'submitted')
            ->where('order_id', $orderId)
            ->where('session_key', $sessionKey)
            ->orderByDesc('id')
            ->first();
        if ($pointer) return [$pointer, $sessionKey];

        $id = DB::table('pmd_table_order_drafts')->insertGetId([
            'table_id' => null,
            'table_no' => null,
            'table_name' => null,
            'qr' => null,
            'session_key' => $sessionKey,
            'status' => 'submitted',
            'order_id' => $orderId,
            'payload' => json_encode([
                'source' => 'r60t_private_invoice_pointer',
                'guest_hash' => hash('sha256', $guestSessionId),
            ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return [DB::table('pmd_table_order_drafts')->where('id', $id)->first(), $sessionKey];
    } catch (\Throwable $e) {
        \Log::warning('PMD R60T private invoice pointer failed', [
            'order_id' => $orderId,
            'message' => $e->getMessage(),
        ]);
        return [null, ''];
    }
};

$pmdR60tPayload = static function ($order, array $context, string $origin, string $guestSessionId = '') use (
    $formatTableOrderResponse,
    $pmdRoundAugmentOrderPayload,
    $pmdR60tEnsurePrivateInvoicePointer
) {
    $payload = json_decode($formatTableOrderResponse(null, $order, $context)->getContent(), true) ?: [];

    if (in_array($origin, ['guest_self', 'staff_shared'], true) && trim($guestSessionId) !== '') {
        [$invoicePointer, $privateSessionKey] = $pmdR60tEnsurePrivateInvoicePointer($order, $guestSessionId);
        if ($privateSessionKey !== '') {
            // Reuse the proven fulfilment-status recovery + canonical invoice token
            // generation. This does not alter payment/provider/invoice implementation.
            $payload = $pmdRoundAugmentOrderPayload(
                $payload,
                $order,
                $invoicePointer,
                $context,
                $privateSessionKey
            );
        }
    }

    $payload['orderOrigin'] = $origin;
    $payload['source'] = $origin;
    $remainingForPayment = max(0, (float)($order->order_total ?? 0) - (float)($order->settled_amount ?? 0));
    $payload['canSplit'] = $origin === 'staff_shared' && $remainingForPayment > 0.0001;
    $payload['remainingPayableAmount'] = round($remainingForPayment, 4);
    $payload['paymentRequiredBeforeKitchen'] = $origin === 'guest_self';
    $payload['kitchenReleased'] = $origin === 'staff_shared' || (int)($order->processed ?? 0) === 1;
    return $payload;
};


// PMD_R61_TABLE_VISIT_LEASE
// A printed QR scan activates one physical table visit. Existing table-release
// history is the lifecycle authority; payment state remains completely separate.
$pmdR61CutoverTs = 1787723959;

$pmdR61ActualTableId = static function (array $context): int {
    $table = $context['table'] ?? null;
    return max(0, (int)($table->table_id ?? $table->id ?? 0));
};

$pmdR61LatestReleaseTs = static function (int $tableId): int {
    if ($tableId < 1) return 0;
    try {
        if (\Illuminate\Support\Facades\Schema::hasTable('pmd_table_status_history')) {
            $columns = \Illuminate\Support\Facades\Schema::getColumnListing('pmd_table_status_history');
            if (in_array('table_id', $columns, true)) {
                $timeColumn = in_array('created_at', $columns, true)
                    ? 'created_at'
                    : (in_array('updated_at', $columns, true) ? 'updated_at' : null);
                if ($timeColumn) {
                    $query = DB::table('pmd_table_status_history')->where('table_id', $tableId);
                    $query->where(function ($q) use ($columns) {
                        $added = false;
                        if (in_array('reason', $columns, true)) {
                            $q->whereIn('reason', [
                                'customer_left',
                                'customer_left_skip_cleaning',
                                'cashier_manual_free',
                                'cleaning_complete',
                            ]);
                            $added = true;
                        }
                        if (in_array('new_status', $columns, true)) {
                            if ($added) $q->orWhereIn('new_status', ['cleaning', 'available']);
                            else $q->whereIn('new_status', ['cleaning', 'available']);
                            $added = true;
                        }
                        if (!$added) $q->whereRaw('1 = 0');
                    });
                    $value = $query->orderByDesc($timeColumn)->value($timeColumn);
                    $ts = $value ? (strtotime((string)$value) ?: 0) : 0;
                    if ($ts > 0) return $ts;
                }
            }
        }
    } catch (\Throwable $ignored) {
    }
    return 0;
};

$pmdR61LeaseCookieName = static fn (int $tableId): string => 'pmd_r61_visit_'.$tableId;
$pmdR61LeaseCacheKey = static function (int $tableId, string $token): string {
    return \App\Helpers\TenantHelper::scopedCacheKey(
        'pmd:r61:visit:'.$tableId.':'.hash('sha256', $token)
    );
};

$pmdR61ReadLease = static function (int $tableId) use ($pmdR61LeaseCookieName, $pmdR61LeaseCacheKey) {
    if ($tableId < 1) return null;
    $token = trim((string)request()->cookie($pmdR61LeaseCookieName($tableId), ''));
    if ($token === '') return null;
    try {
        $lease = \Illuminate\Support\Facades\Cache::get($pmdR61LeaseCacheKey($tableId, $token));
        return is_array($lease) ? $lease : null;
    } catch (\Throwable $ignored) {
        return null;
    }
};

$pmdR61LeaseValid = static function (array $context, string $guestSessionId = '') use (
    $pmdR61ActualTableId,
    $pmdR61LatestReleaseTs,
    $pmdR61ReadLease,
    $pmdR61CutoverTs
): bool {
    $tableId = $pmdR61ActualTableId($context);
    if ($tableId < 1) return false;
    $latestRelease = $pmdR61LatestReleaseTs($tableId);
    $lease = $pmdR61ReadLease($tableId);

    if (!$lease) {
        // Rollout compatibility: pages already open before R61 keep working until
        // the first explicit Customer Left / FREE that happens after this deploy.
        return $latestRelease <= $pmdR61CutoverTs;
    }

    $activatedAt = (int)($lease['activated_at'] ?? 0);
    if ($activatedAt < 1 || $latestRelease > $activatedAt) return false;
    if ($guestSessionId !== '' && !hash_equals($guestSessionId, (string)($lease['guest_session_id'] ?? ''))) return false;
    return true;
};

$pmdR61ExpiredState = static function () {
    // HTTP 200 intentionally clears orders even in a tab still running the older
    // R60T bundle. The new bundle additionally reads sessionExpired and locks UI.
    return response()->json([
        'success' => true,
        'sessionExpired' => true,
        'code' => 'TABLE_SESSION_EXPIRED',
        'selfOrders' => [],
        'sharedStaffOrders' => [],
        'orders' => [],
        'updatedAt' => now()->toIso8601String(),
    ]);
};

$pmdR61ExpiredAction = static function () {
    return response()->json([
        'success' => false,
        'ok' => false,
        'code' => 'TABLE_SESSION_EXPIRED',
        'error' => 'This table visit has ended. Scan the table QR again to continue.',
    ], 410);
};

$pmdR61GuestActionLeaseValid = static function ($tableRef) use (
    $pmdR61LatestReleaseTs,
    $pmdR61ReadLease,
    $pmdR61CutoverTs
): bool {
    $ref = trim((string)$tableRef);
    if ($ref === '') return false;
    try {
        $table = DB::table('tables')->where('table_id', $ref)->first();
        if (!$table && \Illuminate\Support\Facades\Schema::hasColumn('tables', 'table_no')) {
            $table = DB::table('tables')->where('table_no', $ref)->first();
        }
    } catch (\Throwable $ignored) {
        return false;
    }
    $tableId = max(0, (int)($table->table_id ?? $table->id ?? 0));
    if ($tableId < 1) return false;
    $latestRelease = $pmdR61LatestReleaseTs($tableId);
    $lease = $pmdR61ReadLease($tableId);
    if (!$lease) return $latestRelease <= $pmdR61CutoverTs;
    return (int)($lease['activated_at'] ?? 0) >= $latestRelease;
};

Route::post('/guest-orders/activate', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $pmdR61ActualTableId,
    $pmdR61LatestReleaseTs,
    $pmdR61ReadLease,
    $pmdR61LeaseCookieName,
    $pmdR61LeaseCacheKey,
    $pmdR61CutoverTs
) {
    $request->validate([
        'guest_session_id' => 'required|string|max:191',
        'qr' => 'required|string|max:255',
    ]);
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);

    $tableId = $pmdR61ActualTableId($context);
    if ($tableId < 1) return response()->json(['success' => false, 'error' => 'A valid physical table is required'], 422);

    $providedQr = trim((string)$request->input('qr', ''));
    $storedQr = trim((string)($context['table']->qr_code ?? ''));
    if ($providedQr === '' || $storedQr === '' || !hash_equals($storedQr, $providedQr)) {
        return response()->json(['success' => false, 'code' => 'INVALID_TABLE_QR', 'error' => 'Invalid table QR'], 403);
    }

    $guestSessionId = trim((string)$request->input('guest_session_id'));
    $latestRelease = $pmdR61LatestReleaseTs($tableId);
    $currentLease = $pmdR61ReadLease($tableId);
    $currentLeaseValid = is_array($currentLease)
        && (int)($currentLease['activated_at'] ?? 0) >= $latestRelease
        && hash_equals($guestSessionId, (string)($currentLease['guest_session_id'] ?? ''));

    if (!$currentLeaseValid && $latestRelease > $pmdR61CutoverTs) {
        $oldIdentity = DB::table('orders')
            ->where('comment', 'like', '%[pmd_origin:guest_self]%')
            ->where('comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
            ->exists();
        if ($oldIdentity) {
            return response()->json([
                'success' => false,
                'code' => 'SESSION_ROTATION_REQUIRED',
                'error' => 'Start a new guest identity for this table visit.',
            ], 409);
        }
    }

    $token = bin2hex(random_bytes(32));
    \Illuminate\Support\Facades\Cache::put(
        $pmdR61LeaseCacheKey($tableId, $token),
        [
            'table_id' => $tableId,
            'guest_session_id' => $guestSessionId,
            'activated_at' => time(),
        ],
        now()->addHours(12)
    );

    return response()->json([
        'success' => true,
        'tableId' => $tableId,
        'guestSessionId' => $guestSessionId,
    ])->cookie(
        $pmdR61LeaseCookieName($tableId),
        $token,
        720,
        '/',
        null,
        request()->isSecure(),
        true,
        false,
        'Lax'
    );
});

Route::get('/guest-orders/state', function (\Illuminate\Http\Request $request) use (
    $resolveTableDraftContext,
    $pmdR60tContextCandidates,
    $pmdR60tIsGuestSelfOrder,
    $pmdR60tIsLegacyGuestRound,
    $pmdR60tOrderBelongsToGuest,
    $pmdR60tReleasePaidGuestOrder,
    $pmdR60tMarkTableOccupied,
    $pmdR60tPayload,
    $pmdR61LeaseValid,
    $pmdR61ExpiredState
) {
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);
    $guestSessionId = trim((string)$request->query('guest_session_id', ''));
    if ($guestSessionId === '') return response()->json(['success' => false, 'error' => 'guest_session_id is required'], 422);
    if (!$pmdR61LeaseValid($context, $guestSessionId)) return $pmdR61ExpiredState();

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
            // PMD_R63_SINGLE_OPEN_SELF_ORDER
            // A superseded unpaid fragment is retained only as an audit row.
            if (str_contains((string)($order->comment ?? ''), '[merged_into:')) continue;
            if (!$pmdR60tOrderBelongsToGuest($order, $guestSessionId)) continue;
            $pmdR60tReleasePaidGuestOrder($order, $context);
            $order = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', (int)$order->order_id)
                ->first(['orders.*', 'statuses.status_name']);
            if ($order) $self[] = $pmdR60tPayload($order, $context, 'guest_self', $guestSessionId);
            continue;
        }

        // Never expose another guest's legacy QR round as a shared table bill.
        if ($pmdR60tIsLegacyGuestRound($order)) continue;

        // PMD_R68B_SHARED_STAFF_VISIT_HISTORY
        // Payment completion never ends the physical visit. Keep this staff bill
        // in the current visit as payment/history; the explicit table release is
        // the only lifecycle boundary.
        $total = max(0, (float)($order->order_total ?? 0));
        $settled = max(0, (float)($order->settled_amount ?? 0));
        $settlement = strtolower(trim((string)($order->settlement_status ?? '')));
        $financiallyOpen = !in_array($settlement, ['paid', 'settled', 'cancelled', 'canceled', 'failed', 'refunded', 'void', 'voided'], true)
            && ($total <= 0 || $settled < $total - 0.0001);

        $belongsToCurrentVisit = true;
        try {
            $physicalTableId = max(0, (int)($context['table']->table_id ?? $context['table']->id ?? 0));
            if ($physicalTableId > 0 && \Illuminate\Support\Facades\Schema::hasTable('pmd_table_status_history')) {
                $historyColumns = \Illuminate\Support\Facades\Schema::getColumnListing('pmd_table_status_history');
                if (in_array('table_id', $historyColumns, true) && in_array('created_at', $historyColumns, true)) {
                    $releaseQuery = DB::table('pmd_table_status_history')->where('table_id', $physicalTableId);
                    $releaseQuery->where(function ($history) use ($historyColumns) {
                        $added = false;
                        if (in_array('reason', $historyColumns, true)) {
                            $history->whereIn('reason', [
                                'customer_left',
                                'customer_left_skip_cleaning',
                                'cashier_manual_free',
                                'cleaning_complete',
                            ]);
                            $added = true;
                        }
                        if (in_array('new_status', $historyColumns, true)) {
                            if ($added) $history->orWhereIn('new_status', ['cleaning', 'available']);
                            else $history->whereIn('new_status', ['cleaning', 'available']);
                            $added = true;
                        }
                        if (!$added) $history->whereRaw('1 = 0');
                    });
                    $lastReleaseAt = $releaseQuery->orderByDesc('created_at')->value('created_at');
                    $lastReleaseTs = $lastReleaseAt ? (strtotime((string)$lastReleaseAt) ?: 0) : 0;
                    $orderCreatedTs = !empty($order->created_at) ? (strtotime((string)$order->created_at) ?: 0) : 0;
                    if ($lastReleaseTs > 1787723959 && $orderCreatedTs > 0) {
                        $belongsToCurrentVisit = $orderCreatedTs > $lastReleaseTs;
                    }
                }
            }
        } catch (\Throwable $ignored) {
            // Legacy fallback: never resurrect a fully-paid historical bill if
            // lifecycle history cannot be resolved.
            $belongsToCurrentVisit = $financiallyOpen;
        }

        if (!$belongsToCurrentVisit) continue;
        $shared[] = $pmdR60tPayload($order, $context, 'staff_shared', $guestSessionId);
    }

    // PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE
    // Kitchen readiness/payment completion never releases the physical table.
    // Only the explicit staff visit-release boundary may make it available.
    if ($self || $shared) $pmdR60tMarkTableOccupied($context);

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
    $pmdR60tPayload,
    $pmdR61LeaseValid,
    $pmdR61ExpiredAction
) {
    $request->validate([
        'guest_session_id' => 'required|string|max:191',
        'confirmation_id' => 'required|string|max:191',
        'items' => 'required|array|min:1',
    ]);
    $context = $resolveTableDraftContext($request);
    if (!$context['table']) return response()->json(['success' => false, 'error' => 'A valid table is required'], 422);
    $guestSessionId = trim((string)$request->input('guest_session_id'));
    if (!$pmdR61LeaseValid($context, $guestSessionId)) return $pmdR61ExpiredAction();
    $confirmationId = trim((string)$request->input('confirmation_id'));
    $items = $normalizeDraftItems((array)$request->input('items', []));
    if (!$items) return response()->json(['success' => false, 'error' => 'No valid menu items'], 422);

    $confirmationMarker = '[guest_confirm:'.$confirmationId.']';
    $existing = DB::table('orders')
        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
        ->where('orders.comment', 'like', '%'.$confirmationMarker.'%')
        ->where('orders.comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
        ->first(['orders.*', 'statuses.status_name']);
    if ($existing) {
        if (preg_match('/\[merged_into:(\d+)\]/', (string)($existing->comment ?? ''), $mergedMatch)) {
            $mergedTarget = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', (int)$mergedMatch[1])
                ->first(['orders.*', 'statuses.status_name']);
            if ($mergedTarget) return response()->json($pmdR60tPayload($mergedTarget, $context, 'guest_self', $guestSessionId));
        }
        return response()->json($pmdR60tPayload($existing, $context, 'guest_self', $guestSessionId));
    }

    // PMD_R63_SINGLE_OPEN_SELF_ORDER
    // One private guest visit owns at most one completely-unpaid payment-held
    // order. Continue-ordering appends to it; a settled/released order starts a
    // new card on the next confirmation.
    $orderType = (string)(($context['table_id'] ?? '') ?: ($context['table_no'] ?? 'table'));

    $hasActivePayment = static function (int $orderId): bool {
        if ($orderId < 1) return false;
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')) return false;
            $columns = \Illuminate\Support\Facades\Schema::getColumnListing('order_payment_transactions');
            if (!in_array('order_id', $columns, true)) return false;
            $query = DB::table('order_payment_transactions')->where('order_id', $orderId);
            if (in_array('settlement_status', $columns, true)) {
                $query->whereNotIn('settlement_status', [
                    'failed', 'cancelled', 'canceled', 'refunded', 'refund', 'void', 'voided'
                ]);
            }
            return $query->exists();
        } catch (\Throwable $ignored) {
            return true;
        }
    };

    $recalculateOpenOrder = static function (int $orderId, ?string $comment = null): void {
        $menuRows = DB::table('order_menus')->where('order_id', $orderId)->get();
        $allItems = [];
        foreach ($menuRows as $row) {
            $quantity = max(1, (int)($row->quantity ?? 1));
            $price = (float)($row->price ?? 0);
            $allItems[] = [
                'menu_id' => (int)($row->menu_id ?? 0),
                'name' => (string)($row->name ?? 'Item'),
                'quantity' => $quantity,
                'price' => $price,
                'subtotal' => (float)($row->subtotal ?? ($price * $quantity)),
            ];
        }
        $resolved = pmd_table_order_calculate_totals($allItems);
        $updates = [
            'order_total' => round((float)$resolved['total'], 4),
            'total_items' => array_sum(array_map(static fn($i) => (int)($i['quantity'] ?? 1), $allItems)),
            'updated_at' => now(),
        ];
        if ($comment !== null) $updates['comment'] = $comment;
        DB::table('orders')->where('order_id', $orderId)->update($updates);
        DB::table('order_totals')->where('order_id', $orderId)->delete();
        $totalRows = array_map(static fn($row) => array_merge(['order_id' => $orderId], $row), $resolved['rows']);
        if ($totalRows) DB::table('order_totals')->insert($totalRows);
    };

    $openQuery = DB::table('orders')
        ->where('order_type', $orderType)
        ->where('comment', 'like', '%[pmd_origin:guest_self]%')
        ->where('comment', 'like', '%[payment_hold]%')
        ->where('comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
        ->where('processed', 0);
    if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) {
        $openQuery->whereNotIn('settlement_status', [
            'paid', 'settled', 'partial', 'part_paid', 'part-paid',
            'cancelled', 'canceled', 'failed', 'refunded', 'void', 'voided'
        ]);
    }
    if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) {
        $openQuery->where('settled_amount', '<=', 0.0001);
    }

    $openRows = $openQuery->orderByDesc('order_id')->limit(20)->get();
    $mergeable = [];
    foreach ($openRows as $row) {
        $candidateId = (int)($row->order_id ?? 0);
        if ($candidateId > 0 && !$hasActivePayment($candidateId)) $mergeable[] = $row;
    }

    // Cleanly fold fragments produced by the earlier R60T iterations into the
    // newest still-unpaid order. This is intentionally limited to zero-settled,
    // unprocessed orders with no payment transaction.
    if (count($mergeable) > 1) {
        $primaryId = (int)$mergeable[0]->order_id;
        $secondaryIds = array_values(array_filter(array_map(
            static fn($row) => (int)($row->order_id ?? 0),
            array_slice($mergeable, 1)
        ), static fn($id) => $id > 0));

        DB::transaction(function () use ($primaryId, $secondaryIds, $recalculateOpenOrder) {
            $locked = DB::table('orders')->whereIn('order_id', array_merge([$primaryId], $secondaryIds))
                ->orderByDesc('order_id')->lockForUpdate()->get()->keyBy('order_id');
            $primary = $locked->get($primaryId);
            if (!$primary || (int)($primary->processed ?? 0) !== 0) return;

            foreach ($secondaryIds as $secondaryId) {
                $secondary = $locked->get($secondaryId);
                if (!$secondary || (int)($secondary->processed ?? 0) !== 0) continue;
                $settled = max(0, (float)($secondary->settled_amount ?? 0));
                $settlement = strtolower(trim((string)($secondary->settlement_status ?? '')));
                if ($settled > 0.0001 || in_array($settlement, ['paid', 'settled', 'partial', 'part_paid', 'part-paid'], true)) continue;

                DB::table('order_menus')->where('order_id', $secondaryId)->update(['order_id' => $primaryId]);
                DB::table('order_totals')->where('order_id', $secondaryId)->delete();
                $secondaryComment = (string)($secondary->comment ?? '');
                if (!str_contains($secondaryComment, '[merged_into:')) {
                    $secondaryComment = trim($secondaryComment.' | [merged_into:'.$primaryId.']', ' |');
                }
                $secondaryUpdate = [
                    'order_total' => 0,
                    'total_items' => 0,
                    'comment' => $secondaryComment,
                    'updated_at' => now(),
                ];
                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) {
                    $secondaryUpdate['settlement_status'] = 'cancelled';
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) {
                    $secondaryUpdate['settled_amount'] = 0;
                }
                DB::table('orders')->where('order_id', $secondaryId)->update($secondaryUpdate);
            }

            $recalculateOpenOrder($primaryId);
        });
    }

    $openOrder = DB::table('orders')
        ->where('order_type', $orderType)
        ->where('comment', 'like', '%[pmd_origin:guest_self]%')
        ->where('comment', 'like', '%[payment_hold]%')
        ->where('comment', 'like', '%[submitted_by:'.$guestSessionId.']%')
        ->where('processed', 0)
        ->orderByDesc('order_id')
        ->first();

    if ($openOrder && !$hasActivePayment((int)$openOrder->order_id)) {
        $mergedOrderId = DB::transaction(function () use (
            $openOrder,
            $guestSessionId,
            $confirmationMarker,
            $items,
            $recalculateOpenOrder
        ) {
            $orderId = (int)$openOrder->order_id;
            $locked = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
            if (!$locked || (int)($locked->processed ?? 0) !== 0) return 0;
            $settled = max(0, (float)($locked->settled_amount ?? 0));
            $settlement = strtolower(trim((string)($locked->settlement_status ?? '')));
            if ($settled > 0.0001 || in_array($settlement, ['paid', 'settled', 'partial', 'part_paid', 'part-paid'], true)) return 0;

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

            $comment = (string)($locked->comment ?? '');
            if (!str_contains($comment, $confirmationMarker)) {
                $comment = trim($comment.' | '.$confirmationMarker, ' |');
            }
            $recalculateOpenOrder($orderId, $comment);
            return $orderId;
        });

        if ($mergedOrderId > 0) {
            $mergedOrder = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $mergedOrderId)
                ->first(['orders.*', 'statuses.status_name']);
            return response()->json($pmdR60tPayload($mergedOrder, $context, 'guest_self', $guestSessionId));
        }
    }

    $orderId = DB::transaction(function () use ($context, $request, $guestSessionId, $confirmationMarker, $items) {
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
    return response()->json($pmdR60tPayload($order, $context, 'guest_self', $guestSessionId), 201);
});
