<?php

header('Content-Type: application/json');

exec("php /home/ubuntu/pmd_r2o_sync_tables.php");
exec("php /home/ubuntu/pmd_r2o_auto_create_tables.php");

echo json_encode([
    'success' => true,
    'message' => 'Tables synced successfully'
]);
