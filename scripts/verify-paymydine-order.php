#!/usr/bin/env php
<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$root = dirname(__DIR__);
$options = getopt('', ['order:', 'tenant::', 'connection::', 'help']);
if (isset($options['help'])) {
    usage(0);
}

$orderNo = resolveOrderNo($options, $argv);
$tenantHost = trim((string)($options['tenant'] ?? 'mimoza.paymydine.com'));
$forcedConnection = isset($options['connection']) ? trim((string)$options['connection']) : null;

if ($orderNo <= 0) {
    out('FAIL', 'Missing or invalid order number. Pass --order=1567, a positional order id, or export/pass ORDER_NO inline.');
    usage(2);
}

require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(ConsoleKernel::class)->bootstrap();

$failures = 0;
$warnings = 0;

out('INFO', 'PayMyDine read-only order verification starting', [
    'order' => $orderNo,
    'tenant' => $tenantHost,
]);

[$connection, $tenant] = resolveTenantConnection($tenantHost, $forcedConnection, $orderNo);
if (!$connection) {
    out('FAIL', 'Could not resolve a database connection containing this order. Check --tenant/--connection and central tenants table.');
    exit(2);
}

Config::set('database.default', $connection);
DB::setDefaultConnection($connection);

$dbName = currentDatabase($connection);
$prefix = (string)Config::get("database.connections.{$connection}.prefix", '');
out('INFO', 'Active database context', [
    'connection' => $connection,
    'database' => $dbName,
    'prefix' => $prefix,
    'tenant_domain' => $tenant ? ($tenant->domain ?? null) : null,
    'tenant_database' => $tenant ? ($tenant->database ?? null) : null,
]);

$order = fetchOrder($connection, $orderNo);
if (!$order) {
    out('FAIL', 'Order was not found in the active tenant database', ['order_id' => $orderNo]);
    exit(2);
}
out('PASS', 'Order exists in active tenant database', summarizeRow($order, ['order_id', 'order_total', 'status_id', 'payment', 'created_at', 'updated_at']));

$menus = fetchRows($connection, 'order_menus', 'order_id', $orderNo, ['order_menu_id', 'menu_id', 'name', 'quantity', 'price', 'subtotal', 'comment', 'option_values']);
out('INFO', 'Order menu rows', ['count' => count($menus)]);
foreach ($menus as $menu) {
    out('ROW', 'order_menu', summarizeRow($menu, ['order_menu_id', 'name', 'quantity', 'price', 'subtotal', 'comment']));
}

$totals = fetchRows($connection, 'order_totals', 'order_id', $orderNo, ['order_total_id', 'code', 'title', 'value', 'priority', 'is_summable']);
$taxSettings = readTaxSettings($connection);
$totalsResult = verifyTotals($order, $totals, $taxSettings);
$failures += $totalsResult['failures'];
$warnings += $totalsResult['warnings'];

$commentResult = verifyGuestSessionCommentDisplay($menus, $root);
$failures += $commentResult['failures'];
$warnings += $commentResult['warnings'];

$paymentResult = verifyPaymentTables($connection, $orderNo, $totalsResult['item_total']);
$failures += $paymentResult['failures'];
$warnings += $paymentResult['warnings'];

if ($failures > 0) {
    out('FAIL', 'Verification finished with failures', ['failures' => $failures, 'warnings' => $warnings]);
    exit(2);
}

out($warnings > 0 ? 'WARN' : 'PASS', 'Verification finished', ['failures' => $failures, 'warnings' => $warnings]);
exit(0);

function usage(int $exitCode): void
{
    $script = basename(__FILE__);
    echo <<<TXT
Usage:
  php scripts/{$script} --order=1567 --tenant=mimoza.paymydine.com
  php scripts/{$script} 1567 --tenant=mimoza.paymydine.com
  ORDER_NO=1567 php scripts/{$script} --tenant=mimoza.paymydine.com
  export ORDER_NO=1567 && php scripts/{$script} --tenant=mimoza.paymydine.com

Notes:
  - "ORDER_NO=1567" on a line by itself is not exported to PHP; pass it inline or export it.
  - The script is read-only and skips optional payment tables that are not present.
  - Use --connection=tenant/mysql only when you intentionally want to override tenant resolution.

TXT;
    exit($exitCode);
}

