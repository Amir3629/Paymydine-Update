<?php

// Menu endpoints
// PMD_MENU_HIGHLIGHTS_ROUTE_SOURCE_20260607
// Keep the production /api/v1/menu route on the same controller path as routes/api.php
// so recommendation/bestseller metadata and menu highlight settings cannot diverge.
Route::get('/menu', function (\Illuminate\Http\Request $request) {
    return app(\App\Http\Controllers\Api\MenuController::class)->index($request);
});
