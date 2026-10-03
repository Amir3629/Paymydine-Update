<?php

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


// =============================
// PMD R2O REAL INVOICE ROUTE
// =============================


// =============================
// PMD R2O REAL INVOICE ROUTE
// =============================


// =============================
// PMD R2O REAL INVOICE ROUTE
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (TENANT TOKEN)
// =============================


// =============================
// PMD R2O REAL INVOICE ROUTE (LIVE DIAG)
// =============================


// =============================
// PMD R2O REAL INVOICE ROUTE (QUERY INVOICE_ID FIRST)
// =============================


// =============================
// PMD R2O REAL INVOICE ROUTE (SAFE FALLBACK TO PAYMYDINE)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (TENANT SETTINGS FINAL)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE FINAL
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (UNPREFIXED SETTINGS SCAN)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (QUERY FIRST / NO ORDER REQUIRED)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (ONE-SHOT FULL DIAG + FIX)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (REAL TABLE TOKEN LOOKUP)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (REAL TABLE TOKEN LOOKUP)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE FINAL CLEAN
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (READY2ORDER JWT ONLY)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (USE REAL TENANT DB)
// =============================



// =============================
// PMD R2O REAL INVOICE ROUTE (TENANT PREFIX FINAL)
// =============================
// =============================
// PMD R2O BON ROUTE (80MM / RECEIPT)
// =============================



// =============================
// R2O A4 INVOICE
// =============================
Route::get('admin/orders/pos-invoice/{id}', function ($id) {

    preg_match('/([0-9]+)/', request('invoice_id'), $m);
    $invoiceId = $m[1] ?? null;

    if (!$invoiceId) {
        return redirect(admin_url('orders/invoice/'.$id));
    }

    // tenant detection
    $host = request()->getHost();
    $tenant = \Illuminate\Support\Facades\DB::table('tenants')->where('domain',$host)->first();

    if (!$tenant) {
        return redirect(admin_url('orders/invoice/'.$id));
    }

    \Illuminate\Support\Facades\DB::setDefaultConnection('mysql');
    \Illuminate\Support\Facades\DB::purge();
    config(['database.connections.mysql.database' => $tenant->database]);

    // get token
    $row = \Illuminate\Support\Facades\DB::table('pos_configs')
        ->where('url','like','%ready2order%')
        ->first();

    if (!$row || empty($row->access_token)) {
        return redirect(admin_url('orders/invoice/'.$id));
    }

    $token = $row->access_token;

    $res = \Illuminate\Support\Facades\Http::withToken($token)
        ->get("https://api.ready2order.com/v1/document/invoice/{$invoiceId}/pdf");

    $json = $res->json();

    if (!isset($json['uri'])) {
        return redirect(admin_url('orders/invoice/'.$id));
    }

    return response()->stream(function () use ($json) {
        echo file_get_contents($json['uri']);
    }, 200, [
        'Content-Type' => 'application/pdf',
        'Content-Disposition' => 'inline; filename="invoice.pdf"',
    ]);

});


// =============================
// R2O BON (80mm RECEIPT)
// =============================
Route::get('admin/orders/pos-bon/{id}', function ($id) {

    preg_match('/([0-9]+)/', request('invoice_id'), $m);
    $invoiceId = $m[1] ?? null;

    if (!$invoiceId) {
        return redirect(admin_url('orders/invoice/'.$id));
    }

    $host = request()->getHost();
    $tenant = \Illuminate\Support\Facades\DB::table('tenants')->where('domain',$host)->first();

    if (!$tenant) {
        return redirect(admin_url('orders/invoice/'.$id));
    }

    \Illuminate\Support\Facades\DB::setDefaultConnection('mysql');
    \Illuminate\Support\Facades\DB::purge();
    config(['database.connections.mysql.database' => $tenant->database]);

    $row = \Illuminate\Support\Facades\DB::table('pos_configs')
        ->where('url','like','%ready2order%')
        ->first();

    if (!$row || empty($row->access_token)) {
        return redirect(admin_url('orders/invoice/'.$id));
    }

    $token = $row->access_token;

    // 👇 مهم: receipt endpoint
    $res = \Illuminate\Support\Facades\Http::withToken($token)
        ->get("https://api.ready2order.com/v1/document/invoice/{$invoiceId}/pdf", ['format' => '80mm']);

    $json = $res->json();

    if (!isset($json['uri'])) {
        return redirect(admin_url('orders/invoice/'.$id));
    }

    return response()->stream(function () use ($json) {
        echo file_get_contents($json['uri']);
    }, 200, [
        'Content-Type' => 'application/pdf',
        'Content-Disposition' => 'inline; filename="receipt.pdf"',
    ]);

});

