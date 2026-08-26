<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use Admin\Controllers\StaffAuthController;
use Admin\Controllers\Biometricdevices;
use Admin\Controllers\BiometricDevicesAPI;
use Admin\Controllers\Api\CashDrawerController;
use Admin\Controllers\Api\PosAgentController;
use App\Admin\Controllers\NotificationsApiController;
use App\Admin\Classes\TerminalDevicesPlatformController;
use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;
require_once base_path('app/system/helpers/r2o_outbound_dryrun_helper.php');
use Illuminate\Support\Facades\DB;


/*
|--------------------------------------------------------------------------
| PMD_REVIEW_SOCIAL_SAFE_SAVE_ROUTE_20260606
|--------------------------------------------------------------------------
| Direct save route for the safe Review & Social Links settings page.
|--------------------------------------------------------------------------
*/
\Illuminate\Support\Facades\Route::post('pmd-review-social-safe-save', function (\Illuminate\Http\Request $request) {
    $keys = [
        'pmd_review_share_prompt_enabled',
        'pmd_home_social_icons_enabled',

        'pmd_social_instagram_enabled',
        'pmd_social_instagram_url',

        'pmd_social_google_enabled',
        'pmd_social_google_url',

        'pmd_social_trustpilot_enabled',
        'pmd_social_trustpilot_url',

        'pmd_social_reviews_enabled',
        'pmd_social_reviews_url',

        'pmd_social_website_enabled',
        'pmd_social_website_url',
    ];

    if (!\Illuminate\Support\Facades\Schema::hasTable('settings')) {
        return redirect(admin_url('settings/edit/review_social'))
            ->with('error', 'settings table not found');
    }

    $cols = \Illuminate\Support\Facades\Schema::getColumnListing('settings');
    $keyCol = in_array('item', $cols, true) ? 'item' : (in_array('key', $cols, true) ? 'key' : null);
    $valueCol = in_array('value', $cols, true) ? 'value' : (in_array('data', $cols, true) ? 'data' : null);

    if (!$keyCol || !$valueCol) {
        return redirect(admin_url('settings/edit/review_social'))
            ->with('error', 'settings table columns not recognized');
    }

    foreach ($keys as $key) {
        $value = (string)$request->input($key, '');

        $payload = [$valueCol => $value];

        if (in_array('serialized', $cols, true)) {
            $payload['serialized'] = 0;
        }

        if (in_array('updated_at', $cols, true)) {
            $payload['updated_at'] = now();
        }

        $insert = $payload;
        if (in_array('created_at', $cols, true)) {
            $insert['created_at'] = now();
        }

        \Illuminate\Support\Facades\DB::table('settings')->updateOrInsert(
            [$keyCol => $key],
            $insert
        );
    }

    return redirect(admin_url('settings/edit/review_social'))
        ->with('success', 'Review & Social Links settings saved.');
});


