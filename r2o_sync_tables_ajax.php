<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$syncFile = '/var/www/paymydine/storage/app/r2o_tools/pmd_r2o_sync_tables.php';
$autoFile = '/var/www/paymydine/storage/app/r2o_tools/pmd_r2o_auto_create_tables.php';

function runPhp(string $file): array {
    $out = [];
    $rc = 0;
    exec('php ' . escapeshellarg($file) . ' 2>&1', $out, $rc);
    $raw = trim(implode("\n", $out));
    $json = null;
    if ($raw !== '') {
        $tmp = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $json = $tmp;
        }
    }
    return [
        'rc' => $rc,
        'raw' => $raw,
        'json' => $json,
    ];
}

function addKnownTable(array &$bucket, array $row, string $source): void {
    $externalId = $row['external_table_id'] ?? null;
    $externalName = trim((string)($row['external_table_name'] ?? ''));
    $localTableId = $row['local_table_id'] ?? null;

    if (($externalId === null || $externalId === '') && $externalName === '') {
        return;
    }

    $key = (string)($externalId !== null && $externalId !== '' ? $externalId : 'name:' . mb_strtolower($externalName));

    if (!isset($bucket[$key])) {
        $bucket[$key] = [
            'external_table_id'   => $externalId !== null ? (string)$externalId : null,
            'external_table_name' => $externalName,
            'local_table_id'      => $localTableId !== null && $localTableId !== '' ? (int)$localTableId : null,
            'sources'             => [$source],
        ];
        return;
    }

    if ($bucket[$key]['external_table_name'] === '' && $externalName !== '') {
        $bucket[$key]['external_table_name'] = $externalName;
    }
    if (($bucket[$key]['local_table_id'] === null || $bucket[$key]['local_table_id'] === 0) && $localTableId !== null && $localTableId !== '') {
        $bucket[$key]['local_table_id'] = (int)$localTableId;
    }
    if (!in_array($source, $bucket[$key]['sources'], true)) {
        $bucket[$key]['sources'][] = $source;
    }
}

if (!is_file($syncFile) || !is_file($autoFile)) {
    echo json_encode([
        'success' => false,
        'message' => 'sync_tools_missing',
        'sync_file' => $syncFile,
        'auto_file' => $autoFile,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$sync = runPhp($syncFile);
$auto = runPhp($autoFile);

$syncJson = is_array($sync['json']) ? $sync['json'] : null;
$autoJson = is_array($auto['json']) ? $auto['json'] : null;

$allKnown = [];

/* 1) tables from sync API output */
foreach (($syncJson['tables'] ?? []) as $row) {
    if (!is_array($row)) continue;
    addKnownTable($allKnown, [
        'external_table_id'   => $row['external_table_id'] ?? null,
        'external_table_name' => $row['external_table_name'] ?? '',
        'local_table_id'      => null,
    ], (string)($row['source'] ?? 'sync'));
}

/* 2) matched mappings */
foreach (($autoJson['matched_tables'] ?? []) as $row) {
    if (!is_array($row)) continue;
    addKnownTable($allKnown, [
        'external_table_id'   => $row['external_table_id'] ?? null,
        'external_table_name' => $row['external_table_name'] ?? '',
        'local_table_id'      => $row['local_table_id'] ?? null,
    ], 'matched_mapping');
}

/* 3) created tables */
foreach (($autoJson['created_tables'] ?? []) as $row) {
    if (!is_array($row)) continue;
    addKnownTable($allKnown, [
        'external_table_id'   => $row['external_table_id'] ?? null,
        'external_table_name' => $row['external_table_name'] ?? '',
        'local_table_id'      => $row['local_table_id'] ?? null,
    ], 'created_table');
}

/* 4) unmapped tables */
foreach (($autoJson['unmapped_tables'] ?? []) as $row) {
    if (!is_array($row)) continue;
    addKnownTable($allKnown, [
        'external_table_id'   => $row['external_table_id'] ?? null,
        'external_table_name' => $row['external_table_name'] ?? '',
        'local_table_id'      => $row['local_table_id'] ?? null,
    ], 'unmapped');
}

$allKnownTables = array_values($allKnown);

usort($allKnownTables, function ($a, $b) {
    return strnatcasecmp((string)($a['external_table_name'] ?? ''), (string)($b['external_table_name'] ?? ''));
});

$payload = [
    'success' => ($sync['rc'] === 0 && $auto['rc'] === 0),
    'message' => ($sync['rc'] === 0 && $auto['rc'] === 0) ? 'sync_finished' : 'sync_finished_with_warnings',
    'sync' => $syncJson,
    'auto_create' => $autoJson,
    'all_known_tables' => $allKnownTables,
    'all_known_tables_count' => count($allKnownTables),
    'debug' => [
        'sync_rc' => $sync['rc'],
        'auto_rc' => $auto['rc'],
        'sync_raw' => $sync['raw'],
        'auto_raw' => $auto['raw'],
    ],
];

@file_put_contents(
    '/var/www/paymydine/storage/logs/system.log',
    '['.date('Y-m-d H:i:s').'] PMD_R2O_SYNC_AJAX '.json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).PHP_EOL,
    FILE_APPEND
);

echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
