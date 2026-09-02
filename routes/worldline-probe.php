<?php

/**
 * Historical Worldline probe routes were retired in September 2026.
 *
 * This file remains because app/admin/routes.php requires it for backwards
 * compatibility with deployed route manifests.
 *
 * Removed legacy surfaces included:
 * - public/admin configuration diagnostics;
 * - standalone hosted-checkout creation using client-supplied amounts;
 * - unsigned webhook logging;
 * - a raw-card probe that accepted PAN/CVV in PayMyDine-owned inputs/server
 *   memory and could serialize sensitive card data into logs.
 *
 * Canonical Worldline integrations must use the shared PayMyDine payment
 * orchestration routes and Worldline-hosted secure UI. Never add raw PAN/CVV
 * handling back to this file.
 */

$worldlineLegacyInlineRetired = static function () {
    return response()->json([
        'success' => false,
        'provider' => 'worldline',
        'error_code' => 'worldline_legacy_inline_retired',
        'message' => 'Legacy Worldline inline payment APIs are retired. Use the canonical hosted checkout flow.',
        'canonical_endpoint' => '/api/v1/payments/card/create-session',
    ], 410);
};

// Safety belt for old callers. These aliases intentionally never accept
// payment data. If another historical route is still present elsewhere in a
// deployed route manifest, the later-loaded admin route file keeps these
// explicit tombstones available for the legacy probe namespace.
foreach ([
    '/payments/worldline/inline/session',
    '/payments/worldline/inline/client-session',
    '/payments/worldline/inline/create-payment',
    '/payments/worldline/inline/verify',
    '/payments/worldline/inline/payment-products',
    '/payments/worldline/raw-card-probe',
] as $retiredWorldlineRoute) {
    \Route::match(['get', 'post'], $retiredWorldlineRoute, $worldlineLegacyInlineRetired);
}
