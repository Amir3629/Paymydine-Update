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

Route::get('admin/orders/split-receipt/{transactionId}', function ($transactionId) {
    if (!\Illuminate\Support\Facades\Schema::hasTable('order_payment_transactions')
        || !\Illuminate\Support\Facades\Schema::hasTable('order_payment_transaction_items')) {
        abort(404, 'Split receipt is not available');
    }

    $transaction = \Illuminate\Support\Facades\DB::table('order_payment_transactions')
        ->where('id', (int)$transactionId)
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
            $tableName = $tableRow->table_name ?: ('Table '.$tableRow->table_no);
        }
    }
    if (!$tableName) {
        $tableName = (string)($order->order_type ?? '');
    }

    $allocationMeta = pmdResolveSplitAllocationColumn();
    $allocationColumn = $allocationMeta['column'];
    $joinLeft = $allocationMeta['mode'] === 'menu_id_legacy' ? 'om.menu_id' : 'om.order_menu_id';
    $items = \Illuminate\Support\Facades\DB::table('order_payment_transaction_items as ti_ti')
        ->leftJoin('order_menus as om', $joinLeft, '=', 'ti_ti.'.$allocationColumn)
        ->where('ti_ti.transaction_id', (int)$transactionId)
        ->get([
            'ti_ti.'.$allocationColumn.' as allocation_key',
            'ti_ti.quantity_paid',
            'ti_ti.unit_price',
            'ti_ti.line_total',
            'om.name',
            'om.order_menu_id',
            'om.menu_id',
        ]);

    return view('admin::orders.split_receipt', [
        'transaction' => $transaction,
        'order' => $order,
        'tableName' => $tableName,
        'items' => $items,
    ]);
});


