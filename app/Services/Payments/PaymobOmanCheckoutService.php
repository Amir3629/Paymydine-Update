<?php

namespace App\Services\Payments;

use Admin\Models\Payments_model;
use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\LocationPlatformContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_PAYMOB_OMAN_CHECKOUT_R11
 *
 * Server-authoritative Paymob checkout creation. The browser chooses a method,
 * tip and optional coupon, but order balance, split reservation, item quantities,
 * currency and final provider amount are rebuilt from the tenant database.
 */
final class PaymobOmanCheckoutService
{
    public const VERSION = '11.0.0';

    public function __construct(
        private ?PaymobOmanConnectionService $connection = null,
        private ?PaymobOmanPaymentAttemptService $attempts = null,
        private ?LocationPlatformContext $market = null,
        private ?MoneyMinorUnitConverter $money = null
    ) {
        $this->connection = $connection ?: new PaymobOmanConnectionService();
        $this->attempts = $attempts ?: new PaymobOmanPaymentAttemptService();
        $this->market = $market ?: new LocationPlatformContext();
        $this->money = $money ?: new MoneyMinorUnitConverter();
    }

    public function create(array $input): array
    {
        $locationId = isset($input['location_id']) ? (int)$input['location_id'] : null;
        if ($this->market->countryCode($locationId) !== CountryPlatformProfileRegistry::OMAN) {
            return ['ok' => false, 'http_status' => 409, 'message' => 'Paymob Oman checkout is only available for an Oman location.'];
        }

        $runtimeConfig = $this->connection->runtimeConfig();
        $gate = PaymobOmanRuntimeGate::state($runtimeConfig);
        if (!($gate['checkout_allowed'] ?? false)) {
            return [
                'ok' => false,
                'http_status' => 409,
                'message' => 'Paymob Oman guest checkout is locked until sandbox QA is explicitly enabled and verified.',
                'runtime_gate' => $gate,
            ];
        }

        $readiness = $this->connection->readiness();
        if (!($readiness['ready'] ?? false)) {
            return [
                'ok' => false,
                'http_status' => 422,
                'message' => (string)($readiness['structural']['message'] ?? 'Paymob Oman configuration is incomplete.'),
            ];
        }

        if (!$this->providerEnabled()) {
            return ['ok' => false, 'http_status' => 409, 'message' => 'Paymob is not enabled for this restaurant.'];
        }

        $methodVariant = strtolower(trim((string)($input['payment_method'] ?? '')));
        if (!in_array($methodVariant, ['om_card', 'om_omannet', 'om_apple_pay', 'om_google_pay'], true)) {
            return ['ok' => false, 'http_status' => 422, 'message' => 'Select an enabled Paymob Oman payment method.'];
        }
        if (!$this->methodEnabled($methodVariant)) {
            return ['ok' => false, 'http_status' => 409, 'message' => 'The selected Paymob Oman payment method is not enabled.'];
        }

        try {
            $allocations = $this->resolveAllocations($input, $methodVariant);
        } catch (\InvalidArgumentException $error) {
            return ['ok' => false, 'http_status' => 422, 'message' => $error->getMessage()];
        } catch (\Throwable $error) {
            return ['ok' => false, 'http_status' => 500, 'message' => 'PayMyDine could not prepare this payment securely.'];
        }

        if (!$allocations) {
            return ['ok' => false, 'http_status' => 422, 'message' => 'No payable order balance was found.'];
        }

        $primary = $allocations[0];
        $principal = round((float)array_sum(array_column($allocations, 'principal_amount')), 4);
        $tip = round((float)array_sum(array_column($allocations, 'tip_amount')), 4);
        $couponDiscount = round((float)array_sum(array_column($allocations, 'coupon_discount')), 4);
        $payable = round((float)array_sum(array_column($allocations, 'payable_amount')), 4);
        $amountMinor = $this->money->toMinor($payable, 'OMR');

        $clientRequestId = trim((string)($input['merchant_reference'] ?? $input['client_request_id'] ?? ''));
        if ($clientRequestId === '') {
            $clientRequestId = 'browser-'.(int)$primary['order_id'].'-'.bin2hex(random_bytes(8));
        }

        $attempt = $this->attempts->createOrReuse([
            'order_id' => (int)$primary['order_id'],
            'client_request_id' => $clientRequestId,
            'payment_intent_token' => $primary['payment_intent_token'] ?? null,
            'guest_session_id' => $input['guest_session_id'] ?? null,
            'method_variant' => $methodVariant,
            'principal_amount' => $principal,
            'tip_amount' => $tip,
            'coupon_discount' => $couponDiscount,
            'coupon_code' => count($allocations) === 1 ? ($primary['coupon_code'] ?? null) : null,
            'payable_amount' => $payable,
            'amount_minor' => $amountMinor,
            'currency' => 'OMR',
            'selected_items' => count($allocations) === 1 ? ($primary['selected_items'] ?? []) : [],
            'order_allocations' => $allocations,
            'expires_at' => now()->addMinutes(30),
        ]);

        if ((string)$attempt->method_variant !== $methodVariant || (int)$attempt->amount_minor !== $amountMinor) {
            return ['ok' => false, 'http_status' => 409, 'message' => 'This browser payment request was already used with a different amount or method. Refresh and try again.'];
        }

        // A retry after a successful Intention must reuse that exact provider
        // object; client_secret is encrypted at rest and only decrypted here.
        if (in_array((string)$attempt->status, ['intention_created', 'provider_paid', 'settled'], true)) {
            $secret = $this->attempts->clientSecret($attempt);
            $checkoutUrl = $secret !== '' ? (new PaymobApiClient($runtimeConfig))->checkoutUrl($secret) : '';
            if ($checkoutUrl !== '' || (string)$attempt->status === 'settled') {
                return [
                    'ok' => true,
                    'http_status' => 200,
                    'provider' => 'paymob',
                    'flow' => 'redirect',
                    'checkout_url' => $checkoutUrl !== '' ? $checkoutUrl : null,
                    'provider_reference' => (string)$attempt->special_reference,
                    'attempt' => $this->attempts->safeState($attempt),
                    'reused' => true,
                ];
            }
        }

        if ((string)$attempt->status === 'provider_call_started') {
            return [
                'ok' => false,
                'http_status' => 409,
                'message' => 'The previous Paymob request has an unknown network result. Do not create another charge; use payment status/reconciliation.',
                'provider_reference' => (string)$attempt->special_reference,
            ];
        }

        $notificationUrl = $this->httpsUrl((string)($input['notification_url'] ?? ''));
        $redirectionUrl = $this->httpsUrl((string)($input['return_url'] ?? ''));
        if ($notificationUrl === '' || $redirectionUrl === '') {
            return ['ok' => false, 'http_status' => 422, 'message' => 'Secure Paymob callback and return URLs are required.'];
        }

        $billing = [
            'first_name' => trim((string)($input['first_name'] ?? '')) ?: 'PayMyDine',
            'last_name' => trim((string)($input['last_name'] ?? '')) ?: 'Guest',
            'email' => $this->email((string)($input['customer_email'] ?? ''), (int)$primary['order_id']),
            'phone_number' => trim((string)($input['customer_phone'] ?? $input['phone_number'] ?? '')),
            'country' => 'OM',
            'city' => trim((string)($input['city'] ?? '')) ?: 'Muscat',
        ];
        if ($billing['phone_number'] === '') {
            return ['ok' => false, 'http_status' => 422, 'message' => 'A customer phone number is required for Paymob checkout.'];
        }

        $providerItems = array_map(function (array $allocation) {
            return [
                'name' => 'PayMyDine Order #'.(int)$allocation['order_id'],
                'amount_minor' => $this->money->toMinor((float)$allocation['payable_amount'], 'OMR'),
                'description' => 'Restaurant order payment',
                'quantity' => 1,
            ];
        }, $allocations);

        $this->attempts->markProviderCallStarted((int)$attempt->id);
        $runtime = new PaymobOmanRuntimeService($runtimeConfig);
        $result = $runtime->createCheckout(
            (int)$primary['order_id'],
            $payable,
            [$methodVariant],
            $billing,
            (string)$attempt->special_reference,
            $notificationUrl,
            $redirectionUrl,
            $providerItems
        );

        if (!($result['ok'] ?? false)) {
            // No HTTP status means the transport result is ambiguous: Paymob may
            // have received the persisted reference even if PMD lost the reply.
            $ambiguous = !isset($result['http_status']);
            $this->attempts->markProviderFailure((int)$attempt->id, $result, $ambiguous);
            return [
                'ok' => false,
                'http_status' => $ambiguous ? 409 : ((int)($result['http_status'] ?? 422) ?: 422),
                'message' => $ambiguous
                    ? 'Paymob connection result is uncertain. Do not retry the charge; use payment status/reconciliation.'
                    : (string)($result['message'] ?? 'Paymob checkout could not be created.'),
                'provider_reference' => (string)$attempt->special_reference,
            ];
        }

        $attempt = $this->attempts->markIntentionCreated((int)$attempt->id, $result);
        $checkoutUrl = trim((string)($result['checkout_url'] ?? ''));
        if ($checkoutUrl === '') {
            $this->attempts->markReconciliation((int)$attempt->id, 'reconciliation_required', 'Paymob Intention was created but checkout URL is missing.');
            return ['ok' => false, 'http_status' => 502, 'message' => 'Paymob created the payment but did not return a checkout URL. Do not pay again.'];
        }

        return [
            'ok' => true,
            'http_status' => 201,
            'success' => true,
            'provider' => 'paymob',
            'provider_code' => 'paymob',
            'flow' => 'redirect',
            'checkout_url' => $checkoutUrl,
            'redirect_url' => $checkoutUrl,
            // This is PMD's durable attempt reference, not proof of payment.
            'provider_reference' => (string)$attempt->special_reference,
            'merchant_reference' => (string)$attempt->special_reference,
            'attempt' => $this->attempts->safeState($attempt),
            'settled_by_backend' => true,
        ];
    }

