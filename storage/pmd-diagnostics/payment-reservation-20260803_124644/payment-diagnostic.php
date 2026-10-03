<?php

declare(strict_types=1);

use Admin\Models\Payments_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = getenv('PMD_APP_ROOT');

$_SERVER['HTTP_HOST'] = 'mimoza.paymydine.com';
$_SERVER['SERVER_NAME'] = 'mimoza.paymydine.com';
$_SERVER['REQUEST_URI'] = '/api/v1/payments';

require $root.'/vendor/autoload.php';

$app = require $root.'/bootstrap/app.php';

$kernel = $app->make(
    Illuminate\Contracts\Console\Kernel::class
);

$kernel->bootstrap();

$model = new Payments_model();
$table = $model->getTable();

$columns = Schema::getColumnListing($table);

$wanted = array_values(array_intersect(
    [
        'id',
        'payment_id',
        'code',
        'name',
        'provider_code',
        'class_name',
        'status',
        'is_default',
        'priority',
        'sort_order',
        'meta',
        'data',
        'created_at',
        'updated_at',
    ],
    $columns
));

$rows = DB::table($table)
    ->whereIn('code', [
        'card',
        'apple_pay',
        'google_pay',
        'wero',
        'paypal',
        'cod',
        'cash',
        'stripe',
        'worldline',
        'paypalexpress',
    ])
    ->orderByRaw(
        in_array('sort_order', $columns, true)
            ? 'sort_order asc'
            : (
                in_array('priority', $columns, true)
                    ? 'priority asc'
                    : 'code asc'
            )
    )
    ->get($wanted)
    ->map(function ($row) {
        $result = (array)$row;

        foreach (['meta', 'data'] as $field) {
            if (!array_key_exists($field, $result)) {
                continue;
            }

            $decoded = is_string($result[$field])
                ? json_decode($result[$field], true)
                : $result[$field];

            if (!is_array($decoded)) {
                $result[$field] = gettype($result[$field]);
                continue;
            }

            $safe = [];

            foreach ($decoded as $key => $value) {
                if (preg_match(
                    '/secret|password|token|private|api.?key|client.?secret/i',
                    (string)$key
                )) {
                    $safe[$key] = $value ? '***redacted***' : $value;
                } else {
                    $safe[$key] = $value;
                }
            }

            $result[$field] = $safe;
        }

        return $result;
    })
    ->values();

$listPayments = Payments_model::listPayments()
    ->map(function ($method) {
        return [
            'code' => (string)$method->code,
            'name' => (string)$method->name,
            'provider_code' => $method->provider_code ?: null,
            'status' => (int)$method->status,
            'class_name_present' =>
                strlen((string)$method->class_name) > 0,
        ];
    })
    ->values();

echo json_encode(
    [
        'connection' => DB::getDefaultConnection(),
        'database' => DB::connection()->getDatabaseName(),
        'resolved_table' => $table,
        'columns' => $columns,
        'storage_rows' => $rows,
        'listPayments_output' => $listPayments,
    ],
    JSON_PRETTY_PRINT |
    JSON_UNESCAPED_SLASHES |
    JSON_UNESCAPED_UNICODE
).PHP_EOL;
