<?php

declare(strict_types=1);

use Admin\Models\Payments_model;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$domain = strtolower(trim((string)($argv[1] ?? '')));
if ($domain === '') {
    fwrite(STDERR, "Usage: php scripts/disable-paymob-oman-sandbox-qa-r11.php omantest.paymydine.com\n");
    exit(2);
}
if (!str_contains($domain, '.')) $domain .= '.paymydine.com';

try {
    $tenant = DB::connection('mysql')->table('tenants')->whereRaw('LOWER(domain) = ?', [$domain])->first();
    if (!$tenant || empty($tenant->database)) throw new RuntimeException('Tenant was not found.');

    Config::set('database.connections.mysql.database', (string)$tenant->database);
    Config::set('database.default', 'mysql');
    DB::purge('mysql');
    DB::reconnect('mysql');
    DB::setDefaultConnection('mysql');

    $provider = Payments_model::query()->where('code', 'paymob')->first();
    if ($provider) {
        $provider->status = 0;
        $provider->is_default = 0;
        $provider->save();
    }

    foreach (['om_card','om_omannet','om_apple_pay','om_google_pay'] as $code) {
        $row = Payments_model::query()->where('code', $code)->first();
        if (!$row) continue;
        $connection = $row->getConnection();
        $table = $row->getTable();
        $columns = $connection->getSchemaBuilder()->getColumnListing($table);
        $update = [];
        if (in_array('status', $columns, true)) $update['status'] = 0;
        if (in_array('is_default', $columns, true)) $update['is_default'] = 0;
        if (in_array('updated_at', $columns, true)) $update['updated_at'] = now();
        if (in_array('date_updated', $columns, true)) $update['date_updated'] = now();
        if ($update) $connection->table($table)->where('code', $code)->update($update);
    }

    echo json_encode([
        'ok' => true,
        'tenant' => (string)$tenant->domain,
        'paymob_provider_enabled' => false,
        'paymob_online_methods_enabled' => false,
        'terminal_ready' => false,
        'note' => 'Paymob Oman online offering is fail-closed. Credentials were not deleted.',
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
    echo "PAYMOB OMAN SANDBOX QA: DISABLED / FAIL-CLOSED\n";
} catch (Throwable $error) {
    fwrite(STDERR, "PAYMOB OMAN SANDBOX QA DISABLE FAILED\n".$error->getMessage()."\n");
    exit(5);
}