    private function resolveAllocations(array $input, string $methodVariant): array
    {
        $rawGroup = is_array($input['order_allocations'] ?? null) ? (array)$input['order_allocations'] : [];
        $rows = count($rawGroup) > 1 ? $rawGroup : [[
            'orderId' => $input['order_id'] ?? null,
            'amount' => $input['amount'] ?? null,
            'tipAmount' => $input['tip_amount'] ?? 0,
            'couponCode' => $input['coupon_code'] ?? null,
            'couponDiscount' => $input['coupon_discount'] ?? 0,
            'selectedItems' => $input['selected_items'] ?? null,
            'paymentIntentToken' => $input['payment_intent_token'] ?? null,
            'guestSessionId' => $input['guest_session_id'] ?? null,
        ]];

        if (count($rows) > 20) throw new \InvalidArgumentException('Too many orders were selected for one payment.');

        $allocations = [];
        $seen = [];
        foreach ($rows as $raw) {
            if (!is_array($raw)) throw new \InvalidArgumentException('Invalid payment allocation.');
            $orderId = (int)($raw['order_id'] ?? $raw['orderId'] ?? 0);
            if ($orderId < 1 || isset($seen[$orderId])) throw new \InvalidArgumentException('Invalid or duplicate order in payment.');
            $seen[$orderId] = true;

            $order = DB::table('orders')->where('order_id', $orderId)->first();
            if (!$order) throw new \InvalidArgumentException('One selected order was not found.');
            if (!$this->orderMatchesTable($order, $input)) throw new \InvalidArgumentException('One selected order does not belong to this table.');

            $status = strtolower(trim((string)($order->settlement_status ?? 'unpaid')));
            if (in_array($status, ['paid', 'cancelled', 'canceled', 'failed'], true)) {
                throw new \InvalidArgumentException('One selected order is no longer payable.');
            }

            $total = $this->canonicalOrderTotal($orderId, $order);
            $settled = round(max(0, (float)($order->settled_amount ?? 0)), 4);
            $remaining = round(max(0, $total - $settled), 4);
            if ($remaining <= 0.0001) throw new \InvalidArgumentException('One selected order is already paid.');

            $intentToken = trim((string)($raw['payment_intent_token'] ?? $raw['paymentIntentToken'] ?? ''));
            if ($intentToken !== '') {
                $allocation = $this->allocationFromSplitIntent($orderId, $intentToken, $methodVariant, $remaining);
            } else {
                $couponCode = trim((string)($raw['coupon_code'] ?? $raw['couponCode'] ?? ''));
                $coupon = $this->couponDiscount($couponCode, $remaining);
                $afterCoupon = round(max(0, $remaining - $coupon['discount']), 4);
                $tip = round(max(0, (float)($raw['tip_amount'] ?? $raw['tipAmount'] ?? 0)), 4);
                if ($tip > $afterCoupon + 0.0001) throw new \InvalidArgumentException('Tip cannot exceed the payable order balance.');
                $payable = round($afterCoupon + $tip, 4);
                if ($payable <= 0.0001) throw new \InvalidArgumentException('Payment amount must be greater than zero.');

                $allocation = [
                    'order_id' => $orderId,
                    'payment_intent_token' => null,
                    'principal_amount' => $remaining,
                    'tip_amount' => $tip,
                    'coupon_discount' => (float)$coupon['discount'],
                    'coupon_code' => $coupon['code'],
                    'payable_amount' => $payable,
                    'selected_items' => $this->remainingItems($orderId),
                ];
            }

            $allocation['guest_session_id'] = trim((string)($raw['guest_session_id'] ?? $raw['guestSessionId'] ?? $input['guest_session_id'] ?? '')) ?: null;
            $allocations[] = $allocation;
        }

        return $allocations;
    }

