<?php

require_once "bootstrap/app.php";

use App\Helpers\TableHelper;

echo "Testing TableHelper::getTableInfo(34)
";
$result = TableHelper::getTableInfo("34");
var_dump($result);

echo "
Testing direct DB query
";
$table = DB::table("tables")
    ->where("table_id", 34)
    ->where("table_status", 1)
    ->first();
var_dump($table);
