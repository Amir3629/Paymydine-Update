<?php

        // API Routes - Register these before the catch-all route
        Route::group(['prefix' => 'api'], function () {
            // Health check endpoint
            Route::get('/health', function () {
                return response()->json([
                    'status' => 'ok',
                    'timestamp' => now(),
                    'version' => '1.0.0'
                ]);
            });

            // Direct media serving route for TastyIgniter attachments
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

            /*
             * RE-ENABLED: /api/v1 routes (NOW SECURED)
             *
             * This group is now safe to use because:
             * 1. DetectTenant middleware added (line below)
             * 2. All hardcoded ti_* replaced with {$p} dynamic prefix
             * 3. Returns 404 when no tenant detected
             *
             * Note: This may create duplicates with routes.php and routes/api.php
             * But now all three sources are tenant-protected, so it's safe
             * (First registered route wins - they all have same middleware now)
             *
             * Fixed: 2025-10-10 - See EMERGENCY_FIX_CODE_CHANGES.md
             */

            // API v1 routes
            // Note: Must use full class name in App::before() context (middleware aliases not yet registered)

Route::prefix('v1')->middleware(['web', \App\Http\Middleware\DetectTenant::class])->group(function () {

                require __DIR__.'/api-v1-settings.php';
                require __DIR__.'/api-v1-menu.php';
                require __DIR__.'/api-v1-table-info.php';
                require __DIR__.'/api-v1-table-order-support.php';
                require __DIR__.'/api-v1-coupon.php';
                require __DIR__.'/api-v1-table-order.php';
                require __DIR__.'/api-v1-guest-actions.php';
            });
        });
