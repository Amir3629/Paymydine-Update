<?php namespace Admin\Controllers;

use Admin\Classes\AdminController;

class Pos_configs extends AdminController
{
    public function syncReady2OrderTables()
    {
        exec("php /home/ubuntu/pmd_r2o_sync_tables.php");
        exec("php /home/ubuntu/pmd_r2o_auto_create_tables.php");

        echo json_encode([
            'success' => true,
            'message' => 'Tables synced successfully'
        ]);
        exit;
    }
}