function resolveOrderNo(array $options, array $argv): int
{
    if (isset($options['order'])) {
        return (int)$options['order'];
    }

    foreach (array_slice($argv, 1) as $arg) {
        if (preg_match('/^\d+$/', (string)$arg)) {
            return (int)$arg;
        }
    }

    $env = getenv('ORDER_NO');
    return $env === false ? 0 : (int)$env;
}

function resolveTenantConnection(string $tenantHost, ?string $forcedConnection, int $orderNo): array
{
    if ($forcedConnection) {
        if (!connectionExists($forcedConnection)) {
            out('FAIL', 'Forced connection is not configured', ['connection' => $forcedConnection]);
            return [null, null];
        }
        DB::purge($forcedConnection);
        DB::reconnect($forcedConnection);
        return [$forcedConnection, null];
    }

    $tenant = findTenant($tenantHost);
    if ($tenant && !empty($tenant->database)) {
        Config::set('database.connections.tenant.database', $tenant->database);
        Config::set('database.connections.tenant.host', $tenant->db_host ?? env('TENANT_DB_HOST', env('DB_HOST')));
        Config::set('database.connections.tenant.port', $tenant->db_port ?? env('TENANT_DB_PORT', env('DB_PORT')));
        Config::set('database.connections.tenant.username', $tenant->db_user ?? env('TENANT_DB_USERNAME', env('DB_USERNAME')));
        Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD', env('DB_PASSWORD')));
        DB::purge('tenant');
        DB::reconnect('tenant');
        app()->instance('tenant', $tenant);
        return ['tenant', $tenant];
    }

    out('WARN', 'Tenant row was not resolved from central tenants table; probing configured connections for the order', [
        'tenant' => $tenantHost,
    ]);

    foreach (array_unique(['tenant', Config::get('database.default'), 'mysql']) as $candidate) {
        if (!$candidate || !connectionExists((string)$candidate)) {
            continue;
        }

        try {
            if (tableExists((string)$candidate, 'orders') && fetchOrder((string)$candidate, $orderNo)) {
                return [(string)$candidate, null];
            }
        } catch (Throwable $e) {
            out('WARN', 'Connection probe failed', ['connection' => $candidate, 'error' => $e->getMessage()]);
        }
    }

    return [null, null];
}

function findTenant(string $tenantHost): ?object
{
    $subdomain = extractSubdomain($tenantHost);
    foreach (array_unique(['mysql', Config::get('database.default')]) as $connection) {
        if (!$connection || !connectionExists((string)$connection)) {
            continue;
        }

        try {
            if (!tableExists((string)$connection, 'tenants')) {
                continue;
            }

            $query = DB::connection((string)$connection)->table('tenants')
                ->where('domain', $tenantHost);

            if ($subdomain !== '') {
                $query->orWhere('domain', $subdomain)
                    ->orWhere('domain', 'like', $subdomain.'.%');
            }

            $tenant = $query->first();
            if ($tenant) {
                out('PASS', 'Tenant resolved from central tenants table', [
                    'connection' => $connection,
                    'domain' => $tenant->domain ?? null,
                    'database' => $tenant->database ?? null,
                ]);
                return $tenant;
            }
        } catch (Throwable $e) {
            out('WARN', 'Tenant lookup failed', ['connection' => $connection, 'error' => $e->getMessage()]);
        }
    }

    return null;
}

function extractSubdomain(string $host): string
{
    $host = strtolower(trim(preg_replace('/:\d+$/', '', $host) ?? ''));
    $parts = array_values(array_filter(explode('.', $host)));
    return count($parts) >= 3 ? $parts[0] : $host;
}


