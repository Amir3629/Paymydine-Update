<?php

namespace App\Services\Financial;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

final class BillingGroupFiscalService
{
    /** @var BillingGroupService */
    private $groups;

    /** @var BillingGroupFiscalPayloadBuilder */
    private $payloads;

    public function __construct(BillingGroupService $groups, BillingGroupFiscalPayloadBuilder $payloads)
    {
        $this->groups = $groups;
        $this->payloads = $payloads;
    }

    public static function schemaReady(): bool
    {
        try {
            return BillingGroupService::schemaReady()
                && Schema::hasTable('fiskaly_configs')
                && Schema::hasColumn('pmd_billing_groups', 'fiscal_revision')
                && Schema::hasColumn('pmd_billing_groups', 'fiscal_attempts')
                && Schema::hasColumn('pmd_billing_groups', 'fiscal_error')
                && Schema::hasColumn('pmd_billing_groups', 'fiscal_policy_snapshot')
                && Schema::hasColumn('pmd_billing_groups', 'fiscalized_at');
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Local-only close preflight. No network calls are performed here.
     * This is safe to call inside the R45 table-free transaction.
     */
    public function prepareClosedGroup(int $groupId): array
    {
        if (!self::schemaReady()) {
            return ['required' => false, 'status' => 'schema_unavailable'];
        }

        return DB::transaction(function () use ($groupId): array {
            $group = DB::table('pmd_billing_groups')->where('id', $groupId)->lockForUpdate()->first();
            if (!$group) throw new RuntimeException('Billing group not found.');
            if ((string)$group->mode !== 'r36') return ['required' => false, 'status' => 'legacy_passthrough'];
            if ((string)$group->status !== 'closed' || (string)$group->payment_status !== 'paid') {
                throw new RuntimeException('Fiscal preparation requires a closed and fully paid Final Bill.');
            }
            if ((string)$group->payment_status === 'reconciliation_required') {
                throw new RuntimeException('Payment reconciliation must be resolved before fiscalization.');
            }

            $locationId = $this->locationIdForGroup($groupId);
            $config = $this->configForLocation($locationId);
            if (!$config) {
                DB::table('pmd_billing_groups')->where('id', $groupId)->update([
                    'fiscal_status' => 'not_required',
                    'fiscal_error' => null,
                    'updated_at' => now(),
                ]);
                return ['required' => false, 'status' => 'not_required', 'locationId' => $locationId];
            }

            try {
                $policy = $this->policyForGroup($group);
            } catch (\Throwable $e) {
                DB::table('pmd_billing_groups')->where('id', $groupId)->update([
                    'fiscal_status' => 'blocked',
                    'fiscal_error' => $this->short($e->getMessage()),
                    'updated_at' => now(),
                ]);
                return [
                    'required' => true,
                    'status' => 'blocked',
                    'locationId' => $locationId,
                    'error' => $e->getMessage(),
                ];
            }

            DB::table('pmd_billing_groups')->where('id', $groupId)->update([
                'fiscal_status' => ((string)$group->fiscal_status === 'fiscalized') ? 'fiscalized' : 'pending',
                'fiscal_policy_snapshot' => json_encode($policy, JSON_UNESCAPED_SLASHES),
                'fiscal_error' => ((string)$group->fiscal_status === 'fiscalized') ? null : $group->fiscal_error,
                'updated_at' => now(),
            ]);

            return [
                'required' => true,
                'status' => ((string)$group->fiscal_status === 'fiscalized') ? 'fiscalized' : 'pending',
                'locationId' => $locationId,
                'environment' => (string)($config->environment ?? 'test'),
                'policy' => $policy,
            ];
        });
    }

    /**
     * Network fiscalization. Call only after the financial/table-free DB transaction commits.
     */
    public function finalizeClosedGroup(int $groupId): array
    {
        $prepared = $this->prepareClosedGroup($groupId);
        if (empty($prepared['required'])) return $prepared;
        if (($prepared['status'] ?? '') === 'blocked') return $prepared;

        $context = DB::transaction(function () use ($groupId): array {
            $group = DB::table('pmd_billing_groups')->where('id', $groupId)->lockForUpdate()->first();
            if (!$group) throw new RuntimeException('Billing group not found.');
            if ((string)$group->fiscal_status === 'fiscalized' && !empty($group->fiskaly_receipt)) {
                return ['already' => true, 'group' => $group];
            }
            if ((string)$group->status !== 'closed' || (string)$group->payment_status !== 'paid') {
                throw new RuntimeException('Fiscalization requires a closed, fully paid Final Bill.');
            }

            $locationId = $this->locationIdForGroup($groupId);
            $config = $this->configForLocation($locationId);
            if (!$config) {
                DB::table('pmd_billing_groups')->where('id', $groupId)->update([
                    'fiscal_status' => 'not_required',
                    'fiscal_error' => null,
                    'updated_at' => now(),
                ]);
                return ['not_required' => true, 'group' => $group];
            }

            $summary = $this->groups->summaryForPublicId((string)$group->public_id);
            if (!$summary) throw new RuntimeException('Final Bill could not be refreshed for fiscalization.');
            $group = DB::table('pmd_billing_groups')->where('id', $groupId)->lockForUpdate()->first();
            $policy = $this->policyForGroup($group);

            $childGross = 0;
            foreach ((array)($summary['orders'] ?? []) as $order) {
                $snapshot = is_array($order['snapshot'] ?? null) ? $order['snapshot'] : [];
                $childGross += max(0, (int)($snapshot['total_cents'] ?? 0));
            }
            $serviceGross = max(0, (int)($summary['serviceChargeCents'] ?? 0)
                + (int)($summary['serviceChargeTaxAddedCents'] ?? 0));
            $tipGross = max(0, (int)($summary['tipCents'] ?? 0));
            $discount = max(0, (int)($summary['discountCents'] ?? 0));

            $payments = [];
            foreach (DB::table('pmd_billing_group_payments')
                ->where('billing_group_id', $groupId)
                ->where('status', 'settled')
                ->orderBy('id')
                ->lockForUpdate()
                ->get() as $payment) {
                $payments[] = [
                    'method' => (string)$payment->method,
                    'amount_cents' => max(0, (int)$payment->payable_cents),
                ];
            }

            $schema = $this->payloads->buildReceipt(
                $childGross,
                (float)$policy['child_vat_rate'],
                $serviceGross,
                (float)$policy['service_charge_vat_rate'],
                $tipGross,
                (float)$policy['tip_vat_rate'],
                $discount,
                $payments,
                (string)$group->currency
            );

            $txId = trim((string)($group->fiskaly_transaction_id ?? ''));
            if ($txId === '') $txId = (string)Str::uuid();

            DB::table('pmd_billing_groups')->where('id', $groupId)->update([
                'fiskaly_transaction_id' => $txId,
                'fiscal_status' => ((int)($group->fiscal_revision ?? 0) >= 1) ? 'active' : 'pending',
                'fiscal_attempts' => (int)($group->fiscal_attempts ?? 0) + 1,
                'fiscal_policy_snapshot' => json_encode($policy, JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ]);

            return [
                'groupId' => $groupId,
                'publicId' => (string)$group->public_id,
                'invoiceNumber' => (string)($group->invoice_number ?? ''),
                'txId' => $txId,
                'revision' => (int)($group->fiscal_revision ?? 0),
                'locationId' => $locationId,
                'config' => $config,
                'schema' => $schema,
                'policy' => $policy,
                'currency' => (string)$group->currency,
            ];
        });

        if (!empty($context['already'])) {
            $receipt = json_decode((string)$context['group']->fiskaly_receipt, true);
            return ['required' => true, 'status' => 'fiscalized', 'duplicate' => true, 'receipt' => $receipt ?: []];
        }
        if (!empty($context['not_required'])) return ['required' => false, 'status' => 'not_required'];

        try {
            $config = $context['config'];
            $token = $this->accessToken((string)$config->api_key, (string)$config->api_secret);
            $base = $this->baseUrl();
            $txUrl = $base.'/tss/'.rawurlencode((string)$config->tss_id).'/tx/'.rawurlencode((string)$context['txId']);
            $remote = null;

            if ((int)$context['revision'] < 1) {
                $start = $this->put($txUrl.'?tx_revision=1', [
                    'state' => 'ACTIVE',
                    'client_id' => (string)$config->client_id,
                ], $token);

                if (!$start->successful()) {
                    $remote = $this->recover($txUrl, $token);
                    if (!$remote || !in_array(strtoupper((string)($remote['state'] ?? '')), ['ACTIVE', 'FINISHED'], true)) {
                        throw new RuntimeException('Fiskaly SIGN DE ACTIVE failed: HTTP '.$start->status().' '.$this->short($start->body()));
                    }
                } else {
                    $remote = $start->json() ?: [];
                }

                if (strtoupper((string)($remote['state'] ?? '')) === 'FINISHED') {
                    return $this->persistFinished($context, $remote);
                }

                DB::table('pmd_billing_groups')->where('id', (int)$context['groupId'])->update([
                    'fiscal_status' => 'active',
                    'fiscal_revision' => 1,
                    'fiskaly_receipt' => json_encode([
                        'state' => 'ACTIVE',
                        'response' => $remote,
                        'request_schema' => $context['schema'],
                    ], JSON_UNESCAPED_SLASHES),
                    'updated_at' => now(),
                ]);
            }

            $finishPayload = [
                'state' => 'FINISHED',
                'client_id' => (string)$config->client_id,
                'schema' => $context['schema'],
                'metadata' => array_filter([
                    'pmd_billing_group' => (string)$context['publicId'],
                    'pmd_invoice' => (string)$context['invoiceNumber'],
                ], static fn ($value) => trim((string)$value) !== ''),
            ];
            $finish = $this->put($txUrl.'?tx_revision=2', $finishPayload, $token);
            if (!$finish->successful()) {
                $remote = $this->recover($txUrl, $token);
                if (!$remote || strtoupper((string)($remote['state'] ?? '')) !== 'FINISHED') {
                    throw new RuntimeException('Fiskaly SIGN DE FINISHED failed: HTTP '.$finish->status().' '.$this->short($finish->body()));
                }
            } else {
                $remote = $finish->json() ?: [];
            }

            return $this->persistFinished($context, $remote);
        } catch (\Throwable $e) {
            DB::table('pmd_billing_groups')->where('id', $groupId)->update([
                'fiscal_status' => 'failed',
                'fiscal_error' => $this->short($e->getMessage()),
                'updated_at' => now(),
            ]);
            throw $e;
        }
    }

    public function finalizePublicId(string $publicId): array
    {
        $group = DB::table('pmd_billing_groups')->where('public_id', trim($publicId))->first();
        if (!$group) throw new RuntimeException('Billing group not found.');
        return $this->finalizeClosedGroup((int)$group->id);
    }

    private function persistFinished(array $context, array $remote): array
    {
        if (strtoupper((string)($remote['state'] ?? '')) !== 'FINISHED') {
            throw new RuntimeException('Fiskaly did not return a FINISHED transaction.');
        }

        $receipt = [
            'provider' => 'fiskaly_sign_de_v2',
            'transaction_id' => (string)$context['txId'],
            'environment' => (string)($context['config']->environment ?? 'test'),
            'request_schema' => $context['schema'],
            'policy' => $context['policy'],
            'response' => $remote,
        ];

        DB::table('pmd_billing_groups')->where('id', (int)$context['groupId'])->update([
            'fiscal_status' => 'fiscalized',
            'fiscal_revision' => 2,
            'fiscal_error' => null,
            'fiskaly_receipt' => json_encode($receipt, JSON_UNESCAPED_SLASHES),
            'fiscalized_at' => now(),
            'updated_at' => now(),
        ]);

        return ['required' => true, 'status' => 'fiscalized', 'duplicate' => false, 'receipt' => $receipt];
    }

    private function policyForGroup($group): array
    {
        $confirmed = $this->truthy($this->settingValue(
            'pmd_r36_fiscal_policy_confirmed',
            $this->envValue('PMD_R36_FISCAL_POLICY_CONFIRMED', '0')
        ));
        if (!$confirmed) {
            throw new RuntimeException('R36 fiscal policy is not confirmed. Set pmd_r36_fiscal_policy_confirmed=1 only after the merchant/tax policy is approved.');
        }

        $taxEnabled = (string)$this->settingValue('tax_mode', $this->settingValue('tax_enabled', '0')) === '1';
        $childRate = $taxEnabled ? max(0, (float)$this->settingValue('tax_percentage', 0)) : 0.0;
        $this->payloads->vatName($childRate);

        $serviceGross = max(0, (int)$group->service_charge_cents);
        $serviceRaw = trim((string)$this->settingValue(
            'pmd_service_charge_vat_rate',
            $this->envValue('PMD_R36_SERVICE_CHARGE_VAT_RATE', '')
        ));
        if ($serviceGross > 0 && $serviceRaw === '') {
            throw new RuntimeException('Service-charge VAT policy is missing. Set pmd_service_charge_vat_rate to inherit, 19, 7, 10.7, 5.5 or 0.');
        }
        $serviceRate = $serviceRaw === '' || strtolower($serviceRaw) === 'inherit'
            ? $childRate
            : $this->numericRate($serviceRaw, 'service-charge');
        $this->payloads->vatName($serviceRate);

        $tipGross = max(0, (int)$group->tip_cents);
        $tipRaw = trim((string)$this->settingValue(
            'pmd_tip_fiscal_vat_rate',
            $this->envValue('PMD_R36_TIP_FISCAL_VAT_RATE', '')
        ));
        if ($tipGross > 0 && $tipRaw === '') {
            throw new RuntimeException('Tip fiscal VAT policy is missing. Set pmd_tip_fiscal_vat_rate to inherit, 19, 7, 10.7, 5.5 or 0.');
        }
        $tipRate = $tipRaw === '' || strtolower($tipRaw) === 'inherit'
            ? $childRate
            : $this->numericRate($tipRaw, 'tip');
        $this->payloads->vatName($tipRate);

        if ((int)$group->discount_cents > 0) {
            $discountMode = strtolower(trim((string)$this->settingValue(
                'pmd_discount_fiscal_mode',
                $this->envValue('PMD_R36_DISCOUNT_FISCAL_MODE', '')
            )));
            if ($discountMode !== 'child_gross') {
                throw new RuntimeException('Discount fiscal policy must be explicitly set to child_gross for the current R36 allocator.');
            }
        } else {
            $discountMode = 'child_gross';
        }

        return [
            'version' => 1,
            'confirmed' => true,
            'child_vat_rate' => $childRate,
            'service_charge_vat_rate' => $serviceRate,
            'tip_vat_rate' => $tipRate,
            'discount_mode' => $discountMode,
            'captured_at' => now()->toIso8601String(),
        ];
    }

    private function numericRate(string $value, string $label): float
    {
        if (!is_numeric($value)) throw new RuntimeException('Invalid '.$label.' VAT rate.');
        return (float)$value;
    }

    private function locationIdForGroup(int $groupId): int
    {
        if (!Schema::hasColumn('orders', 'location_id')) return 1;
        $ids = DB::table('pmd_billing_group_orders')->where('billing_group_id', $groupId)->pluck('order_id')->all();
        if (!$ids) return 1;
        $locations = DB::table('orders')->whereIn('order_id', $ids)->pluck('location_id')
            ->filter(static fn ($value) => (int)$value > 0)->map(static fn ($value) => (int)$value)->unique()->values();
        if ($locations->count() > 1) throw new RuntimeException('A Final Bill cannot span multiple fiscal locations.');
        return (int)($locations->first() ?: 1);
    }

    private function configForLocation(int $locationId)
    {
        if (!Schema::hasTable('fiskaly_configs')) return null;
        $query = DB::table('fiskaly_configs')->where('provider', 'fiskaly')->where('is_enabled', 1);
        if (Schema::hasColumn('fiskaly_configs', 'location_id')) {
            $config = (clone $query)->where('location_id', $locationId)->first();
            if ($config) return $this->assertConfig($config);
        }
        $config = $query->orderByDesc('fiskaly_config_id')->first();
        return $config ? $this->assertConfig($config) : null;
    }

    private function assertConfig($config)
    {
        foreach (['api_key', 'api_secret', 'tss_id', 'client_id'] as $field) {
            if (trim((string)($config->$field ?? '')) === '') {
                throw new RuntimeException('Enabled Fiskaly configuration is incomplete: missing '.$field.'.');
            }
        }
        return $config;
    }

    private function accessToken(string $apiKey, string $apiSecret): string
    {
        $response = Http::timeout(20)->acceptJson()->asJson()->post($this->baseUrl().'/auth', [
            'api_key' => $apiKey,
            'api_secret' => $apiSecret,
        ]);
        if (!$response->successful()) {
            throw new RuntimeException('Fiskaly SIGN DE authentication failed: HTTP '.$response->status());
        }
        $token = trim((string)($response->json('access_token') ?? ''));
        if ($token === '') throw new RuntimeException('Fiskaly SIGN DE authentication returned no access token.');
        return $token;
    }

    private function put(string $url, array $payload, string $token)
    {
        return Http::timeout(25)->withToken($token)->acceptJson()->asJson()->put($url, $payload);
    }

    private function recover(string $txUrl, string $token): ?array
    {
        try {
            $response = Http::timeout(15)->withToken($token)->acceptJson()->get($txUrl);
            return $response->successful() ? ($response->json() ?: []) : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function baseUrl(): string
    {
        $configured = trim($this->envValue(
            'PMD_FISKALY_SIGN_DE_BASE_URL',
            'https://kassensichv-middleware.fiskaly.com/api/v2'
        ));
        if (!preg_match('#^https://#i', $configured)) {
            throw new RuntimeException('PMD_FISKALY_SIGN_DE_BASE_URL must use HTTPS.');
        }
        return rtrim($configured, '/');
    }

    private function settingValue(string $key, $default = null)
    {
        try {
            if (function_exists('setting')) {
                $value = setting($key, null);
                if ($value !== null && $value !== '') return $value;
            }
            if (Schema::hasTable('settings')) {
                $value = DB::table('settings')->where('item', $key)->orderByDesc('setting_id')->value('value');
                if ($value !== null && $value !== '') return $value;
            }
        } catch (\Throwable $e) {
        }
        return $default;
    }

    private function envValue(string $key, string $default = ''): string
    {
        try { return trim((string)env($key, $default)); }
        catch (\Throwable $e) { return $default; }
    }

    private function truthy($value): bool
    {
        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'on'], true);
    }

    private function short(string $message): string
    {
        return mb_substr(trim($message), 0, 4000);
    }
}
