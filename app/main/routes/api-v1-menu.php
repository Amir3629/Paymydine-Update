<?php

require_once __DIR__.'/menu-highlight-response.php';

// Menu endpoints
Route::get('/menu', function () {
    return pmd_menu_highlights_response_20260607();
});