// PMD_SPLIT_RECEIPT_TENANT_SAFE_R37C
Route::get('admin/orders/split-receipt/{transactionId}', function ($transactionId) {
    if (!\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')
        || !\Illuminate\Support\Facades\Schema::hasTable('order_payment_transaction_items')) {
        abort(404, 'Split receipt is not available');
    }

    $transactionId = (int)$transactionId;

    $transaction = \Illuminate\Support\Facades\DB::table(
        'order_payment_transactions'
    )
        ->where('id', $transactionId)
        ->first();

    if (!$transaction) {
        abort(404, 'Transaction not found');
    }

    $order = \Illuminate\Support\Facades\DB::table('orders')
        ->where('order_id', (int)$transaction->order_id)
        ->first();

    $tableName = null;

    if ($order && is_numeric($order->order_type ?? null)) {
        $tableRow = \Illuminate\Support\Facades\DB::table('tables')
            ->where('table_id', (int)$order->order_type)
            ->first();

        if ($tableRow) {
            $tableName = $tableRow->table_name
                ?: ('Table '.$tableRow->table_no);
        }
    }

    if (!$tableName) {
        $tableName = (string)($order->order_type ?? '');
    }

    $allocationMeta = pmdResolveSplitAllocationColumn();
    $allocationColumn = (string)$allocationMeta['column'];
    $allocationMode = (string)$allocationMeta['mode'];

    $allocationColumns =
        \Illuminate\Support\Facades\Schema::getColumnListing(
            'order_payment_transaction_items'
        );

    $transactionColumn = in_array(
        'transaction_id',
        $allocationColumns,
        true
    )
        ? 'transaction_id'
        : (
            in_array(
                'payment_transaction_id',
                $allocationColumns,
                true
            )
                ? 'payment_transaction_id'
                : null
        );

    if (!$transactionColumn) {
        abort(
            500,
            'Receipt allocation transaction column is unavailable'
        );
    }

    /*
     * Do not use SQL aliases here.
     * Tenant table prefixes can rewrite builder aliases and leave raw
     * identifiers pointing at a different name.
     */
    $allocationRows =
        \Illuminate\Support\Facades\DB::table(
            'order_payment_transaction_items'
        )
            ->where($transactionColumn, $transactionId)
            ->get();

    $items = $allocationRows
        ->map(function ($row) use (
            $allocationColumn,
            $allocationMode,
            $transaction
        ) {
            $data = (array)$row;

            $allocationKey = (int)(
                $data[$allocationColumn] ?? 0
            );

            $menu = null;

            if ($allocationKey > 0) {
                $menuQuery =
                    \Illuminate\Support\Facades\DB::table(
                        'order_menus'
                    )
                        ->where(
                            'order_id',
                            (int)$transaction->order_id
                        );

                if ($allocationMode === 'menu_id_legacy') {
                    $menuQuery->where(
                        'menu_id',
                        $allocationKey
                    );
                } else {
                    $menuQuery->where(
                        'order_menu_id',
                        $allocationKey
                    );
                }

                $menu = $menuQuery->first();
            }

            $quantity = (float)(
                $data['quantity_paid']
                ?? $data['quantity']
                ?? $data['qty']
                ?? 0
            );

            if ($quantity <= 0) {
                $quantity = 1.0;
            }

            $unitPrice = null;

            foreach (['unit_price', 'price'] as $field) {
                if (
                    array_key_exists($field, $data)
                    && is_numeric($data[$field])
                ) {
                    $unitPrice = (float)$data[$field];
                    break;
                }
            }

            if ($unitPrice === null && $menu) {
                $menuQuantity = (float)(
                    $menu->quantity ?? 0
                );

                $menuSubtotal = (float)(
                    $menu->subtotal ?? 0
                );

                $unitPrice = $menuQuantity > 0
                    ? round(
                        $menuSubtotal / $menuQuantity,
                        4
                    )
                    : (float)($menu->price ?? 0);
            }

            $unitPrice = (float)($unitPrice ?? 0);

            $lineTotal = null;

            foreach (['line_total', 'amount'] as $field) {
                if (
                    array_key_exists($field, $data)
                    && is_numeric($data[$field])
                ) {
                    $lineTotal = (float)$data[$field];
                    break;
                }
            }

            if ($lineTotal === null) {
                $lineTotal = round(
                    $unitPrice * $quantity,
                    4
                );
            }

            return (object)[
                'allocation_key' => $allocationKey,
                'quantity_paid' => $quantity,
                'unit_price' => $unitPrice,
                'line_total' => (float)$lineTotal,
                'name' => (string)(
                    $menu->name ?? 'Item'
                ),
                'order_menu_id' => (int)(
                    $menu->order_menu_id ?? (
                        $allocationMode === 'menu_id_legacy'
                            ? 0
                            : $allocationKey
                    )
                ),
                'menu_id' => (int)(
                    $menu->menu_id ?? (
                        $allocationMode === 'menu_id_legacy'
                            ? $allocationKey
                            : 0
                    )
                ),
            ];
        })
        ->values();

    return view('admin::orders.split_receipt', [
        'transaction' => $transaction,
        'order' => $order,
        'tableName' => $tableName,
        'items' => $items,
    ]);
});