    private function allocationFromSplitIntent(int $orderId, string $token, string $methodVariant, float $remaining): array
    {
        if (!Schema::hasTable('pmd_guest_payment_intents')) {
            throw new \InvalidArgumentException('Split payment reservation is unavailable.');
        }
        $intent = DB::table('pmd_guest_payment_intents')->where('token', $token)->first();
        if (!$intent || (int)$intent->order_id !== $orderId) throw new \InvalidArgumentException('Split payment reservation was not found.');
        if ((string)$intent->status !== 'pending') throw new \InvalidArgumentException('Split payment reservation is no longer payable.');
        if ($intent->expires_at && now()->greaterThan(\Illuminate\Support\Carbon::parse($intent->expires_at))) {
            throw new \InvalidArgumentException('Split payment reservation expired.');
        }

        $reservedProvider = strtolower(trim((string)($intent->provider ?? '')));
        if ($reservedProvider !== '' && $reservedProvider !== 'paymob') throw new \InvalidArgumentException('Split payment reservation belongs to another provider.');
        $reservedMethod = strtolower(trim((string)($intent->payment_method ?? '')));
        if ($reservedMethod !== '' && $reservedMethod !== $methodVariant) throw new \InvalidArgumentException('Split payment reservation belongs to another payment method.');

        $principal = round(max(0, (float)$intent->principal_amount), 4);
        $tip = round(max(0, (float)$intent->tip_amount), 4);
        $payable = round(max(0, (float)$intent->payable_amount), 4);
        if ($principal <= 0 || $payable <= 0 || $principal > $remaining + 0.002) {
            throw new \InvalidArgumentException('Split payment reservation no longer matches the order balance.');
        }

        $selected = json_decode((string)($intent->selected_items ?? ''), true);
        return [
            'order_id' => $orderId,
            'payment_intent_token' => $token,
            'principal_amount' => $principal,
            'tip_amount' => $tip,
            'coupon_discount' => 0.0,
            'coupon_code' => null,
            'payable_amount' => $payable,
            'selected_items' => is_array($selected) ? $selected : [],
        ];
    }

