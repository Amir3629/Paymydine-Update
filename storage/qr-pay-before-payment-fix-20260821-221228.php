<?php

// PMD_RESTORE_SPLIT_ALLOCATION_HELPER_20260612
if (!function_exists('pmdResolveSplitAllocationColumn')) {
    function pmdResolveSplitAllocationColumn(): array
    {
        try {
            $connection = \Illuminate\Support\Facades\DB::connection();
            $tableName = $connection->getTablePrefix().'order_payment_transaction_items';

            $tableExists = false;
            try {
                $tableExists = count($connection->select("SHOW TABLES LIKE ?", [$tableName])) > 0;
            } catch (\Throwable $e) {
                $tableExists = false;
            }

            if (!$tableExists) {
                return ['column' => 'order_menu_id', 'mode' => 'order_menu_id'];
            }

            $columns = collect($connection->select("SHOW COLUMNS FROM `{$tableName}`"))
                ->map(function ($row) {
                    return (string)($row->Field ?? '');
                })
                ->filter()
                ->values()
                ->all();

            if (in_array('order_item_id', $columns, true)) {
                return ['column' => 'order_item_id', 'mode' => 'order_menu_id'];
            }

            if (in_array('order_menu_id', $columns, true)) {
                return ['column' => 'order_menu_id', 'mode' => 'order_menu_id'];
            }

            if (in_array('menu_id', $columns, true)) {
                return ['column' => 'menu_id', 'mode' => 'menu_id_legacy'];
            }

            return ['column' => 'order_menu_id', 'mode' => 'order_menu_id'];
        } catch (\Throwable $e) {
            \Log::warning('pmdResolveSplitAllocationColumn fallback used', [
                'message' => $e->getMessage(),
            ]);

            return ['column' => 'order_menu_id', 'mode' => 'order_menu_id'];
        }
    }
}


use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use Admin\Controllers\StaffAuthController;
use Admin\Controllers\Biometricdevices;
use Admin\Controllers\BiometricDevicesAPI;
use Admin\Controllers\Api\CashDrawerController;
use Admin\Controllers\Api\PosAgentController;
use App\Admin\Controllers\NotificationsApiController;
use App\Admin\Classes\TerminalDevicesPlatformController;
use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;
require_once base_path('app/system/helpers/r2o_outbound_dryrun_helper.php');
use Illuminate\Support\Facades\DB;


