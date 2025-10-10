<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\TableController;
use App\Http\Controllers\Api\CategoryController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Apply CORS middleware to all API routes
Route::middleware(['cors'])->group(function () {

    // Health check endpoint
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now(),
            'version' => '1.0.0'
        ]);
    });

    // Image serving endpoint (matching old API structure)
    Route::get('/images', function (Request $request) {
        $filename = $request->get('file');
        if (empty($filename)) {
            abort(404);
        }
        
        // Extract hash directories from filename (e.g., 688a367fbc700218826107.jpg -> 688/a36/7fb)
        if (preg_match('/^(\w{3})(\w{3})(\w{3})/', $filename, $matches)) {
            $hash1 = $matches[1];
            $hash2 = $matches[2];
            $hash3 = $matches[3];
            $imagePath = storage_path("app/public/assets/media/attachments/public/{$hash1}/{$hash2}/{$hash3}/{$filename}");
        } else {
            // Fallback to direct path
            $imagePath = storage_path('app/public/assets/media/attachments/public/' . $filename);
        }
        
        if (file_exists($imagePath)) {
            $mimeType = mime_content_type($imagePath);
            return response()->file($imagePath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000'
            ]);
        } else {
            // Fallback to pasta.png
            $fallbackPath = public_path('images/pasta.png');
            if (file_exists($fallbackPath)) {
                return response()->file($fallbackPath, [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=31536000'
                ]);
            } else {
                abort(404);
            }
        }
    });

    // Media serving route for images
    Route::get('/media/{path}', function ($path) {
        // Remove any query parameters
        $path = explode('?', $path)[0];
        
        // First try the direct path (as stored in database)
        $mediaPath = base_path('assets/media/attachments/public/' . $path);
        
        if (!file_exists($mediaPath)) {
            // If not found, search recursively for the filename
            $filename = basename($path);
            $searchPath = base_path('assets/media/attachments/public');
            
            $foundPath = null;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($searchPath, RecursiveDirectoryIterator::SKIP_DOTS)
            );
            
            foreach ($iterator as $file) {
                if ($file->getFilename() === $filename) {
                    $foundPath = $file->getPathname();
                    break;
                }
            }
            
            if ($foundPath) {
                $mediaPath = $foundPath;
            }
        }
        
        if (file_exists($mediaPath)) {
            $mimeType = mime_content_type($mediaPath);
            return response()->file($mediaPath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000'
            ]);
        } else {
            // Fallback to pasta.png if image not found
            $fallbackPath = public_path('images/pasta.png');
            if (file_exists($fallbackPath)) {
                return response()->file($fallbackPath, [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=31536000'
                ]);
            } else {
                abort(404);
            }
        }
    })->where('path', '.*');

    // API v1 routes
    Route::prefix('v1')->group(function () {
        
        // Menu endpoints
        Route::get('/menu', [MenuController::class, 'index']);
        Route::get('/menu/categories', [CategoryController::class, 'index']);
        Route::get('/menu/items', [MenuController::class, 'items']);
        Route::get('/menu/categories/{categoryId}/items', [MenuController::class, 'itemsByCategory']);
        
        // Categories endpoints
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/categories/{categoryId}', [CategoryController::class, 'show']);
        
        // Order endpoints
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders/{orderId}', [OrderController::class, 'show']);
        Route::patch('/orders/{orderId}', [OrderController::class, 'update']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/order-status', [OrderController::class, 'getOrderStatus']);
        Route::post('/order-status', [OrderController::class, 'updateOrderStatus']);
        
        // Table endpoints
        Route::get('/tables/{qrCode}', [TableController::class, 'getByQrCode']);
        Route::get('/tables', [TableController::class, 'index']);
        Route::get('/table-info', [TableController::class, 'getTableInfo']);
        Route::get('/table-menu', [MenuController::class, 'getTableMenu']);
        
        // Restaurant info endpoint
        Route::get('/restaurant', function (Request $request) {
            $restaurant = \Illuminate\Support\Facades\DB::table('ti_locations')->first();
            
            return response()->json([
                'id' => 1,
                'name' => $restaurant->location_name ?? 'PayMyDine',
                'description' => $restaurant->description ?? '',
                'address' => $restaurant->location_address_1 ?? '',
                'phone' => $restaurant->location_telephone ?? '',
                'email' => $restaurant->location_email ?? '',
                'settings' => [
                    'currency' => $restaurant->location_currency ?? 'USD',
                    'timezone' => $restaurant->location_timezone ?? 'UTC',
                    'delivery_enabled' => (bool)($restaurant->offer_delivery ?? false),
                    'pickup_enabled' => (bool)($restaurant->offer_collection ?? false),
                ]
            ]);
        });
        
        // Settings endpoint
        Route::get('/settings', function () {
            $settings = \Illuminate\Support\Facades\DB::table('ti_settings')->get()->keyBy('item');
            
            return response()->json([
                'site_name' => $settings['site_name']->value ?? 'PayMyDine',
                'site_logo' => $settings['site_logo']->value ?? '',
                'default_currency' => $settings['default_currency']->value ?? 'USD',
                'default_language' => $settings['default_language']->value ?? 'en',
                'order_prefix' => $settings['invoice_prefix']->value ?? '#',
                'guest_order' => $settings['guest_order']->value ?? '1',
            ]);
        });
        
        // Waiter call endpoint
        Route::post('/waiter-call', function (Request $request) {
            $request->validate([
                'table_id' => 'required|string',
                'message' => 'required|string|max:500'
            ]);
            
            // For now, just return success since the table doesn't exist
            // In production, you would create this table or use an existing one
            return response()->json([
                'success' => true,
                'message' => 'Waiter called successfully',
                'call_id' => uniqid()
            ]);
        });
    });

    // Fallback route for unmatched API calls
    Route::fallback(function () {
        return response()->json([
            'error' => 'Endpoint not found',
            'message' => 'The requested API endpoint does not exist.'
        ], 404);
    });

}); // End of CORS middleware group 