/*
|--------------------------------------------------------------------------
| PMD_PAID_INVOICE_PRESENTATION_R38
|--------------------------------------------------------------------------
| routes/review-social.php is loaded after routes/qr-pay.php by the tenant
| route orchestrator. Re-registering this exact GET URI therefore keeps all of
| the proven paid-invoice security checks while correcting two presentation
| defects in the rendered canonical Admin invoice:
|  - /api/media restaurant logos must not be sent back through uploads_url().
|  - table-service receipts do not need the synthetic "Table Customer" row.
|--------------------------------------------------------------------------
*/
\Illuminate\Support\Facades\Route::group([
    'prefix' => 'api/v1',
    'middleware' => [
        'web',
        \App\Http\Middleware\DetectTenant::class,
        \App\Http\Middleware\TenantDatabaseMiddleware::class,
    ],
], function () {
    \Illuminate\Support\Facades\Route::get('/orders/{order}/paid-invoice', function (\Illuminate\Http\Request $request, $orderId) {
        $orderId = (int)$orderId;
        if ($orderId < 1) return response('Invoice not found', 404);

        $token = trim((string)$request->query('token', ''));
        if ($token === '') return response('Invoice token is required', 403);

        if (!\Illuminate\Support\Facades\Schema::hasTable('pmd_table_order_drafts')) {
            return response('Invoice session not found', 404);
        }

        // PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE
        // Multiple submitted pointers can exist for one canonical order (for
        // example a private QR invoice pointer plus older compatibility rows).
        // The existing HMAC token itself identifies the correct session key.
        $submittedDrafts = \Illuminate\Support\Facades\DB::table('pmd_table_order_drafts')
            ->where('status', 'submitted')
            ->where('order_id', $orderId)
            ->orderByDesc('id')
            ->limit(80)
            ->get();
        if ($submittedDrafts->isEmpty()) return response('Invoice session not found', 404);

        $submittedDraft = null;
        $sessionKey = '';
        foreach ($submittedDrafts as $candidate) {
            $candidateKey = trim((string)($candidate->session_key ?? ''));
            if ($candidateKey === '') continue;
            $candidateToken = hash_hmac(
                'sha256',
                $request->getHost().'|'.$orderId.'|'.$candidateKey,
                (string)config('app.key')
            );
            if (hash_equals($candidateToken, $token)) {
                $submittedDraft = $candidate;
                $sessionKey = $candidateKey;
                break;
            }
        }
        if (!$submittedDraft || $sessionKey === '') return response('Invalid invoice token', 403);

        $order = \Admin\Models\Orders_model::query()->where('order_id', $orderId)->first();
        if (!$order) return response('Invoice not found', 404);

        $canonicalTotal = \Illuminate\Support\Facades\DB::table('order_totals')
            ->where('order_id', $orderId)
            ->where('code', 'total')
            ->value('value');
        $orderTotal = round((float)($canonicalTotal ?? $order->order_total ?? 0), 4);
        $settledAmount = max(0, round((float)($order->settled_amount ?? 0), 4));
        $settlementStatus = strtolower(trim((string)($order->settlement_status ?? '')));
        $isPaid = in_array($settlementStatus, ['paid', 'settled'], true)
            || ($orderTotal > 0 && $settledAmount >= $orderTotal - 0.0001);
        if (!$isPaid) return response('Invoice is available after full payment', 409);

        try {
            if (method_exists($order, 'hasInvoice') && !$order->hasInvoice()) $order->generateInvoice();
            $order = $order->fresh() ?: $order;
        } catch (\Throwable $e) {
            \Log::warning('PMD R38 invoice metadata generation skipped', [
                'order_id' => $orderId,
                'message' => $e->getMessage(),
            ]);
        }

        try {
            $html = \Illuminate\Support\Facades\View::make('admin::orders.customer_invoice', [
                'model' => $order,
            ])->render();
        } catch (\Throwable $e) {
            \Log::error('PMD R38 canonical customer invoice render failed', [
                'order_id' => $orderId,
                'message' => $e->getMessage(),
            ]);
            return response('Unable to render customer invoice', 500);
        }

        // The Restaurant Profile stores uploaded logos as /api/media/<filename>.
        // The legacy invoice Blade passes relative values through uploads_url(),
        // producing /assets/media/uploads/api/media/<filename>. Repair only that
        // known malformed prefix; absolute/legacy logo URLs remain untouched.
        $html = str_replace(
            '/assets/media/uploads/api/media/',
            '/api/media/',
            $html
        );

        // Only remove the synthetic table-service identity. Preserve the Customer
        // row for genuine named customers on non-table invoices.
        if (strtolower(trim((string)($order->customer_name ?? ''))) === 'table customer') {
            $cleaned = preg_replace(
                '#<div class="row">\s*<span>Customer</span>\s*<span>Table Customer</span>\s*</div>#is',
                '',
                $html,
                1
            );
            if (is_string($cleaned)) $html = $cleaned;
        }

        $printRequested = in_array(
            strtolower(trim((string)$request->query('print', '0'))),
            ['1', 'true', 'yes', 'on'],
            true
        );
        if ($printRequested) {
            $printScript = <<<'HTML'
<script id="pmd-r38-canonical-invoice-autoprint">
(function () {
  var fired = false;
  function printCanonicalInvoice() {
    if (fired) return;
    fired = true;
    window.setTimeout(function () {
      try { window.print(); } catch (e) {}
    }, 300);
  }
  if (document.readyState === 'complete') printCanonicalInvoice();
  else window.addEventListener('load', printCanonicalInvoice, { once: true });
})();
</script>
HTML;
            if (stripos($html, '</body>') !== false) {
                $html = preg_replace('/<\/body>/i', $printScript.'</body>', $html, 1);
            } else {
                $html .= $printScript;
            }
        }

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'Referrer-Policy' => 'no-referrer',
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'X-PMD-Invoice-Authority' => 'admin::orders.customer_invoice',
            'X-PMD-Invoice-Presentation' => 'r38',
        ]);
    })->withoutMiddleware([\Igniter\Cart\Middleware\Currency::class]);
});