// === QR PAY LATER ACTIVE API ROUTES ===
Route::group([
    'prefix' => 'api/v1',
    'middleware' => ['web', \App\Http\Middleware\DetectTenant::class, \App\Http\Middleware\TenantDatabaseMiddleware::class],
], function () {
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
        $tableNo = trim((string)$request->input('table_no', $request->query('table_no', '')));
        $qr = trim((string)$request->input('qr', $request->query('qr', '')));
        $table = null;
        foreach (array_values(array_unique(array_filter([$tableId, $tableNo], fn($v) => $v !== ''))) as $candidate) {
            $table = \Illuminate\Support\Facades\DB::table('tables')
                ->where('table_id', $candidate)
                ->orWhere('table_no', $candidate)
                ->first();
            if ($table) break;
        }
        if (!$table && $qr !== '') {
            $table = \Illuminate\Support\Facades\DB::table('tables')->where('qr_code', $qr)->first();
        }
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
            $menu = \Illuminate\Support\Facades\DB::table('menus')->where('menu_id', $menuId)->where('menu_status', 1)->first();
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

    $formatDraftResponse = function ($draft = null, ?object $order = null, array $context = []) {
        $items = [];
        $status = 'empty';
        $orderId = null;
        $payment = null;
        $settledAmount = 0.0;
        $total = 0.0;
        $subtotal = 0.0;
        $taxAmount = 0.0;
        $orderTotalsRows = [];
        if ($draft) {
            $payload = json_decode((string)($draft->payload ?? '[]'), true);
            $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            $status = (string)($draft->status ?? 'draft');
            $orderId = $draft->order_id ? (int)$draft->order_id : null;
        }
        if ($order) {
            $status = ((float)($order->settled_amount ?? 0) > 0) ? 'partially_paid' : 'submitted_unpaid';
            $orderId = (int)$order->order_id;
            $payment = (string)($order->payment ?? '');
            $settledAmount = (float)($order->settled_amount ?? 0);
            $total = (float)($order->order_total ?? 0);
            $items = \Illuminate\Support\Facades\DB::table('order_menus')
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
        return response()->json([
            'success' => true,
            'status' => $status,
            'draft_id' => $draft ? (int)$draft->id : null,
            'order_id' => $orderId,
            'table_id' => $context['table_id'] ?? ($draft->table_id ?? null),
            'table_no' => $context['table_no'] ?? ($draft->table_no ?? null),
            'table_name' => $context['table_name'] ?? ($draft->table_name ?? null),
            'items' => array_values($items),
            'groups' => array_values($groups),
            'order_totals' => $orderTotalsRows,
            'totals' => ['subtotal' => round($subtotal, 4), 'tax' => round($taxAmount, 4), 'total' => round($total, 4), 'orderTotal' => round($total, 4), 'settledAmount' => round($settledAmount, 4), 'remainingAmount' => round($remaining, 4)],
            'settlement' => ['orderTotal' => round($total, 4), 'settledAmount' => round($settledAmount, 4), 'remainingAmount' => round($remaining, 4), 'settlementStatus' => $status === 'paid' ? 'paid' : ($settledAmount > 0 ? 'partial' : 'unpaid')],
            'payment' => $payment,
            'status_name' => $order ? (string)($order->status_name ?? '') : null,
            'paymentStatus' => $status === 'paid' ? 'paid' : ($settledAmount > 0 ? 'partial' : 'unpaid'),
            'hasActiveTableOrder' => (bool)($draft || $order),
            'canShowToNewDevice' => (bool)($draft || $order),
            'updatedAt' => $order ? (string)($order->updated_at ?? '') : ($draft ? (string)($draft->updated_at ?? '') : null),
        ]);
    };

    $findActiveSubmittedTableOrder = function (array $context) {
        $candidates = $context['candidates'] ?? [];
        if (empty($candidates)) return null;

        $orders = \Illuminate\Support\Facades\DB::table('orders')
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
            $isPaid = in_array($settlementStatus, ['paid', 'settled'], true)
                || $normalizedStatus === 'paid'
                || ($total > 0 && $settled >= $total - 0.0001);
            $isTerminal = in_array($normalizedStatus, $terminalStatusNames, true);

            // Cross-device table order visibility: show while unpaid OR not kitchen-completed.
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

    Route::get('/table-order-draft', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $formatDraftResponse, $findActiveSubmittedTableOrder) {
        $ensureTableOrderDraftTable();
        $context = $resolveTableDraftContext($request);
        if (($context['table_id'] ?? '') === '' && ($context['table_no'] ?? '') === '' && ($context['qr'] ?? '') === '') {
            return response()->json(['success' => false, 'error' => 'table_id, table_no, or qr is required'], 422);
        }
        $draft = \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')
            ->where('status', 'draft')
            ->where(function ($q) use ($context) {
                if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
            })
            ->orderByDesc('id')
            ->first();
        if ($draft) {
            \Log::info('PMD_TABLE_DRAFT_LOADED', ['draft_id' => (int)$draft->id, 'table_id' => $context['table_id'] ?? null]);
            return $formatDraftResponse($draft, null, $context);
        }
        $order = $findActiveSubmittedTableOrder($context);
        return $formatDraftResponse(null, $order, $context);
    });

    Route::post('/table-order-draft/confirm-items', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $normalizeDraftItems, $formatDraftResponse) {
        $ensureTableOrderDraftTable();
        $request->validate(['guest_session_id' => 'required|string|max:191', 'items' => 'required|array|min:1']);
        $context = $resolveTableDraftContext($request);
        $items = $normalizeDraftItems((array)$request->input('items', []));
        if (empty($items)) return response()->json(['success' => false, 'error' => 'No valid items to confirm'], 422);
        $guest = trim((string)$request->input('guest_session_id'));
        foreach ($items as &$item) $item['guest_session_id'] = $guest;
        unset($item);
        $draft = null;
        \Illuminate\Support\Facades\DB::transaction(function () use (&$draft, $context, $items) {
            $draft = \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')
                ->where('status', 'draft')
                ->where(function ($q) use ($context) {
                    if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                    if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                    if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
                })
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();
            $payload = $draft ? (json_decode((string)$draft->payload, true) ?: []) : [];
            $existing = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            $payload['items'] = array_values(array_merge($existing, $items));
            if ($draft) {
                \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')->where('id', $draft->id)->update(['payload' => json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), 'updated_at' => now()]);
            } else {
                $id = \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')->insertGetId([
                    'table_id' => $context['table_id'] ?: null,
                    'table_no' => $context['table_no'] ?: null,
                    'table_name' => $context['table_name'] ?: null,
                    'qr' => $context['qr'] ?: null,
                    'status' => 'draft',
                    'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $draft = \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')->where('id', $id)->first();
            }
        });
        $draft = \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')->where('id', $draft->id)->first();
        \Log::info('PMD_TABLE_DRAFT_CONFIRMED_ITEMS', ['draft_id' => (int)$draft->id, 'count' => count($items)]);
        return $formatDraftResponse($draft, null, $context);
    });

    Route::post('/table-order-draft/submit', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $formatDraftResponse, $findActiveSubmittedTableOrder) {
        $ensureTableOrderDraftTable();
        $context = $resolveTableDraftContext($request);
        $draftId = (int)$request->input('draft_id', 0);
        $orderId = null;
        $draft = null;
        \Illuminate\Support\Facades\DB::transaction(function () use (&$draft, &$orderId, $draftId, $context, $request, $findActiveSubmittedTableOrder) {
            $query = \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')->where('status', 'draft');
            if ($draftId > 0) $query->where('id', $draftId); else $query->where(function ($q) use ($context) {
                if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
            });
            $draft = $query->lockForUpdate()->orderByDesc('id')->first();
            if (!$draft) return;
            $payload = json_decode((string)$draft->payload, true) ?: [];
            $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            if (empty($items)) return;
            // PMD_ADMIN_TABLE_ORDER_VAT_TOTALS_SUBMIT_20260604
            // Active customer /api/v1 table-order submit route in app/admin/routes.php.
            // Item subtotal already includes option prices from frontend payload.
            // Write VAT rows here so Admin / Order Status / Payment / Split all read one source of truth.
            $resolvedTotals = pmd_table_order_calculate_totals($items);
            $itemsSubtotal = (float)$resolvedTotals['subtotal'];
            $taxAmount = (float)$resolvedTotals['tax'];
            $total = (float)$resolvedTotals['total'];

            // PMD_AUDIT_PHASE5_MERGE_OPEN_TABLE_ORDER
            // If this table already has an unpaid qr_pay_later order, append the new
            // submitted draft items to that same order instead of creating another
            // open order. This fixes cross-device checkout polling because all guests
            // now observe one active table order that grows over time.
            $existingOpenOrder = $findActiveSubmittedTableOrder($context);
            if ($existingOpenOrder && (int)($existingOpenOrder->order_id ?? 0) > 0) {
                $orderId = (int)$existingOpenOrder->order_id;

                foreach ($items as $item) {
                    \Illuminate\Support\Facades\DB::table('order_menus')->insert([
                        'order_id' => $orderId,
                        'menu_id' => (int)($item['menu_id'] ?? 0),
                        'name' => (string)($item['name'] ?? 'Item'),
                        'quantity' => max(1, (int)($item['quantity'] ?? 1)),
                        'price' => (float)($item['price'] ?? 0),
                        'subtotal' => (float)($item['subtotal'] ?? 0),
                        'comment' => '[guest_session:'.(string)($item['guest_session_id'] ?? '').']',
                        'option_values' => !empty($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null,
                    ]);
                }

                $allItems = \Illuminate\Support\Facades\DB::table('order_menus')
                    ->where('order_id', $orderId)
                    ->get(['price', 'quantity', 'subtotal'])
                    ->map(fn($row) => [
                        'price' => (float)($row->price ?? 0),
                        'quantity' => (float)($row->quantity ?? 0),
                        'subtotal' => (float)($row->subtotal ?? 0),
                    ])
                    ->values()
                    ->all();

                $mergedTotals = pmd_table_order_calculate_totals($allItems);
                $mergedRows = array_map(function ($row) use ($orderId) {
                    return array_merge(['order_id' => $orderId], $row);
                }, $mergedTotals['rows']);

                if (\Illuminate\Support\Facades\Schema::hasTable('order_totals')) {
                    \Illuminate\Support\Facades\DB::table('order_totals')->where('order_id', $orderId)->delete();
                    \Illuminate\Support\Facades\DB::table('order_totals')->insert($mergedRows);
                }

                $update = [
                    'order_total' => round((float)$mergedTotals['total'], 4),
                    'total_items' => (int)round((float)\Illuminate\Support\Facades\DB::table('order_menus')->where('order_id', $orderId)->sum('quantity')),
                    'updated_at' => now(),
                ];
                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) {
                    $update['settlement_status'] = 'unpaid';
                }
                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) {
                    $update['settled_amount'] = (float)($existingOpenOrder->settled_amount ?? 0);
                }

                \Illuminate\Support\Facades\DB::table('orders')->where('order_id', $orderId)->update($update);
                \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')->where('id', $draft->id)->update([
                    'status' => 'submitted',
                    'order_id' => $orderId,
                    'updated_at' => now(),
                ]);

                try {
                    \Illuminate\Support\Facades\DB::table('notifications')->insert([
                        'type' => 'order',
                        'title' => 'Updated table order #'.$orderId,
                        'table_id' => (int)($context['table_id'] ?: 0),
                        'table_name' => (string)(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')),
                        'payload' => json_encode(['order_id' => $orderId, 'draft_id' => (int)$draft->id, 'merged' => true]),
                        'status' => 'new',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } catch (\Throwable $ignored) {}

                \Log::info('PMD_TABLE_DRAFT_MERGED_INTO_OPEN_ORDER', [
                    'draft_id' => (int)$draft->id,
                    'order_id' => $orderId,
                    'item_count' => count($items),
                    'merged_total' => round((float)$mergedTotals['total'], 4),
                ]);

                return;
            }
            $orderNumber = (int)\Illuminate\Support\Facades\DB::table('orders')->max('order_id') + 1;
            $comment = trim('Table Draft Basket | Table ID: '.($context['table_id'] ?? '').' | Table: '.(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')).' | [table_draft_id:'.$draft->id.']'.($request->input('guest_session_id') ? ' | [submitted_by:'.$request->input('guest_session_id').']' : ''), ' |');
            $insert = [
                'order_id' => $orderNumber,
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
            $orderId = \Illuminate\Support\Facades\DB::table('orders')->insertGetId($insert);
            foreach ($items as $item) {
                \Illuminate\Support\Facades\DB::table('order_menus')->insert([
                    'order_id' => $orderId,
                    'menu_id' => (int)($item['menu_id'] ?? 0),
                    'name' => (string)($item['name'] ?? 'Item'),
                    'quantity' => max(1, (int)($item['quantity'] ?? 1)),
                    'price' => (float)($item['price'] ?? 0),
                    'subtotal' => (float)($item['subtotal'] ?? 0),
                    'comment' => '[guest_session:'.(string)($item['guest_session_id'] ?? '').']',
                    'option_values' => !empty($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null,
                ]);
            }
            $totalsRows = array_map(function ($row) use ($orderId) {
                return array_merge(['order_id' => $orderId], $row);
            }, $resolvedTotals['rows']);

            \Illuminate\Support\Facades\DB::table('order_totals')->insert($totalsRows);
            \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')->where('id', $draft->id)->update(['status' => 'submitted', 'order_id' => $orderId, 'updated_at' => now()]);
            try {
                \Illuminate\Support\Facades\DB::table('notifications')->insert(['type' => 'order', 'title' => 'New table order #'.$orderId, 'table_id' => (int)($context['table_id'] ?: 0), 'table_name' => (string)(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')), 'payload' => json_encode(['order_id' => $orderId, 'draft_id' => (int)$draft->id]), 'status' => 'new', 'created_at' => now(), 'updated_at' => now()]);
            } catch (\Throwable $ignored) {}
        });
        if (!$orderId) {
            $existing = $findActiveSubmittedTableOrder($context);
            if ($existing) return $formatDraftResponse(null, $existing, $context);
            return response()->json(['success' => false, 'error' => 'No draft items to submit'], 422);
        }
        $order = \Illuminate\Support\Facades\DB::table('orders')->where('order_id', $orderId)->first();
        \Log::info('PMD_TABLE_DRAFT_SUBMITTED', ['draft_id' => $draft ? (int)$draft->id : null, 'order_id' => $orderId]);
        return $formatDraftResponse(null, $order, $context);
    });

    Route::get('/orders/pending-qr', function (\Illuminate\Http\Request $request) {
        $tableId   = trim((string)$request->get('table_id', ''));
        $tableNo   = trim((string)$request->get('table_no', ''));
        $tableParam= trim((string)$request->get('table', ''));
        $qrInput   = trim((string)$request->get('qr', ''));
        $connName = \Illuminate\Support\Facades\DB::getDefaultConnection();
        $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();

        if ($tableId === '' && $tableNo === '' && $tableParam === '' && $qrInput === '') {
            return response()->json([
                'success' => false,
                'error' => 'table_id or table_no or table or qr is required',
            ], 422);
        }

        $hasSettlementColumns = \Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')
            && \Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount');

        $table = null;
        $inputs = array_values(array_unique(array_filter([$tableId, $tableNo, $tableParam], fn($v) => $v !== '')));

        foreach ($inputs as $candidate) {
            $table = \Illuminate\Support\Facades\DB::table('tables')
                ->where('table_id', $candidate)
                ->orWhere('table_no', $candidate)
                ->first();
            if ($table) {
                break;
            }
        }

        if (!$table && $qrInput !== '') {
            $table = \Illuminate\Support\Facades\DB::table('tables')
                ->where('qr_code', $qrInput)
                ->first();
        }

        $exactCandidates = array_values(array_unique(array_filter([
            $table ? (string)$table->table_id : null,
            $table ? (string)$table->table_no : null,
            $table ? (string)$table->table_name : null,
            $tableId,
            $tableNo,
            $tableParam,
        ], fn($v) => $v !== null && $v !== '')));

        $baseOrderQuery = \Illuminate\Support\Facades\DB::table('orders')
            ->where('payment', 'qr_pay_later')
            ->when($hasSettlementColumns, function ($q) {
                $q->where(function ($settlement) {
                    $settlement->whereNull('settlement_status')
                        ->orWhereNotIn('settlement_status', ['paid', 'cancelled', 'failed']);
                })->where(function ($amount) {
                    $amount->whereNull('settled_amount')
                        ->orWhereColumn('settled_amount', '<', 'order_total');
                });
            }, function ($q) {
                $paidStatusId = (int) (\Illuminate\Support\Facades\DB::table('statuses')
                    ->whereRaw('LOWER(status_name) = ?', ['paid'])
                    ->value('status_id') ?? 10);
                $q->where('status_id', '!=', $paidStatusId);
            });

        // Deterministic targeting: first try exact order_type table match.
        $order = null;
        $duplicateOpenOrderIds = [];
        if (!empty($exactCandidates)) {
            $exactMatches = (clone $baseOrderQuery)
                ->whereIn('order_type', $exactCandidates)
                ->orderByDesc('order_id')
                ->get();
            $order = $exactMatches->first();
            $duplicateOpenOrderIds = $exactMatches->pluck('order_id')->skip(1)->map(fn($id) => (int)$id)->values()->all();
        }

        // Legacy fallback: only when exact table match failed.
        if (!$order && !empty($exactCandidates)) {
            $fallbackMatches = (clone $baseOrderQuery)
                ->where(function ($q) use ($exactCandidates) {
                    foreach ($exactCandidates as $candidate) {
                        $q->orWhere('comment', 'like', '%Table ID: ' . $candidate . '%');
                        $q->orWhere('comment', 'like', '%Table: ' . $candidate . '%');
                    }
                })
                ->orderByDesc('order_id')
                ->get();
            $order = $fallbackMatches->first();
            $duplicateOpenOrderIds = $fallbackMatches->pluck('order_id')->skip(1)->map(fn($id) => (int)$id)->values()->all();
        }

        \Log::info('QR_SETTLEMENT_DEBUG pending-qr resolve', [
            'host' => $request->getHost(),
            'connection' => $connName,
            'database' => $dbName,
            'input' => [
                'table_id' => $tableId,
                'table_no' => $tableNo,
                'table' => $tableParam,
                'qr' => $qrInput,
            ],
            'resolved_table' => $table ? [
                'table_id' => (string)$table->table_id,
                'table_no' => (string)($table->table_no ?? ''),
                'table_name' => (string)($table->table_name ?? ''),
            ] : null,
            'exact_candidates' => $exactCandidates,
            'selected_order_id' => $order->order_id ?? null,
        ]);

        if (!$order) {
            return response()->json([
                'success' => true,
                'data' => null,
            ]);
        }

        $rawItems = \Illuminate\Support\Facades\DB::table('order_menus')
            ->where('order_id', $order->order_id)
            ->get(['order_menu_id', 'menu_id', 'name', 'quantity', 'price', 'subtotal']);
        $allItemsForTotals = $rawItems->map(fn($row) => [
            'price' => (float)($row->price ?? 0),
            'quantity' => (float)($row->quantity ?? 0),
            'subtotal' => (float)($row->subtotal ?? 0),
        ])->all();
        $resolvedOrderTotals = pmd_table_order_totals_from_order((int)$order->order_id, $allItemsForTotals, (float)($order->order_total ?? 0));
        $orderItemSubtotalTotal = max(0.0, pmd_table_order_item_subtotal($allItemsForTotals));
        $orderGrossRatio = $orderItemSubtotalTotal > 0 ? max(0.0, round(((float)$resolvedOrderTotals['total']) / $orderItemSubtotalTotal, 8)) : 1.0;

        $hasSplitTables = \Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')
            && \Illuminate\Support\Facades\Schema::hasTable('order_payment_transaction_items');
        $allocationMeta = pmdResolveSplitAllocationColumn();
        $allocationColumn = $allocationMeta['column'];
        $allocationMode = $allocationMeta['mode'];
        $paidQtyByOrderMenu = [];
        $paidQtyByMenu = [];

        if ($hasSplitTables) {
            $paidRows = \Illuminate\Support\Facades\DB::table('order_payment_transactions as opt')
                ->join('order_payment_transaction_items as opti', 'opti.transaction_id', '=', 'opt.id')
                ->where('opt.order_id', $order->order_id)
                ->whereNotIn('opt.settlement_status', ['failed', 'cancelled'])
                ->selectRaw("COALESCE(ti_opti.order_menu_id, ti_opti.menu_id) as alloc_key, SUM(ti_opti.quantity_paid) as qty_paid")
                ->groupByRaw("COALESCE(ti_opti.order_menu_id, ti_opti.menu_id)")
                ->get();

            foreach ($paidRows as $paidRow) {
                if ($allocationMode === 'menu_id_legacy') {
                    $paidQtyByMenu[(int)$paidRow->alloc_key] = (float)$paidRow->qty_paid;
                } else {
                    $paidQtyByOrderMenu[(int)$paidRow->alloc_key] = (float)$paidRow->qty_paid;
                }
            }
        }

        $items = [];
        $computedRemainingAmount = 0.0;
        $consumedPaidByMenu = [];
        foreach ($rawItems as $orderItem) {
            $orderedQty = (float)($orderItem->quantity ?? 0);
            if ($allocationMode === 'menu_id_legacy') {
                $menuId = (int)($orderItem->menu_id ?? 0);
                $menuPaidTotal = (float)($paidQtyByMenu[$menuId] ?? 0);
                $alreadyConsumed = (float)($consumedPaidByMenu[$menuId] ?? 0);
                $paidQty = max(0, min($orderedQty, $menuPaidTotal - $alreadyConsumed));
                $consumedPaidByMenu[$menuId] = $alreadyConsumed + $paidQty;
            } else {
                $paidQty = (float)($paidQtyByOrderMenu[(int)$orderItem->order_menu_id] ?? 0);
            }
            if ($paidQty > $orderedQty) {
                $paidQty = $orderedQty;
            }

            $remainingQty = round(max(0, $orderedQty - $paidQty), 3);
            if ($remainingQty <= 0) {
                continue;
            }

            $lineSubtotal = (float)($orderItem->subtotal ?? 0);
            $unitPrice = $orderedQty > 0
                ? round($lineSubtotal / $orderedQty, 4)
                : round((float)($orderItem->price ?? 0), 4);
            $remainingSubtotal = round($unitPrice * $remainingQty, 4);
            $computedRemainingAmount += $remainingSubtotal;

            $items[] = (object)[
                'order_menu_id' => (int)$orderItem->order_menu_id,
                'menu_id' => (int)$orderItem->menu_id,
                'name' => (string)$orderItem->name,
                'quantity' => $remainingQty,
                'price' => $unitPrice,
                'subtotal' => $remainingSubtotal,
            ];
        }

        $orderTotal = (float)$resolvedOrderTotals['total'];
        $settledAmount = $hasSettlementColumns
            ? (float)($order->settled_amount ?? 0)
            : (strtolower((string)($order->payment ?? '')) === 'qr_pay_later' ? 0.0 : $orderTotal);

        if ($settledAmount < 0) {
            $settledAmount = 0;
        }
        if ($settledAmount > $orderTotal && $orderTotal > 0) {
            $settledAmount = $orderTotal;
        }

        $remainingAmount = max(0, round($orderTotal - $settledAmount, 4));
        if ($hasSplitTables) {
            $remainingAmount = round($computedRemainingAmount * $orderGrossRatio, 4);
            $settledAmount = max(0, round($orderTotal - $remainingAmount, 4));
        }
        $settlementStatus = $hasSettlementColumns
            ? strtolower((string)($order->settlement_status ?? 'unpaid'))
            : ($remainingAmount <= 0.0001 ? 'paid' : 'unpaid');

        if (!in_array($settlementStatus, ['unpaid', 'partial', 'paid'], true)) {
            if ($remainingAmount <= 0.0001) {
                $settlementStatus = 'paid';
            } elseif ($settledAmount > 0.0001) {
                $settlementStatus = 'partial';
            } else {
                $settlementStatus = 'unpaid';
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'order_id' => (int)$order->order_id,
                'table_id' => (string)$order->order_type,
                'payment' => (string)$order->payment,
                'status_id' => (int)$order->status_id,
                'order_total' => $orderTotal,
                'settlement_status' => $settlementStatus,
                'settled_amount' => round($settledAmount, 4),
                'remaining_amount' => round($remainingAmount, 4),
                'settlement_method' => (string)($order->settlement_method ?? ''),
                'settlement_reference' => (string)($order->settlement_reference ?? ''),
                'duplicate_open_order_ids' => $duplicateOpenOrderIds,
                'items' => $items,
            ],
        ]);
    });

    // PMD_SPLIT_PAYMENT_SAFETY_R35
    $pmdEnsureSplitIntentR35 = function () {
        if (!\Illuminate\Support\Facades\Schema::hasTable('pmd_guest_payment_intents')) {
            \Illuminate\Support\Facades\Schema::create('pmd_guest_payment_intents', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->increments('id');
                $table->string('token', 64)->unique();
                $table->unsignedInteger('order_id')->index();
                $table->string('guest_session_id', 191)->nullable()->index();
                $table->string('split_mode', 24)->index();
                $table->unsignedInteger('split_people')->nullable();
                $table->decimal('share_percent', 8, 3)->nullable();
                $table->unsignedInteger('part_index')->nullable();
                $table->decimal('plan_base_amount', 15, 4)->default(0);
                $table->decimal('principal_amount', 15, 4)->default(0);
                $table->decimal('tip_amount', 15, 4)->default(0);
                $table->decimal('payable_amount', 15, 4)->default(0);
                $table->longText('selected_items')->nullable();
                $table->string('payment_method', 50)->nullable();
                $table->string('provider', 80)->nullable();
                $table->string('status', 24)->default('pending')->index();
                $table->unsignedBigInteger('transaction_id')->nullable()->index();
                $table->string('payment_reference', 255)->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamps();
            });
        }
    };

    $pmdR35TableMatches = function ($order, \Illuminate\Http\Request $request): bool {
        $values = array_values(array_unique(array_filter([
            trim((string)$request->input('table_id', '')),
            trim((string)$request->input('table_no', '')),
            trim((string)$request->input('table', '')),
        ], fn($v) => $v !== '')));
        $qr = trim((string)$request->input('qr', ''));
        if ($qr !== '') {
            $table = \Illuminate\Support\Facades\DB::table('tables')->where('qr_code', $qr)->first();
            if ($table) $values = array_values(array_unique(array_filter(array_merge($values, [(string)$table->table_id, (string)($table->table_no ?? ''), (string)($table->table_name ?? '')]))));
        }
        if (!$values) return true;
        $orderType = (string)($order->order_type ?? '');
        $comment = (string)($order->comment ?? '');
        foreach ($values as $candidate) {
            if ($orderType === $candidate || str_contains($comment, 'Table ID: '.$candidate) || str_contains($comment, 'Table: '.$candidate)) return true;
        }
        return false;
    };

    Route::post('/orders/split-intent', function (\Illuminate\Http\Request $request) use ($pmdEnsureSplitIntentR35, $pmdR35TableMatches) {
        $pmdEnsureSplitIntentR35();
        $request->validate([
            'order_id' => 'required|integer|min:1',
            'guest_session_id' => 'nullable|string|max:191',
            'split_mode' => 'required|string|in:mine,equal,items,shares',
            'split_people' => 'nullable|integer|min:2|max:20',
            'share_percent' => 'nullable|numeric|min:1|max:100',
            'selected_items' => 'nullable|array',
            'selected_items.*.order_menu_id' => 'required_with:selected_items|integer|min:1',
            'selected_items.*.quantity' => 'required_with:selected_items|numeric|min:0.001',
            'tip_percent' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'required|string|max:50',
            'provider' => 'nullable|string|max:80',
            'table_id' => 'nullable|string|max:50', 'table_no' => 'nullable|string|max:50', 'qr' => 'nullable|string|max:191',
        ]);

        $order = \Admin\Models\Orders_model::query()->where('order_id', (int)$request->order_id)->first();
        if (!$order) return response()->json(['success' => false, 'error' => 'Order not found'], 404);
        if (strtolower((string)$order->payment) !== 'qr_pay_later') return response()->json(['success' => false, 'error' => 'Only qr_pay_later orders support split payment'], 422);
        if (!$pmdR35TableMatches($order, $request)) return response()->json(['success' => false, 'error' => 'Order does not belong to scanned table'], 409);

        try {
            $data = \Illuminate\Support\Facades\DB::transaction(function () use ($request, $order) {
                \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')
                    ->where('status', 'pending')->whereNotNull('expires_at')->where('expires_at', '<', now())
                    ->update(['status' => 'expired', 'updated_at' => now()]);

                $locked = \Admin\Models\Orders_model::query()->where('order_id', $order->order_id)->lockForUpdate()->firstOrFail();
                $orderTotal = (float)(\Illuminate\Support\Facades\DB::table('order_totals')->where('order_id', $locked->order_id)->where('code', 'total')->value('value') ?? $locked->order_total ?? 0);
                $settled = max(0.0, (float)($locked->settled_amount ?? 0));
                $remaining = max(0.0, round($orderTotal - $settled, 4));
                if ($remaining <= 0.0001) throw new \InvalidArgumentException('Order is already paid');

                $mode = strtolower((string)$request->split_mode);
                $guest = trim((string)$request->input('guest_session_id', ''));
                $tipPercent = max(0.0, min(100.0, (float)$request->input('tip_percent', 0)));
                $pendingRows = \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')
                    ->where('order_id', $locked->order_id)->where('status', 'pending')->where('expires_at', '>', now())->get();
                $conflictingPending = $pendingRows->first(fn($row) => strtolower((string)$row->split_mode) !== $mode);
                if ($conflictingPending) throw new \InvalidArgumentException('Another split method is already being paid for this order. Refresh after it finishes or expires.');
                $reservedPrincipal = (float)$pendingRows->sum('principal_amount');
                $available = max(0.0, round($remaining - $reservedPrincipal, 4));
                if ($available <= 0.0001) throw new \InvalidArgumentException('Another guest is currently paying the remaining balance. Please refresh shortly.');

                $orderMenus = \Illuminate\Support\Facades\DB::table('order_menus')->where('order_id', $locked->order_id)
                    ->get(['order_menu_id','menu_id','name','quantity','price','subtotal','comment']);
                $itemSubtotalTotal = max(0.0, (float)$orderMenus->sum(fn($r) => (float)($r->subtotal ?? ((float)$r->price * (float)$r->quantity))));
                $grossRatio = $itemSubtotalTotal > 0 ? max(0.0, round($orderTotal / $itemSubtotalTotal, 8)) : 1.0;
                $principal = 0.0; $selected = null; $providerItems = []; $parts = null; $share = null; $partIndex = null; $planBase = $orderTotal;

                $amountPlanSettled = \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')
                    ->where('order_id', $locked->order_id)->where('status', 'settled')->whereIn('split_mode', ['equal','shares'])->exists();

                if (in_array($mode, ['items','mine'], true)) {
                    if ($amountPlanSettled) throw new \InvalidArgumentException('This order already uses an amount split plan. Pay the remaining balance or continue that plan.');
                    $requested = collect($request->input('selected_items', []));
                    if ($requested->isEmpty()) throw new \InvalidArgumentException('Select at least one unpaid item.');

                    $allocation = pmdResolveSplitAllocationColumn();
                    $paidByOrderMenu = []; $paidByMenu = [];
                    if (\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions') && \Illuminate\Support\Facades\Schema::hasTable('order_payment_transaction_items')) {
                        $txIds = \Illuminate\Support\Facades\DB::table('order_payment_transactions')->where('order_id', $locked->order_id)
                            ->whereNotIn('settlement_status', ['failed','cancelled','canceled'])->pluck('id')->all();
                        if ($txIds) {
                            $rows = \Illuminate\Support\Facades\DB::table('order_payment_transaction_items')->whereIn('transaction_id', $txIds)->get([$allocation['column'], 'quantity_paid']);
                            foreach ($rows as $row) {
                                $key = (int)$row->{$allocation['column']};
                                if ($allocation['mode'] === 'menu_id_legacy') $paidByMenu[$key] = ($paidByMenu[$key] ?? 0) + (float)$row->quantity_paid;
                                else $paidByOrderMenu[$key] = ($paidByOrderMenu[$key] ?? 0) + (float)$row->quantity_paid;
                            }
                        }
                    }
                    $reservedQty = [];
                    foreach ($pendingRows as $pending) {
                        foreach ((array)(json_decode((string)$pending->selected_items, true) ?: []) as $it) {
                            $id = (int)($it['order_menu_id'] ?? 0); if ($id > 0) $reservedQty[$id] = ($reservedQty[$id] ?? 0) + (float)($it['quantity'] ?? 0);
                        }
                    }
                    $menuMap = []; $legacyConsumed = [];
                    foreach ($orderMenus as $row) {
                        $ordered = (float)$row->quantity;
                        if ($allocation['mode'] === 'menu_id_legacy') {
                            $mid=(int)$row->menu_id; $used=(float)($legacyConsumed[$mid] ?? 0); $paid=max(0,min($ordered,(float)($paidByMenu[$mid] ?? 0)-$used)); $legacyConsumed[$mid]=$used+$paid;
                        } else $paid=min($ordered,(float)($paidByOrderMenu[(int)$row->order_menu_id] ?? 0));
                        $menuMap[(int)$row->order_menu_id] = ['row'=>$row,'unpaid'=>max(0,$ordered-$paid)];
                    }
                    $selected = [];
                    foreach ($requested as $it) {
                        $id=(int)($it['order_menu_id'] ?? 0); $qty=round((float)($it['quantity'] ?? 0),3);
                        if ($id < 1 || $qty <= 0 || !isset($menuMap[$id])) throw new \InvalidArgumentException('Invalid selected item.');
                        $row=$menuMap[$id]['row'];
                        if ($mode === 'mine' && ($guest === '' || !str_contains((string)($row->comment ?? ''), '[guest_session:'.$guest.']'))) throw new \InvalidArgumentException('One selected item does not belong to this guest.');
                        $availableQty=max(0,(float)$menuMap[$id]['unpaid']-(float)($reservedQty[$id] ?? 0));
                        if ($qty > $availableQty + 0.0001) throw new \InvalidArgumentException('Selected quantity is already paid or being paid by another guest.');
                        $orderedQty=max(0.001,(float)$row->quantity); $unit=((float)$row->subtotal)/$orderedQty;
                        $grossLine=round($unit*$qty*$grossRatio,4); $principal += $grossLine;
                        $selected[]=['order_menu_id'=>$id,'quantity'=>$qty];
                        $providerItems[]=['id'=>(string)$id,'name'=>(string)$row->name,'quantity'=>$qty,'price'=>round($grossLine/$qty,2)];
                    }
                } elseif ($mode === 'equal') {
                    $parts=max(2,min(20,(int)$request->input('split_people',2)));
                    $history=\Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')->where('order_id',$locked->order_id)->where('split_mode','equal')->whereIn('status',['pending','settled'])->orderBy('id')->get();
                    if ($history->isEmpty() && $settled > 0.0001) throw new \InvalidArgumentException('Equal split must start before a different partial-payment method is used.');
                    if ($history->isNotEmpty()) {
                        $first=$history->first(); if ((int)$first->split_people !== $parts) throw new \InvalidArgumentException('An equal split plan already exists with '.(int)$first->split_people.' people.');
                        $planBase=(float)$first->plan_base_amount;
                    }
                    $active=$history->filter(fn($r)=>$r->status==='settled' || ($r->status==='pending' && $r->expires_at && \Illuminate\Support\Carbon::parse($r->expires_at)->gt(now())))->values();
                    $partIndex=$active->count(); if ($partIndex >= $parts) throw new \InvalidArgumentException('All equal split parts are already paid or reserved.');
                    $cents=max(1,(int)round($planBase*100)); $base=intdiv($cents,$parts); $extra=$cents%$parts;
                    $principal=($base+($partIndex<$extra?1:0))/100;
                    $providerItems[]=['id'=>'equal-'.($partIndex+1),'name'=>'Equal split '.($partIndex+1).'/'.$parts,'quantity'=>1,'price'=>round($principal,2)];
                } else {
                    $share=max(1.0,min(100.0,(float)$request->input('share_percent',50)));
                    $history=\Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')->where('order_id',$locked->order_id)->where('split_mode','shares')->whereIn('status',['pending','settled'])->orderBy('id')->get();
                    if ($history->isEmpty() && $settled > 0.0001) throw new \InvalidArgumentException('Percentage split must start before a different partial-payment method is used.');
                    if ($history->isNotEmpty()) $planBase=(float)$history->first()->plan_base_amount;
                    $active=$history->filter(fn($r)=>$r->status==='settled' || ($r->status==='pending' && $r->expires_at && \Illuminate\Support\Carbon::parse($r->expires_at)->gt(now())));
                    $used=(float)$active->sum('share_percent'); if ($used+$share > 100.0001) throw new \InvalidArgumentException('Selected percentages would exceed 100% of this split plan.');
                    $principal=round($planBase*($share/100),2);
                    if ($used+$share >= 99.999) $principal=$available;
                    $providerItems[]=['id'=>'share-'.str_replace('.','_',number_format($share,2,'.','')),'name'=>'Bill share '.number_format($share,2).'%','quantity'=>1,'price'=>round($principal,2)];
                }

                $principal=round($principal,4);
                if ($principal <= 0.0001) throw new \InvalidArgumentException('Payment amount must be greater than zero.');
                if ($principal > $available + 0.02) throw new \InvalidArgumentException('Another payment changed the remaining balance. Refresh and try again.');
                $tip=round($principal*($tipPercent/100),4); $payable=round($principal+$tip,4);
                if ($tip > 0) $providerItems[]=['id'=>'tip','name'=>'Tip','quantity'=>1,'price'=>round($tip,2)];
                $token='r35_'.bin2hex(random_bytes(20)); $expires=now()->addMinutes(15);
                \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')->insert([
                    'token'=>$token,'order_id'=>(int)$locked->order_id,'guest_session_id'=>$guest?:null,'split_mode'=>$mode,
                    'split_people'=>$parts,'share_percent'=>$share,'part_index'=>$partIndex,'plan_base_amount'=>round($planBase,4),
                    'principal_amount'=>$principal,'tip_amount'=>$tip,'payable_amount'=>$payable,
                    'selected_items'=>$selected?json_encode($selected,JSON_UNESCAPED_SLASHES):null,
                    'payment_method'=>strtolower((string)$request->payment_method),'provider'=>trim((string)$request->input('provider',''))?:null,
                    'status'=>'pending','expires_at'=>$expires,'created_at'=>now(),'updated_at'=>now(),
                ]);
                $label='PMD R35 '.$mode.($mode==='equal'?':'.$parts.':'.number_format($planBase,2,'.',''):($mode==='shares'?':'.number_format($share,2,'.','').':'.number_format($planBase,2,'.',''):''));
                return compact('token','principal','tip','payable','selected','providerItems','parts','share','expires','label','mode');
            });
            return response()->json(['success'=>true,'intent_token'=>$data['token'],'order_id'=>(int)$request->order_id,'split_mode'=>$data['mode'],
                'principal_amount'=>round($data['principal'],2),'tip_amount'=>round($data['tip'],2),'payable_amount'=>round($data['payable'],2),
                'selected_items'=>$data['selected'],'provider_items'=>$data['providerItems'],'payer_label'=>$data['label'],
                'split_people'=>$data['parts'],'share_percent'=>$data['share'],'expires_at'=>$data['expires']->toIso8601String()]);
        } catch (\InvalidArgumentException $e) { return response()->json(['success'=>false,'error'=>$e->getMessage()],422); }
        catch (\Throwable $e) { \Log::error('PMD R35 split intent failed',['order_id'=>$request->order_id,'message'=>$e->getMessage()]); return response()->json(['success'=>false,'error'=>'Could not reserve this split payment. Please refresh and try again.'],500); }
    })->withoutMiddleware([\Igniter\Cart\Middleware\Currency::class]);

    // PMD_STRIPE_INLINE_PAYMENT_R35B: release an abandoned split reservation
    // before another guest tries to pay the same principal/items.
    Route::post('/orders/split-intent/cancel', function (\Illuminate\Http\Request $request) use ($pmdEnsureSplitIntentR35) {
        $pmdEnsureSplitIntentR35();
        $payload = $request->validate([
            'intent_token' => 'required|string|max:64',
            'guest_session_id' => 'nullable|string|max:191',
        ]);
        $intent = \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')
            ->where('token', (string)$payload['intent_token'])->first();
        if (!$intent) return response()->json(['success' => true, 'released' => false, 'status' => 'missing']);

        $requestedGuest = trim((string)($payload['guest_session_id'] ?? ''));
        $intentGuest = trim((string)($intent->guest_session_id ?? ''));
        if ($requestedGuest !== '' && $intentGuest !== '' && !hash_equals($intentGuest, $requestedGuest)) {
            return response()->json(['success' => false, 'error' => 'Split payment reservation does not belong to this guest.'], 409);
        }

        $released = false;
        if ((string)$intent->status === 'pending') {
            $released = \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')
                ->where('id', (int)$intent->id)->where('status', 'pending')
                ->update(['status' => 'cancelled', 'updated_at' => now()]) > 0;
        }
        return response()->json(['success' => true, 'released' => $released, 'status' => $released ? 'cancelled' : (string)$intent->status]);
    })->withoutMiddleware([\Igniter\Cart\Middleware\Currency::class]);

    Route::post('/orders/pay-existing', function (\Illuminate\Http\Request $request) {
        \Log::info('PMD_PAY_EXISTING_DEBUG_20260612 incoming', [
            'host' => $request->getHost(),
            'connection' => \Illuminate\Support\Facades\DB::getDefaultConnection(),
            'database' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
            'payload' => $request->all(),
        ]);
        $request->validate([
            'order_id' => 'required|integer',
            'payment_method' => 'required|string|max:50',
            'payment_reference' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric|min:0.0001',
            'payer_label' => 'nullable|string|max:191',
            'table_id' => 'nullable|string|max:50',
            'table_no' => 'nullable|string|max:50',
            'table' => 'nullable|string|max:50',
            'qr' => 'nullable|string|max:191',
            'selected_items' => 'nullable|array',
            'selected_items.*.order_menu_id' => 'required_with:selected_items|integer',
            'selected_items.*.quantity' => 'required_with:selected_items|numeric|min:0.001',
            'tip_amount' => 'nullable|numeric|min:0',
            'coupon_discount' => 'nullable|numeric|min:0',
            'coupon_code' => 'nullable|string|max:191',
            'payment_intent_token' => 'nullable|string|max:64',
            'idempotency_key' => 'nullable|string|max:64',
            'split_mode' => 'nullable|string|in:mine,equal,items,shares',
            'split_people' => 'nullable|integer|min:2|max:20',
            'share_percent' => 'nullable|numeric|min:1|max:100',
            'guest_session_id' => 'nullable|string|max:191',
        ]);

        $order = \Admin\Models\Orders_model::query()->where('order_id', $request->order_id)->first();
        if (!$order) {
            return response()->json(['success' => false, 'error' => 'Order not found'], 404);
        }
        if (strtolower((string)$order->payment) !== 'qr_pay_later') {
            return response()->json(['success' => false, 'error' => 'Only qr_pay_later orders can be paid through this endpoint'], 422);
        }

        $r35IntentId = null;
        $r35Intent = null;
        $r35SplitMode = strtolower(trim((string)$request->input('split_mode', '')));
        $r35Token = trim((string)$request->input('payment_intent_token', ''));
        if ($r35SplitMode !== '' || $r35Token !== '') {
            $pmdEnsureSplitIntentR35();
            if ($r35Token === '') return response()->json(['success'=>false,'error'=>'A split payment reservation is required.'],422);
            $r35Intent = \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')->where('token',$r35Token)->first();
            if (!$r35Intent || (int)$r35Intent->order_id !== (int)$order->order_id) return response()->json(['success'=>false,'error'=>'Split payment reservation was not found.'],409);
            if ((string)$r35Intent->status === 'settled') {
                $fresh=\Admin\Models\Orders_model::query()->where('order_id',$order->order_id)->first();
                $total=(float)(\Illuminate\Support\Facades\DB::table('order_totals')->where('order_id',$order->order_id)->where('code','total')->value('value') ?? $fresh->order_total ?? 0);
                $settled=(float)($fresh->settled_amount ?? 0);
                return response()->json(['success'=>true,'order_id'=>(int)$order->order_id,'transaction_id'=>$r35Intent->transaction_id ? (int)$r35Intent->transaction_id : null,
                    'message'=>'Payment already recorded','settlement_status'=>max(0,$total-$settled)<=0.0001?'paid':'partial','settled_amount'=>$settled,
                    'remaining_amount'=>max(0,$total-$settled),'paid_amount'=>(float)$r35Intent->payable_amount,'allocations'=>[],
                    'already_paid'=>false,'idempotent_replay'=>true,'should_print_receipt'=>false]);
            }
            if (!in_array((string)$r35Intent->status,['pending','expired'],true)) return response()->json(['success'=>false,'error'=>'Split payment reservation is no longer payable.'],409);
            if ($r35SplitMode === '') $r35SplitMode=(string)$r35Intent->split_mode;
            if ($r35SplitMode !== (string)$r35Intent->split_mode) return response()->json(['success'=>false,'error'=>'Split payment mode does not match reservation.'],409);
            $request->merge([
                'amount'=>(float)$r35Intent->payable_amount,'tip_amount'=>(float)$r35Intent->tip_amount,'coupon_discount'=>0,'coupon_code'=>null,
                'selected_items'=>json_decode((string)$r35Intent->selected_items,true) ?: null,
                'payer_label'=>'PMD R35 '.(string)$r35Intent->split_mode,
                'idempotency_key'=>$r35Token,
            ]);
            $r35IntentId=(int)$r35Intent->id;
            if (in_array(strtolower((string)$request->payment_method),['cash','cod'],true) && !$request->boolean('staff_confirmed')) {
                return response()->json(['success'=>false,'error'=>'Cash must be collected and confirmed by restaurant staff.'],422);
            }
        }

        $contextValues = array_values(array_unique(array_filter([
            trim((string)$request->input('table_id', '')),
            trim((string)$request->input('table_no', '')),
            trim((string)$request->input('table', '')),
        ], fn($value) => $value !== '')));
        $qrContext = trim((string)$request->input('qr', ''));
        if ($qrContext !== '') {
            $tableForQr = \Illuminate\Support\Facades\DB::table('tables')->where('qr_code', $qrContext)->first();
            if ($tableForQr) {
                $contextValues = array_values(array_unique(array_filter(array_merge($contextValues, [
                    (string)$tableForQr->table_id,
                    (string)($tableForQr->table_no ?? ''),
                    (string)($tableForQr->table_name ?? ''),
                ]), fn($value) => $value !== '')));
            }
        }
        if (!empty($contextValues)) {
            $orderType = (string)($order->order_type ?? '');
            $comment = (string)($order->comment ?? '');
            $contextMatches = in_array($orderType, $contextValues, true);
            if (!$contextMatches) {
                foreach ($contextValues as $candidate) {
                    if (str_contains($comment, 'Table ID: '.$candidate) || str_contains($comment, 'Table: '.$candidate)) {
                        $contextMatches = true;
                        break;
                    }
                }
            }
            if (!$contextMatches) {
                return response()->json(['success' => false, 'error' => 'Order does not belong to scanned table'], 409);
            }
        }

        \Log::info('QR_SETTLEMENT_DEBUG pay-existing before', [
            'host' => $request->getHost(),
            'connection' => \Illuminate\Support\Facades\DB::getDefaultConnection(),
            'database' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
            'order_id' => $order->order_id,
            'payload' => $request->only(['order_id', 'payment_method', 'payment_reference', 'amount', 'selected_items', 'tip_amount', 'coupon_discount', 'coupon_code']),
        ]);

        $normalizedPaymentMethod = strtolower((string)$request->payment_method);
        $paidStatusId = (int)(\Illuminate\Support\Facades\DB::table('statuses')
            ->whereRaw('LOWER(status_name) = ?', ['paid'])
            ->value('status_id') ?? 10);
        $hasSplitTables = \Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')
            && \Illuminate\Support\Facades\Schema::hasTable('order_payment_transaction_items');
        $allocationMeta = pmdResolveSplitAllocationColumn();
        $allocationColumn = $allocationMeta['column'];
        $allocationMode = $allocationMeta['mode'];
        $hasAllocOrderMenuColumn = \Illuminate\Support\Facades\Schema::hasColumn('order_payment_transaction_items', 'order_menu_id');
        $hasAllocMenuIdColumn = \Illuminate\Support\Facades\Schema::hasColumn('order_payment_transaction_items', 'menu_id');
        $selectedItemsPayload = collect($request->input('selected_items', []));
        $transactionId = null;

        try {
            $result = \Illuminate\Support\Facades\DB::transaction(function () use ($request, $order, $normalizedPaymentMethod, $paidStatusId, $hasSplitTables, $selectedItemsPayload, $allocationColumn, $allocationMode, $hasAllocOrderMenuColumn, $hasAllocMenuIdColumn, &$transactionId, $r35IntentId, $r35SplitMode) {
                $lockedOrder = \Admin\Models\Orders_model::query()
                    ->where('order_id', $order->order_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                // PMD_SPLIT_PAYMENT_SAFETY_R35: intent and order are locked together.
                if ($r35IntentId) {
                    $lockedR35Intent = \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')
                        ->where('id', $r35IntentId)->lockForUpdate()->first();
                    if (!$lockedR35Intent) throw new \InvalidArgumentException('Split payment reservation was not found.');
                    if ((string)$lockedR35Intent->status === 'settled') {
                        $transactionId = $lockedR35Intent->transaction_id ? (int)$lockedR35Intent->transaction_id : null;
                        $currentTotal = (float)(\Illuminate\Support\Facades\DB::table('order_totals')
                            ->where('order_id', $lockedOrder->order_id)->where('code', 'total')->value('value') ?? $lockedOrder->order_total ?? 0);
                        $currentSettled = max(0, (float)($lockedOrder->settled_amount ?? 0));
                        $currentRemaining = max(0, round($currentTotal - $currentSettled, 4));
                        return [
                            'lockedOrder' => $lockedOrder,
                            'previousSettlementStatus' => strtolower((string)($lockedOrder->settlement_status ?? 'partial')),
                            'newSettlementStatus' => $currentRemaining <= 0.0001 ? 'paid' : 'partial',
                            'newSettled' => $currentSettled,
                            'remaining' => $currentRemaining,
                            'calculatedAmount' => (float)$lockedR35Intent->principal_amount,
                            'allocationRows' => [],
                            'alreadyPaid' => false,
                            'idempotentReplay' => true,
                            'tipAmount' => (float)$lockedR35Intent->tip_amount,
                            'couponDiscount' => 0.0,
                            'payableAmount' => (float)$lockedR35Intent->payable_amount,
                        ];
                    }
                    if (!in_array((string)$lockedR35Intent->status, ['pending','expired'], true)) {
                        throw new \InvalidArgumentException('Split payment reservation is no longer payable.');
                    }
                }

                $canonicalTotalForGuard = \Illuminate\Support\Facades\DB::table('order_totals')
                    ->where('order_id', $lockedOrder->order_id)
                    ->where('code', 'total')
                    ->value('value');
                $orderTotalForGuard = round((float)($canonicalTotalForGuard ?? $lockedOrder->order_total ?? 0), 4);
                $currentSettledForGuard = max(0, round((float)($lockedOrder->settled_amount ?? 0), 4));
                $currentSettlementStatusForGuard = strtolower((string)($lockedOrder->settlement_status ?? 'unpaid'));
                if (in_array($currentSettlementStatusForGuard, ['cancelled', 'failed'], true)) {
                    throw new \InvalidArgumentException('Order is not payable');
                }
                if ($currentSettlementStatusForGuard === 'paid' || ($orderTotalForGuard > 0 && $currentSettledForGuard >= $orderTotalForGuard - 0.0001)) {
                    return [
                        'lockedOrder' => $lockedOrder,
                        'previousSettlementStatus' => 'paid',
                        'newSettlementStatus' => 'paid',
                        'newSettled' => $currentSettledForGuard,
                        'remaining' => 0.0,
                        'calculatedAmount' => 0.0,
                        'allocationRows' => [],
                        'alreadyPaid' => true,
                    ];
                }

                $orderMenus = \Illuminate\Support\Facades\DB::table('order_menus')
                    ->where('order_id', $lockedOrder->order_id)
                    ->get(['order_menu_id', 'menu_id', 'name', 'quantity', 'price', 'subtotal']);
                $orderItemsForTotals = $orderMenus->map(fn($row) => [
                    'price' => (float)($row->price ?? 0),
                    'quantity' => (float)($row->quantity ?? 0),
                    'subtotal' => (float)($row->subtotal ?? 0),
                ])->all();
                $resolvedPaymentTotals = pmd_table_order_totals_from_order((int)$lockedOrder->order_id, $orderItemsForTotals, (float)($lockedOrder->order_total ?? 0));
                $orderItemSubtotalTotal = max(0.0, pmd_table_order_item_subtotal($orderItemsForTotals));
                $orderGrossRatio = $orderItemSubtotalTotal > 0 ? max(0.0, round(((float)$resolvedPaymentTotals['total']) / $orderItemSubtotalTotal, 8)) : 1.0;
                $lockedOrder->order_total = (float)$resolvedPaymentTotals['total'];

                $remainingByOrderMenu = [];
                $paidQtyByOrderMenu = [];
                $paidQtyByMenu = [];

                if ($hasSplitTables) {
                    $paidRows = \Illuminate\Support\Facades\DB::table('order_payment_transactions as opt')
                        ->join('order_payment_transaction_items as opti', 'opti.transaction_id', '=', 'opt.id')
                        ->where('opt.order_id', $lockedOrder->order_id)
                        ->whereNotIn('opt.settlement_status', ['failed', 'cancelled'])
                        ->selectRaw("ti_opti.{$allocationColumn} as alloc_key, SUM(ti_opti.quantity_paid) as qty_paid")
                        ->groupByRaw("ti_opti." . $allocationColumn)
                        ->get();
                    foreach ($paidRows as $paidRow) {
                        if ($allocationMode === 'menu_id_legacy') {
                            $paidQtyByMenu[(int)$paidRow->alloc_key] = (float)$paidRow->qty_paid;
                        } else {
                            $paidQtyByOrderMenu[(int)$paidRow->alloc_key] = (float)$paidRow->qty_paid;
                        }
                    }
                }

                $remainingTotal = 0.0;
                $consumedPaidByMenu = [];
                foreach ($orderMenus as $menuRow) {
                    $orderedQty = (float)($menuRow->quantity ?? 0);
                    $lineSubtotal = (float)($menuRow->subtotal ?? 0);
                    $unitPrice = $orderedQty > 0 ? round($lineSubtotal / $orderedQty, 4) : round((float)($menuRow->price ?? 0), 4);
                    if ($allocationMode === 'menu_id_legacy') {
                        $menuId = (int)($menuRow->menu_id ?? 0);
                        $menuPaidTotal = (float)($paidQtyByMenu[$menuId] ?? 0);
                        $alreadyConsumed = (float)($consumedPaidByMenu[$menuId] ?? 0);
                        $paidQty = max(0, min($orderedQty, $menuPaidTotal - $alreadyConsumed));
                        $consumedPaidByMenu[$menuId] = $alreadyConsumed + $paidQty;
                    } else {
                        $paidQty = min($orderedQty, (float)($paidQtyByOrderMenu[(int)$menuRow->order_menu_id] ?? 0));
                    }
                    $remainingQty = round(max(0, $orderedQty - $paidQty), 3);
                    if ($remainingQty > 0) {
                        $remainingByOrderMenu[(int)$menuRow->order_menu_id] = ['row' => $menuRow, 'remaining_qty' => $remainingQty, 'unit_price' => $unitPrice];
                        $remainingTotal += round($unitPrice * $remainingQty, 4);
                    }
                }

                $amountOnlySplitR35 = in_array($r35SplitMode, ['equal','shares'], true) && $selectedItemsPayload->isEmpty();
                $allocationQty = [];
                if ($selectedItemsPayload->isNotEmpty()) {
                    foreach ($selectedItemsPayload as $itemPayload) {
                        $menuId = (int)($itemPayload['order_menu_id'] ?? 0);
                        $qty = round((float)($itemPayload['quantity'] ?? 0), 3);
                        if ($menuId <= 0 || $qty <= 0) throw new \InvalidArgumentException('Invalid selected item payload');
                        $allocationQty[$menuId] = round(($allocationQty[$menuId] ?? 0) + $qty, 3);
                    }
                } elseif (!$amountOnlySplitR35) {
                    foreach ($remainingByOrderMenu as $menuId => $remainingInfo) $allocationQty[$menuId] = (float)$remainingInfo['remaining_qty'];
                }
                if (empty($allocationQty) && !$amountOnlySplitR35) throw new \InvalidArgumentException('No payable items remaining');

                $allocationRows = [];
                $calculatedAmount = 0.0;
                foreach ($allocationQty as $menuId => $qtyToPay) {
                    if (!isset($remainingByOrderMenu[$menuId])) throw new \InvalidArgumentException('Selected item does not belong to order or is already paid');
                    $maxRemaining = (float)$remainingByOrderMenu[$menuId]['remaining_qty'];
                    if ($qtyToPay > $maxRemaining + 0.0001) throw new \InvalidArgumentException('Selected quantity exceeds unpaid quantity');
                    $unitPrice = (float)$remainingByOrderMenu[$menuId]['unit_price'];
                    $lineTotal = round($unitPrice * $qtyToPay, 4);
                    $allocationRows[] = ['order_menu_id'=>$menuId,'menu_id'=>(int)($remainingByOrderMenu[$menuId]['row']->menu_id ?? 0),
                        'name'=>(string)($remainingByOrderMenu[$menuId]['row']->name ?? ''),'quantity_paid'=>$qtyToPay,'unit_price'=>$unitPrice,'line_total'=>$lineTotal];
                    $calculatedAmount += $lineTotal;
                }

                $tipAmount = max(0, round((float)$request->input('tip_amount', 0), 4));
                $couponDiscount = max(0, round((float)$request->input('coupon_discount', 0), 4));
                if ($amountOnlySplitR35) {
                    if (!$r35IntentId) throw new \InvalidArgumentException('Amount split requires a valid payment reservation');
                    if ($couponDiscount > 0.0001) throw new \InvalidArgumentException('Coupons are only supported on full remaining payment');
                    $payableAmount = round((float)$request->input('amount', 0), 4);
                    $calculatedAmount = round($payableAmount - $tipAmount, 4);
                    if ($calculatedAmount <= 0) throw new \InvalidArgumentException('Payment amount must be greater than zero');
                } else {
                    $calculatedItemSubtotal = round($calculatedAmount, 4);
                    $calculatedAmount = round($calculatedItemSubtotal * $orderGrossRatio, 4);
                    if ($calculatedAmount <= 0) throw new \InvalidArgumentException('Payment amount must be greater than zero');
                    $couponDiscount = min($couponDiscount, round($calculatedAmount + $tipAmount, 4));
                    $payableAmount = round(max(0, $calculatedAmount + $tipAmount - $couponDiscount), 4);
                    if ($request->filled('amount')) {
                        $requestedAmount = round((float)$request->input('amount'), 4);
                        if (abs($requestedAmount - $payableAmount) > 0.02) throw new \InvalidArgumentException('Selected items amount mismatch');
                    }
                }
                $remainingGrossTotal = round($remainingTotal * $orderGrossRatio, 4);
                $financialRemaining = max(0, round((float)$lockedOrder->order_total - (float)$lockedOrder->settled_amount, 4));
                $maximumPrincipal = $amountOnlySplitR35 ? $financialRemaining : $remainingGrossTotal;
                if ($calculatedAmount > $maximumPrincipal + 0.02) throw new \InvalidArgumentException('Cannot overpay remaining amount');

                $orderTotal = round((float)($lockedOrder->order_total ?? 0), 4);
                $currentSettled = max(0, round((float)($lockedOrder->settled_amount ?? 0), 4));
                $newSettled = round(min($orderTotal, $currentSettled + $calculatedAmount), 4);
                $remaining = max(0, round($orderTotal - $newSettled, 4));
                $newSettlementStatus = $remaining <= 0.0001 ? 'paid' : 'partial';
                $previousSettlementStatus = strtolower((string)($lockedOrder->settlement_status ?? 'unpaid'));
                if (!in_array($previousSettlementStatus, ['unpaid', 'partial', 'paid'], true)) {
                    $previousSettlementStatus = $currentSettled > 0.0001 ? 'partial' : 'unpaid';
                }

                if ($hasSplitTables) {
                    $transactionPayload = [
                        'order_id' => (int)$lockedOrder->order_id,
                        'payment_method' => $normalizedPaymentMethod,
                        'payment_reference' => $request->filled('payment_reference') ? (string)$request->payment_reference : null,
                        'amount' => $payableAmount,
                        'settlement_status' => $newSettlementStatus,
                        'payer_label' => $request->filled('payer_label') ? (string)$request->payer_label : null,
                        'paid_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    if ($request->filled('idempotency_key') && \Illuminate\Support\Facades\Schema::hasColumn('order_payment_transactions', 'idempotency_key')) {
                        $transactionPayload['idempotency_key'] = (string)$request->input('idempotency_key');
                    }
                    $transactionId = \Illuminate\Support\Facades\DB::table('order_payment_transactions')->insertGetId($transactionPayload);
                    $insertRows = [];
                    foreach ($allocationRows as $allocationRow) {
                        $insertRow = [
                            'transaction_id' => $transactionId,
                            $allocationColumn => $allocationMode === 'menu_id_legacy'
                                ? $allocationRow['menu_id']
                                : $allocationRow['order_menu_id'],
                            'quantity_paid' => $allocationRow['quantity_paid'],
                            'unit_price' => $allocationRow['unit_price'],
                            'line_total' => $allocationRow['line_total'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        if ($hasAllocOrderMenuColumn) {
                            $insertRow['order_menu_id'] = $allocationRow['order_menu_id'];
                        }
                        if ($hasAllocMenuIdColumn) {
                            $insertRow['menu_id'] = $allocationRow['menu_id'];
                        }
                        $insertRows[] = $insertRow;
                    }
                    if (!empty($insertRows)) \Illuminate\Support\Facades\DB::table('order_payment_transaction_items')->insert($insertRows);
                }

                $lockedOrder->settlement_status = $newSettlementStatus;
                $lockedOrder->settled_amount = $newSettled;
                $lockedOrder->settlement_method = $normalizedPaymentMethod;
                if ($request->filled('payment_reference')) {
                    $lockedOrder->settlement_reference = (string)$request->payment_reference;
                }
                $lockedOrder->processed = $newSettlementStatus === 'paid' ? 1 : 0;
                if ($newSettlementStatus === 'paid') {
                    // PMD_PRESERVE_KITCHEN_STATUS_ON_PAYMENT_R28
                    // Payment settlement is financial state. Keep the existing kitchen/fulfilment
                    // status_id (Received/Preparing/Ready/etc.) intact after a mid-service payment.
                    $lockedOrder->settled_at = now();
                }
                $lockedOrder->save();
                if ($r35IntentId) {
                    \Illuminate\Support\Facades\DB::table('pmd_guest_payment_intents')->where('id', $r35IntentId)->update([
                        'status' => 'settled', 'transaction_id' => $transactionId,
                        'payment_reference' => $request->filled('payment_reference') ? (string)$request->payment_reference : null,
                        'updated_at' => now(),
                    ]);
                }

                return compact('lockedOrder', 'previousSettlementStatus', 'newSettlementStatus', 'newSettled', 'remaining', 'calculatedAmount', 'allocationRows') + ['alreadyPaid' => false, 'tipAmount' => $tipAmount, 'couponDiscount' => $couponDiscount, 'payableAmount' => $payableAmount];
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            \Log::error('QR_SETTLEMENT_DEBUG pay-existing failed', [
                'order_id' => $order->order_id,
                'message' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'error' => 'Failed to record payment transaction'], 500);
        }

        $order = $result['lockedOrder'];
        $previousSettlementStatus = $result['previousSettlementStatus'];
        $newSettlementStatus = $result['newSettlementStatus'];
        $newSettled = $result['newSettled'];
        $remaining = $result['remaining'];
        $paymentAmount = round((float)($result['payableAmount'] ?? $result['calculatedAmount']), 4);
        $settlementItemAmount = round((float)$result['calculatedAmount'], 4);
        $tipAmount = round((float)($result['tipAmount'] ?? 0), 4);
        $couponDiscount = round((float)($result['couponDiscount'] ?? 0), 4);
        $allocationRows = $result['allocationRows'];
        $alreadyPaid = (bool)($result['alreadyPaid'] ?? false);
        $idempotentReplay = (bool)($result['idempotentReplay'] ?? false);
        $shouldPrintReceipt = !$alreadyPaid && !$idempotentReplay && $previousSettlementStatus !== 'paid' && $newSettlementStatus === 'paid';

        if ($idempotentReplay) {
            return response()->json([
                'success' => true,
                'order_id' => (int)$request->order_id,
                'transaction_id' => $transactionId ? (int)$transactionId : null,
                'message' => 'Payment already recorded',
                'settlement_status' => $newSettlementStatus,
                'settled_amount' => $newSettled,
                'remaining_amount' => $remaining,
                'paid_amount' => $paymentAmount,
                'allocations' => [],
                'already_paid' => false,
                'idempotent_replay' => true,
                'should_print_receipt' => false,
            ]);
        }

        if ($alreadyPaid) {
            return response()->json([
                'success' => true,
                'order_id' => (int)$request->order_id,
                'transaction_id' => null,
                'message' => 'Order is already paid',
                'settlement_status' => 'paid',
                'settled_amount' => $newSettled,
                'remaining_amount' => 0.0,
                'paid_amount' => 0.0,
                'allocations' => [],
                'already_paid' => true,
                'should_print_receipt' => false,
            ]);
        }

        \Illuminate\Support\Facades\DB::table('order_totals')
            ->where('order_id', $request->order_id)
            ->where('code', 'payment_method')
            ->update(['value' => $normalizedPaymentMethod]);
        if ($request->filled('payment_reference')) {
            \Illuminate\Support\Facades\DB::table('order_totals')->insert([
                'order_id' => $request->order_id,
                'code' => 'payment_reference',
                'title' => 'Payment Reference',
                'value' => (string)$request->payment_reference,
                'priority' => 0,
            ]);
        }

        try {
            $tableDisplay = (string)($order->order_type ?? '');
            $tableId = trim((string)($order->order_type ?? ''));
            if ($tableId !== '' && is_numeric($tableId)) {
                $table = \Illuminate\Support\Facades\DB::table('tables')->where('table_id', $tableId)->first();
                if ($table) $tableDisplay = (string)($table->table_name ?: ('Table '.$table->table_no));
            }
            $notifyStatus = $newSettlementStatus === 'paid' ? 'full_payment' : 'partial_payment';
            if ($notifyStatus === 'full_payment' && !$shouldPrintReceipt) {
                $notifyStatus = null;
            }
            if ($notifyStatus !== null) {
                \App\Helpers\NotificationHelper::createOrderNotification([
                    'tenant_id' => $order->location_id ?? 1,
                    'order_id' => $order->order_id,
                    'table_id' => is_numeric($tableId) ? (int)$tableId : null,
                    'table_name' => $tableDisplay,
                    'status' => $notifyStatus,
                    'status_name' => $newSettlementStatus === 'paid' ? 'Paid' : 'Partial',
                    'message' => $newSettlementStatus === 'paid'
                        ? sprintf(
                            'Order #%d fully paid (%s, paid %0.2f).',
                            (int)$order->order_id,
                            strtoupper($normalizedPaymentMethod),
                            $paymentAmount
                        )
                        : sprintf(
                            'Order #%d partially paid (%s, paid %0.2f, remaining %0.2f).',
                            (int)$order->order_id,
                            strtoupper($normalizedPaymentMethod),
                            $paymentAmount,
                            $remaining
                        ),
                    'amount_paid' => $paymentAmount,
                    'remaining_amount' => $remaining,
                    'payment_method' => $normalizedPaymentMethod,
                    'payment_reference' => $request->filled('payment_reference') ? (string)$request->payment_reference : '',
                    'priority' => $newSettlementStatus === 'paid' ? 'high' : 'medium',
                ]);
            }
        } catch (\Throwable $e) {
            \Log::warning('QR settlement notification failed', ['order_id' => $order->order_id, 'message' => $e->getMessage()]);
        }

        \Log::info('QR_SETTLEMENT_DEBUG pay-existing after', [
            'order_id' => (int)$order->order_id,
            'transaction_id' => $transactionId,
            'allocation_rows' => $allocationRows,
            'settlement_status' => $newSettlementStatus,
            'settled_amount' => $newSettled,
            'remaining_amount' => $remaining,
        ]);

        return response()->json([
            'success' => true,
            'order_id' => (int)$request->order_id,
            'transaction_id' => $transactionId ? (int)$transactionId : null,
            'message' => $newSettlementStatus === 'paid' ? 'Order paid successfully' : 'Partial payment recorded',
            'settlement_status' => $newSettlementStatus,
            'settled_amount' => $newSettled,
            'remaining_amount' => $remaining,
            'paid_amount' => $paymentAmount,
            'settled_item_amount' => $settlementItemAmount,
            'tip_amount' => $tipAmount,
            'coupon_discount' => $couponDiscount,
            'allocations' => $allocationRows,
            'already_paid' => false,
            'should_print_receipt' => $shouldPrintReceipt,
            'receipt_url' => $transactionId ? url('admin/orders/split-receipt/'.$transactionId) : null,
        ]);
    })->withoutMiddleware([\Igniter\Cart\Middleware\Currency::class]);

    Route::get('/orders/{order}/payment-transactions', function ($orderId) {
        if (!\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')
            || !\Illuminate\Support\Facades\Schema::hasTable('order_payment_transaction_items')) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $transactions = \Illuminate\Support\Facades\DB::table('order_payment_transactions')
            ->where('order_id', (int)$orderId)
            ->orderByDesc('id')
            ->get();
        $txIds = $transactions->pluck('id')->all();
        $allocationMeta = pmdResolveSplitAllocationColumn();
        $allocationColumn = $allocationMeta['column'];
        $joinLeft = $allocationMeta['mode'] === 'menu_id_legacy' ? 'om.menu_id' : 'om.order_menu_id';
        $itemsByTx = [];
        if (!empty($txIds)) {
            $itemRows = \Illuminate\Support\Facades\DB::table('order_payment_transaction_items as ti_ti')
                ->leftJoin('order_menus as om', $joinLeft, '=', 'ti_ti.'.$allocationColumn)
                ->whereIn('ti_ti.transaction_id', $txIds)
                ->get([
                    'ti_ti.transaction_id',
                    'ti_ti.'.$allocationColumn.' as allocation_key',
                    'ti_ti.quantity_paid',
                    'ti_ti.unit_price',
                    'ti_ti.line_total',
                    'om.order_menu_id',
                    'om.menu_id',
                    'om.name',
                ]);
            foreach ($itemRows as $itemRow) {
                $itemsByTx[(int)$itemRow->transaction_id] = $itemsByTx[(int)$itemRow->transaction_id] ?? [];
                $itemsByTx[(int)$itemRow->transaction_id][] = $itemRow;
            }
        }

        $data = [];
        foreach ($transactions as $transaction) {
            $id = (int)$transaction->id;
            $data[] = [
                'id' => $id,
                'payment_method' => (string)$transaction->payment_method,
                'payment_reference' => (string)($transaction->payment_reference ?? ''),
                'amount' => (float)$transaction->amount,
                'settlement_status' => (string)($transaction->settlement_status ?? ''),
                'payer_label' => (string)($transaction->payer_label ?? ''),
                'paid_at' => $transaction->paid_at,
                'receipt_url' => url('admin/orders/split-receipt/'.$id),
                'items' => array_map(function ($row) {
                    return [
                        'order_menu_id' => (int)($row->order_menu_id ?? 0),
                        'menu_id' => (int)($row->menu_id ?? 0),
                        'name' => (string)($row->name ?? ''),
                        'quantity_paid' => (float)$row->quantity_paid,
                        'unit_price' => (float)$row->unit_price,
                        'line_total' => (float)$row->line_total,
                    ];
                }, $itemsByTx[$id] ?? []),
            ];
        }

        return response()->json(['success' => true, 'data' => $data]);
    });

    Route::post('/orders/start-payment', function (\Illuminate\Http\Request $request) {
        $payload = $request->validate([
            'order_id' => 'required|integer|min:1',
            'payment_method' => 'required|string|max:50',
            'provider' => 'nullable|string|max:50',
            'guest_session_id' => 'nullable|string|max:191',
            'table_id' => 'nullable|string|max:50',
            'table_no' => 'nullable|string|max:50',
            'source' => 'nullable|string|max:50',
        ]);

        $order = \Admin\Models\Orders_model::query()->where('order_id', (int)$payload['order_id'])->first();
        if (!$order) return response()->json(['success' => false, 'error' => 'Order not found'], 404);
        if (strtolower((string)($order->payment ?? '')) === 'qr_pay_later') {
            return response()->json(['success' => false, 'error' => 'Use pay-existing for qr_pay_later orders'], 422);
        }
        $pmdStartPaymentSettlementStatus = strtolower((string)($order->settlement_status ?? 'unpaid'));
        if (in_array((int)($order->status_id ?? 0), [5, 10], true) || in_array($pmdStartPaymentSettlementStatus, ['paid', 'cancelled', 'failed'], true)) {
            return response()->json(['success' => false, 'error' => 'Order is already paid or closed'], 422);
        }

        $orderTotal = round((float)($order->order_total ?? 0), 4);
        $settled = round((float)($order->settled_amount ?? 0), 4);
        $amount = $settled > 0 ? max(0, round($orderTotal - $settled, 4)) : $orderTotal;
        if ($amount <= 0) return response()->json(['success' => false, 'error' => 'No payable amount remaining'], 422);

        $method = strtolower((string)$payload['payment_method']);
        if (in_array($method, ['cash', 'cod'], true)) {
            return response()->json([
                'success' => true,
                'order_id' => (int)$order->order_id,
                'amount' => $amount,
                'currency' => strtoupper((string)(setting('currency_code', 'EUR') ?: 'EUR')),
                'provider' => 'cash',
                'message' => 'Cash collection requested',
            ]);
        }

        $provider = strtolower((string)($payload['provider'] ?? ''));
        if ($provider === '') {
            $provider = $method === 'paypal' ? 'paypal' : 'stripe';
        }

        return response()->json([
            'success' => true,
            'order_id' => (int)$order->order_id,
            'amount' => $amount,
            'currency' => strtoupper((string)(setting('currency_code', 'EUR') ?: 'EUR')),
            'provider' => $provider,
            'payment_method' => $method,
        ]);
    });

    // PMD_REVIEW_SAVE_AND_BUSINESS_INVOICE_ENDPOINTS_20260605
    Route::post('/reviews', function (\Illuminate\Http\Request $request) {
        $payload = $request->validate([
            'order_id' => 'nullable|integer|min:1',
            'rating' => 'required|integer|min:1|max:5',
            'review' => 'nullable|string|max:4000',
            'public_share_consent' => 'nullable|boolean',
        ]);

        $rating = (int)($payload['rating'] ?? 0);
        $reviewText = trim((string)($payload['review'] ?? ''));
        if ($rating < 1 || $rating > 5) {
            return response()->json(['success' => false, 'error' => 'Please select a star rating from 1 to 5.'], 422);
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('reviews')) {
            \Illuminate\Support\Facades\Schema::create('reviews', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->increments('review_id');
                $table->unsignedInteger('customer_id')->nullable()->index();
                $table->unsignedInteger('sale_id')->nullable()->index();
                $table->string('sale_type')->nullable()->index();
                $table->unsignedInteger('location_id')->nullable()->index();
                $table->string('tenant_host')->nullable();
                $table->string('author')->nullable();
                $table->unsignedTinyInteger('quality')->default(0);
                $table->unsignedTinyInteger('service')->default(0);
                $table->unsignedTinyInteger('delivery')->default(0);
                $table->text('review_text')->nullable();
                $table->boolean('review_status')->default(false);
                $table->boolean('public_share_consent')->nullable();
                $table->timestamps();
            });
        }
        if (!\Illuminate\Support\Facades\Schema::hasColumn('reviews', 'public_share_consent')) {
            \Illuminate\Support\Facades\Schema::table('reviews', function (\Illuminate\Database\Schema\Blueprint $table) { $table->boolean('public_share_consent')->nullable(); });
        }
        if (!\Illuminate\Support\Facades\Schema::hasColumn('reviews', 'tenant_host')) {
            \Illuminate\Support\Facades\Schema::table('reviews', function (\Illuminate\Database\Schema\Blueprint $table) { $table->string('tenant_host')->nullable(); });
        }
        foreach ([
            'order_id' => 'unsignedInteger',
            'menu_id' => 'unsignedInteger',
            'customer_name' => 'string',
            'rating' => 'unsignedTinyInteger',
            'comment' => 'text',
            'status' => 'string',
            'source' => 'string',
        ] as $column => $type) {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('reviews', $column)) {
                \Illuminate\Support\Facades\Schema::table('reviews', function (\Illuminate\Database\Schema\Blueprint $table) use ($column, $type) {
                    if ($type === 'unsignedInteger') $table->unsignedInteger($column)->nullable()->index();
                    elseif ($type === 'unsignedTinyInteger') $table->unsignedTinyInteger($column)->default(0);
                    elseif ($type === 'text') $table->text($column)->nullable();
                    else $table->string($column)->nullable();
                });
            }
        }

        $locationId = null;
        $orderId = isset($payload['order_id']) ? (int)$payload['order_id'] : null;
        if ($orderId) {
            $locationId = \Illuminate\Support\Facades\DB::table('orders')->where('order_id', $orderId)->value('location_id');
        }
        if (!$locationId) {
            $locationId = \Illuminate\Support\Facades\DB::table('locations')->value('location_id') ?: null;
        }

        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('reviews');
        $insert = [
            'customer_id' => null,
            'sale_id' => $orderId,
            'sale_type' => $orderId ? 'orders' : null,
            'location_id' => $locationId,
            'tenant_host' => $request->getHost(),
            'author' => 'Checkout guest',
            'quality' => $rating,
            'service' => $rating,
            'delivery' => $rating,
            'review_text' => $reviewText,
            'review_status' => 0,
            'public_share_consent' => array_key_exists('public_share_consent', $payload) ? $payload['public_share_consent'] : null,
            'order_id' => $orderId,
            'customer_name' => 'Checkout guest',
            'rating' => $rating,
            'comment' => $reviewText,
            'status' => 'pending',
            'source' => 'frontend',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        $insert = array_intersect_key($insert, array_flip($columns));
        $reviewId = \Illuminate\Support\Facades\DB::table('reviews')->insertGetId($insert);

        return response()->json(['success' => true, 'data' => ['review_id' => $reviewId]]);
    });

    // PMD_PAID_INVOICE_DOWNLOAD_R28
    // PMD_CANONICAL_CUSTOMER_INVOICE_R28E
    // Paid customer invoices now reuse the exact Admin customer-invoice Blade as the
    // single visual/data authority. No second PDF layout is maintained in this API.
    // The HMAC table-session capability and full-payment guard from R28 remain required.
    Route::get('/orders/{order}/paid-invoice', function (\Illuminate\Http\Request $request, $orderId) {
        $orderId = (int)$orderId;
        if ($orderId < 1) return response('Invoice not found', 404);

        $token = trim((string)$request->query('token', ''));
        if ($token === '') return response('Invoice token is required', 403);

        if (!\Illuminate\Support\Facades\Schema::hasTable('pmd_table_order_drafts')) {
            return response('Invoice session not found', 404);
        }

        $submittedDraft = \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')
            ->where('status', 'submitted')
            ->where('order_id', $orderId)
            ->orderByDesc('id')
            ->first();
        $sessionKey = trim((string)($submittedDraft->session_key ?? ''));
        if (!$submittedDraft || $sessionKey === '') return response('Invoice session not found', 404);

        $expectedToken = hash_hmac(
            'sha256',
            $request->getHost().'|'.$orderId.'|'.$sessionKey,
            (string)config('app.key')
        );
        if (!hash_equals($expectedToken, $token)) return response('Invalid invoice token', 403);

        $order = \Admin\Models\Orders_model::query()->where('order_id', $orderId)->first();
        if (!$order) return response('Invoice not found', 404);

        $canonicalTotal = \Illuminate\Support\Facades\DB::table('order_totals')
            ->where('order_id', $orderId)
            ->where('code', 'total')
            ->value('value');
        $orderTotal = round((float)($canonicalTotal ?? $order->order_total ?? 0), 4);
        $settledAmount = max(0, round((float)($order->settled_amount ?? 0), 4));
        $settlementStatus = strtolower(trim((string)($order->settlement_status ?? '')));
        $isPaid = in_array($settlementStatus, ['paid', 'settled'], true)
            || ($orderTotal > 0 && $settledAmount >= $orderTotal - 0.0001);
        if (!$isPaid) return response('Invoice is available after full payment', 409);

        // Use the platform's existing invoice-number/date authority before rendering the
        // canonical customer view. This is the same Orders_model/HasInvoice path used by Admin.
        try {
            if (method_exists($order, 'hasInvoice') && !$order->hasInvoice()) $order->generateInvoice();
            $order = $order->fresh() ?: $order;
        } catch (\Throwable $e) {
            \Log::warning('PMD R28E invoice metadata generation skipped', [
                'order_id' => $orderId,
                'message' => $e->getMessage(),
            ]);
        }

        try {
            $html = \Illuminate\Support\Facades\View::make('admin::orders.customer_invoice', [
                'model' => $order,
            ])->render();
        } catch (\Throwable $e) {
            \Log::error('PMD R28E canonical customer invoice render failed', [
                'order_id' => $orderId,
                'message' => $e->getMessage(),
            ]);
            return response('Unable to render customer invoice', 500);
        }

        // The canonical Admin customer invoice is HTML/print CSS. When opened from the
        // frontend download button, request print=1 so the browser immediately offers its
        // native Print / Save as PDF flow while preserving the exact Admin design, logo,
        // tenant invoice template, footer, VAT/Fiskaly data and future Admin-side changes.
        $printRequested = in_array(strtolower(trim((string)$request->query('print', '0'))), ['1', 'true', 'yes', 'on'], true);
        if ($printRequested) {
            $printScript = <<<'HTML'
<script id="pmd-r28e-canonical-invoice-autoprint">
(function () {
  var fired = false;
  function printCanonicalInvoice() {
    if (fired) return;
    fired = true;
    window.setTimeout(function () {
      try { window.print(); } catch (e) {}
    }, 300);
  }
  if (document.readyState === 'complete') printCanonicalInvoice();
  else window.addEventListener('load', printCanonicalInvoice, { once: true });
})();
</script>
HTML;
            if (stripos($html, '</body>') !== false) {
                $html = preg_replace('/<\/body>/i', $printScript.'</body>', $html, 1);
            } else {
                $html .= $printScript;
            }
        }

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'Referrer-Policy' => 'no-referrer',
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'X-PMD-Invoice-Authority' => 'admin::orders.customer_invoice',
        ]);
    })->withoutMiddleware([\Igniter\Cart\Middleware\Currency::class]);

    Route::get('/orders/{order}/business-invoice', function ($orderId) {
        $orderId = (int)$orderId;
        $order = \Admin\Models\Orders_model::query()->where('order_id', $orderId)->first();
        if (!$order) return response('Order not found', 404);

        $settings = \Illuminate\Support\Facades\DB::table('settings')->get()->keyBy('item');
        $restaurant = (string)(optional($settings->get('site_name'))->value ?? 'PayMyDine Restaurant');
        $currency = (string)(optional($settings->get('default_currency_code'))->value ?? optional($settings->get('default_currency'))->value ?? 'EUR');
        $lines = [
            'Business Invoice',
            $restaurant,
            'Invoice #: '.$orderId,
            'Date: '.(string)($order->created_at ?? now()),
            'Customer: '.((string)($order->customer_name ?? '') ?: 'Guest'),
            '',
            'Items:',
        ];
        try {
            foreach (($order->getOrderMenusWithOptions() ?? []) as $row) {
                $qty = (float)($row->quantity ?? 0);
                $name = (string)($row->name ?? 'Item');
                $line = $qty * (float)($row->price ?? 0);
                $lines[] = rtrim(rtrim(number_format($qty, 2, '.', ''), '0'), '.').' x '.$name.' - '.number_format($line, 2).' '.$currency;
            }
        } catch (\Throwable $e) {}
        $lines[] = '';
        $lines[] = 'Total: '.number_format((float)($order->order_total ?? 0), 2).' '.$currency;

        $escape = function ($text) { return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], (string)$text); };
        $content = "BT /F1 12 Tf 50 790 Td 14 TL";
        foreach ($lines as $line) $content .= " (".$escape($line).") Tj T*";
        $content .= " ET";
        $objects = [];
        $objects[] = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n";
        $objects[] = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n";
        $objects[] = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n";
        $objects[] = "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n";
        $objects[] = "5 0 obj << /Length ".strlen($content)." >> stream\n".$content."\nendstream endobj\n";
        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) { $offsets[] = strlen($pdf); $pdf .= $object; }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects)+1)."\n0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        $pdf .= "trailer << /Size ".(count($objects)+1)." /Root 1 0 R >>\nstartxref\n".$xref."\n%%EOF";

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="business-invoice-'.$orderId.'.pdf"',
        ]);
    });

    Route::post('/orders/finalize-payment', function (\Illuminate\Http\Request $request) {
        $payload = $request->validate([
            'order_id' => 'required|integer|min:1',
            'payment_intent_id' => 'required|string|max:255',
            'payment_method' => 'nullable|string|max:50',
            'provider' => 'nullable|string|max:50',
        ]);

        $order = \Admin\Models\Orders_model::query()->where('order_id', (int)$payload['order_id'])->first();
        if (!$order) return response()->json(['success' => false, 'error' => 'Order not found'], 404);
        if (strtolower((string)($order->payment ?? '')) === 'qr_pay_later') {
            return response()->json(['success' => false, 'error' => 'Use pay-existing for qr_pay_later orders'], 422);
        }

        $paymentIntentId = trim((string)$payload['payment_intent_id']);
        $payment = \Admin\Models\Payments_model::isEnabled()->where('code', 'stripe')->first();
        if (!$payment) return response()->json(['success' => false, 'error' => 'Stripe not configured'], 404);

        $data = (array)$payment->data;
        $mode = $data['transaction_mode'] ?? 'test';
        $secretKey = $mode === 'live' ? ($data['live_secret_key'] ?? null) : ($data['test_secret_key'] ?? null);
        if (!$secretKey) return response()->json(['success' => false, 'error' => 'Stripe secret key not configured'], 503);

        try {
            \Stripe\Stripe::setApiKey($secretKey);
            $intent = \Stripe\PaymentIntent::retrieve($paymentIntentId);
        } catch (\Throwable $e) {
            \Log::warning('PMD finalize-payment stripe retrieve failed', ['order_id' => (int)$payload['order_id'], 'payment_intent_id' => $paymentIntentId, 'message' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Unable to verify payment intent'], 422);
        }

        if (($intent->status ?? '') !== 'succeeded') {
            \Log::warning('PMD finalize-payment not succeeded', [
                'order_id' => (int)$payload['order_id'],
                'provider' => strtolower((string)($payload['provider'] ?? 'stripe')),
                'payment_intent_id' => $paymentIntentId,
                'intent_status' => (string)($intent->status ?? 'unknown'),
            ]);
            return response()->json(['success' => false, 'error' => 'Payment is not completed yet'], 422);
        }

        $result = \Illuminate\Support\Facades\DB::transaction(function () use ($order, $payload, $paymentIntentId, $intent) {
            $lockedOrder = \Admin\Models\Orders_model::query()->where('order_id', (int)$order->order_id)->lockForUpdate()->firstOrFail();
            $orderTotal = round((float)($lockedOrder->order_total ?? 0), 4);
            $currentSettled = max(0, round((float)($lockedOrder->settled_amount ?? 0), 4));
            $currentStatus = strtolower((string)($lockedOrder->settlement_status ?? 'unpaid'));

            if ($currentStatus === 'paid' || ($orderTotal > 0 && $currentSettled >= $orderTotal - 0.0001)) {
                return ['already_paid' => true, 'order' => $lockedOrder];
            }

            $paidAmount = round(((float)($intent->amount_received ?? 0)) / 100, 4);
            if ($paidAmount <= 0) $paidAmount = $orderTotal;
            $newSettled = $orderTotal > 0 ? min($orderTotal, $paidAmount) : $paidAmount;
            $newStatus = ($orderTotal <= 0 || $newSettled >= $orderTotal - 0.0001) ? 'paid' : 'partial';

            $lockedOrder->settlement_status = $newStatus;
            $lockedOrder->settled_amount = $newSettled;
            $lockedOrder->settled_at = $newStatus === 'paid' ? now() : $lockedOrder->settled_at;
            $lockedOrder->processed = $newStatus === 'paid' ? 1 : (int)($lockedOrder->processed ?? 0);
            $lockedOrder->settlement_method = strtolower((string)($payload['payment_method'] ?? 'card'));
            $lockedOrder->settlement_reference = $paymentIntentId;
            $lockedOrder->stripe_payment_intent_id = $paymentIntentId;
            $lockedOrder->save();

            if (\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')) {
                $existsTx = \Illuminate\Support\Facades\DB::table('order_payment_transactions')
                    ->where('order_id', (int)$lockedOrder->order_id)
                    ->where('payment_reference', $paymentIntentId)
                    ->exists();
                if (!$existsTx) {
                    \Illuminate\Support\Facades\DB::table('order_payment_transactions')->insert([
                        'order_id' => (int)$lockedOrder->order_id,
                        'payment_method' => strtolower((string)($payload['payment_method'] ?? 'card')),
                        'payment_reference' => $paymentIntentId,
                        'amount' => $paidAmount,
                        'settlement_status' => $newStatus === 'paid' ? 'paid' : $newStatus,
                        'paid_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('payment_logs')) {
                $existingPaymentLog = \Illuminate\Support\Facades\DB::table('payment_logs')
                    ->where('order_id', (int)$lockedOrder->order_id)
                    ->where('payment_code', 'stripe')
                    ->where('request', 'like', '%'.$paymentIntentId.'%')
                    ->exists();

                if (!$existingPaymentLog) {
                    \Illuminate\Support\Facades\DB::table('payment_logs')->insert([
                        'order_id' => (int)$lockedOrder->order_id,
                        'payment_name' => 'Stripe Card',
                        'message' => 'Payment received: €'.number_format((float)$paidAmount, 2, '.', ''),
                        'request' => json_encode([
                            'payment_intent_id' => $paymentIntentId,
                            'provider' => strtolower((string)($payload['provider'] ?? 'stripe')),
                            'payment_method' => strtolower((string)($payload['payment_method'] ?? 'card')),
                        ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                        'response' => json_encode([
                            'amount' => (float)$paidAmount,
                            'settled_amount' => (float)$newSettled,
                            'settlement_status' => $newStatus,
                            'is_paid' => $newStatus === 'paid',
                        ], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                        'is_success' => 1,
                        'payment_code' => 'stripe',
                        'is_refundable' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            return [
                'already_paid' => false,
                'order' => $lockedOrder,
                'settled_amount' => $newSettled,
                'settlement_status' => $newStatus,
                'should_notify_payment_success' => $newStatus === 'paid',
            ];
        });

        if (!empty($result['should_notify_payment_success']) && \Illuminate\Support\Facades\Schema::hasTable('notifications')) {
            try {
                $orderId = (int)$order->order_id;
                $orderIdNeedle = '"order_id":'.$orderId;
                $existingPaymentNotification = \Illuminate\Support\Facades\DB::table('notifications')
                    ->where('type', 'order_payment_success')
                    ->where('status', 'new')
                    ->where('payload', 'like', '%'.$orderIdNeedle.'%')
                    ->exists();

                if (!$existingPaymentNotification) {
                    \Illuminate\Support\Facades\DB::table('notifications')->insert([
                        'type' => 'order_payment_success',
                        'title' => 'Payment received for order #'.$orderId,
                        'table_id' => !empty($result['order']->table_id) ? (string)$result['order']->table_id : null,
                        'table_name' => (string)($result['order']->order_type ?? ''),
                        'payload' => json_encode([
                            'order_id' => $orderId,
                            'payment_method' => strtolower((string)($payload['payment_method'] ?? 'card')),
                            'provider' => strtolower((string)($payload['provider'] ?? 'stripe')),
                            'payment_intent_id' => $paymentIntentId,
                            'settled_amount' => (float)($result['settled_amount'] ?? 0),
                        ], JSON_UNESCAPED_UNICODE),
                        'status' => 'new',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            } catch (\Throwable $e) {
                \Log::warning('PMD finalize-payment notification skipped', [
                    'order_id' => (int)$order->order_id,
                    'payment_intent_id' => $paymentIntentId,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'order_id' => (int)$order->order_id,
            'already_paid' => (bool)($result['already_paid'] ?? false),
            'settlement_status' => (string)(($result['settlement_status'] ?? ($result['order']->settlement_status ?? 'paid'))),
            'settled_amount' => (float)(($result['settled_amount'] ?? ($result['order']->settled_amount ?? 0))),
        ]);
    });
});
// === /QR PAY LATER ACTIVE API ROUTES ===
