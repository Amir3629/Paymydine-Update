<?php

namespace App\Http\Middleware;

use App\Services\Financial\BillingGroupInvoiceService;
use App\Services\Financial\BillingGroupService;
use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

final class PmdBillingGroupSync
{
    /** @var BillingGroupService */
    private $billingGroups;

    /** @var BillingGroupInvoiceService */
    private $invoices;

    public function __construct(BillingGroupService $billingGroups, BillingGroupInvoiceService $invoices)
    {
        $this->billingGroups = $billingGroups;
        $this->invoices = $invoices;
    }

    public function handle($request, Closure $next)
    {
        $path = trim((string)$request->path(), '/');
        $isTableOrder = strpos($path, 'api/v1/table-orders/') === 0;

        if (!$isTableOrder || !BillingGroupService::schemaReady()) {
            return $next($request);
        }

        // PMD_R36_ATOMIC_QR_SUBMIT
        // Wrap the existing route transaction in one outer transaction. Laravel's
        // nested DB transaction counter defers the real commit until Billing Group
        // attachment/normalization has succeeded too.
        if ($path === 'api/v1/table-orders/submit') {
            return DB::transaction(function () use ($request, $next, $path) {
                $response = $next($request);
                return $this->synchronizeResponse($request, $response, $path, false);
            });
        }

        $response = $next($request);
        return $this->synchronizeResponse($request, $response, $path, true);
    }

    private function synchronizeResponse($request, $response, string $path, bool $bestEffort)
    {
        try {
            $payload = method_exists($response, 'getData') ? $response->getData(true) : [];
            if (!is_array($payload)) {
                $payload = [];
            }

            $tableId = trim((string)(
                $payload['table_id']
                ?? $request->input('table_id', $request->query('table_id', ''))
            ));
            $sessionKey = trim((string)(
                $payload['sessionKey']
                ?? $payload['session_key']
                ?? $request->input('session_key', $request->query('session_key', ''))
            ));

            // Submit responses may expose draft_id instead of session_key. Resolve
            // the draft while the outer transaction still owns the new order.
            if (($tableId === '' || $sessionKey === '')
                && Schema::hasTable('pmd_table_order_drafts')) {
                $draftId = (int)($payload['draft_id'] ?? $request->input('draft_id', 0));
                if ($draftId > 0) {
                    $draft = DB::table('pmd_table_order_drafts')->where('id', $draftId)->first();
                    if ($draft) {
                        if ($tableId === '') {
                            $tableId = trim((string)($draft->table_id ?? $draft->table_no ?? ''));
                        }
                        if ($sessionKey === '') {
                            $sessionKey = trim((string)($draft->session_key ?? ''));
                        }
                    }
                }
            }

            if ($tableId === '' || $sessionKey === '') {
                return $response;
            }

            $summary = $this->billingGroups->synchronizeTableSession($tableId, $sessionKey);
            if ($summary && method_exists($response, 'setData')) {
                if (($summary['mode'] ?? '') === 'r36') {
                    $payload = $this->suppressChildInvoices($payload);
                }
                $payload['billingGroup'] = $this->invoices->decorateSummary($summary);
                $response->setData($payload);
            }
        } catch (\Throwable $e) {
            Log::warning('PMD R36 billing-group synchronization failed', [
                'path' => $path,
                'message' => $e->getMessage(),
            ]);
            if (!$bestEffort) {
                throw $e;
            }
        }

        return $response;
    }

    private function suppressChildInvoices(array $payload): array
    {
        foreach (['invoiceAvailable', 'invoice_available'] as $key) {
            if (array_key_exists($key, $payload)) $payload[$key] = false;
        }
        foreach (['invoiceDownloadToken', 'invoice_download_token'] as $key) {
            if (array_key_exists($key, $payload)) $payload[$key] = null;
        }

        if (isset($payload['orders']) && is_array($payload['orders'])) {
            foreach ($payload['orders'] as $index => $order) {
                if (!is_array($order)) continue;
                foreach (['invoiceAvailable', 'invoice_available'] as $key) {
                    if (array_key_exists($key, $order)) $order[$key] = false;
                }
                foreach (['invoiceDownloadToken', 'invoice_download_token'] as $key) {
                    if (array_key_exists($key, $order)) $order[$key] = null;
                }
                $payload['orders'][$index] = $order;
            }
        }

        return $payload;
    }
}