    private function remainingItems(int $orderId): array
    {
        if (!Schema::hasTable('order_menus')) return [];
        $rows = DB::table('order_menus')->where('order_id', $orderId)->get(['order_menu_id', 'menu_id', 'quantity']);
        if ($rows->isEmpty()) return [];

        $paidByOrderMenu = [];
        $paidByMenu = [];
        $allocationColumn = null;
        if (Schema::hasTable('order_payment_transactions') && Schema::hasTable('order_payment_transaction_items')) {
            $columns = Schema::getColumnListing('order_payment_transaction_items');
            $allocationColumn = in_array('order_menu_id', $columns, true) ? 'order_menu_id' : (in_array('order_item_id', $columns, true) ? 'order_item_id' : (in_array('menu_id', $columns, true) ? 'menu_id' : null));
            if ($allocationColumn) {
                $txIds = DB::table('order_payment_transactions')->where('order_id', $orderId)
                    ->whereNotIn('settlement_status', ['failed', 'cancelled', 'canceled'])->pluck('id')->all();
                if ($txIds) {
                    $paidRows = DB::table('order_payment_transaction_items')->whereIn('transaction_id', $txIds)
                        ->selectRaw($allocationColumn.' as allocation_key, SUM(quantity_paid) as paid_qty')
                        ->groupBy($allocationColumn)->get();
                    foreach ($paidRows as $paid) {
                        if ($allocationColumn === 'menu_id') $paidByMenu[(int)$paid->allocation_key] = (float)$paid->paid_qty;
                        else $paidByOrderMenu[(int)$paid->allocation_key] = (float)$paid->paid_qty;
                    }
                }
            }
        }

        $selected = [];
        $consumedByMenu = [];
        foreach ($rows as $row) {
            $ordered = max(0, (float)$row->quantity);
            if ($allocationColumn === 'menu_id') {
                $menuId = (int)$row->menu_id;
                $used = (float)($consumedByMenu[$menuId] ?? 0);
                $paid = max(0, min($ordered, (float)($paidByMenu[$menuId] ?? 0) - $used));
                $consumedByMenu[$menuId] = $used + $paid;
            } else {
                $paid = min($ordered, (float)($paidByOrderMenu[(int)$row->order_menu_id] ?? 0));
            }
            $remaining = round(max(0, $ordered - $paid), 3);
            if ($remaining > 0) $selected[] = ['order_menu_id' => (int)$row->order_menu_id, 'quantity' => $remaining];
        }
        return $selected;
    }

