<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$raw = $_GET['ids'] ?? $_POST['ids'] ?? '';
if (is_array($raw)) {
    $ids = $raw;
} else {
    $ids = preg_split('/\s*,\s*/', (string)$raw, -1, PREG_SPLIT_NO_EMPTY);
}

$map = [];
foreach ($ids as $id) {
    $id = preg_replace('/[^0-9A-Za-z_-]/', '', (string)$id);
    if ($id !== '') {
        $map[$id] = '';
    }
}

echo json_encode([
    'ok' => true,
    'success' => true,
    'data' => $map,
    'tables' => $map,
    'names' => $map,
    'message' => 'PMD legacy table-name lookup placeholder'
]);
