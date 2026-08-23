<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "PAYMYDINE PHP OK".PHP_EOL;
echo "Database: ".$app['db']->connection()->getDatabaseName().PHP_EOL;