    private function couponDiscount(string $code, float $subtotal): array
    {
        $code = strtoupper(trim($code));
        if ($code === '') return ['code' => null, 'discount' => 0.0];
        if (!Schema::hasTable('igniter_coupons')) throw new \InvalidArgumentException('Coupon validation is unavailable.');

        $coupon = DB::table('igniter_coupons')->where('code', $code)->where('status', 1)->first();
        if (!$coupon) throw new \InvalidArgumentException('Coupon is no longer valid.');
        if ((float)($coupon->min_total ?? 0) > 0 && $subtotal < (float)$coupon->min_total) {
            throw new \InvalidArgumentException('Order total no longer meets the coupon minimum.');
        }

        $discount = strtoupper((string)($coupon->type ?? '')) === 'F'
            ? min((float)$coupon->discount, $subtotal)
            : $subtotal * ((float)$coupon->discount / 100);
        return ['code' => (string)$coupon->code, 'discount' => round(min($subtotal, max(0, $discount)), 4)];
    }

    private function canonicalOrderTotal(int $orderId, object $order): float
    {
        $value = Schema::hasTable('order_totals')
            ? DB::table('order_totals')->where('order_id', $orderId)->where('code', 'total')->value('value')
            : null;
        return round(max(0, (float)($value ?? $order->order_total ?? 0)), 4);
    }

    private function orderMatchesTable(object $order, array $input): bool
    {
        $candidates = array_values(array_unique(array_filter([
            trim((string)($input['table_id'] ?? '')),
            trim((string)($input['table_no'] ?? '')),
            trim((string)($input['table'] ?? '')),
        ], static fn ($value) => $value !== '')));

        $qr = trim((string)($input['qr'] ?? ''));
        if ($qr !== '' && Schema::hasTable('tables')) {
            $table = DB::table('tables')->where('qr_code', $qr)->first();
            if ($table) {
                $candidates = array_values(array_unique(array_filter(array_merge($candidates, [
                    (string)($table->table_id ?? ''),
                    (string)($table->table_no ?? ''),
                    (string)($table->table_name ?? ''),
                ]))));
            }
        }

        if (!$candidates) return false;
        $orderType = trim((string)($order->order_type ?? ''));
        $comment = (string)($order->comment ?? '');
        foreach ($candidates as $candidate) {
            if ($orderType === $candidate) return true;
            if (str_contains($comment, 'Table ID: '.$candidate) || str_contains($comment, 'Table: '.$candidate)) return true;
        }
        return false;
    }

    private function providerEnabled(): bool
    {
        $row = $this->connection->providerRecord();
        return $row !== null && (bool)$row->status;
    }

    private function methodEnabled(string $method): bool
    {
        $row = Payments_model::query()->where('code', $method)->first();
        if (!$row || !(bool)$row->status) return false;
        $provider = strtolower(trim((string)($row->provider_code ?? '')));
        if ($provider === '' && method_exists($row, 'getConfigData')) {
            $provider = strtolower(trim((string)($row->getConfigData()['provider_code'] ?? '')));
        }
        return $provider === 'paymob';
    }

    private function httpsUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) return '';
        return strtolower((string)parse_url($url, PHP_URL_SCHEME)) === 'https' ? $url : '';
    }

    private function email(string $email, int $orderId): string
    {
        $email = trim($email);
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : 'guest-'.$orderId.'@paymydine.com';
    }
}