function readTaxSettings(string $connection): array
{
    $settings = [
        'tax_mode' => '0',
        'tax_percentage' => '0',
        'tax_menu_price' => '1',
        'enabled' => false,
    ];

    if (!tableExists($connection, 'settings')) {
        out('WARN', 'settings table not present; VAT mode check will be inferred only from order_totals rows');
        return $settings;
    }

    $columns = getColumns($connection, 'settings');
    if (!in_array('item', $columns, true) || !in_array('value', $columns, true)) {
        out('WARN', 'settings table does not expose expected item/value columns; VAT mode check will be inferred only from order_totals rows');
        return $settings;
    }

    $rows = DB::connection($connection)->table('settings')
        ->whereIn('item', ['tax_mode', 'tax_enabled', 'tax_percentage', 'tax_menu_price'])
        ->pluck('value', 'item')
        ->all();

    $settings['tax_mode'] = (string)($rows['tax_mode'] ?? $rows['tax_enabled'] ?? '0');
    $settings['tax_percentage'] = (string)($rows['tax_percentage'] ?? '0');
    $settings['tax_menu_price'] = (string)($rows['tax_menu_price'] ?? '1');
    $settings['enabled'] = $settings['tax_mode'] === '1';

    out('INFO', 'Tenant VAT settings', $settings);
    return $settings;
}

function verifyTotals(object $order, array $totals, array $taxSettings): array
{
    $failures = 0;
    $warnings = 0;
    $counts = [];
    $values = [];

    out('INFO', 'Order totals rows', ['count' => count($totals)]);
    foreach ($totals as $row) {
        $code = strtolower((string)($row->code ?? ''));
        $counts[$code] = ($counts[$code] ?? 0) + 1;
        $values[$code][] = (float)($row->value ?? 0);
        out('ROW', 'order_total', summarizeRow($row, ['order_total_id', 'code', 'title', 'value', 'priority', 'is_summable']));
    }

    foreach (['subtotal', 'tax', 'total'] as $requiredCode) {
        if (($counts[$requiredCode] ?? 0) === 1) {
            out('PASS', "Exactly one {$requiredCode} row exists");
        } else {
            out('FAIL', "Expected exactly one {$requiredCode} row", ['actual' => $counts[$requiredCode] ?? 0]);
            $failures++;
        }
    }

    $subtotal = $values['subtotal'][0] ?? null;
    $tax = $values['tax'][0] ?? null;
    $total = $values['total'][0] ?? null;
    $orderTotal = isset($order->order_total) ? (float)$order->order_total : null;

    if ($orderTotal !== null && $total !== null) {
        if (amountsClose($orderTotal, $total)) {
            out('PASS', 'orders.order_total equals order_totals total row', [
                'orders.order_total' => money($orderTotal),
                'order_totals.total' => money($total),
            ]);
        } else {
            out('FAIL', 'orders.order_total does not equal order_totals total row', [
                'orders.order_total' => money($orderTotal),
                'order_totals.total' => money($total),
            ]);
            $failures++;
        }
    }

    if ($subtotal !== null && $tax !== null && $total !== null) {
        $sum = round($subtotal + $tax, 2);
        $isAddAtCheckoutVat = ($taxSettings['enabled'] ?? false) && (string)($taxSettings['tax_menu_price'] ?? '1') === '1';
        if (amountsClose($sum, $total)) {
            out('PASS', 'Subtotal plus VAT equals total', [
                'subtotal' => money($subtotal),
                'tax' => money($tax),
                'sum' => money($sum),
                'total' => money($total),
                'tax_mode' => $taxSettings['tax_mode'] ?? null,
                'tax_menu_price' => $taxSettings['tax_menu_price'] ?? null,
            ]);
        } elseif ($isAddAtCheckoutVat) {
            out('FAIL', 'Subtotal plus VAT must equal total when VAT is add-at-checkout', [
                'subtotal' => money($subtotal),
                'tax' => money($tax),
                'sum' => money($sum),
                'total' => money($total),
                'tax_mode' => $taxSettings['tax_mode'] ?? null,
                'tax_menu_price' => $taxSettings['tax_menu_price'] ?? null,
            ]);
            $failures++;
        } else {
            out('WARN', 'Subtotal plus VAT does not equal total; this can be valid for tax-included pricing or other adjustments', [
                'subtotal' => money($subtotal),
                'tax' => money($tax),
                'sum' => money($sum),
                'total' => money($total),
                'tax_mode' => $taxSettings['tax_mode'] ?? null,
                'tax_menu_price' => $taxSettings['tax_menu_price'] ?? null,
            ]);
            $warnings++;
        }
    }

    return ['failures' => $failures, 'warnings' => $warnings, 'item_total' => $total ?? $orderTotal ?? 0.0];
}

