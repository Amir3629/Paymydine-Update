from pathlib import Path

main_routes = Path('app/main/routes.php')
main_before = Path('app/main/routes/main-app-before.php')
staff_routes = Path('routes/pmd-staff-portal-v1.php')

loader_block = "// PMD_STAFF_PORTAL_V1_PUBLIC_ROUTE_LOADER\nrequire_once base_path('routes/pmd-staff-portal-v1.php');\n\n"

text = main_routes.read_text()
if loader_block not in text:
    raise SystemExit('standalone Main loader block not found')
main_routes.write_text(text.replace(loader_block, '', 1))

text = main_before.read_text()
anchor = "        require_once __DIR__.'/main-public-compat.php';\n        require_once __DIR__.'/next-proxy.php';\n"
replacement = "        require_once __DIR__.'/main-public-compat.php';\n\n        // PMD_STAFF_PORTAL_V1_PUBLIC_ROUTE_LOADER\n        require_once base_path('routes/pmd-staff-portal-v1.php');\n\n        require_once __DIR__.'/next-proxy.php';\n"
if anchor not in text:
    raise SystemExit('main public route anchor not found')
main_before.write_text(text.replace(anchor, replacement, 1))

staff_routes.write_text("""<?php

use App\\Http\\Controllers\\PmdStaffPortalController;
use Illuminate\\Support\\Facades\\Route;

/** PMD_STAFF_PORTAL_V1
 * Loaded from app/main/routes/main-app-before.php inside the canonical web group,
 * immediately before the Next.js catch-all route module.
 */
Route::get('/staff/login', [PmdStaffPortalController::class, 'login'])->name('pmd.staff.login');
Route::post('/staff/login', [PmdStaffPortalController::class, 'authenticate'])
    ->middleware('throttle:8,15')
    ->name('pmd.staff.authenticate');
Route::get('/staff', [PmdStaffPortalController::class, 'index'])->name('pmd.staff.home');
Route::post('/staff/request', [PmdStaffPortalController::class, 'saveRequest'])->name('pmd.staff.request');
Route::post('/staff/logout', [PmdStaffPortalController::class, 'logout'])->name('pmd.staff.logout');
""")

print('Staff Portal routes moved into canonical Main web group before catch-all')
