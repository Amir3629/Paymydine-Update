<?php

use Illuminate\Support\Facades\Route;
use Admin\Controllers\PmdFloorV1;

if (!defined('PMD_FLOOR_V1_ROUTES')) {
    define('PMD_FLOOR_V1_ROUTES', true);

    Route::get('floor', [PmdFloorV1::class, 'index']);
    Route::get('pmd-floor-v1/state', [PmdFloorV1::class, 'state']);
    Route::post('pmd-floor-v1/state', [PmdFloorV1::class, 'saveState']);
}
