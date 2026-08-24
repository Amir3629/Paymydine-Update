<?php

require_once __DIR__.'/pmd-tenant-media-owner-r3.php';

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
        // PMD_MEDIA_OWNERSHIP_GATE_R3
        if (!pmd_media_owned_by_request_tenant_r3($path)) abort(404);
        /*
         * PMD_API_MEDIA_CLEAN_STREAM_V1
         *
         * Some bootstrap output is currently adding bytes before binary
         * image responses. JSON tolerates leading whitespace, PNG does not.
         *
         * Stream the file only after clearing pending output buffers, so
         * the first response bytes are the real image signature.
         */
        $streamFile = static function (
            string $filePath,
            string $mimeType
        ) {
            $fileSize = filesize($filePath);

            if ($fileSize === false) {
                abort(404);
            }

            return response()->stream(
                static function () use ($filePath) {
                    while (ob_get_level() > 0) {
                        if (!@ob_end_clean()) {
                            break;
                        }
                    }

                    $handle = fopen($filePath, 'rb');

                    if ($handle === false) {
                        return;
                    }

                    try {
                        fpassthru($handle);
                    } finally {
                        fclose($handle);
                    }
                },
                200,
                [
                    'Content-Type' => $mimeType,
                    'Content-Length' => (string)$fileSize,
                    'Cache-Control' => 'public, max-age=31536000',
                    'X-Content-Type-Options' => 'nosniff',
                ]
            );
        };
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

            return $streamFile(
                $mediaPath,
                $mimeType
            );
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
require_once __DIR__.'/api-v1-table-order-rounds.php';
            require_once __DIR__.'/api-v1-guest-actions.php';
        });
});
