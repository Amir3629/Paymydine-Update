<?php

namespace Admin\Services;

use Illuminate\Http\Request;

/**
 * PMD_CASHIER_QUICK_V22_RESPONSE_BRIDGE_R43
 *
 * V2.1 remains the canonical mobile host/floor launcher. This response bridge
 * adds the small V2.2 workflow layer with content-hashed assets, so we do not
 * fork CashierLab, Waiter POS, payment, or table-free business logic.
 */
class PmdCashierQuickV22Bridge
{
    public function decorate(Request $request, $response)
    {
        if (
            !$request->isMethod('GET')
            || trim($request->path(), '/') !== 'admin/cashierlab'
            || (string)$request->query('pmd_cashier_quick', '') !== '1'
            || !is_object($response)
            || !method_exists($response, 'getContent')
            || !method_exists($response, 'setContent')
        ) {
            return $response;
        }

        $html = (string)$response->getContent();
        if ($html === '' || str_contains($html, 'data-pmd-cashier-quick-v22-assets="r43"')) {
            return $response;
        }

        $cssRelative = 'app/admin/assets/css/pmd-cashier-quick-v22.css';
        $jsRelative = 'app/admin/assets/js/pmd-cashier-quick-v22.js';
        $cssPath = base_path($cssRelative);
        $jsPath = base_path($jsRelative);

        if (!is_file($cssPath) || !is_file($jsPath)) {
            logger()->warning('PMD Cashier Quick V2.2 bridge assets are missing.');
            return $response;
        }

        $cssVersion = substr(hash_file('sha256', $cssPath), 0, 16);
        $jsVersion = substr(hash_file('sha256', $jsPath), 0, 16);

        $head = '<link data-pmd-cashier-quick-v22-assets="r43" rel="stylesheet" href="/'
            .$cssRelative.'?v='.$cssVersion.'">';
        $body = '<script data-pmd-cashier-quick-v22-assets="r43" src="/'
            .$jsRelative.'?v='.$jsVersion.'"></script>';

        $headCount = 0;
        $html = str_replace('</head>', $head."\n</head>", $html, $headCount);
        if ($headCount !== 1) {
            logger()->warning('PMD Cashier Quick V2.2 CSS injection skipped.', ['count' => $headCount]);
            return $response;
        }

        $bodyCount = 0;
        $html = str_replace('</body>', $body."\n</body>", $html, $bodyCount);
        if ($bodyCount !== 1) {
            logger()->warning('PMD Cashier Quick V2.2 JS injection skipped.', ['count' => $bodyCount]);
            return $response;
        }

        $response->setContent($html);
        if (method_exists($response, 'headers')) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate');
        }

        return $response;
    }
}
