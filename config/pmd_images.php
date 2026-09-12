<?php

return [
    /*
    |--------------------------------------------------------------------------
    | PayMyDine raster upload normalization
    |--------------------------------------------------------------------------
    |
    | New user-uploaded JPG/PNG images are normalized to WebP before they are
    | persisted by the existing upload authorities. SVG, GIF, PDF and other
    | non-raster uploads are intentionally left untouched.
    |
    */
    'enabled' => env('PMD_IMAGE_WEBP_ENABLED', true),

    // Guard GD from decoding unexpectedly huge raster images in one request.
    'max_pixels' => (int)env('PMD_IMAGE_WEBP_MAX_PIXELS', 24000000),

    'profiles' => [
        // Food and combo photography: strong reduction with visually high quality.
        'menu' => [
            'max_edge' => 2560,
            'quality' => 88,
        ],

        // Logos often contain text/edges, so keep a higher WebP quality.
        'logo' => [
            'max_edge' => 2048,
            'quality' => 92,
        ],

        // Staff profile images never need menu-photo dimensions.
        'avatar' => [
            'max_edge' => 1200,
            'quality' => 88,
        ],

        // Reusable Media Manager assets may contain either photos or graphics.
        'media' => [
            'max_edge' => 2560,
            'quality' => 90,
        ],
    ],
];
