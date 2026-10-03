<?php

/*
|--------------------------------------------------------------------------
| PayMyDine Frontend V2 media authority R9
|--------------------------------------------------------------------------
| Backend-owned media route for restaurant/logo/menu images. This route
| stays under /api/v1, which is excluded from the public Next catch-all.
| It resolves legacy Media Manager files and old frontend public images
| without sending image requests back through the V2 root.
|--------------------------------------------------------------------------
*/

if (!defined('PMD_FRONTEND_V2_MEDIA_ROUTE_R9')) {
    define('PMD_FRONTEND_V2_MEDIA_ROUTE_R9', true);

    \Illuminate\Support\Facades\Route::match(['GET', 'HEAD'], '/api/v1/frontend-media-v2/{path}', function ($path) {
        $raw = rawurldecode(explode('?', (string)$path)[0]);
        $raw = str_replace('\\', '/', $raw);
        $raw = preg_replace('#^/+#', '', $raw);

        if ($raw === '' || strpos($raw, "\0") !== false) abort(404);

        $parts = array_values(array_filter(explode('/', $raw), 'strlen'));
        foreach ($parts as $part) {
            if ($part === '.' || $part === '..') abort(404);
        }

        $filename = basename($raw);
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowed = ['png','jpg','jpeg','webp','gif','svg','avif','ico'];
        if (!in_array($ext, $allowed, true)) abort(404);

        $variants = [$raw, $filename];
        foreach ([
            'api/media/',
            'assets/media/attachments/public/',
            'assets/media/',
            'uploads/',
            'storage/',
            'images/',
            'public/',
        ] as $prefix) {
            if (strpos($raw, $prefix) === 0) {
                $variants[] = substr($raw, strlen($prefix));
            }
        }
        foreach (['images/', 'uploads/', 'media/', 'assets/images/'] as $prefix) {
            $variants[] = $prefix.$filename;
        }
        $variants = array_values(array_unique(array_filter($variants)));

        $candidateRoots = [
            base_path('assets/media/attachments/public'),
            base_path('assets/media'),
            function_exists('public_path') ? public_path() : null,
            base_path('frontend/Paymydine-Update/public'),
            base_path('frontend/Paymydine-Update/public/images'),
            base_path('frontend/Paymydine-Update/public/uploads'),
            base_path('storage/app/public'),
        ];

        $roots = [];
        foreach ($candidateRoots as $root) {
            if (!$root || !is_dir($root)) continue;
            $real = realpath($root);
            if ($real) $roots[] = $real;
        }
        $roots = array_values(array_unique($roots));

        $inside = function ($candidate, $root) {
            $real = realpath($candidate);
            if (!$real || !is_file($real)) return null;
            $rootPrefix = rtrim($root, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
            if (strpos($real, $rootPrefix) !== 0 && $real !== rtrim($root, DIRECTORY_SEPARATOR)) return null;
            return $real;
        };

        $serve = function ($candidate) use ($ext) {
            $mimeMap = [
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'webp' => 'image/webp',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'avif' => 'image/avif',
                'ico' => 'image/x-icon',
            ];
            $mime = $mimeMap[$ext] ?? (mime_content_type($candidate) ?: 'application/octet-stream');
            return response()->file($candidate, [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline',
                'Cache-Control' => 'public, max-age=300, must-revalidate',
                'X-Content-Type-Options' => 'nosniff',
                'X-PMD-Media-Revision' => '20260815-r9',
            ]);
        };

        // Fast path: exact and common legacy-relative locations.
        foreach ($roots as $root) {
            foreach ($variants as $relative) {
                $candidate = $inside($root.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative), $root);
                if ($candidate) return $serve($candidate);
            }
        }

        // Slow path: basename lookup in the controlled media/public roots only.
        foreach ($roots as $root) {
            try {
                $iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS)
                );
                foreach ($iterator as $file) {
                    if (!$file->isFile() || $file->getFilename() !== $filename) continue;
                    $candidate = $inside($file->getPathname(), $root);
                    if ($candidate) return $serve($candidate);
                }
            } catch (\Throwable $e) {
            }
        }

        abort(404);
    })->where('path', '.*');
}
