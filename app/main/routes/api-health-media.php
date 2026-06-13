<?php

/*
|--------------------------------------------------------------------------
| PMD_MAIN_API_HEALTH_MEDIA_AND_V1_LOADER_FIX_20260606
|--------------------------------------------------------------------------
| Registers /api routes and loads focused /api/v1 modules inside the
| tenant-protected v1 group.
|--------------------------------------------------------------------------
*/

Route::group(['prefix' => 'api'], function () {
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now(),
            'version' => '1.0.0',
        ]);
    });

    Route::get('/media/{path}', function ($path) {
        $path = explode('?', (string)$path)[0];
        $mediaPath = base_path('assets/media/attachments/public/'.$path);

        if (!file_exists($mediaPath)) {
            $filename = basename($path);
            $searchPath = base_path('assets/media/attachments/public');
            $foundPath = null;

            if (is_dir($searchPath)) {
                $iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($searchPath, RecursiveDirectoryIterator::SKIP_DOTS)
                );

                foreach ($iterator as $file) {
                    if ($file->getFilename() === $filename) {
                        $foundPath = $file->getPathname();
                        break;
                    }
                }
            }

            if ($foundPath) {
                $mediaPath = $foundPath;
            }
        }

        if (file_exists($mediaPath)) {
            $mimeType = mime_content_type($mediaPath) ?: 'application/octet-stream';

            return response()->file($mediaPath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        }

        $fallbackPath = public_path('images/pasta.png');

        if (file_exists($fallbackPath)) {
            return response()->file($fallbackPath, [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        }

        abort(404);
    })->where('path', '.*');

    Route::prefix('v1')
        ->middleware(['web', \App\Http\Middleware\DetectTenant::class])
        ->group(function () {
            require_once __DIR__.'/api-v1-settings.php';
            require_once __DIR__.'/api-v1-menu.php';
            require_once __DIR__.'/api-v1-table-info.php';
            require_once __DIR__.'/api-v1-table-order-support.php';
            require_once __DIR__.'/api-v1-coupon.php';
            require_once __DIR__.'/api-v1-table-order.php';
            require_once __DIR__.'/api-v1-guest-actions.php';
        });
});
