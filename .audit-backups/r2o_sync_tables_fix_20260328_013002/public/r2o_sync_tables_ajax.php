<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$out1 = [];
$out2 = [];
$rc1 = 0;
$rc2 = 0;

exec('php /home/ubuntu/pmd_r2o_sync_tables.php 2>&1', $out1, $rc1);
exec('php /home/ubuntu/pmd_r2o_auto_create_tables.php 2>&1', $out2, $rc2);

$payload = [
    'success' => ($rc1 === 0 && $rc2 === 0),
    'message' => ($rc1 === 0 && $rc2 === 0)
        ? 'ready2order tables synced successfully'
        : 'table sync finished with warnings',
    'rc_sync_tables' => $rc1,
    'rc_auto_create' => $rc2,
    'output_sync_tables' => $out1,
    'output_auto_create' => $out2,
];

@file_put_contents(
    '/var/www/paymydine/storage/logs/system.log',
    '['.date('Y-m-d H:i:s').'] PMD_R2O_SYNC_AJAX '.json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL,
    FILE_APPEND
);

echo json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