// PMD_SPLIT_INVOICE_GERMANY_R71
// Customer-facing German split invoice over the canonical payment transaction.
Route::get('admin/orders/split-invoice/{transactionId}', function ($transactionId) {
    if (!\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')
        || !\Illuminate\Support\Facades\Schema::hasTable('order_payment_transaction_items')) {
        abort(404, 'Split invoice is not available');
    }

    $transactionId = (int)$transactionId;

    $transaction = \Illuminate\Support\Facades\DB::table(
        'order_payment_transactions'
    )
        ->where('id', $transactionId)
        ->first();

    if (!$transaction) {
        abort(404, 'Transaction not found');
    }

    $order = \Illuminate\Support\Facades\DB::table('orders')
        ->where('order_id', (int)$transaction->order_id)
        ->first();

    $tableName = null;

    if ($order && is_numeric($order->order_type ?? null)) {
        $tableRow = \Illuminate\Support\Facades\DB::table('tables')
            ->where('table_id', (int)$order->order_type)
            ->first();

        if ($tableRow) {
            $tableName = $tableRow->table_name
                ?: ('Table '.$tableRow->table_no);
        }
    }

    if (!$tableName) {
        $tableName = (string)($order->order_type ?? '');
    }

    $allocationMeta = pmdResolveSplitAllocationColumn();
    $allocationColumn = (string)$allocationMeta['column'];
    $allocationMode = (string)$allocationMeta['mode'];

    $allocationColumns =
        \Illuminate\Support\Facades\Schema::getColumnListing(
            'order_payment_transaction_items'
        );

    $transactionColumn = in_array(
        'transaction_id',
        $allocationColumns,
        true
    )
        ? 'transaction_id'
        : (
            in_array(
                'payment_transaction_id',
                $allocationColumns,
                true
            )
                ? 'payment_transaction_id'
                : null
        );

    if (!$transactionColumn) {
        abort(
            500,
            'Invoice allocation transaction column is unavailable'
        );
    }

    /*
     * Do not use SQL aliases here.
     * Tenant table prefixes can rewrite builder aliases and leave raw
     * identifiers pointing at a different name.
     */
    $allocationRows =
        \Illuminate\Support\Facades\DB::table(
            'order_payment_transaction_items'
        )
            ->where($transactionColumn, $transactionId)
            ->get();

    $items = $allocationRows
        ->map(function ($row) use (
            $allocationColumn,
            $allocationMode,
            $transaction
        ) {
            $data = (array)$row;

            $allocationKey = (int)(
                $data[$allocationColumn] ?? 0
            );

            $menu = null;

            if ($allocationKey > 0) {
                $menuQuery =
                    \Illuminate\Support\Facades\DB::table(
                        'order_menus'
                    )
                        ->where(
                            'order_id',
                            (int)$transaction->order_id
                        );

                if ($allocationMode === 'menu_id_legacy') {
                    $menuQuery->where(
                        'menu_id',
                        $allocationKey
                    );
                } else {
                    $menuQuery->where(
                        'order_menu_id',
                        $allocationKey
                    );
                }

                $menu = $menuQuery->first();
            }

            $quantity = (float)(
                $data['quantity_paid']
                ?? $data['quantity']
                ?? $data['qty']
                ?? 0
            );

            if ($quantity <= 0) {
                $quantity = 1.0;
            }

            $unitPrice = null;

            foreach (['unit_price', 'price'] as $field) {
                if (
                    array_key_exists($field, $data)
                    && is_numeric($data[$field])
                ) {
                    $unitPrice = (float)$data[$field];
                    break;
                }
            }

            if ($unitPrice === null && $menu) {
                $menuQuantity = (float)(
                    $menu->quantity ?? 0
                );

                $menuSubtotal = (float)(
                    $menu->subtotal ?? 0
                );

                $unitPrice = $menuQuantity > 0
                    ? round(
                        $menuSubtotal / $menuQuantity,
                        4
                    )
                    : (float)($menu->price ?? 0);
            }

            $unitPrice = (float)($unitPrice ?? 0);

            $lineTotal = null;

            foreach (['line_total', 'amount'] as $field) {
                if (
                    array_key_exists($field, $data)
                    && is_numeric($data[$field])
                ) {
                    $lineTotal = (float)$data[$field];
                    break;
                }
            }

            if ($lineTotal === null) {
                $lineTotal = round(
                    $unitPrice * $quantity,
                    4
                );
            }

            return (object)[
                'allocation_key' => $allocationKey,
                'quantity_paid' => $quantity,
                'unit_price' => $unitPrice,
                'line_total' => (float)$lineTotal,
                'name' => (string)(
                    $menu->name ?? 'Item'
                ),
                'order_menu_id' => (int)(
                    $menu->order_menu_id ?? (
                        $allocationMode === 'menu_id_legacy'
                            ? 0
                            : $allocationKey
                    )
                ),
                'menu_id' => (int)(
                    $menu->menu_id ?? (
                        $allocationMode === 'menu_id_legacy'
                            ? $allocationKey
                            : 0
                    )
                ),
            ];
        })
        ->values();

    return view('admin::orders.split_receipt', [
        'invoiceMode' => true,
        'transaction' => $transaction,
        'order' => $order,
        'tableName' => $tableName,
        'items' => $items,
    ]);
});