function verifyGuestSessionCommentDisplay(array $menus, string $root): array
{
    $failures = 0;
    $warnings = 0;
    $hidden = 0;

    foreach ($menus as $menu) {
        $comment = (string)($menu->comment ?? '');
        if ($comment !== '' && cleanGuestSessionComment($comment) === '') {
            $hidden++;
        }
    }

    if ($hidden > 0) {
        out('PASS', 'Empty guest_session menu comments are detected as hidden by the sanitizer', ['raw_rows_hidden' => $hidden]);
    } else {
        out('INFO', 'No empty guest_session-only menu comments found on this order');
    }

    $views = [
        'app/admin/views/orders/form/order_menus.blade.php',
        'app/admin/views/orders/invoice.blade.php',
        'app/admin/views/orders/customer_invoice.blade.php',
    ];

    foreach ($views as $view) {
        $path = $root.'/'.$view;
        if (!is_file($path)) {
            out('WARN', 'View file not present, skipped guest_session render check', ['view' => $view]);
            $warnings++;
            continue;
        }

        $contents = file_get_contents($path) ?: '';
        $rendersMenuComment = str_contains($contents, '->comment') || str_contains($contents, '$row->comment') || str_contains($contents, '$menuItem->comment');
        if (str_contains($contents, 'pmdCleanGuestSessionComment')) {
            out('PASS', 'View uses guest_session comment sanitizer', ['view' => $view]);
        } elseif (!$rendersMenuComment) {
            out('PASS', 'View does not render menu comments, so empty guest_session comments cannot appear', ['view' => $view]);
        } else {
            out('FAIL', 'View renders menu comments without the guest_session comment sanitizer', ['view' => $view]);
            $failures++;
        }
    }

    return ['failures' => $failures, 'warnings' => $warnings];
}

function verifyPaymentTables(string $connection, int $orderNo, float $itemTotal): array
{
    $failures = 0;
    $warnings = 0;
    $optionalTables = [
        'order_payment_transactions',
        'order_payment_transaction_items',
        'payment_attempts',
        'payments',
        'order_payments',
        'payment_transactions',
        'transactions',
    ];

    foreach ($optionalTables as $table) {
        if (!tableExists($connection, $table)) {
            $message = $table === 'payment_attempts'
                ? 'payment_attempts table not present, skipped'
                : "{$table} table not present, skipped";
            out('INFO', $message);
            continue;
        }

        $columns = getColumns($connection, $table);
        if (!in_array('order_id', $columns, true)) {
            out('INFO', 'Optional payment table exists but has no order_id column, skipped direct order query', ['table' => $table]);
            continue;
        }

        $rows = fetchRows($connection, $table, 'order_id', $orderNo, array_slice($columns, 0, 12));
        out('INFO', 'Optional payment table rows', ['table' => $table, 'count' => count($rows)]);
        foreach ($rows as $row) {
            out('ROW', $table, summarizeRow($row, array_slice($columns, 0, 8)));
        }
    }

    if (tableExists($connection, 'order_payment_transactions') && tableExists($connection, 'order_payment_transaction_items')) {
        $txColumns = getColumns($connection, 'order_payment_transactions');
        $txIdColumn = in_array('order_payment_transaction_id', $txColumns, true) ? 'order_payment_transaction_id' : (in_array('id', $txColumns, true) ? 'id' : null);
        if ($txIdColumn) {
            $transactions = fetchRows($connection, 'order_payment_transactions', 'order_id', $orderNo, $txColumns);
            $itemColumns = getColumns($connection, 'order_payment_transaction_items');
            $fkColumn = in_array('order_payment_transaction_id', $itemColumns, true) ? 'order_payment_transaction_id' : (in_array('transaction_id', $itemColumns, true) ? 'transaction_id' : null);
            foreach ($transactions as $transaction) {
                $transactionId = $transaction->{$txIdColumn} ?? null;
                $providerAmount = firstNumeric($transaction, ['amount', 'payable_amount', 'paid_amount', 'provider_amount']);
                $itemSettlement = null;
                if ($transactionId !== null && $fkColumn) {
                    $itemRows = DB::connection($connection)->table('order_payment_transaction_items')
                        ->where($fkColumn, $transactionId)
                        ->get();
                    $itemSettlement = 0.0;
                    foreach ($itemRows as $itemRow) {
                        $itemSettlement += firstNumeric($itemRow, ['line_total', 'amount', 'subtotal', 'price']) ?? 0.0;
                    }
                }

                if ($providerAmount !== null) {
                    $context = [
                        'transaction_id' => $transactionId,
                        'provider_or_paid_amount' => money($providerAmount),
                        'order_item_total' => money($itemTotal),
                    ];
                    if ($itemSettlement !== null) {
                        $context['settled_item_amount'] = money($itemSettlement);
                        $context['payment_adjustment_delta'] = money($providerAmount - $itemSettlement);
                    }
                    out('PASS', 'Payment/provider amount is recorded separately from item settlement where transaction data exists', $context);
                }
            }
        }
    }

    return ['failures' => $failures, 'warnings' => $warnings];
}

