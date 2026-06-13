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


Route::get('orders/debug-order/{id}', function ($id) {
    try {
        $id = (int)$id;

        $out = [];
        $out['request_url'] = request()->fullUrl();
        $out['database_default'] = config('database.default');
        $out['db_connections'] = array_keys(config('database.connections', []));

        $model = null;
        $tries = [];

        foreach ([null, 'tenant', 'mysql'] as $conn) {
            try {
                $q = $conn
                    ? \Admin\Models\Orders_model::on($conn)
                    : \Admin\Models\Orders_model::query();

                $row = $q->where('order_id', $id)->first();

                $tries[] = [
                    'connection' => $conn ?: 'default',
                    'found' => $row ? true : false,
                ];

                if ($row && !$model) {
                    $model = $row;
                }
            } catch (\Throwable $e) {
                $tries[] = [
                    'connection' => $conn ?: 'default',
                    'found' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $out['model_tries'] = $tries;

        if (!$model) {
            return response()->json([
                'ok' => false,
                'message' => 'Order not found by model in this web request',
                'debug' => $out,
            ], 404);
        }

        $connName = $model->getConnectionName() ?: config('database.default');
        $out['resolved_connection'] = $connName;
        $out['order'] = [
            'order_id' => $model->order_id ?? null,
            'location_id' => $model->location_id ?? null,
            'invoice_number' => $model->invoice_number ?? null,
            'order_total' => $model->order_total ?? null,
            'total_items' => $model->total_items ?? null,
            'fiskaly_status' => $model->fiskaly_status ?? null,
            'fiskaly_tx_number' => $model->fiskaly_tx_number ?? null,
        ];

        try {
            $out['menus_raw'] = \Illuminate\Support\Facades\DB::connection($connName)
                ->table('order_menus')
                ->where('order_id', $id)
                ->orderBy('order_menu_id')
                ->get()
                ->map(function ($r) { return (array)$r; })
                ->values()
                ->all();
        } catch (\Throwable $e) {
            $out['menus_raw_error'] = $e->getMessage();
        }

        try {
            $out['menu_options_raw'] = \Illuminate\Support\Facades\DB::connection($connName)
                ->table('order_menu_options')
                ->where('order_id', $id)
                ->orderBy('order_menu_option_id')
                ->get()
                ->map(function ($r) { return (array)$r; })
                ->values()
                ->all();
        } catch (\Throwable $e) {
            $out['menu_options_raw_error'] = $e->getMessage();
        }

        try {
            $out['totals_raw'] = \Illuminate\Support\Facades\DB::connection($connName)
                ->table('order_totals')
                ->where('order_id', $id)
                ->orderBy('priority')
                ->get()
                ->map(function ($r) { return (array)$r; })
                ->values()
                ->all();
        } catch (\Throwable $e) {
            $out['totals_raw_error'] = $e->getMessage();
        }

        try {
            $menusWithOptions = $model->getOrderMenusWithOptions();
            $out['menus_with_options'] = collect($menusWithOptions)->map(function ($m) {
                return [
                    'order_menu_id' => $m->order_menu_id ?? null,
                    'name' => $m->name ?? null,
                    'quantity' => $m->quantity ?? null,
                    'price' => $m->price ?? null,
                    'subtotal' => $m->subtotal ?? null,
                    'comment' => $m->comment ?? null,
                    'menu_options' => collect($m->menu_options ?? [])->map(function ($o) {
                        return [
                            'order_menu_option_id' => $o->order_menu_option_id ?? null,
                            'order_option_name' => $o->order_option_name ?? null,
                            'order_option_category' => $o->order_option_category ?? null,
                            'quantity' => $o->quantity ?? null,
                            'order_option_price' => $o->order_option_price ?? null,
                        ];
                    })->values()->all(),
                ];
            })->values()->all();
        } catch (\Throwable $e) {
            $out['menus_with_options_error'] = $e->getMessage();
        }

        return response()->json([
            'ok' => true,
            'debug' => $out,
        ], 200, [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    } catch (\Throwable $e) {
        return response()->json([
            'ok' => false,
            'fatal' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ], 500, [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
});




Route::get('orders/debug-order/{id}', function ($id) {
    try {
        $id = (int)$id;

        $out = [];
        $out['request_url'] = request()->fullUrl();
        $out['database_default'] = config('database.default');
        $out['db_connections'] = array_keys(config('database.connections', []));

        $model = null;
        $tries = [];

        foreach ([null, 'tenant', 'mysql'] as $conn) {
            try {
                $q = $conn
                    ? \Admin\Models\Orders_model::on($conn)
                    : \Admin\Models\Orders_model::query();

                $row = $q->where('order_id', $id)->first();

                $tries[] = [
                    'connection' => $conn ?: 'default',
                    'found' => $row ? true : false,
                ];

                if ($row && !$model) {
                    $model = $row;
                }
            } catch (\Throwable $e) {
                $tries[] = [
                    'connection' => $conn ?: 'default',
                    'found' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $out['model_tries'] = $tries;

        if (!$model) {
            return response()->json([
                'ok' => false,
                'message' => 'Order not found by model in this web request',
                'debug' => $out,
            ], 404);
        }

        $connName = $model->getConnectionName() ?: config('database.default');
        $out['resolved_connection'] = $connName;
        $out['order'] = [
            'order_id' => $model->order_id ?? null,
            'location_id' => $model->location_id ?? null,
            'invoice_number' => $model->invoice_number ?? null,
            'order_total' => $model->order_total ?? null,
            'total_items' => $model->total_items ?? null,
            'fiskaly_status' => $model->fiskaly_status ?? null,
            'fiskaly_tx_number' => $model->fiskaly_tx_number ?? null,
        ];

        try {
            $out['menus_raw'] = \Illuminate\Support\Facades\DB::connection($connName)
                ->table('order_menus')
                ->where('order_id', $id)
                ->orderBy('order_menu_id')
                ->get()
                ->map(function ($r) { return (array)$r; })
                ->values()
                ->all();
        } catch (\Throwable $e) {
            $out['menus_raw_error'] = $e->getMessage();
        }

        try {
            $out['menu_options_raw'] = \Illuminate\Support\Facades\DB::connection($connName)
                ->table('order_menu_options')
                ->where('order_id', $id)
                ->orderBy('order_menu_option_id')
                ->get()
                ->map(function ($r) { return (array)$r; })
                ->values()
                ->all();
        } catch (\Throwable $e) {
            $out['menu_options_raw_error'] = $e->getMessage();
        }

        try {
            $out['totals_raw'] = \Illuminate\Support\Facades\DB::connection($connName)
                ->table('order_totals')
                ->where('order_id', $id)
                ->orderBy('priority')
                ->get()
                ->map(function ($r) { return (array)$r; })
                ->values()
                ->all();
        } catch (\Throwable $e) {
            $out['totals_raw_error'] = $e->getMessage();
        }

        try {
            $menusWithOptions = $model->getOrderMenusWithOptions();
            $out['menus_with_options'] = collect($menusWithOptions)->map(function ($m) {
                return [
                    'order_menu_id' => $m->order_menu_id ?? null,
                    'name' => $m->name ?? null,
                    'quantity' => $m->quantity ?? null,
                    'price' => $m->price ?? null,
                    'subtotal' => $m->subtotal ?? null,
                    'comment' => $m->comment ?? null,
                    'menu_options' => collect($m->menu_options ?? [])->map(function ($o) {
                        return [
                            'order_menu_option_id' => $o->order_menu_option_id ?? null,
                            'order_option_name' => $o->order_option_name ?? null,
                            'order_option_category' => $o->order_option_category ?? null,
                            'quantity' => $o->quantity ?? null,
                            'order_option_price' => $o->order_option_price ?? null,
                        ];
                    })->values()->all(),
                ];
            })->values()->all();
        } catch (\Throwable $e) {
            $out['menus_with_options_error'] = $e->getMessage();
        }

        return response()->json([
            'ok' => true,
            'debug' => $out,
        ], 200, [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    } catch (\Throwable $e) {
        return response()->json([
            'ok' => false,
            'fatal' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ], 500, [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
});




Route::get('orders/web-debug/{id}', function ($id) {
    try {
        $id = (int)$id;

        $result = [
            'route_id' => $id,
            'database_default' => config('database.default'),
            'tenant_db' => config('database.connections.tenant.database'),
            'mysql_db' => config('database.connections.mysql.database'),
            'found_in' => null,
            'model_connection' => null,
            'order' => null,
            'menus_with_options' => [],
            'order_totals' => [],
        ];

        $model = null;

        try {
            $model = \Admin\Models\Orders_model::query()->where('order_id', $id)->first();
            if ($model) {
                $result['found_in'] = 'default-query';
            }
        } catch (\Throwable $e) {}

        if (!$model) {
            foreach (['tenant', 'mysql'] as $conn) {
                try {
                    $candidate = \Admin\Models\Orders_model::on($conn)->where('order_id', $id)->first();
                    if ($candidate) {
                        $model = $candidate;
                        $result['found_in'] = $conn;
                        break;
                    }
                } catch (\Throwable $e) {}
            }
        }

        if (!$model) {
            return response()->json([
                'ok' => false,
                'message' => 'Order not found in web context',
                'result' => $result,
            ], 404, [], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        }

        $result['model_connection'] = method_exists($model, 'getConnectionName')
            ? ($model->getConnectionName() ?: config('database.default'))
            : null;

        $result['order'] = [
            'order_id' => $model->order_id ?? null,
            'invoice_number' => $model->invoice_number ?? null,
            'order_type' => $model->order_type ?? null,
            'status' => $model->status ?? null,
            'location_id' => $model->location_id ?? null,
            'order_total' => $model->order_total ?? null,
            'total_items' => $model->total_items ?? null,
            'fiskaly_status' => $model->fiskaly_status ?? null,
            'fiskaly_qr_code_data' => $model->fiskaly_qr_code_data ?? null,
            'fiskaly_tx_number' => $model->fiskaly_tx_number ?? null,
            'fiskaly_signature_counter' => $model->fiskaly_signature_counter ?? null,
            'fiskaly_serial_number' => $model->fiskaly_serial_number ?? null,
        ];

        try {
            foreach (($model->getOrderMenusWithOptions() ?? []) as $menu) {
                $row = [
                    'id' => $menu->id ?? null,
                    'menu_id' => $menu->menu_id ?? null,
                    'name' => $menu->name ?? null,
                    'quantity' => $menu->quantity ?? null,
                    'price' => $menu->price ?? null,
                    'subtotal' => $menu->subtotal ?? null,
                    'comment' => $menu->comment ?? null,
                    'options' => [],
                ];

                try {
                    foreach (($menu->menu_options ?? []) as $opt) {
                        $row['options'][] = [
                            'order_option_category' => $opt->order_option_category ?? null,
                            'order_option_name' => $opt->order_option_name ?? null,
                            'quantity' => $opt->quantity ?? null,
                            'order_option_price' => $opt->order_option_price ?? null,
                        ];
                    }
                } catch (\Throwable $e) {
                    $row['options_error'] = $e->getMessage();
                }

                $result['menus_with_options'][] = $row;
            }
        } catch (\Throwable $e) {
            $result['menus_with_options_error'] = $e->getMessage();
        }

        try {
            foreach (($model->getOrderTotals() ?? []) as $tot) {
                $result['order_totals'][] = [
                    'code' => $tot->code ?? null,
                    'title' => $tot->title ?? null,
                    'value' => $tot->value ?? null,
                    'priority' => $tot->priority ?? null,
                ];
            }
        } catch (\Throwable $e) {
            $result['order_totals_error'] = $e->getMessage();
        }

        return response()->json([
            'ok' => true,
            'result' => $result,
        ], 200, [], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

    } catch (\Throwable $e) {
        return response()->json([
            'ok' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ], 500, [], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    }
});