// PMD_CASHIER_INLINE_CANONICAL_INVOICE_R37C
// Thin Admin transport adapter only.
// Visual/data authority remains admin::orders.customer_invoice.
Route::middleware(['web'])->get(
    'admin/pmd-cashier-order-center/invoice/{orderId}',
    function ($orderId) {
        $user = AdminAuth::getUser();

        if (
            !$user
            || !$user->hasPermission('Admin.Orders')
        ) {
            abort(403, 'Order permission required.');
        }

        $orderId = (int)$orderId;

        if ($orderId < 1) {
            return response(
                'Invoice not found',
                404
            );
        }

        $order =
            \Admin\Models\Orders_model::query()
                ->where('order_id', $orderId)
                ->first();

        if (!$order) {
            return response(
                'Invoice not found',
                404
            );
        }

        $canonicalTotal = null;

        if (
            \Illuminate\Support\Facades\Schema::hasTable(
                'order_totals'
            )
        ) {
            $canonicalTotal =
                \Illuminate\Support\Facades\DB::table(
                    'order_totals'
                )
                    ->where('order_id', $orderId)
                    ->where('code', 'total')
                    ->value('value');
        }

        $orderTotal = round(
            (float)(
                $canonicalTotal
                ?? $order->order_total
                ?? 0
            ),
            4
        );

        $settledAmount = max(
            0,
            round(
                (float)(
                    $order->settled_amount ?? 0
                ),
                4
            )
        );

        $settlementStatus = strtolower(
            trim(
                (string)(
                    $order->settlement_status ?? ''
                )
            )
        );

        $isPaid =
            in_array(
                $settlementStatus,
                ['paid', 'settled'],
                true
            )
            || (
                $orderTotal > 0
                && $settledAmount >= $orderTotal - 0.0001
            );

        if (!$isPaid) {
            return response(
                'Invoice is available after full payment.',
                409
            );
        }

        try {
            if (
                method_exists($order, 'hasInvoice')
                && method_exists($order, 'generateInvoice')
                && !$order->hasInvoice()
            ) {
                $order->generateInvoice();
            }

            $order = $order->fresh() ?: $order;
        } catch (\Throwable $error) {
            \Log::warning(
                'PMD R37C invoice metadata generation skipped',
                [
                    'order_id' => $orderId,
                    'message' => $error->getMessage(),
                ]
            );
        }

        try {
            $html =
                \Illuminate\Support\Facades\View::make(
                    'admin::orders.customer_invoice',
                    [
                        'model' => $order,
                        'isFiscalInvoice' => false,
                    ]
                )->render();
        } catch (\Throwable $error) {
            \Log::error(
                'PMD R37C canonical invoice render failed',
                [
                    'order_id' => $orderId,
                    'message' => $error->getMessage(),
                ]
            );

            return response(
                'Unable to render customer invoice.',
                500
            );
        }

        return response(
            $html,
            200,
            [
                'Content-Type' =>
                    'text/html; charset=UTF-8',
                'Content-Disposition' => 'inline',
                'Cache-Control' =>
                    'private, no-store, max-age=0',
                'X-Frame-Options' => 'SAMEORIGIN',
                'X-PMD-Invoice-Authority' =>
                    'admin::orders.customer_invoice',
            ]
        );
    }
);