function cleanGuestSessionComment(string $comment): string
{
    $comment = trim($comment);
    $comment = preg_replace('/\[guest_session:\s*\]/i', '', $comment) ?? $comment;
    return trim($comment);
}

function fetchOrder(string $connection, int $orderNo): ?object
{
    if (!tableExists($connection, 'orders')) {
        return null;
    }

    return DB::connection($connection)->table('orders')->where('order_id', $orderNo)->first();
}

function fetchRows(string $connection, string $table, string $whereColumn, int $whereValue, array $wantedColumns): array
{
    if (!tableExists($connection, $table)) {
        return [];
    }

    $columns = existingColumns($connection, $table, $wantedColumns);
    $query = DB::connection($connection)->table($table)->where($whereColumn, $whereValue);

    if (in_array('priority', getColumns($connection, $table), true)) {
        $query->orderBy('priority');
    }
    if (in_array('order_menu_id', getColumns($connection, $table), true)) {
        $query->orderBy('order_menu_id');
    }

    return $query->get($columns ?: ['*'])->all();
}

function existingColumns(string $connection, string $table, array $wantedColumns): array
{
    $columns = getColumns($connection, $table);
    return array_values(array_intersect($wantedColumns, $columns));
}

function getColumns(string $connection, string $table): array
{
    static $cache = [];
    $key = $connection.'.'.$table;
    if (!array_key_exists($key, $cache)) {
        try {
            $cache[$key] = Schema::connection($connection)->getColumnListing($table);
        } catch (Throwable $e) {
            $cache[$key] = [];
        }
    }
    return $cache[$key];
}

function tableExists(string $connection, string $table): bool
{
    try {
        return Schema::connection($connection)->hasTable($table);
    } catch (Throwable $e) {
        return false;
    }
}

function connectionExists(string $connection): bool
{
    return Config::has("database.connections.{$connection}");
}

function currentDatabase(string $connection): ?string
{
    try {
        $row = DB::connection($connection)->selectOne('select database() as database_name');
        return $row->database_name ?? null;
    } catch (Throwable $e) {
        return null;
    }
}

function summarizeRow(object $row, array $columns): array
{
    $summary = [];
    foreach ($columns as $column) {
        if (property_exists($row, $column)) {
            $value = $row->{$column};
            if (is_string($value) && strlen($value) > 180) {
                $value = substr($value, 0, 177).'...';
            }
            $summary[$column] = $value;
        }
    }
    return $summary;
}

function firstNumeric(object $row, array $columns): ?float
{
    foreach ($columns as $column) {
        if (property_exists($row, $column) && is_numeric($row->{$column})) {
            return (float)$row->{$column};
        }
    }
    return null;
}

function amountsClose(float $left, float $right, float $epsilon = 0.01): bool
{
    return abs(round($left, 2) - round($right, 2)) <= $epsilon;
}

function money(float $amount): string
{
    return number_format($amount, 2, '.', '');
}

function out(string $level, string $message, array $context = []): void
{
    $line = '['.$level.'] '.$message;
    if ($context !== []) {
        $line .= ' '.json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    echo $line.PHP_EOL;
}
